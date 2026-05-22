// pages/api/documents/[id]/view.ts

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dbPool from '../../../../lib/db'; // Adjust this path
import { RowDataPacket } from 'mysql2';
import { Readable } from 'stream';

// --- Configuration (MUST be consistent with your upload.ts file) ---
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const ENCRYPTION_KEY_FROM_ENV = process.env.ENCRYPTION_KEY;
const DEV_ENCRYPTION_KEY = 'development_encryption_key_for_testing_only_DO_NOT_USE_IN_PROD';
const KEY_DERIVATION_SALT = 'salt-for-scrypt'; // Use the same salt string

// Helper function to read the first 16 bytes (the IV) from the file stream
async function readIvFromStream(stream: fs.ReadStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const ivBuffer = Buffer.alloc(16);
        let bytesRead = 0;

        const cleanupAndReject = (err: any) => {
            if (stream && !stream.destroyed) {
                stream.destroy();
            }
            // Add context to the error message
            reject(new Error('Failed to read IV from file stream: ' + (err.message || 'Unknown error')));
        };

        const readTimeout = setTimeout(() => {
            cleanupAndReject(new Error('Timeout reading IV from file stream.'));
        }, 10000); // 10 seconds timeout

        stream.on('error', cleanupAndReject);

        const onReadable = () => {
            let chunk;
            while (bytesRead < ivBuffer.length && null !== (chunk = stream.read(ivBuffer.length - bytesRead))) {
                chunk.copy(ivBuffer, bytesRead, 0, chunk.length);
                bytesRead += chunk.length;
            }

            if (bytesRead === ivBuffer.length) {
                clearTimeout(readTimeout);
                stream.removeListener('error', cleanupAndReject);
                stream.removeListener('readable', onReadable);
                stream.pause(); // IMPORTANT: Pause the stream after reading IV
                resolve(ivBuffer);
            }
        };
        stream.on('readable', onReadable);

        stream.on('end', () => {
            // If the stream ends *before* reading the full 16-byte IV
            if (bytesRead < ivBuffer.length) {
                clearTimeout(readTimeout);
                // Ensure the stream is destroyed if not already
                if (stream && !stream.destroyed) {
                    stream.destroy();
                }
                // Reject because the file is too short to contain the IV
                reject(new Error(`Encrypted file ended prematurely after ${bytesRead} bytes while trying to read IV. File too short or empty.`));
            }
            // If bytesRead === ivBuffer.length, the 'end' event is expected after the IV is read,
            // but the `resolve` in `onReadable` will have already happened, so no rejection needed here.
        });

        // Handle case where file is empty or less than 16 bytes immediately
        // (The 'end' event handler above also covers this, but this might be slightly faster)
        if (stream.readableEnded && bytesRead < ivBuffer.length) {
            clearTimeout(readTimeout);
            reject(new Error(`Encrypted file is too short or empty (${bytesRead} bytes) to contain the 16-byte IV.`));
        }

    });
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        console.error('Missing or invalid document ID received:', id);
        return res.status(400).json({ message: 'Missing or invalid document ID provided.' });
    }

    if (!dbPool) {
        console.error('Database pool is not available. Check lib/db.js');
        return res.status(503).json({ message: 'Database service unavailable.' });
    }

    let connection;
    let fileReadStream: fs.ReadStream | undefined;

    try {
        // --- 1. Get document record from Database ---
        console.log(`Workspaceing document record for ID: ${id}`);
        connection = await dbPool.getConnection();

        // *** MODIFIED QUERY: Select original_mime_type and original_file_name (or title) ***
        // Make sure your documents table has these columns.
        // If you used a different column name for original filename (e.g., 'original_name'), use that instead of 'title'.
        const [rows] = await connection.execute<RowDataPacket[]>(
            'SELECT file_path, title, original_mime_type, original_file_name FROM documents WHERE id = ?',
            [id]
        );

        const documentRecord = rows[0];

        if (!documentRecord) {
            console.warn(`Document record not found in DB for ID: ${id}`);
            return res.status(404).json({ message: 'Document not found.' });
        }

        const encryptedFileName = documentRecord.file_path;
        // Use original_file_name if available, otherwise fallback to title + a default extension
        const originalFileName = documentRecord.original_file_name || documentRecord.title || `document_${id}`;
        const originalMimeType = documentRecord.original_mime_type; // Get the stored MIME type
        const safeFileName = originalFileName.replace(/ /g, '_');

        // --- Input Validation for essential data ---
        if (!encryptedFileName) {
            console.error(`Database record for ID ${id} is missing 'file_path'.`);
            return res.status(500).json({ message: 'Document record incomplete (missing file path).' });
        }
        if (!originalMimeType) {
            console.warn(`Database record for ID ${id} is missing 'original_mime_type'. Falling back to default.`);
            // Use a generic fallback if mime type is missing in DB
            // application/octet-stream is a good general-purpose fallback
            res.setHeader('Content-Type', 'application/octet-stream');
        } else {
            // *** SOLUTION STEP 1: Set Content-Type header ***
            res.setHeader('Content-Type', originalMimeType);
        }


        const encryptedFilePath = path.join(UPLOAD_DIR, encryptedFileName);
        console.log(`Checking if encrypted file exists at: ${encryptedFilePath}`);

        // --- 2. Check if encrypted file actually exists on disk ---
        if (!fs.existsSync(encryptedFilePath)) {
            console.error(`Encrypted file not found on disk for path: ${encryptedFilePath}`);
            // If DB record exists but file doesn't, it's a server issue
            return res.status(500).json({ message: 'Encrypted file not found on server storage.' });
        }
        console.log('Encrypted file found on disk.');


        // --- 3. Determine the Encryption Key for Decryption ---
        let actualEncryptionKey = ENCRYPTION_KEY_FROM_ENV;
        if (!actualEncryptionKey) {
            console.warn("WARNING: ENCRYPTION_KEY environment variable is missing! Using development key for decryption. DO NOT USE IN PRODUCTION.");
            actualEncryptionKey = DEV_ENCRYPTION_KEY;
        }
        if (actualEncryptionKey.length < 32) {
            console.error("Encryption key is too short for decryption. Must be at least 32 characters for AES-256.");
            // Avoid revealing key details in client error, just indicate server issue
            return res.status(500).json({ message: 'Server configuration error: Encryption key is inadequate.' });
        }
        const key = crypto.scryptSync(actualEncryptionKey, KEY_DERIVATION_SALT, 32);
        console.log('Encryption key derived.');


        // --- 4. Setup Streaming Decryption ---
        console.log(`Creating read stream for file.`);
        try {
            fileReadStream = fs.createReadStream(encryptedFilePath);
            if (!fileReadStream) {
                throw new Error("fs.createReadStream returned null or undefined.");
            }
        } catch (streamCreationError: any) {
            console.error("Error creating read stream:", streamCreationError);
            // Check if headers were already sent by mistake (shouldn't happen here)
            if (!res.headersSent) {
                return res.status(500).json({ message: 'Failed to open encrypted file for reading.', error: streamCreationError.message });
            } else {
                console.error('Headers already sent, cannot send stream creation error.');
                // If headers were sent, the response is likely corrupted, just end it.
                res.end();
                return; // Stop execution
            }
        }


        // Read the first 16 bytes (the IV)
        console.log('Attempting to read IV from stream using helper...');
        // The helper function handles stream pausing after reading IV
        const iv = await readIvFromStream(fileReadStream);
        console.log('Successfully read IV.');

        // Create the decipher stream
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        console.log('Decipher stream created.');


        // --- 5. Set Content-Disposition Header (Before Piping) ---
        // This header tells the browser how to handle the file.
        // 'inline' tries to display it; 'attachment' forces download.
        // For .docx, 'inline' often still results in download unless browser has a viewer.
        // Setting 'attachment' guarantees the user gets the file with the correct name/extension.

        // URL-encode the filename to handle spaces and special characters
        const encodedFileName = encodeURIComponent(originalFileName);

        // Extract the mode from the query parameters
        const { mode } = req.query;

        // Set Content-Disposition based on the mode
        if (mode === 'download') {
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
        }
        // Set the Content-Type header dynamically based on the MIME type
        res.setHeader('Content-Type', originalMimeType || 'application/octet-stream');


        // --- 6. Pipe Decrypted Content to Response ---
        console.log('Piping streams: fileReadStream -> decipher -> res');
        // Ensure fileReadStream is resumed after IV read and headers are set
        if (fileReadStream && !fileReadStream.isPaused()) {
            console.warn("fileReadStream was not paused correctly after IV read or resumed prematurely.");
            // Attempt to pause and resume to ensure proper piping start
            fileReadStream.pause();
            fileReadStream.resume(); // Resume before piping
        } else if (fileReadStream && fileReadStream.isPaused()) {
            fileReadStream.resume(); // Resume the stream paused by readIvFromStream
        } else {
            // fileReadStream might be undefined if stream creation failed, already handled above
            console.error("Cannot pipe: fileReadStream is not available.");
            // If headers weren't sent, send a 500 error
            if (!res.headersSent) {
                res.status(500).json({ message: "Internal server error: File stream not ready for piping." });
            } else {
                // If headers were sent, just end the potentially incomplete response
                res.end();
            }
            return; // Stop execution
        }

        // Now perform the piping
        fileReadStream.pipe(decipher).pipe(res);


        // --- 7. Handle Stream Errors and Completion ---
        // These handlers deal with errors *during* streaming, after headers might have been sent.
        if (fileReadStream) {
            fileReadStream.on('error', (err) => {
                console.error('Read stream error during pipe:', err);
                // Destroy decipher and end response cleanly
                if (decipher && !decipher.destroyed) decipher.destroy();
                if (!res.headersSent) { res.status(500).json({ message: 'File read error during streaming.', error: err.message }); } else { res.end(); }
            });
        }

        decipher.on('error', (err) => {
            console.error('Decipher stream error:', err);
            // Destroy read stream and end response cleanly
            if (fileReadStream && !fileReadStream.destroyed) fileReadStream.destroy();
            if (!res.headersSent) { res.status(500).json({ message: 'File decryption error during streaming.', error: err.message }); } else { res.end(); }
        });

        // Listen for the response stream finishing (sent to client)
        res.on('finish', () => {
            console.log(`Document ${id} successfully streamed to client.`);
            // No need to explicitly destroy streams here usually, pipe handles it.
        });

        // Listen for client closing connection prematurely
        res.on('close', () => {
            console.warn(`Client closed connection prematurely while streaming document ${id}.`);
            // Explicitly destroy streams to free resources
            if (fileReadStream && !fileReadStream.destroyed) fileReadStream.destroy();
            if (decipher && !decipher.destroyed) decipher.destroy();
        });


    } catch (error: any) {
        // This catch block handles errors BEFORE streaming starts (DB errors, file not found on disk initially, IV read errors)
        console.error("Error caught in main view handler try/catch:", error);

        // Clean up read stream if created but not yet piped or error occurred during IV read
        if (fileReadStream && !fileReadStream.destroyed) {
            console.log('Destroying fileReadStream in main catch block due to error.');
            fileReadStream.destroy();
        }

        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
            // Check for specific errors from our logic or helper functions
            if (error.message.includes('Document not found')) {
                return res.status(404).json({ message: error.message });
            }
            if (error.message.includes('Missing file_path')) {
                return res.status(500).json({ message: 'Document record is incomplete.' });
            }
            if (error.message.includes('Failed to read IV') || error.message.includes('Encrypted file ended prematurely') || error.message.includes('File too short or empty')) {
                return res.status(500).json({ message: error.message || 'Failed during file IV reading.', error: error.message });
            }
            if (error.message.includes('Failed to open encrypted file') || error.message.includes('Failed to create file read stream')) {
                return res.status(500).json({ message: error.message || 'Failed to open encrypted file.', error: error.message });
            }
            // Generic fallback for other unexpected errors before streaming starts
            return res.status(500).json({
                message: 'An unexpected error occurred while trying to view the document.',
                error: error.message || 'Unknown error',
                errorType: error.name || 'UNCAUGHT_ERROR'
            });
        } else {
            // If error occurred after headers were sent, stream error handlers are primary, but just end response here as safeguard
            console.warn('Error caught after headers sent in main handler, response might be incomplete.');
            res.end(); // Ensure response is closed
        }

    } finally {
        // --- Database Connection Cleanup ---
        if (connection) {
            try {
                connection.release();
                console.log('Database connection released.');
            } catch (releaseError) {
                console.error('Error releasing database connection:', releaseError);
            }
        }
        // Stream cleanup is handled by error/close events or explicit destroy in catch blocks.
    }
}

export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
};