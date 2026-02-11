import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { UltraPromptView } from './components/UltraPromptView';
import { UltraGenView } from './components/UltraGenView';

type View = 'home' | 'ultraprompt' | 'ultragen';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Home onNavigate={setCurrentView} />;
      case 'ultraprompt':
        return <UltraPromptView />;
      case 'ultragen':
        return <UltraGenView />;
      default:
        return <Home onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">

      {/* Fixed Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 ml-0 lg:ml-64 pb-24 lg:pb-8 p-4 lg:p-8 flex items-center justify-center min-h-screen relative overflow-hidden">
        {/* Subtle Background Effect */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none -z-10"></div>

        <div className="w-full max-w-7xl mx-auto z-10">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;