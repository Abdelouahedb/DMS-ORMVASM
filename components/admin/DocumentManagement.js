import { useState, useEffect } from 'react';
import axios from 'axios';

export default function DocumentManagement() {
  const [documents, setDocuments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchServices();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/admin/documents');
      setDocuments(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to fetch documents.');
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data } = await axios.get('/api/admin/services');
      setServices(data);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await axios.delete('/api/admin/documents', { data: { id } });
      setDocuments(documents.filter(doc => doc.id !== id));
      setSuccess('Document deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError('Failed to delete document.');
    }
  };

  const handleView = (id) => {
    const viewUrl = `/api/documents/${id}/view`;
    window.open(viewUrl, '_blank');
  };

  const handleDownload = async (id) => {
    try {
      const response = await axios.get(`/api/documents/${id}/view?mode=download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      const fileName = contentDisposition
        ? contentDisposition.split('filename=')[1].split(';')[0].replace(/"/g, '')
        : 'downloaded_file';
      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download document:', err);
      setError('Failed to download document.');
    }
  };

  return (
    <div className="card mb-4 p-4 shadow-sm border-0">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h4 className="mb-4 d-flex align-items-center gap-2 text-success">
          <i className="bi bi-file-earmark-check me-2"></i>
          Available Documents
        </h4>
        <span className="badge bg-light text-success fs-6">
          <i className="bi bi-collection me-1"></i>
          {documents.length} Document{documents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
              <div className="mt-2 text-muted">Loading documents...</div>
            </div>
          ) : (
            <>

              {documents.length === 0 ? (
                <div className="alert alert-info m-4 text-center">
                  <i className="bi bi-info-circle me-2"></i>No documents found.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ minWidth: 900 }}>
                    <thead className="table-light">
                      <tr>
                        <th style={{ minWidth: 180 }}>Title</th>
                        <th style={{ minWidth: 120 }}>Author</th>
                        <th style={{ minWidth: 130 }}>Service</th>
                        <th style={{ minWidth: 110 }}>Category</th>
                        <th style={{ minWidth: 120 }}>Date</th>
                        <th className="text-center" style={{ minWidth: 160 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(document => (
                        <tr key={document.id}>
                          <td>
                            <span className="fw-semibold">{document.title}</span>
                            {document.summary && (
                              <div className="text-muted small">{document.summary}</div>
                            )}
                          </td>
                          <td>{document.author}</td>
                          <td>
                            {
                              services.find(s => String(s.id) === String(document.service))
                                ? services.find(s => String(s.id) === String(document.service)).name
                                : document.service
                            }
                          </td>
                          <td>{document.category}</td>
                          <td>
                            {document.date
                              ? <span className="badge bg-success-subtle text-success-emphasis">{new Date(document.date).toLocaleDateString()}</span>
                              : <span className="text-muted">N/A</span>
                            }
                          </td>
                          <td className="text-center">
                            <div className="d-inline-flex gap-1">
                              <button
                                onClick={() => handleView(document.id)}
                                className="btn btn-outline-info btn-sm"
                                title="View"
                                style={{ width: '36px', height: '36px', borderRadius: '50%' }}

                              >
                                <i className="bi bi-eye-fill"></i>
                              </button>
                              <button
                                onClick={() => handleDownload(document.id)}
                                className="btn btn-outline-primary btn-sm"
                                title="Download"
                                style={{ width: '36px', height: '36px', borderRadius: '50%' }}

                              >
                                <i className="bi bi-download"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(document.id)}
                                className="btn btn-outline-danger btn-sm"
                                title="Delete"
                                style={{ width: '36px', height: '36px', borderRadius: '50%' }}

                              >
                                <i className="bi bi-trash-fill"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
