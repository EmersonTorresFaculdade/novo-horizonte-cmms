import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { IMAGES } from '../constants';
import { useAuth } from './AuthContext';

interface ProfileData {
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    location: string;
    avatar: string;
}

interface ProfileContextType {
    profile: ProfileData;
    updateProfile: (data: ProfileData) => void;
    refreshProfile: () => Promise<void>;
    isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile must be used within ProfileProvider');
    }
    return context;
};

interface ProfileProviderProps {
    children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
    const { user } = useAuth(); // Obter usuário autenticado
    const [profile, setProfile] = useState<ProfileData>({
        id: '',
        name: 'Carregando...',
        email: '',
        phone: '',
        position: '',
        department: '',
        location: '',
        avatar: IMAGES.profileCarlos
    });
    const [isLoading, setIsLoading] = useState(true);

    const loadProfile = async () => {
        if (!user) return; // Não carregar se não houver usuário

        try {
            setIsLoading(true);
            // Tentar buscar perfil existente
            let { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id) // Filtrar pelo ID do usuário logado
                .single();

            // Se não encontrar perfil (erro PGRST116), usar dados do usuário básico
            if (error && error.code === 'PGRST116') {
                // Criar perfil padrão na memória (ou poderia criar no banco)
                setProfile({
                    id: user.id,
                    name: user.name || 'Usuário',
                    email: user.email,
                    phone: user.phone || '',
                    position: user.role === 'admin' ? 'Administrador' : 'Técnico',
                    department: 'Geral',
                    location: 'Matriz',
                    avatar: user.avatar_url || IMAGES.profileCarlos
                });
                return;
            }

            if (error) throw error;

            if (data) {
                setProfile({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    phone: data.phone || '',
                    position: data.position || '',
                    department: data.department || '',
                    location: data.location || '',
                    avatar: data.avatar || IMAGES.profileCarlos
                });
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadProfile();
        } else {
            // Resetar perfil se deslogar
            setProfile({
                id: '',
                name: 'Visitante',
                email: '',
                phone: '',
                position: '',
                department: '',
                location: '',
                avatar: IMAGES.profileCarlos
            });
        }
    }, [user]); // Recarregar quando user mudar

    const updateProfile = (data: ProfileData) => {
        setProfile(data);
    };

    const refreshProfile = async () => {
        await loadProfile();
    };

    return (
        <ProfileContext.Provider value={{ profile, updateProfile, refreshProfile, isLoading }}>
            {children}
        </ProfileContext.Provider>
    );
};
