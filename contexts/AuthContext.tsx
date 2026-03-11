import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import { NotificationService } from '../services/NotificationService';

// Tipos
export type UserRole = 'admin_root' | 'admin' | 'user';
export type UserStatus = 'pending' | 'active' | 'inactive';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    phone?: string;
    avatar_url?: string;
    created_at: string;
    last_login?: string;
    email_notifications?: boolean;
    whatsapp_notifications?: boolean;
    push_notifications?: boolean;
    daily_report?: boolean;
    report_frequency?: string;
    manage_equipment?: boolean;
    manage_predial?: boolean;
    manage_others?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, username: string, email: string, password: string, requestedRole: UserRole, phone?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    hasPermission: (requiredRole: UserRole[]) => boolean;
    isAdmin: () => boolean;
    isAdminRoot: () => boolean;
    getPendingUsers: () => Promise<{ data: User[] | null; error: any }>;
    approveUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
    rejectUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
    resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
    verifyResetToken: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
    completePasswordReset: (email: string, token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Carregar usuário da sessão ao iniciar
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setLoading(false);
                return;
            }

            // Verificar se o token é válido
            const { data: session, error } = await supabase
                .from('user_sessions')
                .select('*, users(*)')
                .eq('token', token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !session) {
                localStorage.removeItem('auth_token');
                setLoading(false);
                return;
            }

            setUser(session.users as User);
        } catch (error) {
            console.error('Error checking session:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // Buscar usuário por email OU username
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .or(`email.eq.${email},username.eq.${email}`)
                .single();

            if (userError || !userData) {
                return { success: false, error: 'Usuário ou senha inválidos' };
            }

            // Verificar se o usuário está ativo
            if (userData.status !== 'active') {
                return { success: false, error: 'Conta aguardando aprovação ou inativa' };
            }

            // Verificar senha usando bcrypt
            const isPasswordValid = await bcrypt.compare(password, userData.password_hash);

            if (!isPasswordValid) {
                return { success: false, error: 'Usuário ou senha inválidos' };
            }

            // Criar sessão
            const token = generateToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

            const { error: sessionError } = await supabase
                .from('user_sessions')
                .insert({
                    user_id: userData.id,
                    token,
                    expires_at: expiresAt.toISOString()
                });

            if (sessionError) {
                return { success: false, error: 'Erro ao criar sessão' };
            }

            // Atualizar last_login
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userData.id);

            // Salvar token
            localStorage.setItem('auth_token', token);
            setUser(userData as User);

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Erro ao fazer login' };
        }
    };

    const register = async (name: string, username: string, email: string, password: string, requestedRole: UserRole, phone?: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // Verificar se email já existe
            const { data: existingEmail } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (existingEmail) {
                return { success: false, error: 'Este email já está cadastrado' };
            }

            // Verificar se username já existe
            const { data: existingUsername } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .maybeSingle();

            if (existingUsername) {
                return { success: false, error: 'Este nome de usuário já está em uso' };
            }

            // Hash da senha
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Criar novo usuário com status pending
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                    name,
                    username,
                    email,
                    password_hash: passwordHash, // Salva o hash
                    phone,
                    role: 'user', // Sempre criar como 'user' inicialmente (segurança)
                    requested_role: requestedRole, // O role desejado fica em requested_role
                    status: 'pending',
                    email_notifications: true,
                    whatsapp_notifications: true,
                    push_notifications: true,
                    daily_report: true
                })
                .select()
                .single();

            if (insertError || !newUser) {
                console.error('Insert error:', insertError);
                return { success: false, error: 'Erro ao criar conta. Tente novamente.' };
            }

            // Notificar registro realizado (aguardando aprovação)
            await NotificationService.notifyUserRegistered({
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                status: newUser.status
            });

            return { success: true };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: 'Erro ao criar conta' };
        }
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                await supabase
                    .from('user_sessions')
                    .delete()
                    .eq('token', token);
            }

            localStorage.removeItem('auth_token');
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const hasPermission = (requiredRoles: UserRole[]): boolean => {
        if (!user) return false;
        return requiredRoles.includes(user.role);
    };

    const isAdmin = (): boolean => {
        if (!user) return false;
        return user.role === 'admin' || user.role === 'admin_root';
    };

    const isAdminRoot = (): boolean => {
        if (!user) return false;
        return user.role === 'admin_root';
    };

    const getPendingUsers = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        return { data: data as User[] | null, error };
    };

    const approveUser = async (userId: string) => {
        try {
            // Buscar o usuário para ver qual role ele pediu
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('requested_role')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            // Atualizar status e role final
            const { error } = await supabase
                .from('users')
                .update({
                    status: 'active',
                    role: userData.requested_role || 'user', // Aprova com o role pedido
                    approved_at: new Date().toISOString(),
                    approved_by: user?.id
                })
                .eq('id', userId);

            if (error) throw error;

            // Buscar dados completos para notificação
            const { data: finalUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (finalUser) {
                await NotificationService.notifyUserApproved({
                    id: finalUser.id,
                    name: finalUser.name,
                    email: finalUser.email,
                    phone: finalUser.phone,
                    role: finalUser.role,
                    status: finalUser.status
                });
            }

            return { success: true };
        } catch (error: any) {
            console.error('Error approving user:', error);
            return { success: false, error: error.message };
        }
    };

    const rejectUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    status: 'inactive',
                    approved_at: new Date().toISOString(),
                    approved_by: user?.id
                })
                .eq('id', userId);

            if (error) throw error;

            // Buscar dados completos para notificação
            const { data: finalUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (finalUser) {
                await NotificationService.notifyUserRejected({
                    id: finalUser.id,
                    name: finalUser.name,
                    email: finalUser.email,
                    phone: finalUser.phone,
                    role: finalUser.role,
                    status: finalUser.status
                });
            }

            return { success: true };
        } catch (error: any) {
            console.error('Error rejecting user:', error);
            return { success: false, error: error.message };
        }
    };

    const resetUserPassword = async (userId: string, newPassword: string) => {
        try {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);

            const { error } = await supabase
                .from('users')
                .update({ password_hash: passwordHash })
                .eq('id', userId);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('Error resetting password:', error);
            return { success: false, error: error.message };
        }
    };

    const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // 1. Verificar se o usuário existe
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, name, phone')
                .eq('email', email)
                .maybeSingle();

            if (userError) throw userError;

            if (!userData) {
                return { success: false, error: 'Este e-mail não está cadastrado em nossa base.' };
            }

            // 2. Gerar Token de Reset
            const resetToken = generateToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora de validade

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    reset_token: resetToken,
                    reset_token_expires_at: expiresAt.toISOString()
                })
                .eq('id', userData.id);

            if (updateError) throw updateError;

            // 3. Notificar via NotificationService (usando Edge Function centralizada)
            await NotificationService.notifyPasswordResetRequest({
                id: userData.id,
                name: userData.name,
                email: email,
                phone: userData.phone,
                role: 'user', // Fallback standard
                status: 'active'
            }, resetToken);

            // 4. Também cria uma notificação interna para registro
            await supabase
                .from('notifications')
                .insert({
                    user_id: userData.id,
                    title: 'Token de Recuperação Gerado',
                    message: `Um link de recuperação de senha foi solicitado e enviado para ${email}.`,
                    type: 'info',
                    recipient_role: 'admin',
                    is_read: false
                });

            return { success: true };
        } catch (error: any) {
            console.error('Error requesting password reset:', error);
            return { success: false, error: 'Erro ao processar solicitação' };
        }
    };

    const verifyResetToken = async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, reset_token_expires_at')
                .eq('email', email)
                .eq('reset_token', token)
                .maybeSingle();

            if (error || !data) {
                return { success: false, error: 'Token inválido ou expirado' };
            }

            const expiresAt = new Date(data.reset_token_expires_at);
            if (expiresAt < new Date()) {
                return { success: false, error: 'Link de recuperação expirou' };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: 'Erro ao verificar token' };
        }
    };

    const completePasswordReset = async (email: string, token: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // Verificar token novamente por segurança
            const verify = await verifyResetToken(email, token);
            if (!verify.success) return verify;

            // Hash da nova senha
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);

            // Atualizar senha e remover o token
            const { error } = await supabase
                .from('users')
                .update({
                    password_hash: passwordHash,
                    reset_token: null,
                    reset_token_expires_at: null
                })
                .eq('email', email);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error completing password reset:', error);
            return { success: false, error: 'Erro ao redefinir senha' };
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        register,
        logout,
        hasPermission,
        isAdmin,
        isAdminRoot,
        getPendingUsers,
        approveUser,
        rejectUser,
        resetUserPassword,
        requestPasswordReset,
        verifyResetToken,
        completePasswordReset
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Função auxiliar para gerar token
function generateToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
