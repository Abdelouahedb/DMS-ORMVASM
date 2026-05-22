import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/admin/users');
      setUsers(data);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/admin/users', form);
      fetchUsers();
      setForm({ username: '', password: '', role: 'user' });
      setSuccess('User added successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add user');
      setSuccess('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete('/api/admin/users', { data: { id } });
      fetchUsers();
      setSuccess('User deleted successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete user');
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

      {/* Users List Section */}
      <div className="card mb-4 p-4 shadow-sm border-0">
        <h4 className="mb-4 d-flex align-items-center gap-2 text-success">
          <i className="bi bi-list-ul me-2"></i>
          Current Users
        </h4>
        
        {isLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading users...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 border rounded-3 overflow-hidden">
              <thead className="table-light">
                <tr>
                  <th className="fw-semibold" style={{ minWidth: 180 }}>Username</th>
                  <th className="fw-semibold" style={{ minWidth: 100 }}>Role</th>
                  <th className="text-center fw-semibold" style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-4">
                      <i className="bi bi-info-circle me-2"></i>No users found.
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-circle text-muted"></i>
                          <span className="fw-semibold">{user.username}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${user.role === 'admin' ? 'bg-success' : 'bg-secondary'} px-3 py-2`}>
                          <i className={`bi ${user.role === 'admin' ? 'bi-shield-fill' : 'bi-person-fill'} me-1`}></i>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center mx-auto"
                          title="Delete User"
                          style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Section */}
      <div className="card p-4 shadow-sm border-0">
        <h4 className="mb-4 d-flex align-items-center gap-2 text-success">
          <i className="bi bi-person-plus-fill me-2"></i>
          Add New User
        </h4>
        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-md-4">
            <label htmlFor="username" className="form-label fw-semibold">Username*</label>
            <input
              type="text"
              id="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Enter username"
              required
              className="form-control"
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="password" className="form-label fw-semibold">Password*</label>
            <input
              type="password"
              id="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter password"
              required
              className="form-control"
            />
          </div>
          <div className="col-md-3">
            <label htmlFor="role" className="form-label fw-semibold">Role*</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
              className="form-select"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="col-md-1 d-flex align-items-end">
            <button 
              type="submit" 
              className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span className="d-none d-md-inline">Adding...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle"></i>
                  <span className="d-none d-md-inline">Add</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}