import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, User, Shield, AlertTriangle, Info, Wrench, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationsContext';

const NotificationBell = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    // --- Urgency-based icon & color system ---
    const getNotificationConfig = (type: string, priority?: string) => {
        const p = (priority || '').toLowerCase();

        // Priority-based overrides
        if (p === 'critica' || p === 'crítica' || p === 'urgente' || p === 'alta') {
            return {
                icon: <AlertTriangle size={16} />,
                dotColor: 'bg-red-500',
                iconBg: 'bg-red-50',
                iconColor: 'text-red-600',
                label: '🔴'
            };
        }
        if (p === 'média' || p === 'media') {
            return {
                icon: <Info size={16} />,
                dotColor: 'bg-amber-500',
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
                label: '🟡'
            };
        }

        // Type-based defaults
        switch (type) {
            case 'user_approval':
                return {
                    icon: <User size={16} />,
                    dotColor: 'bg-primary',
                    iconBg: 'bg-emerald-50',
                    iconColor: 'text-primary',
                    label: '🟢'
                };
            case 'admin_approval':
                return {
                    icon: <Shield size={16} />,
                    dotColor: 'bg-amber-500',
                    iconBg: 'bg-amber-50',
                    iconColor: 'text-amber-600',
                    label: '🟡'
                };
            case 'work_order_update':
            case 'status_change':
                return {
                    icon: <Wrench size={16} />,
                    dotColor: 'bg-blue-500',
                    iconBg: 'bg-blue-50',
                    iconColor: 'text-blue-600',
                    label: '🔵'
                };
            case 'work_order_completed':
                return {
                    icon: <CheckCircle2 size={16} />,
                    dotColor: 'bg-emerald-500',
                    iconBg: 'bg-emerald-50',
                    iconColor: 'text-emerald-600',
                    label: '🟢'
                };
            default:
                return {
                    icon: <Bell size={16} />,
                    dotColor: 'bg-slate-400',
                    iconBg: 'bg-slate-50',
                    iconColor: 'text-slate-600',
                    label: '🟢'
                };
        }
    };

    const recentNotifications = notifications.slice(0, 6);

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Agora';
        if (mins < 60) return `${mins}min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon — Premium */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-xl transition-all ${isOpen
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
            >
                <Bell size={20} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm ring-2 ring-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown — Premium */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden animate-fade-in animate-slide-in-top">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center gap-3">
                            <div className="size-9 bg-slate-900 rounded-xl flex items-center justify-center">
                                <Bell size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-sm">Notificações</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
                                </p>
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[11px] text-primary hover:text-green-700 font-black uppercase tracking-widest flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                            >
                                <Check size={14} />
                                Ler todas
                            </button>
                        )}
                    </div>

                    {/* Lista de Notificações */}
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100/80">
                        {recentNotifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="size-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Bell size={28} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-bold text-slate-500">Nenhuma notificação</p>
                                <p className="text-xs text-slate-400 mt-1">Você será notificado sobre atualizações</p>
                            </div>
                        ) : (
                            recentNotifications.map(notification => {
                                const config = getNotificationConfig(notification.type, notification.priority);
                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-slate-50/80 cursor-pointer transition-all group ${!notification.is_read ? 'bg-primary/[0.03] border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                                            }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className={`size-10 ${config.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconColor} group-hover:scale-105 transition-transform`}>
                                                {config.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <h4 className={`text-sm font-bold truncate ${!notification.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                        {getTimeAgo(notification.created_at)}
                                                    </span>
                                                </div>
                                                {notification.message && (
                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!notification.is_read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification.id);
                                                        }}
                                                        className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                                                        title="Marcar como lida"
                                                    >
                                                        <Check size={14} className="text-emerald-600" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Remover"
                                                >
                                                    <X size={14} className="text-slate-400 hover:text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    navigate('/notifications');
                                    setIsOpen(false);
                                }}
                                className="text-xs text-primary hover:text-green-700 font-black uppercase tracking-widest hover:underline"
                            >
                                Ver todas →
                            </button>
                            <span className="text-[10px] text-slate-400 font-bold">
                                {notifications.length} total
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
