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
        if (!user) {
            setNotifications([]);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .or(`user_id.eq.${user.id},recipient_role.eq.${user.role}`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading notifications:', error);
                return;
            }

            // Filtragem por Categoria (para notificações vinculadas a OS)
            const workOrderNotifications = (data || []).filter(n => n.link?.startsWith('/work-orders/'));
            const otherNotifications = (data || []).filter(n => !n.link?.startsWith('/work-orders/'));

            let filteredWorkOrderNotifications = workOrderNotifications;

            if (workOrderNotifications.length > 0) {
                // Extrair IDs das OS
                const woIds = workOrderNotifications.map(n => n.link?.split('/').pop()).filter(Boolean);

                // Buscar categorias das OS
                const { data: woData } = await supabase
                    .from('work_orders')
                    .select('id, maintenance_category')
                    .in('id', woIds);

                if (woData) {
                    const woCategoryMap = new Map(woData.map(wo => [wo.id, wo.maintenance_category || 'Equipamento']));

                    // Filtrar notificações de OS que o usuário não tem permissão
                    filteredWorkOrderNotifications = workOrderNotifications.filter(n => {
                        const woId = n.link?.split('/').pop();
                        const woCategory = woCategoryMap.get(woId);

                        // Se não encontrou a OS (ex: deletada), mantém a notificação ou remove? 
                        // Vamos manter para evitar sumiços misteriosos, mas filtrar se a categoria for conhecida.
                        if (!woCategory) return true;

                        if (woCategory === 'Equipamento' && user.manage_equipment) return true;
                        if (woCategory === 'Predial' && user.manage_predial) return true;
                        if (woCategory === 'Outros' && user.manage_others) return true;

                        return false;
                    });
                }
            }

            const combinedNotifications = [...filteredWorkOrderNotifications, ...otherNotifications];

            // Deduplicar por ID e normalizar is_read
            const uniqueNotifications = combinedNotifications.reduce((acc: Notification[], current) => {
                if (!acc.find(n => n.id === current.id)) {
                    acc.push({
                        ...current,
                        is_read: !!current.is_read
                    });
                }
                return acc;
            }, []);

            // Ordenar por data novamente após o merge
            uniqueNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setNotifications(uniqueNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Marcar como lida
    const markAsRead = async (id: string) => {
        // Atualizar localmente IMEDIATAMENTE (Otimista)
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) {
                console.error('Error marking as read:', error);
                // Re-carregar para garantir sincronia com o servidor em caso de erro
                loadNotifications();
                return;
            }
        } catch (error) {
            console.error('Error marking as read:', error);
            loadNotifications();
        }
    };

    // Marcar todas como lidas
    const markAllAsRead = async () => {
        if (!user) return;

        // Atualizar localmente IMEDIATAMENTE
        setNotifications(prev =>
            prev.map(n => ({ ...n, is_read: true }))
        );

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .or(`user_id.eq.${user.id},recipient_role.eq.${user.role}`)
                .eq('is_read', false);

            if (error) {
                console.error('Error marking all as read:', error);
                loadNotifications();
                return;
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            loadNotifications();
        }
    };

    // Deletar notificação
    const deleteNotification = async (id: string) => {
        // Remover localmente IMEDIATAMENTE
        setNotifications(prev => prev.filter(n => n.id !== id));

        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting notification:', error);
                loadNotifications();
                return;
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            loadNotifications();
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
    }, [user?.id, user?.role]); // Adicionado role como dependência se mudar

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
