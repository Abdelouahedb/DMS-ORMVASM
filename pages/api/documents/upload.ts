// pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios'; // Import axios for Tika Server communication
import { htmlToText } from 'html-to-text'; // Add html-to-text for converting HTML to plain text

// Import the real solrClient and addDocument function
import { solrClient, addDocument } from '../../../lib/solrClient'; // Assuming this path is correct
// Import the database pool
import dbPool from '../../../lib/db'; // Import the database pool directly

// --- Configuration ---
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Max file size limit: 10MB
const ENCRYPTION_KEY_FROM_ENV = process.env.ENCRYPTION_KEY;
const DEV_ENCRYPTION_KEY = 'development_encryption_key_for_testing_only_DO_NOT_USE_IN_PROD'; // !! WARNING !!

const TIKA_SERVER_URL = process.env.TIKA_SERVER_URL || 'http://localhost:9998'; // Tika Server URL

// Ensure upload directory exists
try {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        console.log('Upload directory created:', UPLOAD_DIR);
    }
} catch (error) {
    console.error('Error creating upload directory:', error);
}

// Configure multer middleware
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE }
}).single('file'); // IMPORTANT: Expects a field named 'file'

// Extend NextApiRequest
interface NextApiRequestWithFile extends NextApiRequest {
    file?: Express.Multer.File;
    body: {
        metadata?: string; // Expecting metadata as a JSON string
    };
}

// Encrypt the uploaded file (no changes needed here)
const encryptFile = (filePath: string, encryptionKey: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(filePath)) {
                return reject(new Error(`File not found for encryption: ${filePath}`));
            }

            const encryptedFilePath = path.join(UPLOAD_DIR, `${path.basename(filePath)}-${crypto.randomUUID()}.enc`);

            const iv = crypto.randomBytes(16);
            const key = crypto.scryptSync(encryptionKey, 'salt-for-scrypt', 32);

            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

            const input = fs.createReadStream(filePath);
            const tempEncryptedFilePath = encryptedFilePath + ".tmp";
            const output = fs.createWriteStream(tempEncryptedFilePath);

            output.write(iv, (err) => {
                if (err) {
                    return reject(new Error('Failed to write IV: ' + err.message));
                }
                input.pipe(cipher).pipe(output)
                    .on('finish', () => {
                        fs.renameSync(tempEncryptedFilePath, encryptedFilePath);
                        resolve(encryptedFilePath)
                    })
                    .on('error', (err) => reject(new Error('Encryption stream error: ' + err.message)));
            });

            input.on('error', (err) => reject(new Error('Read stream error during encryption: ' + err.message)));
            cipher.on('error', (err) => reject(new Error('Cipher stream error: ' + err.message)));

        } catch (error: any) {
            console.error('Error in encryptFile function:', error);
            reject(new Error('Encryption failed: ' + error.message));
        }
    });
};


