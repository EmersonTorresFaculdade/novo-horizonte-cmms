import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Check,
    X,
    User,
    Shield,
    Search,
    Filter,
    Trash2,
    BellOff,
    ChevronRight,
    Clock,
    Wrench,
    CheckCircle2
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext';

const Notifications = () => {
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications();

    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredNotifications = notifications.filter(n => {
        const matchesFilter =
            filter === 'all' ? true :
                filter === 'unread' ? !n.is_read :
                    n.is_read;

        const matchesSearch =
            n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (n.message?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

        return matchesFilter && matchesSearch;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'user_approval':
                return <div className="p-2 bg-emerald-50/50 text-primary rounded-lg"><User size={20} /></div>;
            case 'admin_approval':
                return <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Shield size={20} /></div>;
            case 'work_order':
            case 'work_order_created':
                return <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Wrench size={20} /></div>;
            case 'work_order_completed':
                return <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>;
            default:
                return <div className="p-2 bg-slate-50 text-slate-600 rounded-lg"><Bell size={20} /></div>;
        }
    };

    const handleNotificationClick = async (n: any) => {
        if (!n.is_read) {
            await markAsRead(n.id);
        }
        if (n.link) {
            navigate(n.link);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Bell className="text-primary" />
                        Notificações
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Acompanhe todas as atualizações e alertas do sistema.
                        {unreadCount > 0 && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Check size={18} />
                            Marcar lidas
                        </button>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Não Lidas
                    </button>
                    <button
                        onClick={() => setFilter('read')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'read' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Lidas
                    </button>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar notificações..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BellOff size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Nenhuma notificação encontrada</h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            Parece que você está em dia! Nenhuma notificação corresponde aos seus filtros atuais.
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((n) => (
                        <div
                            key={n.id}
                            className={`group bg-white rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${!n.is_read
                                    ? 'border-primary ring-1 ring-primary/5 bg-primary/[0.02] shadow-sm'
                                    : 'border-slate-100 hover:border-slate-300 hover:shadow-md'
                                }`}
                            onClick={() => handleNotificationClick(n)}
                        >
                            <div className="p-5 flex gap-4">
                                <div className="flex-shrink-0">
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-4 mb-1">
                                        <h4 className={`text-base font-bold truncate ${!n.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                                            {n.title}
                                        </h4>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                                <Clock size={14} />
                                                {formatTime(n.created_at)}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(n.id);
                                                }}
                                                className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-alert hover:bg-red-50 rounded-lg transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${!n.is_read ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                                        {n.message}
                                    </p>
                                    {n.link && (
                                        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                                            Ver detalhes
                                            <ChevronRight size={14} />
                                        </div>
                                    )}
                                </div>
                                {!n.is_read && (
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 self-start animate-pulse"></div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
