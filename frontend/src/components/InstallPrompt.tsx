import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, ShieldCheck, CheckCircle2, Monitor } from 'lucide-react';

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
      background: '#0B0F19',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      WebkitFontSmoothing: 'antialiased'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: '#151D2A',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '2.25rem 2rem',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Main Logo & Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'rgba(108, 0, 34, 0.25)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src="/icon.svg" alt="Attendly Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>
          
          <h2 style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontWeight: 800,
            fontSize: '1.75rem',
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            margin: 0,
            lineHeight: 1
          }}>
            Attend<span style={{ color: '#F43F5E' }}>ly</span>
          </h2>
        </div>

        {/* Clean Status Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 12px',
          borderRadius: '9999px',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          color: '#F43F5E',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.3px',
          textTransform: 'uppercase',
          marginBottom: '1rem'
        }}>
          App Installation Required
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          color: '#FFFFFF',
          lineHeight: '1.3'
        }}>
          Install Attendly
        </h1>

        <p style={{
          color: '#94A3B8',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          marginBottom: '1.5rem',
          maxWidth: '360px'
        }}>
          Attendly requires device installation to support GPS location verification and single-device account locking.
        </p>

        {/* Feature Highlights Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          width: '100%',
          marginBottom: '1.5rem',
          textAlign: 'left'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '0.875rem'
          }}>
            <ShieldCheck size={20} color="#F43F5E" style={{ marginBottom: '0.375rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F8FAFC' }}>Device Security</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px', lineHeight: '1.3' }}>Bound to your device</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '0.875rem'
          }}>
            <CheckCircle2 size={20} color="#38BDF8" style={{ marginBottom: '0.375rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F8FAFC' }}>GPS Verification</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px', lineHeight: '1.3' }}>Instant class check-in</div>
          </div>
        </div>

        {/* Platform Tab Navigation */}
        <div
          role="tablist"
          aria-label="Platform installation guides"
          style={{
            display: 'flex',
            width: '100%',
            background: '#0B0F19',
            padding: '3px',
            borderRadius: '12px',
            marginBottom: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <button
            role="tab"
            aria-selected={activeTab === 'android'}
            onClick={() => setActiveTab('android')}
            style={{
              flex: 1,
              minHeight: '38px',
              padding: '6px 0',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'android' ? '#6C0022' : 'transparent',
              color: activeTab === 'android' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            Android
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'ios'}
            onClick={() => setActiveTab('ios')}
            style={{
              flex: 1,
              minHeight: '38px',
              padding: '6px 0',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'ios' ? '#6C0022' : 'transparent',
              color: activeTab === 'ios' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            iPhone / iPad
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'desktop'}
            onClick={() => setActiveTab('desktop')}
            style={{
              flex: 1,
              minHeight: '38px',
              padding: '6px 0',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'desktop' ? '#6C0022' : 'transparent',
              color: activeTab === 'desktop' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            Desktop
          </button>
        </div>

        {/* Tab Content Box */}
        <div style={{
          width: '100%',
          background: 'rgba(11, 15, 25, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '1.25rem',
          textAlign: 'left'
        }}>
          {activeTab === 'ios' && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.625rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={16} /> Safari Setup Steps:
              </div>
              <ol style={{ margin: 0, paddingLeft: '1.125rem', fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: '1.7' }}>
                <li>Tap the <strong style={{ color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Share size={13} /> Share</strong> icon in Safari.</li>
                <li>Select <strong style={{ color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><PlusSquare size={13} /> Add to Home Screen</strong>.</li>
                <li>Open <strong>Attendly</strong> from your home screen.</li>
              </ol>
            </div>
          )}

          {activeTab === 'android' && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.625rem', color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} /> Android Setup Steps:
              </div>
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '0.75rem 1.25rem',
                    background: '#6C0022',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'background 0.2s ease',
                    outline: 'none'
                  }}
                >
                  <Download size={16} /> Add to Home Screen
                </button>
              ) : (
                <ol style={{ margin: 0, paddingLeft: '1.125rem', fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: '1.7' }}>
                  <li>Tap the <strong>Chrome menu (⋮)</strong> top-right.</li>
                  <li>Tap <strong style={{ color: '#4ADE80' }}>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>Open <strong>Attendly</strong> from your home screen.</li>
                </ol>
              )}
            </div>
          )}

          {activeTab === 'desktop' && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: '#F43F5E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Monitor size={16} /> Desktop Setup Steps:
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: '1.5' }}>
                Click the <strong>Install Icon (⊕)</strong> in your Chrome or Edge address bar to install Attendly.
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
