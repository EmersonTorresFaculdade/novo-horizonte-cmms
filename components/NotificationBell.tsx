import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, User, Shield } from 'lucide-react';
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
        // Marcar como lida
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        // Navegar se tiver link
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'user_approval':
                return <User size={16} className="text-primary" />;
            case 'admin_approval':
                return <Shield size={16} className="text-amber-600" />;
            default:
                return <Bell size={16} className="text-slate-600" />;
        }
    };

    const recentNotifications = notifications.slice(0, 5);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 bg-brand-alert text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Notificações</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-primary hover:text-green-700 font-medium flex items-center gap-1"
                            >
                                <Check size={14} />
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    {/* Lista de Notificações */}
                    <div className="max-h-96 overflow-y-auto">
                        {recentNotifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Bell size={32} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm">Nenhuma notificação</p>
                            </div>
                        ) : (
                            recentNotifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-emerald-50/50/50' : ''
                                        }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">{getIcon(notification.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h4 className={`text-sm font-medium ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                                                    {notification.title}
                                                </h4>
                                                {!notification.is_read && (
                                                    <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0"></div>
                                                )}
                                            </div>
                                            {notification.message && (
                                                <p className="text-xs text-slate-600 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(notification.created_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            className="p-1 hover:bg-red-100 rounded transition-colors"
                                        >
                                            <X size={14} className="text-slate-400 hover:text-brand-alert" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 5 && (
                        <div className="p-3 border-t border-slate-200 text-center">
                            <button
                                onClick={() => {
                                    navigate('/notifications');
                                    setIsOpen(false);
                                }}
                                className="text-sm text-primary hover:text-green-700 font-medium"
                            >
                                Ver todas as notificações
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
