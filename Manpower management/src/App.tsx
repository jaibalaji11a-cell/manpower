import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceCreate from './pages/InvoiceCreate';
import WorkDetails from './pages/WorkDetails';
import Clients from './pages/Clients';
import Workers from './pages/Workers';
import WorkerProfile from './pages/WorkerProfile';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import ProfitTracker from './pages/extras/ProfitTracker';
import SalaryCalculator from './pages/extras/SalaryCalculator';
import PaymentReminders from './pages/extras/PaymentReminders';
import CommissionCalc from './pages/extras/CommissionCalc';
import ClientPortal from './pages/ClientPortal';
import WorkerRegistration from './pages/WorkerRegistration';
import WorkerRegistrationSuccess from './pages/WorkerRegistrationSuccess';
import MapIntelligence from './pages/MapIntelligence';
import WorkerDirectory from './pages/WorkerDirectory';
import WorkerAnalytics from './pages/WorkerAnalytics';
import QRManager from './pages/QRManager';

import SplashScreen from './components/Common/SplashScreen';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  // Close sidebar on path change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return <SplashScreen minDuration={4000} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* Public Client Portal — no login required */}
      <Route path="/portal/:clientId" element={<ClientPortal />} />
      {/* Public Worker Registration — no login required */}
      <Route path="/register" element={<WorkerRegistration />} />
      <Route path="/register/success/:docId" element={<WorkerRegistrationSuccess />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedLayout>
            <Invoices />
          </ProtectedLayout>
        }
      />
      <Route
        path="/invoices/new"
        element={
          <ProtectedLayout>
            <InvoiceCreate />
          </ProtectedLayout>
        }
      />
      <Route
        path="/invoices/:id/edit"
        element={
          <ProtectedLayout>
            <InvoiceCreate />
          </ProtectedLayout>
        }
      />
      <Route
        path="/work-details"
        element={
          <ProtectedLayout>
            <WorkDetails />
          </ProtectedLayout>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedLayout>
            <Clients />
          </ProtectedLayout>
        }
      />
      <Route
        path="/workers"
        element={
          <ProtectedLayout>
            <Workers />
          </ProtectedLayout>
        }
      />
      <Route
        path="/workers/:id"
        element={
          <ProtectedLayout>
            <WorkerProfile />
          </ProtectedLayout>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedLayout>
            <Payments />
          </ProtectedLayout>
        }
      />
      <Route
        path="/profit-tracker"
        element={
          <ProtectedLayout>
            <ProfitTracker />
          </ProtectedLayout>
        }
      />
      <Route
        path="/salary-calc"
        element={
          <ProtectedLayout>
            <SalaryCalculator />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reminders"
        element={
          <ProtectedLayout>
            <PaymentReminders />
          </ProtectedLayout>
        }
      />
      <Route
        path="/commission"
        element={
          <ProtectedLayout>
            <CommissionCalc />
          </ProtectedLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <Settings />
          </ProtectedLayout>
        }
      />
      {/* Worker Intelligence */}
      <Route
        path="/map"
        element={
          <ProtectedLayout>
            <MapIntelligence />
          </ProtectedLayout>
        }
      />
      <Route
        path="/worker-directory"
        element={
          <ProtectedLayout>
            <WorkerDirectory />
          </ProtectedLayout>
        }
      />
      <Route
        path="/worker-analytics"
        element={
          <ProtectedLayout>
            <WorkerAnalytics />
          </ProtectedLayout>
        }
      />
      <Route
        path="/qr-manager"
        element={
          <ProtectedLayout>
            <QRManager />
          </ProtectedLayout>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <SplashScreen minDuration={4000} />
          <AppRoutes />
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
