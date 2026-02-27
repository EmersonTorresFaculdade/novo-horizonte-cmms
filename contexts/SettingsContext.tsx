import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface UpdateAppSettingsParams {
    p_company_name: string;
    p_company_logo: string | null;
    p_theme: string;
    p_webhook_url: string;
    p_webhook_enabled: boolean;
    p_email_notifications: boolean;
    p_whatsapp_notifications: boolean;
    p_work_order_alerts: boolean;
    p_critical_alerts: boolean;
    p_daily_report: boolean;
    p_report_frequency: string;
    p_company_email: string;
    p_board_emails: string;
}

interface AppSettings {
    companyName: string;
    companyEmail: string;
    companyLogo: string | null;
    timezone: string;
    language: string;
    emailNotifications: boolean;
    whatsappNotifications: boolean; // Renamed from smsNotifications
    workOrderAlerts: boolean;
    criticalAlerts: boolean;
    dailyReport: boolean;
    theme: string;
    primaryColor: string;
    compactMode: boolean;
    twoFactorAuth: boolean;
    sessionTimeout: number;
    passwordExpiry: number;
    webhookUrl?: string;
    webhookEnabled: boolean;
    reportFrequency: string;
    boardEmails: string;
}

const defaultSettings: AppSettings = {
    companyName: 'Novo Horizonte Alumínios',
    companyEmail: 'contato@novohorizonte.com',
    companyLogo: null,
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    emailNotifications: true,
    whatsappNotifications: true, // Default true for WhatsApp as requested
    workOrderAlerts: true,
    criticalAlerts: true,
    dailyReport: true,
    theme: 'light',
    primaryColor: '#10b981',
    compactMode: false,
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    webhookUrl: '',
    webhookEnabled: true,
    reportFrequency: 'diario',
    boardEmails: ''
};

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
    saveSettings: (currentSettings?: AppSettings) => Promise<void>;
    uploadLogo: (file: File | string | null) => Promise<void>;
    isSaving: boolean;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'app_settings';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load settings from Supabase on mount
    useEffect(() => {
        loadSettingsFromDb();

        // Also check localStorage for immediate render (optimistic)
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSettings(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Error loading local settings:', e);
            }
        }
    }, []);

    // Effect to apply appearance settings
    useEffect(() => {
        const root = document.documentElement;

        // Apply Primary Color
        if (settings.primaryColor) {
            root.style.setProperty('--primary-color', settings.primaryColor);

            // Generate a slightly darker version for hover states (simplified)
            // If it's a hex, we could calculate it, or just use opacity/filter in CSS
            // For now, let's just use the same or a fixed darkening if needed
            root.style.setProperty('--primary-dark-color', `${settings.primaryColor}dd`);
        }

        // Apply Theme
        if (settings.theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Apply Compact Mode
        if (settings.compactMode) {
            root.classList.add('compact-mode');
        } else {
            root.classList.remove('compact-mode');
        }
    }, [settings.primaryColor, settings.theme, settings.compactMode]);

    const loadSettingsFromDb = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .single();

            if (error) {
                if (error.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
                    console.error('Error loading settings from DB:', error);
                }
                return;
            }

            if (data) {
                setSettings(prev => {
                    // Logic: Use DB logo if exists. If not, use '/logo.png' as default fallback.
                    const dbData = data as any;
                    let effectiveLogo = dbData.company_logo || '/logo.png';

                    const dbSettings: Partial<AppSettings> = {
                        companyName: dbData.company_name,
                        companyLogo: effectiveLogo,
                        theme: dbData.theme,
                        webhookUrl: dbData.webhook_url || '',
                        webhookEnabled: dbData.webhook_enabled ?? true,
                        // Map new preference columns
                        emailNotifications: dbData.email_notifications ?? true,
                        whatsappNotifications: dbData.whatsapp_notifications ?? false, // Map from DB
                        workOrderAlerts: dbData.work_order_alerts ?? true,
                        criticalAlerts: dbData.critical_alerts ?? true,
                        dailyReport: dbData.daily_report ?? true,
                        reportFrequency: dbData.report_frequency ?? 'diario',
                        boardEmails: dbData.board_emails || ''
                    };

                    const next = { ...prev, ...dbSettings };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                    return next;
                });
            }
        } catch (e) {
            console.error('Unexpected error loading settings:', e);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...newSettings };
            // Optimistic update to local storage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const saveSettings = async (currentSettings?: AppSettings) => {
        setIsSaving(true);
        const settingsToSave = currentSettings || settings;
        console.log('Attempting to save settings (RPC):', settingsToSave);

        try {
            // Save to Local Storage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));

            // Save to Database using RPC to bypass RLS complexity
            const rpcParams: UpdateAppSettingsParams = {
                p_company_name: settingsToSave.companyName,
                p_company_logo: settingsToSave.companyLogo,
                p_theme: settingsToSave.theme,
                p_webhook_url: settingsToSave.webhookUrl || '',
                p_webhook_enabled: settingsToSave.webhookEnabled,
                p_email_notifications: settingsToSave.emailNotifications,
                p_whatsapp_notifications: settingsToSave.whatsappNotifications,
                p_work_order_alerts: settingsToSave.workOrderAlerts,
                p_critical_alerts: settingsToSave.criticalAlerts,
                p_daily_report: settingsToSave.dailyReport,
                p_report_frequency: settingsToSave.reportFrequency || 'diario',
                p_company_email: settingsToSave.companyEmail,
                p_board_emails: settingsToSave.boardEmails || ''
            };

            const { error } = await supabase.rpc('update_app_settings' as any, rpcParams as any);

            if (error) {
                console.error('Error saving to DB (RPC):', error);
                throw error;
            }

            // Force state update to ensure consistency
            setSettings(settingsToSave);

            setTimeout(() => {
                setIsSaving(false);
            }, 500);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
            setIsSaving(false);
            throw e;
        }
    };

    const uploadLogo = async (file: File | string | null) => {
        try {
            let logoUrl: string | null = null;

            if (file instanceof File) {
                // Upload to Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `company-logo-${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(filePath, file);

                if (uploadError) {
                    throw uploadError;
                }

                const { data } = supabase.storage
                    .from('logos')
                    .getPublicUrl(filePath);

                logoUrl = data.publicUrl;
            } else {
                logoUrl = file; // Handle null or string case
            }

            const newSettings = { ...settings, companyLogo: logoUrl };
            setSettings(newSettings);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

            // Immediately save to DB
            await saveSettings(newSettings);
        } catch (error) {
            console.error('Error uploading logo:', error);
            throw error;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, saveSettings, uploadLogo, isSaving, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
