import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isPWA } from './utils/pwa';
import InstallPrompt from './components/InstallPrompt';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Attend from './pages/Attend';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const PWAGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (!isPWA() && !isDev) {
    return <InstallPrompt />;
  }

  return <>{children}</>;
};

const PWAVisibilityManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { refreshUser } = useAuth();

  React.useEffect(() => {
    let hiddenAt: number | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAt !== null) {
        const elapsed = Date.now() - hiddenAt;
        // Soft token revalidation after 15+ minutes in background
        // avoids spurious full-page reloads on normal tab switching
        if (elapsed > 15 * 60 * 1000) {
          refreshUser();
        }
        hiddenAt = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshUser]);

  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <PWAGate>
    <PWAVisibilityManager>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/attend/:sessionId" element={<ProtectedRoute><Attend /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PWAVisibilityManager>
  </PWAGate>
);

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <AppRoutes />
    </Router>
  </AuthProvider>
);

export default App;
