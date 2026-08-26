import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Compass, CheckCircle, XCircle, MapPin, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';

type AttendState = 'loading' | 'locating' | 'verifying' | 'success' | 'error';

const Attend: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, isLoading: authLoading } = useAuth();

  const [state, setState] = useState<AttendState>('loading');
  const [session, setSession] = useState<any>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.href = `/login?redirect=/attend/${sessionId}`;
      return;
    }
    if (hasStarted.current) return;
    hasStarted.current = true;
    loadSession();
  }, [sessionId, user, authLoading]);

  const loadSession = async () => {
    try {
      const res = await apiRequest('GET', `/api/sessions/${sessionId}`);
      const sessionData = res.data;

      const isExpired = new Date(sessionData.end_time) < new Date() || sessionData.ended_at !== null;
      if (isExpired) {
        setState('error');
        setErrorMsg('This attendance session has already expired or has been closed.');
        return;
      }

      setSession(sessionData);
      setState('locating');
      triggerLocationCheck();
    } catch (e: any) {
      setState('error');
      setErrorMsg(e.message || 'Failed to verify session details.');
    }
  };

  const triggerLocationCheck = () => {
    if (!navigator.geolocation) {
      setState('error');
      setErrorMsg('Your browser does not support geolocation. Please try a different device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setState('verifying');
        try {
          const markRes = await apiRequest('POST', '/api/attendance/mark', {
            session_id: sessionId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

          setDistance(markRes.distance_meters);
          setState('success');
        } catch (e: any) {
          setState('error');
          setErrorMsg(e.message || 'Failed to verify geolocation check-in.');
        }
      },
      (error) => {
        setState('error');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMsg('Location permission denied. Grant GPS access to verify check-in.');
            break;
          case error.TIMEOUT:
            setErrorMsg('GPS timed out. Try refreshing or moving closer to a window.');
            break;
          default:
            setErrorMsg('An error occurred while acquiring device coordinates.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleRetry = () => {
    setState('locating');
    triggerLocationCheck();
  };

  return (
    <div className="page-center">
      <div className="auth-card animate-slideUp" style={{ maxWidth: '460px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
            <Logo showText size="sm" />
          </div>

          {state === 'loading' && (
            <div style={{ padding: '2rem 0' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 1.5rem' }} />
              <h3>Validating session...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Checking session availability
              </p>
            </div>
          )}

          {(state === 'locating' || state === 'verifying') && (
            <div style={{ padding: '2rem 0' }}>
              <div style={{
                width: '140px', height: '140px', borderRadius: '50%',
                border: '2px solid var(--border)',
                margin: '0 auto 2rem',
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-subtle)'
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, var(--primary) 0deg, transparent 90deg, transparent 360deg)',
                  opacity: 0.15,
                  animation: 'radarSweep 2s linear infinite'
                }} />
                <div style={{
                  position: 'absolute', width: '85%', height: '85%', borderRadius: '50%',
                  border: '1.5px solid var(--primary-50)',
                  animation: 'radarPing 2s ease-in-out infinite'
                }} />
                <Compass size={36} className="animate-pulse" style={{ color: 'var(--primary)' }} />
              </div>

              <h3>{state === 'locating' ? 'Locating your device...' : 'Verifying geofence...'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '280px', margin: '0.5rem auto 0' }}>
                Make sure your browser has GPS/location permissions enabled.
              </p>
            </div>
          )}

          {state === 'success' && (
            <div style={{ padding: '2rem 0' }}>
              <div className="icon-circle icon-circle-success" style={{ margin: '0 auto 1.25rem', width: '64px', height: '64px' }}>
                <CheckCircle size={32} />
              </div>
              <h2 style={{ color: 'var(--success)', marginBottom: '0.375rem' }}>Check-in successful</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                {session?.course_code} — {session?.course_title}
              </p>

              {distance !== null && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
                  marginBottom: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)'
                }}>
                  <MapPin size={16} style={{ color: 'var(--primary)' }} />
                  Distance: <strong style={{ color: 'var(--text)' }}>{distance.toFixed(1)}m</strong>
                </div>
              )}

              <Link to="/dashboard" className="btn btn-primary btn-full btn-lg">
                Go to Dashboard
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div style={{ padding: '2rem 0' }}>
              <div className="icon-circle icon-circle-danger" style={{ margin: '0 auto 1.25rem', width: '64px', height: '64px' }}>
                <XCircle size={32} />
              </div>
              <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Verification failed</h2>

              <div className="alert alert-danger" style={{ textAlign: 'left', marginBottom: '2rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{errorMsg}</span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleRetry} className="btn btn-primary" style={{ flex: 1 }}>
                  Retry
                </button>
                <Link to="/dashboard" className="btn btn-secondary">
                  Cancel
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Attend;
