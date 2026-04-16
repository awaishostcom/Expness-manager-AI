import React, { useState, Suspense, lazy } from 'react';
import { ThemeProvider } from 'next-themes';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import { Toaster } from '../components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Income = lazy(() => import('./pages/Income').then(m => ({ default: m.Income })));
const Budgets = lazy(() => import('./pages/Budgets').then(m => ({ default: m.Budgets })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Ledger = lazy(() => import('./pages/Ledger').then(m => ({ default: m.Ledger })));
const Wallet = lazy(() => import('./pages/Wallet').then(m => ({ default: m.Wallet })));
const Staff = lazy(() => import('./pages/Staff').then(m => ({ default: m.Staff })));
const Business = lazy(() => import('./pages/Business').then(m => ({ default: m.Business })));
const Bills = lazy(() => import('./pages/Bills').then(m => ({ default: m.Bills })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export default function App() {
  const { user, loading, isAuthReady } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  if (!isAuthReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-primary/20 rounded-full" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthPage />
        <Toaster />
      </ThemeProvider>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'ledger': return <Ledger />;
      case 'wallet': return <Wallet />;
      case 'accounts': return <Accounts />;
      case 'expenses': return <Expenses />;
      case 'income': return <Income />;
      case 'budgets': return <Budgets />;
      case 'bills': return <Bills />;
      case 'staff': return <Staff />;
      case 'business': return <Business />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </Layout>
        <Toaster position="top-right" />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
