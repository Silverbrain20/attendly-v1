import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Shield, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';

const phrases = [
  'verified by location.',
  'captured in seconds.',
  'protected from proxies.'
];

const Landing: React.FC = () => {
  const { user } = useAuth();

  // Typewriter state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = phrases[phraseIndex];

    const handleTyping = () => {
      if (!isDeleting) {
        // Typing forward
        setCurrentText(fullText.substring(0, currentText.length + 1));

        if (currentText === fullText) {
          // Pause at full word before deleting
          setTimeout(() => setIsDeleting(true), 2200);
          return;
        }
      } else {
        // Deleting backward
        setCurrentText(fullText.substring(0, currentText.length - 1));

        if (currentText === '') {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
          return;
        }
      }
    };

    const speed = isDeleting ? 45 : 85;
    const timer = setTimeout(handleTyping, speed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIndex]);

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="nav-logo" style={{ textDecoration: 'none' }}>
            <Logo showText size="sm" />
          </Link>
          <div className="nav-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ flexGrow: 1 }}>
        <section style={{ padding: '5.5rem 1.5rem 4.5rem', textAlign: 'center', background: 'var(--bg)' }}>
          <div className="animate-slideUp" style={{ maxWidth: '780px', margin: '0 auto' }}>



            {/* Typewriter Hero Headline */}
            <h1 style={{
              fontSize: 'clamp(2.2rem, 5.5vw, 3.5rem)',
              lineHeight: 1.2,
              marginBottom: '1.5rem',
              minHeight: '2.4em',
              fontWeight: 800
            }}>
              Class attendance,{' '}
              <br className="hide-mobile" />
              <span style={{ color: 'var(--primary)', position: 'relative' }}>
                {currentText}
                <span className="typewriter-cursor" />
              </span>
            </h1>

            <p style={{ fontSize: '1.125rem', maxWidth: '580px', margin: '0 auto 2.5rem', color: 'var(--text-secondary)' }}>
              Attendly uses secure GPS geofencing to capture authentic physical check-ins. No sheets, no proxies.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {user ? (
                <Link to="/dashboard" className="btn btn-primary btn-lg">
                  Go to Dashboard <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    Get Started <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" className="btn btn-secondary btn-lg">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '4.5rem 1.5rem', background: 'var(--bg-page)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2>How it works</h2>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Three layers of verification keep attendance authentic.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {/* Feature 1 */}
              <div className="card" style={{ background: 'var(--bg)' }}>
                <div className="feature-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <MapPin size={22} />
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>GPS Geofencing</h3>
                <p style={{ fontSize: '0.9375rem' }}>
                  Students must be physically within the lecture hall's 100m geofence to mark attendance. Verified with high-precision coordinates.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="card" style={{ background: 'var(--bg)' }}>
                <div className="feature-icon" style={{ background: '#F0FDF4', color: 'var(--success)' }}>
                  <Shield size={22} />
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Anti-Proxy Defense</h3>
                <p style={{ fontSize: '0.9375rem' }}>
                  Device fingerprinting, login rate limiting, and OTP email challenges guard against proxy attendance and credential sharing.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="card" style={{ background: 'var(--bg)' }}>
                <div className="feature-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                  <Clock size={22} />
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Audit Trails</h3>
                <p style={{ fontSize: '0.9375rem' }}>
                  Immutable override logs with a 10-cap limit per session. Automatic flagging for review when thresholds are reached.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Built for Students — Well Centered, No Dashes */}
        <section style={{ padding: '4.5rem 1.5rem', background: 'var(--bg)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '2.5rem', fontSize: '2rem' }}>Built for students</h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem'
            }}>
              {[
                'Mark attendance in seconds just scan and confirm',
                'Track your attendance rate across all enrolled courses',
                'Get warnings when your attendance drops below 75%',
                'Works on any device with a browser no app downloads',
                'Class reps can export attendance data as CSV anytime',
              ].map((text, i) => (
                <div
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.875rem',
                    padding: '0.875rem 1.5rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    width: '100%',
                    maxWidth: '560px',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <CheckCircle size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.9375rem', textAlign: 'center' }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 1.5rem', textAlign: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          &copy; {new Date().getFullYear()} Attendly. Designed for secure, zero-cost attendance infrastructure.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
