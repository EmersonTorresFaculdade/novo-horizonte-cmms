import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  Factory,
  Users,
  Package,
  BarChart3,
  Settings,
  CalendarDays,
  ChevronDown,
  LogOut,
  User,
  Bell
} from 'lucide-react';
import { IMAGES } from '../constants';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationsContext';



const Sidebar = () => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { profile } = useProfile();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { unreadCount } = useNotifications();

  // Função para obter label do role
  const getRoleLabel = () => {
    if (!user) return 'Usuário';

    switch (user.role) {
      case 'admin_root':
        return 'Admin Root';
      case 'admin':
        return 'Admin Industrial';
      case 'user':
        return 'Usuário';
      default:
        return 'Usuário';
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-72 h-full bg-brand-dark text-white flex-shrink-0 border-r border-slate-800">
      {/* Logo Section */}
      <div className="h-20 flex items-center px-8 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="size-16 flex items-center justify-center">
            <img
              src={settings.companyLogo || '/logo.png'}
              alt={settings.companyName}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-wide text-white">{settings.companyName}</span>
            <span className="text-xs text-slate-400 font-medium">{getRoleLabel()}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <LayoutDashboard size={20} />
          <span className="text-sm font-medium">Dashboard</span>
        </NavLink>

        <div className="pt-4 pb-2 px-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestão</p>
        </div>

        <NavLink
          to="/work-orders"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Wrench size={20} />
          <span className="text-sm font-medium">Ordens de Serviço</span>
          <span className="ml-auto bg-brand-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">3</span>
        </NavLink>

        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <CalendarDays size={20} />
          <span className="text-sm font-medium">Calendário</span>
        </NavLink>

        {(user?.role === 'admin' || user?.role === 'admin_root') && (
          <>


            <NavLink
              to="/assets"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Factory size={20} />
              <span className="text-sm font-medium">Máquinas & Ativos</span>
            </NavLink>

            <NavLink
              to="/technicians"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Users size={20} />
              <span className="text-sm font-medium">Técnicos</span>
            </NavLink>

            <NavLink
              to="/inventory"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Package size={20} />
              <span className="text-sm font-medium">Estoque</span>
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Bell size={20} />
              <span className="text-sm font-medium">Notificações</span>
              {unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="pt-4 pb-2 px-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Análise</p>
            </div>

            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <BarChart3 size={20} />
              <span className="text-sm font-medium">Relatórios</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Settings size={20} />
              <span className="text-sm font-medium">Configurações</span>
            </NavLink>

            <NavLink
              to="/users/pending"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Users size={20} />
              <span className="text-sm font-medium">Aprovações</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800 bg-brand-dark relative">
        <div
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
        >
          <img
            src={profile.avatar || IMAGES.profileCarlos}
            alt={profile.name}
            className="size-10 rounded-full border-2 border-slate-600 object-cover"
          />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white truncate">{profile.name}</span>
            <span className="text-xs text-slate-400 truncate">{profile.position}</span>
          </div>
          <ChevronDown
            size={16}
            className={`ml-auto text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Dropdown Menu */}
        {isProfileOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => {
                setIsProfileOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
            >
              <User size={18} />
              <span className="text-sm font-medium">Meu Perfil</span>
            </button>
            <div className="h-px bg-slate-700"></div>
            <button
              onClick={() => {
                setIsProfileOpen(false);
                navigate('/');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Sair da Conta</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;