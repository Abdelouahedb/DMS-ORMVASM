import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import Image from 'next/image';
import UserManagement from '@/components/admin/UserManagement';
import ServiceManagement from '@/components/admin/ServiceManagement';
import DocumentManagement from '../../components/admin/DocumentManagement';

export default function AdminDashboard() {
  const router = useRouter();
  const { query } = router;

  const [section, setSection] = useState(query.section || 'users');

  useEffect(() => {
    const isLoggedIn = Cookies.get('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, []);

  const handleSectionChange = (newSection) => {
    setSection(newSection);
    router.push(`/admin/dashboard?section=${newSection}`, undefined, { shallow: true });
  };

  const handleLogout = () => {
    Cookies.remove('isLoggedIn');
    router.push('/login');
  };

  return (
    <>
      {/* Custom global styles matching the Dashboard design */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        body {
          font-family: 'Poppins', sans-serif;
          background-color: #f8f9fa;
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
          border-color: #28a745;
          box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
        }
        .btn-primary {
          background-color: #28a745;
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
          background-color: #17a2b8;
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
          overflow: hidden;
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
        
        /* Enhanced Navigation Tab Styles */
        .admin-nav-tabs {
          background-color: #ffffff;
          border-radius: 0.75rem;
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
          border: none;
          padding: 0.5rem;
        }
        .admin-nav-tabs .nav-item {
          margin: 0 0.25rem;
        }
        .admin-nav-tabs .nav-link {
          border: none;
          background: transparent;
          border-radius: 0.5rem;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          color: #6c757d;
          transition: all 0.2s ease;
          position: relative;
        }
        .admin-nav-tabs .nav-link:hover {
          background-color: rgba(40, 167, 69, 0.1);
          color: #28a745;
          transform: translateY(-1px);
        }
        .admin-nav-tabs .nav-link.active {
          background-color: #28a745;
          color: #ffffff !important;
          box-shadow: 0 0.25rem 0.5rem rgba(40, 167, 69, 0.3);
        }
        .admin-nav-tabs .nav-link.active:hover {
          background-color: #218838;
          color: #ffffff !important;
        }
        
        /* Content Section Styling */
        .admin-content {
          background-color: #ffffff;
          border-radius: 0.75rem;
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
          padding: 2rem;
          border: none;
        }
        
        /* Enhanced Icon Styling */
        .admin-nav-tabs .nav-link i {
          font-size: 1.1rem;
          margin-right: 0.5rem;
        }
      `}</style>

      {/* Modern Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light shadow-sm sticky-top bg-white px-3">
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center gap-2" href="#">
            <Image src="/logo.png" alt="Logo" width={40} height={40} />
            <span className="fw-bold fs-4 text-success">ORMVA/SM Admin Panel</span>
          </a>
          <div className="d-flex align-items-center gap-3">
            <span className="fw-semibold text-muted d-none d-md-inline">Admin Portal</span>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i> Log Out
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        {/* Enhanced Navigation Tabs */}
        <div className="card mb-4 p-1 shadow-sm border-0">
          <ul className="nav nav-tabs admin-nav-tabs justify-content-center">
            <li className="nav-item">
              <button
                className={`nav-link d-flex align-items-center gap-2 ${section === 'users' ? 'active' : ''}`}
                onClick={() => handleSectionChange('users')}
              >
                <i className="bi bi-people-fill"></i> User Management
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link d-flex align-items-center gap-2 ${section === 'services' ? 'active' : ''}`}
                onClick={() => handleSectionChange('services')}
              >
                <i className="bi bi-gear-fill"></i> Service Management
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link d-flex align-items-center gap-2 ${section === 'documents' ? 'active' : ''}`}
                onClick={() => handleSectionChange('documents')}
              >
                <i className="bi bi-file-earmark-text-fill"></i> Document Management
              </button>
            </li>
          </ul>
        </div>

        {/* Section Content with Enhanced Styling */}
        <div className="admin-content">
          {section === 'users' && (
            <div>
              <h3 className="mb-4 d-flex align-items-center gap-2 text-success">
                <i className="bi bi-people-fill me-2"></i>
                User Management
              </h3>
              <UserManagement />
            </div>
          )}
          {section === 'services' && (
            <div>
              <h3 className="mb-4 d-flex align-items-center gap-2 text-success">
                <i className="bi bi-gear-fill me-2"></i>
                Service Management
              </h3>
              <ServiceManagement />
            </div>
          )}
          {section === 'documents' && (
            <div>
              <h3 className="mb-4 d-flex align-items-center gap-2 text-success">
                <i className="bi bi-file-earmark-text-fill me-2"></i>
                Document Management
              </h3>
              <DocumentManagement />
            </div>
          )}
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="footer mt-auto py-3 bg-white border-top shadow-sm">
        <div className="container text-center d-flex flex-column flex-md-row justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2 mb-2 mb-md-0">
            <Image src="/logo.png" alt="Logo" width={28} height={28} />
            <span className="fw-bold text-success">ORMVA/SM DMS Admin</span>
          </div>
          <span className="text-muted small">
            &copy; {new Date().getFullYear()} ORMVA/SM DMS. All rights reserved.
          </span>
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
}