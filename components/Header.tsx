import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, HelpCircle, Plus } from 'lucide-react';
import NotificationBell from './NotificationBell';
import FeedbackModal from './FeedbackModal';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="h-20 flex items-center justify-between px-6 md:px-10 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden text-slate-500 hover:text-primary"
          >
            <Menu size={24} />
          </button>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">
            Visão Geral
          </h2>
        </div>

        <div className="flex items-center gap-6">
          {/* Search Bar - Removed */}
          <div className="hidden md:flex items-center relative w-80">
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            <button
              onClick={() => setShowHelp(true)}
              className="p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title="Ajuda"
            >
              <HelpCircle size={20} />
            </button>
          </div>

          <button
            onClick={() => navigate('/work-orders/new')}
            className="bg-primary hover:bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all"
          >
            <Plus size={20} />
            <span>Novo Chamado</span>
          </button>
        </div>
      </header>

      <FeedbackModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        type="info"
        title="Central de Ajuda"
        message="Para suporte, entre em contato com o administrador do sistema ou consulte a documentação na intranet.\n\nVersão do Sistema: 1.0.0"
      />
    </>
  );
};

export default Header;