import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    Camera,
    Mail,
    Phone,
    User,
    Briefcase,
    MapPin,
    Save,
    X,
    Shield,
    Bell,
    Lock,
    Loader2
} from 'lucide-react';
import { IMAGES } from '../constants';
import { supabase } from '../lib/supabase';
import { useProfile } from '../contexts/ProfileContext';

import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, BellRing, Smartphone } from 'lucide-react';
import { WhatsappIcon } from '../components/WhatsappIcon';
import FeedbackModal from '../components/FeedbackModal';

const Profile = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { profile: globalProfile, updateProfile: updateGlobalProfile } = useProfile();
    const { user, login } = useAuth(); // Usado para reautenticar/verificar senha

    const [profileData, setProfileData] = useState(globalProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [tempData, setTempData] = useState(profileData);
    const [isSaving, setIsSaving] = useState(false);

    // Modals state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Notifications Settings State
    const [notificationSettings, setNotificationSettings] = useState({
        email: user?.email_notifications ?? true,
        push: user?.push_notifications ?? true,
        whatsapp: user?.whatsapp_notifications ?? false
    });

    const [feedback, setFeedback] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'confirm' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'info',
        title: '',
        message: ''
    });

    // Update state when user context changes
    useEffect(() => {
        if (user) {
            setNotificationSettings(prev => ({
                ...prev,
                email: user.email_notifications ?? true,
                push: user.push_notifications ?? true,
                whatsapp: user.whatsapp_notifications ?? false
            }));
        }
    }, [user]);

    // Sincronizar com contexto global quando ele mudar
    useEffect(() => {
        if (globalProfile.id) {
            setProfileData(globalProfile);
            setTempData(globalProfile);
        }
    }, [globalProfile]);

    const handleEdit = () => {
        setIsEditing(true);
        setTempData(profileData);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    name: tempData.name,
                    email: tempData.email,
                    phone: tempData.phone,
                    position: tempData.position,
                    department: tempData.department,
                    location: tempData.location,
                    avatar: tempData.avatar
                })
                .eq('id', profileData.id);

            if (error) throw error;

            setProfileData(tempData);
            setIsEditing(false);

            // Atualizar contexto global para sincronizar com outros componentes
            updateGlobalProfile(tempData);

            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Sucesso!',
                message: 'Seu perfil foi atualizado com sucesso.'
            });
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro',
                message: 'Ocorreu um erro ao salvar seu perfil. Tente novamente.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setTempData(profileData);
        setIsEditing(false);
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempData({ ...tempData, avatar: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    // Password Change Logic
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        setIsSaving(true);

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('As novas senhas não coincidem');
            setIsSaving(false);
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
            setIsSaving(false);
            return;
        }

        try {
            // Verificar senha atual (hack para este protótipo usando a função de login ou query direta)
            // Como temos acesso direto à tabela users e password_hash é texto plano:
            const { data: userCheck, error: checkError } = await supabase
                .from('users')
                .select('password_hash')
                .eq('id', user?.id)
                .single();

            if (checkError || !userCheck) {
                throw new Error('Erro ao verificar usuário');
            }

            if (userCheck.password_hash !== passwordForm.currentPassword) {
                setPasswordError('Senha atual incorreta');
                setIsSaving(false);
                return;
            }

            // Atualizar senha
            const { error: updateError } = await supabase
                .from('users')
                .update({ password_hash: passwordForm.newPassword })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            setPasswordSuccess('Senha alterada com sucesso!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess('');
            }, 3000);

        } catch (error: any) {
            console.error('Erro ao alterar senha:', error);
            setPasswordError('Erro ao alterar senha. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    // Notification Logic
    const handleSaveNotifications = async () => {
        try {
            setIsSaving(true);

            const { error } = await supabase
                .from('users')
                .update({
                    email_notifications: notificationSettings.email,
                    whatsapp_notifications: notificationSettings.whatsapp,
                    push_notifications: notificationSettings.push
                })
                .eq('id', user?.id);

            if (error) throw error;

            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Preferências Salvas',
                message: 'Suas configurações de notificação foram atualizadas.'
            });
            setShowNotificationsModal(false);

            // Em vez de reload imediato, poderíamos recarregar após o modal fechar
            // ou simplesmente confiar que as variáveis locais estão corretas.
            // Para garantir que o Header mostre dados atualizados se necessário:
            // window.location.reload();

        } catch (error) {
            console.error('Erro ao salvar notificações:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro',
                message: 'Não foi possível salvar suas preferências. Tente novamente.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 relative">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <nav className="flex items-center text-sm text-slate-500 mb-1">
                    <a href="#" onClick={() => navigate('/dashboard')} className="hover:text-primary">Início</a>
                    <ChevronRight size={14} className="mx-1" />
                    <span className="text-slate-900 font-medium">Meu Perfil</span>
                </nav>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Meu Perfil</h2>
                <p className="text-slate-500 max-w-2xl">Gerencie suas informações pessoais e configurações de conta.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 sticky top-6">
                        <div className="flex flex-col items-center">
                            <div className="relative group">
                                <img
                                    src={isEditing ? tempData.avatar : profileData.avatar}
                                    alt="Profile"
                                    className="size-32 rounded-full object-cover border-4 border-slate-100 shadow-lg"
                                />
                                {isEditing && (
                                    <button
                                        onClick={handleImageClick}
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        <Camera size={32} className="text-white" />
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mt-4">{profileData.name}</h3>
                            <p className="text-sm text-slate-500">{profileData.position}</p>
                            <p className="text-xs text-slate-400 mt-1">{profileData.department}</p>

                            <div className="w-full mt-6 pt-6 border-t border-slate-100 space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail size={16} className="text-slate-400" />
                                    <span className="text-slate-600">{profileData.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone size={16} className="text-slate-400" />
                                    <span className="text-slate-600">{profileData.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin size={16} className="text-slate-400" />
                                    <span className="text-slate-600">{profileData.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Informações Pessoais</h3>
                                <p className="text-sm text-slate-500 mt-1">Atualize seus dados pessoais e de contato</p>
                            </div>
                            {!isEditing ? (
                                <button
                                    onClick={handleEdit}
                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-primary/20"
                                >
                                    Editar Perfil
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        <X size={16} />
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        {isSaving ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Nome Completo */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <User size={16} />
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={isEditing ? tempData.name : profileData.name}
                                        onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 rounded-lg border ${isEditing
                                            ? 'border-slate-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20'
                                            : 'border-slate-100 bg-slate-50 text-slate-500'
                                            } outline-none transition-all`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <Briefcase size={16} />
                                        Cargo
                                    </label>
                                    <input
                                        type="text"
                                        value={isEditing ? tempData.position : profileData.position}
                                        onChange={(e) => setTempData({ ...tempData, position: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 rounded-lg border ${isEditing
                                            ? 'border-slate-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20'
                                            : 'border-slate-100 bg-slate-50 text-slate-500'
                                            } outline-none transition-all`}
                                    />
                                </div>
                            </div>

                            {/* Email e WhatsApp */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <Mail size={16} />
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={isEditing ? tempData.email : profileData.email}
                                        onChange={(e) => setTempData({ ...tempData, email: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 rounded-lg border ${isEditing
                                            ? 'border-slate-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20'
                                            : 'border-slate-100 bg-slate-50 text-slate-500'
                                            } outline-none transition-all`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <WhatsappIcon size={16} />
                                        Número WhatsApp
                                    </label>
                                    <input
                                        type="tel"
                                        value={isEditing ? tempData.phone : profileData.phone}
                                        onChange={(e) => setTempData({ ...tempData, phone: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 rounded-lg border ${isEditing
                                            ? 'border-slate-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20'
                                            : 'border-slate-100 bg-slate-50 text-slate-500'
                                            } outline-none transition-all`}
                                    />
                                </div>
                            </div>

                            {/* Outros */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <Briefcase size={16} />
                                        Departamento
                                    </label>
                                    <input
                                        type="text"
                                        value={isEditing ? tempData.department : profileData.department}
                                        onChange={(e) => setTempData({ ...tempData, department: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 rounded-lg border ${isEditing
                                            ? 'border-slate-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20'
                                            : 'border-slate-100 bg-slate-50 text-slate-500'
                                            } outline-none transition-all`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <MapPin size={16} />
                                        Localização
                                    </label>
                                    <input
                                        type="text"
                                        value={isEditing ? tempData.location : profileData.location}
                                        onChange={(e) => setTempData({ ...tempData, location: e.target.value })}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 rounded-lg border ${isEditing
                                            ? 'border-slate-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20'
                                            : 'border-slate-100 bg-slate-50 text-slate-500'
                                            } outline-none transition-all`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Shield size={20} />
                                Segurança
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Gerencie a segurança da sua conta</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-primary/10 transition-colors">
                                        <Lock size={20} className="text-slate-600 group-hover:text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900">Alterar Senha</p>
                                        <p className="text-sm text-slate-500">Última alteração há 3 meses</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-slate-400 group-hover:text-primary" />
                            </button>

                            <button
                                onClick={() => setShowNotificationsModal(true)}
                                className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-primary/10 transition-colors">
                                        <Bell size={20} className="text-slate-600 group-hover:text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900">Notificações</p>
                                        <p className="text-sm text-slate-500">Gerencie suas preferências de notificação</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-slate-400 group-hover:text-primary" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Alterar Senha</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                            {passwordError && (
                                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                                    {passwordError}
                                </div>
                            )}
                            {passwordSuccess && (
                                <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">
                                    {passwordSuccess}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Senha Atual</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.current ? "text" : "password"}
                                        value={passwordForm.currentPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.new ? "text" : "password"}
                                        value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.confirm ? "text" : "password"}
                                        value={passwordForm.confirmPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium disabled:opacity-50"
                                >
                                    {isSaving ? 'Salvando...' : 'Alterar Senha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notifications Modal */}
            {showNotificationsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Preferências de Notificações</h3>
                            <button onClick={() => setShowNotificationsModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">Notificações por Email</p>
                                        <p className="text-sm text-slate-500">Receber atualizações no seu email</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.email}
                                        onChange={e => setNotificationSettings({ ...notificationSettings, email: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                        <BellRing size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">Notificações Push</p>
                                        <p className="text-sm text-slate-500">Notificações no navegador</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.push}
                                        onChange={e => setNotificationSettings({ ...notificationSettings, push: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                        <WhatsappIcon size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">Notificações por WhatsApp</p>
                                        <p className="text-sm text-slate-500">Receber atualizações via WhatsApp</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.whatsapp}
                                        onChange={e => setNotificationSettings({ ...notificationSettings, whatsapp: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowNotificationsModal(false)}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveNotifications}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium disabled:opacity-50"
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Preferências'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <FeedbackModal
                isOpen={feedback.isOpen}
                onClose={() => {
                    setFeedback({ ...feedback, isOpen: false });
                    // Se for sucesso de notificações, talvez queira recarregar aqui para atualizar o resto da app
                    if (feedback.title === 'Preferências Salvas') {
                        window.location.reload();
                    }
                }}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
            />
        </div>
    );
};

export default Profile;
