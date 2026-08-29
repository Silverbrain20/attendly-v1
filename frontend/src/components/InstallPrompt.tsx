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
      width: '100%',
      background: 'radial-gradient(circle at 50% 0%, #2A0815 0%, #0F172A 70%, #020617 100%)',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '32px',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        padding: '2.5rem 2rem',
        boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(108, 0, 34, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Accent Header */}
        <div style={{
          position: 'absolute',
          top: '-70px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '220px',
          height: '140px',
          background: 'radial-gradient(circle, rgba(225, 29, 72, 0.4) 0%, rgba(108, 0, 34, 0) 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none'
        }} />

        {/* Official Logo & Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem', position: 'relative' }}>
          <Logo size="xl" showText variant="white" animatePulse />
        </div>

        {/* Security Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          color: '#FDA4AF',
          fontSize: '0.8125rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: '1.25rem'
        }}>
          <Sparkles size={15} /> Official Mobile App Required
        </div>

        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 800,
          marginBottom: '0.75rem',
          letterSpacing: '-0.5px',
          color: '#FFFFFF',
          lineHeight: '1.2'
        }}>
          Install Attendly App
        </h1>

        <p style={{
          color: '#94A3B8',
          fontSize: '0.9375rem',
          lineHeight: '1.6',
          marginBottom: '1.75rem',
          maxWidth: '380px'
        }}>
          To ensure geo-fencing accuracy and device-locked security, Attendly must be installed on your device.
        </p>

        {/* Feature Highlights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.875rem',
          width: '100%',
          marginBottom: '1.75rem',
          textAlign: 'left'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '18px',
            padding: '1rem'
          }}>
            <ShieldCheck size={22} color="#F43F5E" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F8FAFC' }}>Device Security</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px', lineHeight: '1.4' }}>Account bound to your device</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '18px',
            padding: '1rem'
          }}>
            <CheckCircle2 size={22} color="#38BDF8" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F8FAFC' }}>1-Tap Check-in</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px', lineHeight: '1.4' }}>Fast GPS geo verification</div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4px',
          borderRadius: '16px',
          marginBottom: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={() => setActiveTab('android')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '12px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'android' ? 'linear-gradient(135deg, #6C0022 0%, #991B1B 100%)' : 'transparent',
              color: activeTab === 'android' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'android' ? '0 4px 12px rgba(108, 0, 34, 0.4)' : 'none'
            }}
          >
            Android
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '12px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'ios' ? 'linear-gradient(135deg, #6C0022 0%, #991B1B 100%)' : 'transparent',
              color: activeTab === 'ios' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'ios' ? '0 4px 12px rgba(108, 0, 34, 0.4)' : 'none'
            }}
          >
            iPhone / iPad
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '12px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'desktop' ? 'linear-gradient(135deg, #6C0022 0%, #991B1B 100%)' : 'transparent',
              color: activeTab === 'desktop' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'desktop' ? '0 4px 12px rgba(108, 0, 34, 0.4)' : 'none'
            }}
          >
            Desktop
          </button>
        </div>

        {/* Instruction Cards based on activeTab */}
        <div style={{
          width: '100%',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '1.35rem',
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
                <li>Open <strong>Attendly</strong> from your home screen to sign in.</li>
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
                  <li>Open <strong>Attendly</strong> from your home screen to sign in.</li>
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
                Click the <strong>Install Icon (⊕)</strong> located on the right side of your Chrome or Edge address bar to install Attendly.
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.75rem', fontSize: '0.75rem', color: '#64748B' }}>
          &copy; Attendly Geo-Verified Attendance Platform
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
