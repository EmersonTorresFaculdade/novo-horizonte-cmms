import React from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = () => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile Menu Toggle Button (Floating) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 text-slate-700 hover:text-primary transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      )}

      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;