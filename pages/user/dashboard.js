// This is the Dashboard component, serving as the main interface for users to upload and search documents.
// It manages various states related to file uploads, metadata, search queries, and results.
// It interacts with a backend API using Axios for document management and fetches available services.
// It also handles user logout and navigation.

import { useState, useEffect } from 'react'; // React hooks for state and side effects
import axios from 'axios'; // HTTP client for making API requests
import { useRouter } from 'next/router'; // Next.js hook for accessing the router instance
import Image from 'next/image'; // Next.js component for optimized images

const Dashboard = () => {
    const router = useRouter(); // Initialize Next.js router for navigation

    // State for file upload and its associated metadata
    const [file, setFile] = useState(null);
    const [metadata, setMetadata] = useState({
        title: '',
        author: '',
        service: '',
        category: '',
        date: new Date().toISOString().split('T')[0], // Default date to today
        keywords: '' // Stores comma-separated keywords for the document
    });

    // States for document search functionality
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]); // Array to store search results
    const [numFound, setNumFound] = useState(0); // Number of results found
    const [hasSearched, setHasSearched] = useState(false); // Flag to check if a search has been performed
    const [isSearching, setIsSearching] = useState(false); // Loading state for search
    const [searchError, setSearchError] = useState(null); // Error message for search

    // States for document upload functionality
    const [isUploading, setIsUploading] = useState(false); // Loading state for upload
    const [uploadError, setUploadError] = useState(null); // Error message for upload
    const [uploadSuccess, setUploadSuccess] = useState(false); // Success flag for upload

    // States for fetching services dropdown data
    const [services, setServices] = useState([]); // List of available services
    const [loadingServices, setLoadingServices] = useState(true); // Loading state for services
    const [servicesError, setServicesError] = useState(null); // Error message for fetching services

    // useEffect hook to fetch services when the component mounts
    useEffect(() => {
        const fetchServices = async () => {
            setLoadingServices(true); // Set loading true before fetching
            setServicesError(null); // Clear any previous errors
            try {
                const response = await axios.get('/api/admin/services'); // API call to get services
                setServices(response.data); // Update services state
            } catch (error) {
                setServicesError('Failed to load services. Please try again.'); // Set error if fetch fails
            } finally {
                setLoadingServices(false); // Set loading false after fetch completes
            }
        };
        fetchServices(); // Call the fetch function
    }, []); // Empty dependency array means this runs once on mount

    // Handles user logout, removes auth token and redirects to login page
    const handleLogout = () => {
        localStorage.removeItem('authToken'); // Remove the authentication token
        router.push('/login'); // Redirect to login page
    };

    // Handles file selection from the input field
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]; // Get the first selected file
        setFile(selectedFile); // Set the selected file in state

        // Automatically set the title from the file name if it's not already set
        if (selectedFile && !metadata.title) {
            const fileNameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.');
            setMetadata(prev => ({
                ...prev,
                title: fileNameWithoutExt || selectedFile.name // Use filename without extension or full filename
            }));
        }
    };

    // Handles changes in metadata input fields
    const handleMetadataChange = (e) => {
        const { name, value } = e.target; // Get the input field's name and value
        setMetadata((prev) => ({ ...prev, [name]: value })); // Update the specific metadata field
        setUploadError(null); // Clear any upload errors when metadata changes
    };

    // Validates the required metadata fields before upload
    const validateForm = () => {
        const requiredFields = ['title', 'author', 'service', 'category'];
        const missingFields = requiredFields.filter(field => !metadata[field]); // Find missing required fields
        if (missingFields.length > 0) {
            setUploadError(`Please fill in all required fields: ${missingFields.join(', ')}`); // Set error message
            return false; // Validation failed
        }
        return true; // Validation successful
    };

    // Handles the document upload process
    const handleUpload = async () => {
        setUploadError(null); // Clear previous upload errors
        setUploadSuccess(false); // Reset upload success flag

        // Check if a file is selected
        if (!file) {
            setUploadError('Please select a file to upload.');
            return;
        }
        // Validate form metadata
        if (!validateForm()) return;

        // Define allowed file types
        const allowedTypes = [
            'application/pdf', 'image/jpeg', 'image/png',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];
        // Check if the selected file type is allowed
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Invalid file type. Please upload a PDF, Word, Excel file, or image (JPEG, PNG).');
            return;
        }

        // Define maximum allowed file size (10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        // Check if the file size exceeds the limit
        if (file.size > MAX_FILE_SIZE) {
            setUploadError('File size exceeds the 10MB limit.');
            return;
        }

        // Prepare metadata for submission, ensuring date is ISO formatted
        const submissionMetadata = {
            ...metadata,
            date: metadata.date ? new Date(metadata.date).toISOString() : new Date().toISOString()
        };

        // Create FormData object to send file and metadata
        const formData = new FormData();
        formData.append('file', file);
        formData.append('metadata', JSON.stringify(submissionMetadata));

        setIsUploading(true); // Set uploading state to true
        try {
            // Make POST request to upload document
            await axios.post('/api/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' } // Important for file uploads
            });
            setUploadSuccess(true); // Set success flag
            // Reset form fields after successful upload
            setFile(null);
            setMetadata({
                title: '',
                author: '',
                service: '',
                category: '',
                date: new Date().toISOString().split('T')[0],
                keywords: ''
            });
            // Clear the file input visually
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
        } catch (error) {
            let errorMessage = 'Upload failed.';
            // Customize error message based on API response
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
                if (error.response.data.missingFields) {
                    errorMessage += ` Missing fields: ${error.response.data.missingFields.join(', ')}.`;
                }
            }
            setUploadError(errorMessage); // Set the error message
        } finally {
            setIsUploading(false); // Reset uploading state
        }
    };

    // Handles the document search process
    const handleSearch = async (e) => {
        e.preventDefault(); // Prevent default form submission
        setSearchError(null); // Clear previous search errors
        setHasSearched(false); // Reset search status
        setSearchResults([]); // Clear previous results
        setNumFound(0); // Reset number of found results

        if (!searchQuery.trim()) {
            setSearchError('Please enter a search query.'); // Prompt user for query
            return;
        }

        setIsSearching(true); // Set searching state to true
        try {
            // Make GET request to search documents
            const response = await axios.get(`/api/documents/search`, {
                params: { query: searchQuery, start: 0, rows: 10 } // Pass search query as parameter
            });
            setSearchResults(response.data.docs); // Update search results
            setNumFound(response.data.numFound); // Update number of found results
            setHasSearched(true); // Set has searched flag
        } catch (error) {
            setSearchError('Search failed. Please try again. If the issue persists, contact support.'); // Set error message
            setSearchResults([]); // Clear results on error
            setNumFound(0); // Reset count on error
        } finally {
            setIsSearching(false); // Reset searching state
        }
    };

    return (
        <>
            {/* Custom global styles for the dashboard */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                body {
                    font-family: 'Poppins', sans-serif;
                    background-color: #f8f9fa; /* Light background for the page */
                }
                .navbar {
                    background-color: #ffffff;
                    border-bottom: 1px solid #e0e0e0;
                }
                .card {
                    border-radius: 0.75rem;
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
                }
                .form-control, .form-select {
                    border-radius: 0.5rem;
                    border: 1px solid #ced4da;
                    padding: 0.75rem 1rem;
                }
                .form-control:focus, .form-select:focus {
                    border-color: #28a745; /* Green border on focus */
                    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
                }
                .btn-primary {
                    background-color: #28a745; /* Green primary button */
                    border-color: #28a745;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    font-weight: 600;
                    transition: background-color 0.2s ease, border-color 0.2s ease;
                }
                .btn-primary:hover {
                    background-color: #218838;
                    border-color: #1e7e34;
                }
                .btn-success {
                    background-color: #17a2b8; /* Info/Cyan for search button */
                    border-color: #17a2b8;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    font-weight: 600;
                    transition: background-color 0.2s ease, border-color 0.2s ease;
                }
                .btn-success:hover {
                    background-color: #138496;
                    border-color: #117a8b;
                }
                 .btn-outline-danger {
                    border-color: #dc3545;
                    color: #dc3545;
                    border-radius: 0.5rem;
                    padding: 0.5rem 1rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                .btn-outline-danger:hover {
                    background-color: #dc3545;
                    color: #fff;
                }
                .alert {
                    border-radius: 0.5rem;
                    font-size: 0.95rem;
                }
                .table thead th {
                    background-color: #e9ecef;
                    font-weight: 600;
                    color: #495057;
                }
                .table tbody tr:hover {
                    background-color: #f2f2f2;
                }
                .table-responsive {
                    border-radius: 0.5rem;
                    overflow: hidden; /* Ensures rounded corners are applied */
                }
                .footer {
                    background-color: #ffffff;
                    border-top: 1px solid #e0e0e0;
                }
                .footer .text-muted {
                    font-size: 0.875rem;
                }
                .footer a {
                    color: #6c757d;
                    transition: color 0.2s ease;
                }
                .footer a:hover {
                    color: #28a745;
                }
            `}</style>

            {/* Navbar for navigation and logout */}
            <nav className="navbar navbar-expand-lg navbar-light shadow-sm sticky-top bg-white px-3">
                <div className="container-fluid">
                    {/* Brand logo and name */}
                    <a className="navbar-brand d-flex align-items-center gap-2" href="#">
                        <Image src="/logo.png" alt="Logo" width={40} height={40} />
                        <span className="fw-bold fs-4 text-success">DocuManager</span>
                    </a>
                    {/* Welcome message and Logout button */}
                    <div className="d-flex align-items-center gap-3">
                        <span className="fw-semibold text-muted d-none d-md-inline">Welcome!</span>
                        <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
                            <i className="bi bi-box-arrow-right"></i> Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container py-4">
                {/* Upload Document Section */}
                <div className="card my-4 p-4 shadow-sm border-0">
                    <h3 className="mb-4 d-flex align-items-center gap-2 text-success">
                        <i className="bi bi-cloud-arrow-up-fill me-2"></i>
                        Upload Document
                    </h3>
                    {/* Upload Success Alert */}
                    {uploadSuccess && (
                        <div className="alert alert-success d-flex align-items-center mb-3" role="alert">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            File uploaded and indexed successfully!
                        </div>
                    )}
                    {/* Upload Error Alert */}
                    {uploadError && (
                        <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            {uploadError}
                        </div>
                    )}
                    {/* Upload Form */}
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label htmlFor="fileInput" className="form-label fw-semibold">Select File*</label>
                            <input
                                id="fileInput"
                                type="file"
                                onChange={handleFileChange}
                                className="form-control"
                            />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="titleInput" className="form-label fw-semibold">Title*</label>
                            <input
                                id="titleInput"
                                type="text"
                                name="title"
                                value={metadata.title}
                                onChange={handleMetadataChange}
                                placeholder="Enter document title"
                                className="form-control"
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="authorInput" className="form-label fw-semibold">Author*</label>
                            <input
                                id="authorInput"
                                type="text"
                                name="author"
                                value={metadata.author}
                                onChange={handleMetadataChange}
                                placeholder="Enter document author"
                                className="form-control"
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="serviceSelect" className="form-label fw-semibold">Service*</label>
                            {loadingServices ? (
                                <div className="text-muted fst-italic">Loading services...</div>
                            ) : servicesError ? (
                                <div className="text-danger">{servicesError}</div>
                            ) : (
                                <select
                                    id="serviceSelect"
                                    name="service"
                                    value={metadata.service}
                                    onChange={handleMetadataChange}
                                    className="form-select"
                                    required
                                >
                                    <option value="">Select a Service</option>
                                    {services.map((service) => (
                                        <option key={service.id} value={service.id}>
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="categoryInput" className="form-label fw-semibold">Category*</label>
                            <input
                                id="categoryInput"
                                type="text"
                                name="category"
                                value={metadata.category}
                                onChange={handleMetadataChange}
                                placeholder="Enter document category"
                                className="form-control"
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="dateInput" className="form-label fw-semibold">Date</label>
                            <input
                                id="dateInput"
                                type="date"
                                name="date"
                                value={metadata.date}
                                onChange={handleMetadataChange}
                                className="form-control"
                            />
                        </div>
                        <div className="col-12">
                            <label htmlFor="keywordsInput" className="form-label fw-semibold">Keywords</label>
                            <input
                                id="keywordsInput"
                                name="keywords"
                                type="text"
                                value={metadata.keywords || ''}
                                onChange={e => setMetadata(prev => ({ ...prev, keywords: e.target.value }))}
                                placeholder="Comma-separated keywords (e.g., contract, invoice, report)"
                                className="form-control"
                            />
                        </div>
                        <div className="col-12">
                            <button className="btn btn-primary w-100" onClick={handleUpload} disabled={isUploading}>
                                {isUploading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-cloud-arrow-up me-2"></i> Upload Document
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Documents Section */}
                <div className="card my-4 p-4 shadow-sm border-0">
                    <h3 className="mb-4 d-flex align-items-center gap-2 text-success">
                        <i className="bi bi-search me-2"></i>
                        Search Documents
                    </h3>
                    <form onSubmit={handleSearch} className="d-flex mb-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter keywords to search documents..."
                            className="form-control me-2"
                        />
                        <button
                            type="submit"
                            className="btn btn-success d-flex align-items-center gap-2 flex-shrink-0"
                            disabled={isSearching}
                        >
                            {isSearching ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-search"></i> Search
                                </>
                            )}
                        </button>
                    </form>

                    {/* Search Results Display */}
                    <h4 className="mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-list-ul text-secondary"></i>
                        Results
                    </h4>
                    {searchError && (
                        <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            {searchError}
                        </div>
                    )}
                    {isSearching && (
                        <div className="text-center py-3">
                            <div className="spinner-border text-success" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2 text-muted">Searching for documents...</p>
                        </div>
                    )}
                    {!isSearching && !searchError && hasSearched && searchResults.length === 0 && (
                        <div className="alert alert-info d-flex align-items-center" role="alert">
                            <i className="bi bi-info-circle-fill me-2"></i>
                            No documents found matching your query. Try a different search term.
                        </div>
                    )}
                    {searchResults.length > 0 && (
                        <>
                            <p className="text-muted">Found **{numFound}** result(s).</p>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0 border rounded-3 overflow-hidden">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Title</th>
                                            <th>Author</th>
                                            <th>Service</th>
                                            <th>Category</th>
                                            <th>Date</th>
                                            <th className="text-center" style={{ minWidth: 160 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {searchResults.map((result) => (
                                            <tr key={result.id}>
                                                <td>{result.title}</td>
                                                <td>{result.author}</td>
                                                <td>{result.service_name}</td>
                                                <td>{Array.isArray(result.category) ? result.category.join(', ') : result.category}</td>
                                                <td>{result.date ? new Date(result.date).toLocaleDateString() : 'N/A'}</td>
                                                <td className="text-center">
                                                    <div className="d-inline-flex gap-2">
                                                        {/* View Document Button */}
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-info btn-sm d-flex align-items-center justify-content-center"
                                                            title="View Document"
                                                            onClick={() => window.open(`/api/documents/${result.id}/view`, '_blank', 'noopener,noreferrer')}
                                                            style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                                                        >
                                                            <i className="bi bi-eye-fill"></i>
                                                        </button>
                                                        {/* Download Document Button */}
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center"
                                                            title="Download Document"
                                                            onClick={async () => {
                                                                try {
                                                                    const response = await axios.get(`/api/documents/${result.id}/view?mode=download`, {
                                                                        responseType: 'blob', // Important for downloading files
                                                                    });
                                                                    const url = window.URL.createObjectURL(new Blob([response.data]));
                                                                    const link = document.createElement('a');
                                                                    link.href = url;
                                                                    // Extract filename from Content-Disposition header or use a default
                                                                    const contentDisposition = response.headers['content-disposition'];
                                                                    const fileName = contentDisposition
                                                                        ? contentDisposition.split('filename=')[1]?.split(';')[0]?.replace(/"/g, '')
                                                                        : 'downloaded_file';
                                                                    link.setAttribute('download', fileName); // Set download attribute
                                                                    document.body.appendChild(link); // Append link to body
                                                                    link.click(); // Programmatically click the link to trigger download
                                                                    document.body.removeChild(link); // Clean up
                                                                } catch (err) {
                                                                    alert('Failed to download document. Please try again.');
                                                                }
                                                            }}
                                                            style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                                                        >
                                                            <i className="bi bi-download"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Footer Section */}
            <footer className="footer mt-auto py-3 bg-white border-top shadow-sm">
                <div className="container text-center d-flex flex-column flex-md-row justify-content-between align-items-center">
                    {/* Footer Logo and App Name */}
                    <div className="d-flex align-items-center gap-2 mb-2 mb-md-0">
                        <Image src="/logo.png" alt="Logo" width={28} height={28} />
                        <span className="fw-bold text-success">DocuManager</span>
                    </div>
                    {/* Copyright Information */}
                    <span className="text-muted small">
                        &copy; {new Date().getFullYear()} DocuManager. All rights reserved.
                    </span>
                    {/* Social Media/Contact Icons */}
                    <div>
                        <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="text-muted mx-2" aria-label="GitHub">
                            <i className="bi bi-github fs-5"></i>
                        </a>
                        <a href="mailto:support@example.com" className="text-muted mx-2" aria-label="Email Support">
                            <i className="bi bi-envelope-fill fs-5"></i>
                        </a>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default Dashboard;