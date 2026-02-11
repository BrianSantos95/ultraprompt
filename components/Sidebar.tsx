import React from 'react';
import {
  Home,
  ScanFace,
  Image as ImageIcon,
  User,
  ChevronRight,
  Zap
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  return (
    <aside className="fixed bottom-0 left-0 w-full h-16 lg:h-screen lg:w-64 lg:top-0 bg-black border-t lg:border-t-0 lg:border-r border-zinc-800 flex flex-row lg:flex-col transition-all duration-300 z-50">
      {/* Logo Area - Hidden on Mobile */}
      <div className="hidden lg:flex p-6 items-center justify-between cursor-pointer" onClick={() => onViewChange('home')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/5 relative">
            <Zap className="w-5 h-5 text-black fill-black" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">Ultra</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-row lg:flex-col items-center lg:items-stretch justify-around lg:justify-start px-2 lg:px-3 lg:py-6 space-x-2 lg:space-x-0 lg:space-y-2 overflow-visible lg:overflow-y-auto custom-scrollbar">
        <NavItem
          icon={<Home size={24} className="lg:w-5 lg:h-5" />}
          label="Início"
          active={currentView === 'home'}
          onClick={() => onViewChange('home')}
        />

        <NavItem
          icon={<ScanFace size={24} className="lg:w-5 lg:h-5" />}
          label="UltraPrompt"
          active={currentView === 'ultraprompt'}
          onClick={() => onViewChange('ultraprompt')}
        />

        <NavItem
          icon={<Zap size={24} className="lg:w-5 lg:h-5" />}
          label="UltraGen"
          active={currentView === 'ultragen'}
          onClick={() => onViewChange('ultragen')}
          badge="Novo"
        />

        <div className="pt-4 mt-4 border-t border-zinc-800 hidden lg:block">
          <NavItem
            icon={<User size={24} className="lg:w-5 lg:h-5" />}
            label="Planos"
            active={currentView === 'pricing'}
            onClick={() => onViewChange('pricing')}
          />
        </div>
      </nav>

      {/* User Mini Profile */}
      <div className="hidden lg:block p-4 border-t border-zinc-900">
        <UserProfile currentView={currentView} onViewChange={onViewChange} />
      </div>
    </aside>
  );
};

import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const UserProfile = ({ currentView, onViewChange }: any) => {
  const { user, credits, plan } = useAuth();

  if (!user) {
    return (
      <button
        onClick={() => onViewChange('login')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-sm font-medium text-zinc-300 hover:text-white transition-all"
      >
        <User size={16} /> Entrar / Cadastrar
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Credits Display */}
      <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <Zap size={14} className="text-orange-500 fill-orange-500" />
          Créditos
        </div>
        <span className="text-sm font-bold text-white">{credits}</span>
      </div>

      {/* Profile Info */}
      <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-900/50 transition-colors group relative">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-orange-900/20">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{user.email}</p>
          <p className="text-[10px] text-zinc-500 truncate capitalize">{plan || 'Free Plan'}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-all"
          title="Sair"
        >
          <LogOut size={14} />
        </button>
      </div>

      <button
        onClick={() => onViewChange('pricing')}
        className="w-full py-2 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
      >
        Fazer Upgrade
      </button>
    </div>
  );
};

const NavItem = ({ icon, label, active, badge, onClick }: any) => (
  <button
    onClick={onClick}
    className={`
    flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-2 lg:px-3 py-2 lg:py-3 rounded-xl transition-all group relative flex-1 lg:flex-none
    ${active
        ? 'lg:bg-white lg:text-black text-white font-medium'
        : 'text-zinc-500 hover:text-white lg:hover:bg-zinc-900'}
  `}>
    <div className={`${active ? 'text-white lg:text-black' : 'text-zinc-500 group-hover:text-white'} flex-shrink-0 transition-colors`}>
      {icon}
    </div>
    <span className={`text-[10px] lg:text-sm ${active ? 'text-white lg:text-black' : 'text-zinc-500 group-hover:text-white'} truncate`}>{label}</span>

    <div className="hidden lg:flex items-center gap-2 ml-auto">
      {badge && (
        <span className={`
          bg-zinc-800 border border-zinc-700
          text-zinc-300 font-medium text-[9px] px-2 py-0.5 rounded-md min-w-[20px] text-center uppercase tracking-wide
        `}>
          {badge}
        </span>
      )}

      {!badge && active && <ChevronRight size={14} className="text-black/50" />}
    </div>
  </button>
);