import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    try {
      const { data } = await axios.get('/api/admin/services');
      setServices(data);
    } catch (err) {
      setError('Failed to fetch services');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/services', form);
      fetchServices();
      setForm({ name: '' });
      setSuccess('Service added successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add service');
      setSuccess('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await axios.delete('/api/admin/services', { data: { id } });
      fetchServices();
      setSuccess('Service deleted successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete service');
      setSuccess('');
    }
  };

  return (
    <>
      {/* Alert Messages */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
        </div>
      )}

      {/* Services List Section */}
      <div className="card mb-4 p-4 shadow-sm border-0">
        <h4 className="mb-4 d-flex align-items-center gap-2 text-success">
          <i className="bi bi-list-ul me-2"></i>
          Available Services
        </h4>
        {services.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-info-circle text-muted fs-4"></i>
            <p className="mt-2 text-muted">No services found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 border rounded-3 overflow-hidden">
              <thead className="table-light">
                <tr>
                  <th className="fw-semibold" style={{ minWidth: 220 }}>Service Name</th>
                  <th className="text-center fw-semibold" style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => (
                  <tr key={service.id}>
                    <td>
                      <span className="fw-semibold">{service.name}</span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center mx-auto"
                        title="Delete Service"
                        style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Service Section */}
      <div className="card p-4 shadow-sm border-0">
        <h4 className="mb-4 d-flex align-items-center gap-2 text-success">
          <i className="bi bi-plus-circle me-2"></i>
          Add New Service
        </h4>
        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-md-10">
            <label htmlFor="name" className="form-label fw-semibold">Service Name*</label>
            <input
              type="text"
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter service name"
              required
              className="form-control"
            />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button 
              type="submit" 
              className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
            >
              <i className="bi bi-plus-circle"></i>
              Add
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
