import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { Smartphone, Download, Share, PlusSquare, ShieldCheck, CheckCircle2 } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

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
      backgroundColor: '#0F172A',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#1E293B',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }}>
        {/* Logo Banner */}
        <div style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
          <Logo size="lg" animatePulse />
        </div>

        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
          Install Attendly App
        </h1>

        <p style={{ color: '#94A3B8', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
          Attendly requires the installed PWA application to mark attendance and secure your account with device binding.
        </p>

        {/* Security Feature Highlights */}
        <div style={{
          backgroundColor: 'rgba(108, 0, 34, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          textAlign: 'left',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
            <ShieldCheck size={20} color="#F43F5E" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#FFF1F2' }}>Device Security Enabled</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#FDA4AF', lineHeight: 1.4 }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>Prevents proxy attendance and locks your account to your mobile phone.</span>
          </div>
        </div>

        {/* Install Actions */}
        {isIOS ? (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.25rem',
            textAlign: 'left'
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={18} color="#38BDF8" /> iOS Installation Instructions:
            </h3>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#CBD5E1', lineHeight: '1.7' }}>
              <li>Tap the <strong style={{ color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Share size={14} /> Share</strong> button in Safari.</li>
              <li>Scroll down and tap <strong style={{ color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><PlusSquare size={14} /> Add to Home Screen</strong>.</li>
              <li>Open the installed <strong>Attendly</strong> app on your home screen.</li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            style={{
              width: '100%',
              padding: '0.875rem 1.5rem',
              backgroundColor: '#6C0022',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              boxShadow: '0 10px 20px -5px rgba(108, 0, 34, 0.5)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={20} /> Install Attendly App
          </button>
        ) : (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.25rem',
            fontSize: '0.875rem',
            color: '#CBD5E1',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: 0 }}>
              💡 Open this page in <strong>Chrome</strong> or <strong>Edge</strong> on your phone and tap <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong> from the browser menu.
            </p>
          </div>
        )}

        <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#64748B' }}>
          &copy; Attendly Geo-Verified Attendance System.
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
