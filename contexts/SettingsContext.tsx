import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AppSettings {
    companyName: string;
    companyEmail: string;
    companyLogo: string | null;
    timezone: string;
    language: string;
    emailNotifications: boolean;
    smsNotifications: boolean;
    workOrderAlerts: boolean;
    criticalAlerts: boolean;
    dailyReport: boolean;
    theme: string;
    primaryColor: string;
    compactMode: boolean;
    twoFactorAuth: boolean;
    sessionTimeout: number;
    passwordExpiry: number;
}

const defaultSettings: AppSettings = {
    companyName: 'Novo Horizonte',
    companyEmail: 'contato@novohorizonte.com',
    companyLogo: null,
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    emailNotifications: true,
    smsNotifications: false,
    workOrderAlerts: true,
    criticalAlerts: true,
    dailyReport: true,
    theme: 'light',
    primaryColor: '#10b981',
    compactMode: false,
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90
};

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
    saveSettings: () => Promise<void>;
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
                    // Check if we need to migrate local logo to DB
                    let effectiveLogo = data.company_logo;
                    if (!effectiveLogo && prev.companyLogo) {
                        console.log('Migrating local logo to database...');
                        effectiveLogo = prev.companyLogo;

                        // Async update to DB
                        supabase.from('app_settings')
                            .update({
                                company_logo: effectiveLogo,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', data.id)
                            .then(({ error }) => {
                                if (error) console.error('Error migrating logo:', error);
                            });
                    }

                    const dbSettings: Partial<AppSettings> = {
                        companyName: data.company_name,
                        companyLogo: effectiveLogo,
                        theme: data.theme,
                        // Map other fields as we add them to the DB schema
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

        // We defer the DB save to saveSettings or handle it here if requested
        // For now, let's auto-save to DB if it's a critical change
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            // Save to Local Storage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

            // Save to Database
            // First check if we have a row
            const { data: existing } = await supabase
                .from('app_settings')
                .select('id')
                .single();

            const dbPayload = {
                company_name: settings.companyName,
                company_logo: settings.companyLogo,
                theme: settings.theme,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                await supabase
                    .from('app_settings')
                    .update(dbPayload)
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('app_settings')
                    .insert(dbPayload);
            }

            setTimeout(() => {
                setIsSaving(false);
            }, 500);
        } catch (e) {
            console.error('Error saving settings:', e);
            setIsSaving(false);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, saveSettings, isSaving, loading }}>
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
