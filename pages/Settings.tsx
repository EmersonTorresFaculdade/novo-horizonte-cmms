import React, { useState, useRef } from 'react';
import {
    ChevronRight,
    Save,
    Building2,
    Mail,
    Bell,
    Lock,
    Globe,
    Palette,
    Database,
    Download,
    Upload,
    Shield,
    Check,
    Image,
    X,
    Webhook
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import FeedbackModal from '../components/FeedbackModal';

const Settings = () => {
    const { settings, updateSettings, saveSettings, uploadLogo, isSaving } = useSettings();
    const [activeTab, setActiveTab] = useState('general');
    const [testingWebhook, setTestingWebhook] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleSave = async () => {
        try {
            await saveSettings();
            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Configurações Salvas',
                message: 'As alterações foram aplicadas com sucesso.'
            });
        } catch (error: any) {
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro ao Salvar',
                message: error.message || 'Erro ao salvar configurações. Tente novamente.'
            });
        }
    };

    const handleTestWebhook = async () => {
        if (!settings.webhookUrl) {
            setFeedback({
                isOpen: true,
                type: 'info',
                title: 'Atenção',
                message: 'Por favor, preencha a URL do Webhook antes de testar.'
            });
            return;
        }

        setTestingWebhook(true);
        try {
            // First, save the settings to ensure DB is up to date for the Edge Function
            await saveSettings();

            // Invoke Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event: 'test_notification',
                    // Mock work order data
                    workOrder: {
                        id: 'test-id',
                        title: 'Teste de Integração',
                        description: 'Este é um teste de verificação de webhook.',
                        priority: 'Média',
                        status: 'Teste',
                        assetId: '',
                        locationId: '',
                        url: window.location.origin
                    },
                    company: settings.companyName
                }
            });

            if (error) {
                console.error('Edge Function Error:', error);
                throw error;
            }

            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Webhook Testado',
                message: 'O teste foi enviado com sucesso via Servidor Supabase! Verifique seu n8n.'
            });

        } catch (error: any) {
            console.error('Test Error:', error);

            let errorMessage = error.message || 'Erro desconhecido';

            // Try to extract detailed error from Edge Function response
            if (error && typeof error === 'object') {
                try {
                    // Check if it's a Supabase FunctionsHttpError with context
                    if ('context' in error && typeof error.context.json === 'function') {
                        const errorContext = await error.context.json();
                        if (errorContext && errorContext.error) {
                            errorMessage = errorContext.error;
                            if (errorContext.stack) {
                                console.error('Edge Function Stack:', errorContext.stack);
                            }
                        }
                    }
                } catch (e) {
                    console.log('Could not parse error context');
                }
            }

            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro no Teste',
                message: `Falha ao enviar teste: ${errorMessage}`
            });
        } finally {
            setTestingWebhook(false);
        }
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validar tipo de arquivo
            if (!file.type.startsWith('image/')) {
                setFeedback({
                    isOpen: true,
                    type: 'error',
                    title: 'Formato Inválido',
                    message: 'Por favor, selecione apenas arquivos de imagem.'
                });
                return;
            }
            // Validar tamanho (máximo 2MB para upload)
            if (file.size > 2 * 1024 * 1024) {
                setFeedback({
                    isOpen: true,
                    type: 'error',
                    title: 'Arquivo muito grande',
                    message: 'A imagem deve ter no máximo 2MB.'
                });
                return;
            }

            uploadLogo(file);
        }
    };

    const handleRemoveLogo = () => {
        uploadLogo(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };







    const tabs = [
        { id: 'general', label: 'Geral', icon: Building2 },
        { id: 'integrations', label: 'Integrações', icon: Webhook },
        { id: 'notifications', label: 'Notificações', icon: Bell },
        { id: 'appearance', label: 'Aparência', icon: Palette },
        { id: 'security', label: 'Segurança', icon: Shield },
        { id: 'data', label: 'Dados', icon: Database }
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <nav className="flex items-center text-sm text-slate-500 mb-1">
                    <a href="#" className="hover:text-primary">Início</a>
                    <ChevronRight size={14} className="mx-1" />
                    <span className="text-slate-900 font-medium">Configurações</span>
                </nav>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configurações</h2>
                        <p className="text-slate-500 max-w-2xl">Gerencie as configurações do sistema</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold flex items-center gap-2 shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                    >
                        <Save size={16} />
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

            {/* Tabs + Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === tab.id
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                        {/* General Settings */}
                        {activeTab === 'general' && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Configurações Gerais</h3>
                                <div className="space-y-6">
                                    {/* Logo Upload Section */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <Image size={16} />
                                            Logo da Empresa
                                        </label>
                                        <div className="flex items-start gap-6">
                                            {/* Logo Preview */}
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                                                    {settings.companyLogo ? (
                                                        <img
                                                            src={settings.companyLogo}
                                                            alt="Logo da empresa"
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            <Image size={32} className="mx-auto text-slate-300" />
                                                            <span className="text-xs text-slate-400 mt-1">Sem logo</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {settings.companyLogo && (
                                                    <button
                                                        onClick={handleRemoveLogo}
                                                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-md"
                                                        title="Remover logo"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Upload Controls */}
                                            <div className="flex-1">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className="hidden"
                                                    id="logo-upload"
                                                />
                                                <label
                                                    htmlFor="logo-upload"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer transition-colors"
                                                >
                                                    <Upload size={16} />
                                                    Carregar Logo
                                                </label>
                                                <p className="text-xs text-slate-500 mt-2">
                                                    Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 500KB (Salvo no Banco)
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                            <Building2 size={16} />
                                            Nome da Empresa
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.companyName}
                                            onChange={(e) => updateSettings({ companyName: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                            <Mail size={16} />
                                            Email da Empresa
                                        </label>
                                        <input
                                            type="email"
                                            value={settings.companyEmail}
                                            onChange={(e) => updateSettings({ companyEmail: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                                <Globe size={16} />
                                                Fuso Horário
                                            </label>
                                            <select
                                                value={settings.timezone}
                                                onChange={(e) => updateSettings({ timezone: e.target.value })}
                                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                            >
                                                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                                                <option value="America/New_York">Nova York (GMT-5)</option>
                                                <option value="Europe/London">Londres (GMT+0)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Idioma
                                            </label>
                                            <select
                                                value={settings.language}
                                                onChange={(e) => updateSettings({ language: e.target.value })}
                                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                            >
                                                <option value="pt-BR">Português (Brasil)</option>
                                                <option value="en-US">English (US)</option>
                                                <option value="es-ES">Español</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Integrations Settings */}
                        {activeTab === 'integrations' && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Integrações (n8n)</h3>
                                <div className="space-y-6">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                        <div className="flex gap-4">
                                            <div className="p-2 bg-blue-100 rounded-lg h-fit">
                                                <Webhook size={24} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">Webhook de Notificações</h4>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    Configure a URL do seu fluxo no n8n. O sistema enviará dados para este endereço sempre que uma Ordem de Serviço for criada ou atualizada.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div>
                                            <h4 className="font-semibold text-slate-900">Habilitar Integração</h4>
                                            <p className="text-sm text-slate-500 mt-1">Ativar o envio de dados para o Webhook</p>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ webhookEnabled: !settings.webhookEnabled })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.webhookEnabled ? 'bg-primary' : 'bg-slate-200'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.webhookEnabled ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    <div className={`transition-opacity ${!settings.webhookEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            URL do Webhook (POST)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                placeholder="https://seu-n8n.com/webhook/..."
                                                value={settings.webhookUrl || ''}
                                                onChange={(e) => updateSettings({ webhookUrl: e.target.value })}
                                                className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                            <button
                                                onClick={handleTestWebhook}
                                                disabled={!settings.webhookUrl || testingWebhook}
                                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {testingWebhook ? 'Enviando...' : 'Testar Integração'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            O sistema enviará um JSON com os dados da OS para esta URL.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications Settings */}
                        {activeTab === 'notifications' && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Notificações</h3>
                                <div className="space-y-4">
                                    {[
                                        { key: 'emailNotifications', label: 'Notificações por Email', description: 'Receba atualizações importantes por email' },
                                        { key: 'whatsappNotifications', label: 'Notificações por WhatsApp', description: 'Receba alertas críticos via WhatsApp' },
                                        { key: 'workOrderAlerts', label: 'Alertas de Ordem de Serviço', description: 'Notificações sobre novas ordens e atualizações' },
                                        { key: 'criticalAlerts', label: 'Alertas Críticos', description: 'Notificações para situações urgentes' },
                                        { key: 'dailyReport', label: 'Relatório Diário', description: 'Resumo periódico enviado por email' }
                                    ].map((item) => (
                                        <div key={item.key} className="space-y-4">
                                            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-900">{item.label}</h4>
                                                    <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                                                </div>
                                                <button
                                                    onClick={() => updateSettings({ [item.key]: !settings[item.key as keyof typeof settings] })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[item.key as keyof typeof settings] ? 'bg-primary' : 'bg-slate-200'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </div>

                                            {item.key === 'dailyReport' && settings.dailyReport && (
                                                <div className="ml-4 p-4 border-l-2 border-primary bg-slate-50 rounded-r-lg animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                        Frequência do Relatório
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[
                                                            { id: 'diario', label: 'Diário' },
                                                            { id: 'semanal', label: 'Semanal' },
                                                            { id: 'mensal', label: 'Mensal' }
                                                        ].map((freq) => (
                                                            <button
                                                                key={freq.id}
                                                                onClick={() => updateSettings({ reportFrequency: freq.id })}
                                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ${settings.reportFrequency === freq.id
                                                                    ? 'bg-primary text-white border-primary shadow-md'
                                                                    : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200'
                                                                    }`}
                                                            >
                                                                {freq.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Appearance Settings */}
                        {activeTab === 'appearance' && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Aparência</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Tema
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {['light', 'dark'].map((theme) => (
                                                <button
                                                    key={theme}
                                                    onClick={() => updateSettings({ theme })}
                                                    className={`p-4 rounded-lg border-2 transition-all ${settings.theme === theme
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium capitalize">{theme === 'light' ? 'Claro' : 'Escuro'}</span>
                                                        {settings.theme === theme && <Check size={18} className="text-primary" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Cor Primária
                                        </label>
                                        <div className="grid grid-cols-5 gap-3">
                                            {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'].map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => updateSettings({ primaryColor: color })}
                                                    className={`h-12 rounded-lg border-2 transition-all ${settings.primaryColor === color ? 'border-slate-900 scale-110' : 'border-transparent'
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div>
                                            <h4 className="font-semibold text-slate-900">Modo Compacto</h4>
                                            <p className="text-sm text-slate-500 mt-1">Reduz o espaçamento na interface</p>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ compactMode: !settings.compactMode })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.compactMode ? 'bg-primary' : 'bg-slate-200'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.compactMode ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Security Settings */}
                        {activeTab === 'security' && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Segurança</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div>
                                            <h4 className="font-semibold text-slate-900">Autenticação de Dois Fatores</h4>
                                            <p className="text-sm text-slate-500 mt-1">Adicione uma camada extra de segurança</p>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ twoFactorAuth: !settings.twoFactorAuth })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.twoFactorAuth ? 'bg-primary' : 'bg-slate-200'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Tempo Limite de Sessão (minutos)
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.sessionTimeout}
                                            onChange={(e) => updateSettings({ sessionTimeout: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Validade da Senha (dias)
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.passwordExpiry}
                                            onChange={(e) => updateSettings({ passwordExpiry: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>

                                    <button className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                                        <Lock size={16} />
                                        Alterar Senha
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Data Settings */}
                        {activeTab === 'data' && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Gerenciamento de Dados</h3>
                                <div className="space-y-4">
                                    <div className="p-6 bg-blue-50 border border-blue-100 rounded-lg">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-blue-100 rounded-lg">
                                                <Download size={24} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900">Exportar Dados</h4>
                                                <p className="text-sm text-slate-600 mt-2">
                                                    Exporte todos os seus dados em formato CSV ou JSON
                                                </p>
                                                <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all">
                                                    Exportar Agora
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-green-50 border border-green-100 rounded-lg">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-green-100 rounded-lg">
                                                <Upload size={24} className="text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900">Importar Dados</h4>
                                                <p className="text-sm text-slate-600 mt-2">
                                                    Importe dados de sistemas anteriores
                                                </p>
                                                <button className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-all">
                                                    Importar Arquivo
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-red-50 border border-red-100 rounded-lg">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-red-100 rounded-lg">
                                                <Database size={24} className="text-red-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900">Limpar Cache</h4>
                                                <p className="text-sm text-slate-600 mt-2">
                                                    Limpe o cache do sistema para resolver problemas de performance
                                                </p>
                                                <button className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-all">
                                                    Limpar Cache
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                onClose={() => setFeedback({ ...feedback, isOpen: false })}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
            />
        </div>
    );
};

export default Settings;
