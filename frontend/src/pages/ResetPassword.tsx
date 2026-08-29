import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { AlertCircle, CheckCircle, Lock, Mail, FileText } from 'lucide-react';
import Logo from '../components/Logo';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  const [matric, setMatric] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await apiRequest('POST', '/api/auth/forgot-password', {
        matric_number: matric,
        email
      }, true);
      
      if (res.status === 'success') {
        setSuccess('Password reset code sent to your email.');
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Make sure your matric number and email match.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('POST', '/api/auth/reset-password', {
        email,
        matric_number: matric,
        otp,
        new_password: newPassword
      }, true);
      
      if (res.status === 'success') {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your reset code.');
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
            <h2 style={{ marginBottom: '0.25rem' }}>Reset password</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              {step === 1 ? 'Enter your account details' : 'Enter the 6-digit code and your new password'}
            </p>
          </div>

          {/* Step Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 600,
              background: 'var(--primary)', color: 'var(--text-inverse)'
            }}>1</div>
            <div style={{ width: '40px', height: '2px', background: step === 2 ? 'var(--primary)' : 'var(--border)' }} />
            <div style={{
              width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 600,
              background: step === 2 ? 'var(--primary)' : 'var(--bg-muted)',
              color: step === 2 ? 'var(--text-inverse)' : 'var(--text-muted)'
            }}>2</div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{success}</span>
            </div>
          )}

          {/* Step 1: Request OTP */}
          {step === 1 ? (
            <form onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-matric">Matric Number</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                  <input
                    id="reset-matric"
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={matric}
                    onChange={(e) => setMatric(e.target.value)}
                    placeholder="e.g. CSC/2022/001"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                  <input
                    id="reset-email"
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

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <div className="spinner spinner-sm spinner-white" /> : 'Send Reset Code'}
              </button>
            </form>
          ) : (
            /* Step 2: Reset Password */
            <form onSubmit={handleResetPassword}>
              <div style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.625rem 0.875rem',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)'
              }}>
                💡 <strong>Check your email:</strong> If you don't find the code, please check your <strong>Spam</strong> folder.
              </div>

              <div className="form-group">

                <label className="form-label" htmlFor="reset-otp">Reset Code</label>
                <input
                  id="reset-otp"
                  type="text"
                  maxLength={6}
                  className="form-input"
                  style={{ textAlign: 'center', letterSpacing: '6px', fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reset-newpw">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                  <input
                    id="reset-newpw"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reset-confirmpw">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                  <input
                    id="reset-confirmpw"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <div className="spinner spinner-sm spinner-white" /> : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
            <Link to="/login" style={{ fontWeight: 600 }}>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
