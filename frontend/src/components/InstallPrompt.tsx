import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { Smartphone, Download, Share, PlusSquare, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('android');
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  useEffect(() => {
    if (isIOS) {
      setActiveTab('ios');
    }
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setActiveTab('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [isIOS]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      window.location.reload();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #2A0815 0%, #0F172A 70%, #020617 100%)',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem 1rem',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '28px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(108, 0, 34, 0.2)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Accent Header */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(225, 29, 72, 0.35) 0%, rgba(108, 0, 34, 0) 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }} />

        {/* Logo */}
        <div style={{ display: 'inline-flex', marginBottom: '1.25rem', position: 'relative' }}>
          <Logo size="lg" animatePulse />
        </div>

        {/* Tagline Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 14px',
          borderRadius: '9999px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#FDA4AF',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: '1rem'
        }}>
          <Sparkles size={14} /> Official App Required
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          marginBottom: '0.625rem',
          letterSpacing: '-0.5px',
          color: '#FFFFFF'
        }}>
          Install Attendly
        </h1>

        <p style={{
          color: '#94A3B8',
          fontSize: '0.9375rem',
          lineHeight: '1.6',
          marginBottom: '1.75rem'
        }}>
          Attendly requires the installed application to enable device security, lock your account to your phone, and mark attendance.
        </p>

        {/* Feature Highlights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '1.75rem',
          textAlign: 'left'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '0.875rem'
          }}>
            <ShieldCheck size={20} color="#F43F5E" style={{ marginBottom: '0.375rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#F8FAFC' }}>Device Security</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>Account locked to phone</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '0.875rem'
          }}>
            <CheckCircle2 size={20} color="#38BDF8" style={{ marginBottom: '0.375rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#F8FAFC' }}>Instant Check-in</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>1-Tap QR check-in</div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4px',
          borderRadius: '14px',
          marginBottom: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            onClick={() => setActiveTab('android')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'android' ? '#6C0022' : 'transparent',
              color: activeTab === 'android' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease'
            }}
          >
            Android
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'ios' ? '#6C0022' : 'transparent',
              color: activeTab === 'ios' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease'
            }}
          >
            iPhone / iPad
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'desktop' ? '#6C0022' : 'transparent',
              color: activeTab === 'desktop' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease'
            }}
          >
            Desktop
          </button>
        </div>

        {/* Instruction Cards based on activeTab */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '1.25rem',
          textAlign: 'left'
        }}>
          {activeTab === 'ios' && (
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={18} /> Safari Setup Steps:
              </div>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#CBD5E1', lineHeight: '1.8' }}>
                <li>Tap the <strong style={{ color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Share size={14} /> Share</strong> icon at the bottom of Safari.</li>
                <li>Scroll down and select <strong style={{ color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><PlusSquare size={14} /> Add to Home Screen</strong>.</li>
                <li>Open <strong>Attendly</strong> from your home screen to log in.</li>
              </ol>
            </div>
          )}

          {activeTab === 'android' && (
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={18} /> Android Setup Steps:
              </div>
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #6C0022 0%, #991B1B 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.625rem',
                    boxShadow: '0 10px 25px -5px rgba(108, 0, 34, 0.6)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Download size={18} /> Add to Home Screen
                </button>
              ) : (
                <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#CBD5E1', lineHeight: '1.8' }}>
                  <li>Tap the <strong>Chrome menu (⋮)</strong> top-right.</li>
                  <li>Tap <strong style={{ color: '#4ADE80' }}>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>Open <strong>Attendly</strong> from your home screen to log in.</li>
                </ol>
              )}
            </div>
          )}

          {activeTab === 'desktop' && (
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', color: '#F43F5E' }}>
                Desktop Setup Steps:
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#CBD5E1', lineHeight: '1.6' }}>
                Click the <strong>Install Icon (⊕)</strong> located in the right side of your Chrome or Edge address bar to install Attendly.
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#64748B' }}>
          &copy; Attendly Geo-Verified Attendance Platform
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
