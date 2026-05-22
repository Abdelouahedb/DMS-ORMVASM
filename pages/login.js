// This is the Login component for the Document Manager System (DMS).
// It handles user authentication, including state management for username, password, and errors.
// It uses Axios for API calls, jwt-decode for token decoding, Next.js Router for navigation, and js-cookie for cookie management.

import { useState } from 'react'; // React hook for managing component state
import axios from 'axios'; // HTTP client for making API requests
import { jwtDecode } from 'jwt-decode'; // Utility for decoding JWT tokens
import { useRouter } from 'next/router'; // Next.js hook for accessing the router instance
import Cookies from 'js-cookie'; // Library for handling browser cookies
import Image from 'next/image'; // Next.js component for optimized images

export default function Login() {
  // State variables for username, password, and error messages
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter(); // Initialize Next.js router

  // Handles the form submission for login
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError(''); // Clear any previous errors

    try {
      // Make a POST request to the login API endpoint
      const { data } = await axios.post('/api/auth/login', { username, password });
      const token = data.token; // Extract the token from the response

      localStorage.setItem('token', token); // Store the token in localStorage
      // Set a cookie to indicate the user is logged in, expires in 7 days
      Cookies.set('isLoggedIn', 'true', { expires: 7, path: '/' });

      const decoded = jwtDecode(token); // Decode the JWT token
      const { role } = decoded; // Extract the user's role from the decoded token

      // Redirect based on user role
      if (role === 'admin') {
        router.push('/admin/dashboard'); // Redirect admin to admin dashboard
      } else if (role === 'user') {
        router.push('/user/dashboard'); // Redirect regular user to user dashboard
      } else {
        setError('Unknown role. Please contact support.'); // Handle unknown roles
      }
    } catch (err) {
      // Catch and display error messages from the API or a generic login failed message
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    // Main container for the login page, centers content vertically and horizontally
    <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
      {/* Login card with styling for background, shadow, and rounded corners */}
      <div
        className="login-card card shadow-lg border-0 rounded-4 p-4 p-md-5"
        style={{
          background: 'rgba(255,255,255,0.97)',
          boxShadow: '0 8px 32px rgba(56,176,0,0.10)'
        }}
      >
        {/* Logo and system title section */}
        <div className="text-center mb-3">
          <Image src="/logo.png" alt="ORMVA/SM Logo" width={100} height={100} className="mb-2" />
          <h2 className="fw-bold mt-2 mb-1" style={{ color: '#38b000', letterSpacing: '0.5px', fontSize: '1.5rem' }}>
            ORMVA/SM's Document Manager System (DMS)
          </h2>
        </div>

        {/* Welcome back message and sign-in prompt */}
        <h3 className="text-center mb-2 mt-2 login-title" style={{ fontWeight: 700, fontSize: '1.35rem' }}>
          <i className="bi bi-person-circle me-2 text-success"></i>
          Welcome Back!
        </h3>
        <p className="text-center text-muted mb-3" style={{ fontSize: '1rem' }}>
          Sign in to your account
        </p>

        {/* Error message display, conditionally rendered */}
        {error && (
          <div className="alert alert-danger fade show text-center py-2" role="alert" style={{ fontSize: '0.98rem' }}>
            <i className="bi bi-exclamation-octagon-fill me-2"></i> {/* Updated icon for error */}
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Username input field */}
          <div className="mb-3">
            <label htmlFor="username" className="form-label visually-hidden">Username</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-person-fill text-success"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-lg border-start-0"
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                style={{ background: '#f8fff6' }}
              />
            </div>
          </div>
          {/* Password input field */}
          <div className="mb-3">
            <label htmlFor="password" className="form-label visually-hidden">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-lock-fill text-success"></i>
              </span>
              <input
                type="password"
                className="form-control form-control-lg border-start-0"
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ background: '#f8fff6' }}
              />
            </div>
          </div>
          {/* Login button */}
          <button type="submit" className="btn btn-success btn-lg w-100 d-flex align-items-center justify-content-center gap-2 mt-2">
            <i className="bi bi-box-arrow-in-right"></i> Login
          </button>
        </form>
        {/* Copyright notice */}
        <div className="text-center mt-4">
          <small className="text-muted">
            &copy; {new Date().getFullYear()} ORMVA/SM DMS. All rights reserved.
          </small>
        </div>
      </div>
      {/* Global CSS styles for the login page */}
      <style jsx global>{`
        /* Import Google Font - Poppins */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        body {
          font-family: 'Poppins', sans-serif; /* Apply Poppins font to the body */
        }

        .login-bg {
          background: linear-gradient(120deg, #eaffed 0%, #d8f3dc 100%);
        }
        .login-card input:focus {
          box-shadow: 0 0 0 0.15rem rgba(56,176,0,0.25); /* Slightly stronger focus shadow */
          border-color: #38b000;
        }
        .login-card .input-group-text {
          border-radius: 0.5rem 0 0 0.5rem;
        }
        .login-card .form-control {
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .btn-success {
          background-color: #38b000;
          border-color: #38b000;
          transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
        }
        .btn-success:hover {
          background-color: #2b8a00; /* Darker green on hover */
          border-color: #2b8a00;
        }
        @media (max-width: 500px) {
          .login-card {
            padding: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}