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
import { Eye, EyeOff, BellRing, Smartphone, Settings, SlidersHorizontal, Settings2 } from 'lucide-react';
import { WhatsappIcon } from '../components/WhatsappIcon';
import FeedbackModal from '../components/FeedbackModal';
import { useSettings } from '../contexts/SettingsContext';

const Profile = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { profile: globalProfile, updateProfile: updateGlobalProfile } = useProfile();
    const { user, login, isAdmin } = useAuth(); // Usado para reautenticar/verificar senha

    const [profileData, setProfileData] = useState(globalProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [tempData, setTempData] = useState(profileData);
    const [isSaving, setIsSaving] = useState(false);

    // Configurações globais (para o Relatório do Admin)
    const { settings, updateSettings, saveSettings } = useSettings();

    // Modals state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [showManagementModal, setShowManagementModal] = useState(false);

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
        whatsapp: user?.whatsapp_notifications ?? false,
        dailyReport: user?.daily_report ?? false,
        reportFrequency: user?.report_frequency ?? 'diario',
        manageEquipment: user?.manage_equipment ?? true,
        managePredial: user?.manage_predial ?? true,
        manageOthers: user?.manage_others ?? true
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
                whatsapp: user.whatsapp_notifications ?? false,
                manageEquipment: user.manage_equipment ?? true,
                managePredial: user.manage_predial ?? true,
                manageOthers: user.manage_others ?? true
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
                    push_notifications: notificationSettings.push,
                    daily_report: notificationSettings.dailyReport,
                    report_frequency: notificationSettings.reportFrequency,
                    manage_equipment: notificationSettings.manageEquipment,
                    manage_predial: notificationSettings.managePredial,
                    manage_others: notificationSettings.manageOthers
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

    const handleSaveManagement = async () => {
        try {
            setIsSaving(true);

            const { error } = await supabase
                .from('users')
                .update({
                    manage_equipment: notificationSettings.manageEquipment,
                    manage_predial: notificationSettings.managePredial,
                    manage_others: notificationSettings.manageOthers
                } as any)
                .eq('id', user?.id);

            if (error) throw error;

            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Permissões Salvas',
                message: 'As permissões de acesso foram atualizadas com sucesso.'
            });
            setShowManagementModal(false);

        } catch (error) {
            console.error('Erro ao salvar permissões:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro',
                message: 'Não foi possível salvar as permissões. Tente novamente.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 relative">
            {/* Header */}
            <div className="flex flex-col gap-2">

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
                                <Settings size={20} />
                                Configurações da Conta
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Gerencie a segurança e preferências da sua conta</p>
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
                                        <p className="text-sm text-slate-500">Mantenha sua conta segura</p>
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
                                        <p className="text-sm text-slate-500">Gerencie canais e alertas de sistema</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-slate-400 group-hover:text-primary" />
                            </button>

                            {isAdmin() && (
                                <button
                                    onClick={() => setShowManagementModal(true)}
                                    className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-primary/10 transition-colors">
                                            <Settings2 size={20} className="text-slate-600 group-hover:text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-slate-900">Gestão de Acessos</p>
                                            <p className="text-sm text-slate-500">Controle quais setores monitorar e gerenciar</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-400 group-hover:text-primary" />
                                </button>
                            )}
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
                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">Email</p>
                                        <p className="text-xs text-slate-500">Alertas na sua caixa de entrada</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.email}
                                        onChange={e => setNotificationSettings({ ...notificationSettings, email: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                        <BellRing size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">Push</p>
                                        <p className="text-xs text-slate-500">Notificações no navegador</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.push}
                                        onChange={e => setNotificationSettings({ ...notificationSettings, push: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                        <WhatsappIcon size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">WhatsApp</p>
                                        <p className="text-xs text-slate-500">Alertas via mensageiro</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.whatsapp}
                                        onChange={e => setNotificationSettings({ ...notificationSettings, whatsapp: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Relatório Analítico</h4>
                                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">Consolidado</p>
                                            <p className="text-[10px] text-slate-500 line-clamp-1">Resumo técnico por e-mail</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.dailyReport}
                                            onChange={e => setNotificationSettings({ ...notificationSettings, dailyReport: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                {notificationSettings.dailyReport && (
                                    <div className="grid grid-cols-3 gap-2 animate-in fade-in zoom-in duration-200">
                                        {['diario', 'semanal', 'mensal'].map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setNotificationSettings({ ...notificationSettings, reportFrequency: f })}
                                                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border-2 ${notificationSettings.reportFrequency === f ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNotificationsModal(false)}
                                className="px-6 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveNotifications}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark font-black shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Management (Acessos) Modal */}
            {showManagementModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">Gestão de Acessos</h3>
                            <button onClick={() => setShowManagementModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Setores Monitorados</h4>
                                <p className="text-sm text-slate-500">Selecione quais setores você gerencia. Ao ativar um setor, você terá acesso à gestão de suas Ordens de Serviço, Ativos correspondentes, e será notificado sobre as atividades deste setor.</p>
                                <div className="space-y-2 mt-4">
                                    {[
                                        { id: 'manageEquipment', label: 'Máquinas', color: 'bg-blue-500' },
                                        { id: 'managePredial', label: 'Predial', color: 'bg-indigo-500' },
                                        { id: 'manageOthers', label: 'Outros', color: 'bg-slate-500' }
                                    ].map((s) => (
                                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all font-medium text-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-2 rounded-full ${s.color}`} />
                                                <span className="text-slate-700">{s.label}</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={(notificationSettings as any)[s.id]}
                                                    onChange={e => setNotificationSettings({ ...notificationSettings, [s.id]: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowManagementModal(false)}
                                className="px-6 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveManagement}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark font-black shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <FeedbackModal
                isOpen={feedback.isOpen}
                onClose={() => {
                    setFeedback({ ...feedback, isOpen: false });
                    if (feedback.title === 'Preferências Salvas' || feedback.title === 'Permissões Salvas') {
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
