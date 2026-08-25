import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest, getDeviceFingerprint } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Phone, Lock, AlertCircle, FileText } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setUserProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [matric, setMatric] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
        device_fingerprint: fingerprint
      }, true);

      if (res.status === 'success') {
        localStorage.setItem('accessToken', res.access_token);
        localStorage.setItem('refreshToken', res.refresh_token);
        setUserProfile(res.user);
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
            <div className="icon-circle icon-circle-primary" style={{ margin: '0 auto 1rem' }}>
              <UserPlus size={24} />
            </div>
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
