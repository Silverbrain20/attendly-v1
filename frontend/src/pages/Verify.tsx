import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiRequest, getDeviceFingerprint } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';

const Verify: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUserProfile } = useAuth();

  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'email';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (type === 'email') {
        const res = await apiRequest('POST', '/api/auth/verify-email', { email, otp }, true);
        if (res.status === 'success') {
          setSuccess('Email successfully verified! Redirecting to login...');
          setTimeout(() => navigate('/login'), 2000);
        }
      } else {
        const fingerprint = getDeviceFingerprint();
        const res = await apiRequest('POST', '/api/auth/verify-device', {
          email,
          otp,
          device_fingerprint: fingerprint
        }, true);
        
        if (res.status === 'success') {
          localStorage.setItem('accessToken', res.access_token);
          localStorage.setItem('refreshToken', res.refresh_token);
          localStorage.setItem('user', JSON.stringify(res.user));
          setUserProfile(res.user);
          setSuccess('Device verified successfully! Loading dashboard...');
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email) return;
    setResending(true);
    setError('');
    setSuccess('');
    try {
      await apiRequest('POST', '/api/auth/resend-otp', { email, type }, true);
      setSuccess('A new verification code has been sent!');
      setCooldown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page-center">
      <div className="auth-card animate-slideUp">
        <div className="card" style={{ textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ margin: '0 auto 1.25rem', display: 'inline-flex', justifyContent: 'center' }}>
            <Logo size="lg" animatePulse />
          </div>

          <h2 style={{ marginBottom: '0.375rem' }}>
            {type === 'device' ? 'Device Verification' : 'Verify your email'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9375rem' }}>
            We sent a 6-digit verification code to<br />
            <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>

          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            textAlign: 'left'
          }}>
            💡 <strong>Didn't see the email?</strong> Please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
          </div>


          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger" style={{ textAlign: 'left' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success" style={{ textAlign: 'left' }}>
              <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{success}</span>
            </div>
          )}

          {/* OTP Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="otp-input" style={{ textAlign: 'left' }}>Verification Code</label>
              <input
                id="otp-input"
                type="text"
                maxLength={6}
                className="form-input"
                style={{
                  textAlign: 'center',
                  fontSize: '1.75rem',
                  letterSpacing: '8px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  padding: '0.75rem'
                }}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || otp.length !== 6}
            >
              {loading ? <div className="spinner spinner-sm spinner-white" /> : 'Verify Code'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Didn't receive code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              style={{
                background: 'none',
                border: 'none',
                color: cooldown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                fontWeight: 600,
                cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify;
