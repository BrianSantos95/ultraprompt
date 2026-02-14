import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { UltraPromptView } from './components/UltraPromptView';
import { UltraGenView } from './components/UltraGenView';
import { Pricing } from './components/Pricing';
import Login from './components/auth/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminDashboard } from './components/admin/AdminDashboard';

type View = 'home' | 'ultraprompt' | 'ultragen' | 'pricing' | 'login';

// Wrap content to use AuthContext
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View | 'admin'>('login'); // Start with login/loading state

  // Listen for URL changes
  React.useEffect(() => {
    const handlePathChange = () => {
      const path = window.location.pathname.slice(1);
      const validViews = ['home', 'ultraprompt', 'ultragen', 'pricing', 'login', 'admin'];

      if (path === '' || path === '/') {
        // If logged in, go home, else login
        setCurrentView(user ? 'home' : 'login');
      } else if (validViews.includes(path)) {
        setCurrentView(path as View | 'admin');
      }
    };

    handlePathChange();
    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, [user]); // Re-run when user status becomes known

  // Auth Redirect Logic
  React.useEffect(() => {
    if (!loading) {
      if (user) {
        // If logged in and on login page, go home
        if (currentView === 'login') {
          handleNavigation('home');
        }
      } else {
        // If not logged in, force login (unless on simple public pages if any)
        // Assuming Home is protected for now based on user flow
        if (currentView !== 'login' && currentView !== 'pricing') {
          handleNavigation('login');
        }
      }
    }
  }, [user, loading, currentView]);

  const handleNavigation = (view: View | 'admin') => {
    setCurrentView(view);
    const path = view === 'home' ? '/' : `/${view}`;
    window.history.pushState({}, '', path);
  };

  const renderView = () => {
    if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

    switch (currentView) {
      case 'home':
        return <Home onNavigate={handleNavigation} />;
      case 'ultraprompt':
        return <UltraPromptView onNavigate={handleNavigation} />;
      case 'ultragen':
        return <UltraGenView onNavigate={handleNavigation} />;
      case 'pricing':
        return <Pricing />;
      case 'login':
        return <Login />; // Login component handles its own internal "onSuccess" usually, or we watch "user" change
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Home onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* Sidebar only visible if logged in, OR we can show it always but locked. 
            Standard: Show sidebar if user exists. */}
      {user && <Sidebar currentView={currentView} onViewChange={handleNavigation} />}

      <main className={`flex-1 ${user ? 'ml-0 lg:ml-64 pb-24 lg:pb-8 p-4 lg:p-8' : 'p-0'} flex items-center justify-center min-h-screen relative overflow-hidden`}>
        {/* Subtle Background Effect */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none -z-10"></div>

        <div className="w-full max-w-7xl mx-auto z-10">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;