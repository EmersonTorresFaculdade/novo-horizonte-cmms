import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Tipos
export interface Notification {
    id: string;
    user_id: string;
    recipient_role: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    loadNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};

interface NotificationsProviderProps {
    children: ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const { user, isAdmin } = useAuth();

    // Carregar notificações
    const loadNotifications = async () => {
        if (!user || !isAdmin()) {
            setNotifications([]);
            return;
        }

        setLoading(true);
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            // Removed deprecated recipient_role filter to allow personal notifications


            const { data, error } = await query;

            if (error) {
                console.error('Error loading notifications:', error);
                return;
            }

            setNotifications(data || []);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Marcar como lida
    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) {
                console.error('Error marking as read:', error);
                return;
            }

            // Atualizar localmente
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    // Marcar todas como lidas
    const markAllAsRead = async () => {
        if (!user) return;

        try {
            let query = supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('is_read', false);

            // Removed deprecated filter


            const { error } = await query;

            if (error) {
                console.error('Error marking all as read:', error);
                return;
            }

            // Atualizar localmente
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    // Deletar notificação
    const deleteNotification = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting notification:', error);
                return;
            }

            // Remover localmente
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // Contar não lidas
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Carregar ao montar e quando user mudar
    useEffect(() => {
        loadNotifications();

        // Auto-refresh a cada 30 segundos
        const interval = setInterval(loadNotifications, 30000);

        return () => clearInterval(interval);
    }, [user]);

    const value: NotificationsContextType = {
        notifications,
        unreadCount,
        loading,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
    };

    return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
