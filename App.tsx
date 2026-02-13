import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { UltraPromptView } from './components/UltraPromptView';
import { UltraGenView } from './components/UltraGenView';
import { Pricing } from './components/Pricing';
import Login from './components/auth/Login';
import { AuthProvider } from './contexts/AuthContext';
import { AdminDashboard } from './components/admin/AdminDashboard';

type View = 'home' | 'ultraprompt' | 'ultragen' | 'pricing' | 'login';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View | 'admin'>('home');

  // Listen for URL changes (Back/Forward arrows)
  React.useEffect(() => {
    const handlePathChange = () => {
      // Extract view from path (e.g. "/ultragen" -> "ultragen")
      const path = window.location.pathname.slice(1); // remove leading slash
      const validViews = ['home', 'ultraprompt', 'ultragen', 'pricing', 'login', 'admin'];

      if (path === '' || path === '/') {
        setCurrentView('home');
      } else if (validViews.includes(path)) {
        setCurrentView(path as View | 'admin');
      }
    };

    // Handle initial load
    handlePathChange();

    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  // Handle navigation and update URL without #
  const handleNavigation = (view: View | 'admin') => {
    setCurrentView(view);
    const path = view === 'home' ? '/' : `/${view}`;
    window.history.pushState({}, '', path);
  };

  const renderView = () => {
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
        return <Login />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Home onNavigate={handleNavigation} />;
    }
  };

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">

        {/* Fixed Sidebar */}
        <Sidebar currentView={currentView} onViewChange={handleNavigation} />

        {/* Main Content Area */}
        <main className="flex-1 ml-0 lg:ml-64 pb-24 lg:pb-8 p-4 lg:p-8 flex items-center justify-center min-h-screen relative overflow-hidden">
          {/* Subtle Background Effect */}
          <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none -z-10"></div>

          <div className="w-full max-w-7xl mx-auto z-10">
            {renderView()}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;