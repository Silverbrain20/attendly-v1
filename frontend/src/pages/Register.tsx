import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest, getDeviceFingerprint } from '../utils/api';
import { User, Mail, Phone, Lock, AlertCircle, FileText } from 'lucide-react';
import Logo from '../components/Logo';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [matric, setMatric] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isClassRep, setIsClassRep] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fingerprint = getDeviceFingerprint();
      const res = await apiRequest('POST', '/api/auth/register', {
        full_name: fullName,
        matric_number: matric,
        phone_number: phone,
        email,
        password,
        is_class_rep: isClassRep,
        device_fingerprint: fingerprint
      }, true);

      if (res.status === 'success') {
        navigate(`/verify?email=${encodeURIComponent(email)}&type=email`);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check if matric/phone/email is already registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="auth-card animate-slideUp" style={{ maxWidth: '480px' }}>
        <div className="card">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Link to="/" aria-label="Go to homepage" style={{ margin: '0 auto 1.25rem', display: 'inline-flex', justifyContent: 'center', cursor: 'pointer', textDecoration: 'none' }}>
              <Logo size="lg" animatePulse />
            </Link>
            <h2 style={{ marginBottom: '0.25rem' }}>Create your account</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Sign up once to access Attendly</p>
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
              <label className="form-label" htmlFor="reg-name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  id="reg-name"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-matric">Matric Number</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  id="reg-matric"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={matric}
                  onChange={(e) => setMatric(e.target.value)}
                  placeholder="e.g. 22/52HP123"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  id="reg-phone"
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +2348012345678"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  id="reg-password"
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label
                htmlFor="reg-class-rep"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem',
                  padding: '0.75rem 0.875rem',
                  background: isClassRep ? 'var(--primary-light)' : 'var(--bg-subtle)',
                  border: `1px solid ${isClassRep ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-fast), background var(--transition-fast)',
                }}
              >
                <input
                  id="reg-class-rep"
                  type="checkbox"
                  checked={isClassRep}
                  onChange={(e) => setIsClassRep(e.target.checked)}
                  style={{
                    marginTop: '0.1875rem',
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--primary)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <span>
                  <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                    Register as a Class Representative
                  </span>
                  <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Enables Class Rep controls to create courses, start sessions, and manage overrides.
                  </span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? <div className="spinner spinner-sm spinner-white" /> : 'Create Account'}
            </button>
          </form>

          {/* Footer Link */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Already registered? </span>
            <Link to="/login" style={{ fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
