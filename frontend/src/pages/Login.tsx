import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [matric, setMatric] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(matric, password);
      
      if (res.status === 'needs_device_verification') {
        navigate(`/verify?email=${encodeURIComponent(res.email || '')}&type=device`);
      } else if (res.status === 'success') {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials or rate-limit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="auth-card animate-slideUp">
        <div className="card">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ margin: '0 auto 1.25rem', display: 'inline-flex', justifyContent: 'center' }}>
              <Logo size="lg" animatePulse />
            </div>
            <h2 style={{ marginBottom: '0.25rem' }}>Welcome back</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Sign in to your Attendly account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-matric">Matric Number</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  id="login-matric"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={matric}
                  onChange={(e) => setMatric(e.target.value)}
                  placeholder="e.g. 22/25HP123"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
                <Link to="/reset-password" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? <div className="spinner spinner-sm spinner-white" /> : 'Sign In'}
            </button>
          </form>

          {/* Footer Link */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>New student? </span>
            <Link to="/register" style={{ fontWeight: 600 }}>
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