export default async function handler(req: NextApiRequestWithFile, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!dbPool) {
        console.error('Database pool is not available.');
        return res.status(503).json({ message: 'Database service unavailable.' });
    }

    console.log('Upload API called');

    const runMiddleware = (currentReq: NextApiRequestWithFile, currentRes: NextApiResponse, fn: any) => {
        return new Promise((resolve, reject) => {
            fn(currentReq, currentRes, (result: any) => {
                if (result instanceof Error) {
                    return reject(result);
                }
                return resolve(result);
            });
        });
    };

    let originalFilePath: string | undefined;
    let encryptedFilePath: string | undefined;
    let docId: string | undefined;
    let tikaExtractedContent: string = ''; // To store main text from Tika
    let tikaExtractedMetadata: Record<string, any> = {}; // To store metadata from Tika

    try {
        await runMiddleware(req, res, upload);
        console.log('Multer processing finished.');

        const { file } = req;
        if (!file) {
            console.error("No file uploaded or multer failed to attach it.");
            return res.status(400).json({
                message: 'No file uploaded. Ensure the input field is named "file".',
                errorType: 'NO_FILE'
            });
        }

        originalFilePath = file.path; // Store the path for cleanup

        // --- TIKA INTEGRATION: Extract content and metadata ---
        console.log('Sending file to Tika Server for extraction...');
        try {
            const fileStreamForTika = fs.createReadStream(originalFilePath);
            const tikaResponse = await axios.put(`${TIKA_SERVER_URL}/rmeta`, fileStreamForTika, {
                headers: {
                    'Content-Type': file.mimetype, // Use original MIME type for Tika
                    'Accept': 'application/json',
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                // timeout: 60000, // Increased timeout to 60 seconds for potentially large files
            });

            // --- IMPORTANT: ADD THIS LOG TO SEE TIKA'S RAW RESPONSE ---
            console.log('Raw Tika Response Data:', JSON.stringify(tikaResponse.data, null, 2));
            // ---------------------------------------------------------

            // Tika /rmeta returns an array of JSON objects; the first one is usually the main document
            const extractedData = tikaResponse.data[0];
            tikaExtractedContent = extractedData['X-TIKA:content']
                ? htmlToText(extractedData['X-TIKA:content'], { wordwrap: false })
                : (extractedData['X-Tika-Parsed-Content'] || ''); // Use the correct key from Tika's response

            // Clean up some Tika internal metadata that's not usually needed
            delete extractedData['X-Tika-Parsed-Content'];
            delete extractedData['X-Tika-Parsed-by'];
            delete extractedData['X-Parsed-By'];
            delete extractedData['Content-Encoding'];
            delete extractedData['Content-MD5'];
            // You can add more Tika internal fields to exclude based on your needs

            tikaExtractedMetadata = extractedData; // Store remaining metadata

            console.log('Tika extraction successful.');
            // console.log('Tika Content (first 500 chars):', tikaExtractedContent.substring(0, 500));
            // console.log('Tika Metadata:', JSON.stringify(tikaExtractedMetadata, null, 2));

        } catch (tikaError: any) {
            console.error('Error during Tika extraction:', tikaError.message);
            // Enhanced Tika error logging
            if (tikaError.code === 'ECONNREFUSED') {
                console.error('Tika Server connection refused. Please ensure Tika Server is running at', TIKA_SERVER_URL, 'and is accessible.');
            } else if (tikaError.code === 'ETIMEDOUT' || tikaError.code === 'ECONNABORTED') {
                console.error('Tika Server connection timed out or aborted. The file might be too large or Tika is taking too long to process.');
            } else if (tikaError.response) {
                console.error('Tika Server responded with an error status:', tikaError.response.status);
                console.error('Tika Server error response data:', tikaError.response.data);
            }

            // If Tika fails, you might still want to proceed with storing the file
            // but log a warning and don't populate Solr with content.
            // For now, let's make it fail the request if Tika fails.
            if (originalFilePath && fs.existsSync(originalFilePath)) {
                fs.unlinkSync(originalFilePath); // Clean up temp file
            }
            return res.status(500).json({
                message: 'Failed to extract content from document using Tika.',
                errorType: 'TIKA_EXTRACTION_FAILED',
                error: tikaError.message
            });
        }

        // Check for metadata sent from the frontend (optional, your app-specific metadata)
        const { metadata } = req.body;
        let parsedFrontendMetadata: Record<string, any> = {};
        if (metadata) {
            try {
                parsedFrontendMetadata = JSON.parse(metadata);
                console.log('Parsed frontend metadata:', parsedFrontendMetadata);
            } catch (error) {
                console.warn("Warning: Invalid frontend metadata format, proceeding without it.");
            }
        }

        // Combine frontend metadata with Tika's metadata (frontend takes precedence for conflicts)
        const combinedMetadata = {
            ...tikaExtractedMetadata, // Tika's extracted metadata
            ...parsedFrontendMetadata // Frontend provided metadata (e.g., title, author, service, category, summary)
        };


        const requiredFields = ['title', 'author', 'service', 'category'];
        const missingFields = requiredFields.filter(field => !combinedMetadata[field]);

        if (missingFields.length > 0) {
            console.error("Missing required metadata fields (after Tika and frontend):", missingFields);
            if (originalFilePath && fs.existsSync(originalFilePath)) {
                fs.unlinkSync(originalFilePath); // Clean up temp file
            }
            return res.status(400).json({
                message: `Missing required metadata fields: ${missingFields.join(', ')}`,
                errorType: 'MISSING_METADATA_FIELDS',
                missingFields
            });
        }

        if (file.size > MAX_FILE_SIZE) {
            console.error("File size exceeds the limit");
            if (originalFilePath && fs.existsSync(originalFilePath)) {
                fs.unlinkSync(originalFilePath); // Clean up temp file
            }
            return res.status(400).json({
                message: `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`,
                errorType: 'FILE_TOO_LARGE'
            });
        }

        let actualEncryptionKey = ENCRYPTION_KEY_FROM_ENV;
        if (!actualEncryptionKey) {
            console.warn("WARNING: ENCRYPTION_KEY environment variable is missing! Using development key. DO NOT USE IN PRODUCTION.");
            actualEncryptionKey = DEV_ENCRYPTION_KEY;
        }
        if (actualEncryptionKey.length < 32) {
            console.error("Encryption key is too short. Must be at least 32 characters for AES-256.");
            if (originalFilePath && fs.existsSync(originalFilePath)) {
                fs.unlinkSync(originalFilePath); // Clean up temp file
            }
            return res.status(500).json({
                message: 'Server configuration error: Encryption key is inadequate.',
                errorType: 'INSECURE_KEY'
            });
        }

        console.log('Encrypting file...');
        const encryptedFilePathResult = await encryptFile(file.path, actualEncryptionKey);
        encryptedFilePath = encryptedFilePathResult;
        console.log('File encrypted successfully:', encryptedFilePath);

        try {
            fs.unlinkSync(file.path);
            console.log('Original unencrypted file removed:', file.path);
            originalFilePath = undefined;
        } catch (cleanupError) {
            console.error("Failed to remove original unencrypted file after encryption:", cleanupError);
        }

        // --- Prepare Data for DB and Solr ---
        docId = crypto.randomUUID();
        const uploadTimestamp = new Date();
        const uploadDateISO = uploadTimestamp.toISOString();

        // Database Record (contains paths and basic metadata)
        const dbRecord = {
            id: docId,
            title: combinedMetadata.title,
            author: combinedMetadata.author,
            service_id: combinedMetadata.service,
            category: combinedMetadata.category,
            file_path: path.basename(encryptedFilePath),
            upload_date: uploadTimestamp,
            solr_id: docId,
            original_file_name: file.originalname,
            original_mime_type: file.mimetype,
            original_file_size: file.size,
            keywords: combinedMetadata.keywords || null // <-- changed from summary to keywords
        };

        // Solr Document (contains searchable content and rich metadata)
        const [rows] = await dbPool.query('SELECT name FROM services WHERE id = ?', [combinedMetadata.service]) as [Array<{ name: string }>, any];
        const serviceName = rows[0]?.name || '';

        const solrDoc: Record<string, any> = {
            id: docId,
            title: combinedMetadata.title,
            author: combinedMetadata.author,
            service_id: combinedMetadata.service,
            service_name: serviceName, 
            category: combinedMetadata.category,
            date: combinedMetadata['Creation-Date'] ? new Date(combinedMetadata['Creation-Date']).toISOString() : uploadDateISO,
            encryptedFilePath: path.basename(encryptedFilePath),
            originalFileName: file.originalname,
            fileSize: file.size,
            uploadDate: uploadDateISO,
            contentType: combinedMetadata['Content-Type'] || file.mimetype,
            content: tikaExtractedContent,
            keywords: combinedMetadata.keywords || null, // 
            lastModified: combinedMetadata['Last-Modified'] ? new Date(combinedMetadata['Last-Modified']).toISOString() : null,
            pageCount: combinedMetadata['xmpTPg:NPages'] || combinedMetadata['Page-Count'] || null,
            language: combinedMetadata['language'] || null,
            WordCount: combinedMetadata['wordcount'] || null,
        };

        // Clean up null values before sending to Solr if fields are not multiValued and should be omitted
        Object.keys(solrDoc).forEach(key => {
            if (solrDoc[key] === null) {
                delete solrDoc[key];
            }
        });

        console.log('Solr doc to be indexed:', solrDoc);

        // --- Insert into MySQL Database ---
        console.log('Inserting record into database...');
        let connection;
        try {
            connection = await dbPool.getConnection();
            await connection.execute(
                `INSERT INTO documents (id, title, author, service_id, category, file_path, upload_date, solr_id, original_file_name, original_mime_type, original_file_size, keywords)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    dbRecord.id,
                    dbRecord.title,
                    dbRecord.author,
                    dbRecord.service_id,
                    dbRecord.category,
                    dbRecord.file_path,
                    dbRecord.upload_date,
                    dbRecord.solr_id,
                    dbRecord.original_file_name,
                    dbRecord.original_mime_type,
                    dbRecord.original_file_size,
                    dbRecord.keywords // <-- changed from summary to keywords
                ]
            );
            console.log('Database insert successful for id:', dbRecord.id);
        } catch (error: any) {
            console.error("Error inserting into database:", error);
            // Important: If DB insertion fails, delete the encrypted file too!
            if (encryptedFilePath && fs.existsSync(encryptedFilePath)) {
                try {
                    fs.unlinkSync(encryptedFilePath);
                    console.warn('Cleaned up encrypted file due to DB insertion failure:', encryptedFilePath);
                } catch (cleanupErr) {
                    console.error('Failed to clean up encrypted file after DB error:', cleanupErr);
                }
            }
            return res.status(500).json({
                message: 'Failed to save document record to database. Check server logs for details.',
                errorType: 'DB_INSERTION_FAILED',
                error: error.message
            });
        } finally {
            if (connection) connection.release(); // Release the connection back to the pool
        }


        // --- Index in Solr ---
        console.log('Indexing in Solr...');
        try {
            await addDocument(solrDoc);
            console.log('Document added to Solr and committed.');
        } catch (error: any) {
            console.error("Error indexing to Solr:", error);
            // If Solr indexing fails here, the DB record and encrypted file will remain.
            // This is a partial success state. You might want to log this prominently
            // and potentially have a retry mechanism or a way to manually re-index.
            return res.status(500).json({
                message: 'Failed to index document in Solr after saving to database. Check server logs for details.',
                errorType: 'SOLR_INDEXING_FAILED',
                error: error.message
            });
        }


        return res.status(200).json({
            message: 'File uploaded, encrypted, saved to DB, and indexed successfully.',
            fileId: docId,
            fileName: solrDoc.originalFileName
        });

    } catch (error: any) {
        console.error("Error in API handler (top-level catch):", error);

        if (error.code && error.code.startsWith('LIMIT_')) {
            return res.status(400).json({
                message: error.message || 'File upload error.',
                errorType: error.code,
            });
        }

        // Generic error for other unexpected issues
        return res.status(500).json({
            message: 'An unexpected error occurred during document processing.',
            error: error.message || 'Unknown error',
            errorType: error.name || 'UNCAUGHT_ERROR'
        });
    } finally {
        // Ensure original file is deleted if it wasn't already after successful encryption or earlier errors
        if (originalFilePath && fs.existsSync(originalFilePath)) {
            try {
                fs.unlinkSync(originalFilePath);
                console.log('Cleaned up original file in finally block:', originalFilePath);
            } catch (cleanupError) {
                console.error("Failed to remove original file in finally block:", cleanupError);
            }
        }
        // Encrypted file cleanup on DB error is handled within the DB catch block now.
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};