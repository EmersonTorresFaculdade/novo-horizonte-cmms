import React, { useState, useEffect } from 'react';
import { X, Building2, Phone, Mail, FileText, Wrench, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { ThirdPartyCompany } from '../types';

export type ThirdPartyFormData = Omit<ThirdPartyCompany, 'id' | 'created_at' | 'updated_at'> & { id?: string };

interface ThirdPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ThirdPartyFormData) => Promise<void>;
    company: ThirdPartyCompany | null;
}

const ThirdPartyModal: React.FC<ThirdPartyModalProps> = ({ isOpen, onClose, onSave, company }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<ThirdPartyFormData>({
        name: '',
        code: '',
        cnpj: '',
        contact_name: '',
        phone: '',
        email: '',
        specialty: '',
        status: 'Ativo',
        logo_url: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const availableSpecialties = React.useMemo(() => {
        const specs = [
            { id: 'Máquinas', label: 'Máquinas', permission: user?.manage_equipment },
            { id: 'Predial', label: 'Predial', permission: user?.manage_predial },
            { id: 'Outros', label: 'Outros', permission: user?.manage_others }
        ];

        if (user?.role === 'admin_root') return specs;
        return specs.filter(s => s.permission);
    }, [user]);

    useEffect(() => {
        if (company) {
            console.log('ThirdPartyModal: Loading company into form:', company);
            setFormData({
                id: company.id,
                code: company.code || '',
                name: company.name || '',
                cnpj: company.cnpj || '',
                contact_name: company.contact_name || '',
                phone: company.phone || '',
                email: company.email || '',
                specialty: company.specialty || '',
                status: company.status || 'Ativo',
                logo_url: company.logo_url || ''
            });
        } else {
            setFormData({
                name: '',
                code: '',
                cnpj: '',
                contact_name: '',
                phone: '',
                email: '',
                specialty: availableSpecialties.length === 1 ? availableSpecialties[0].id : '',
                status: 'Ativo',
                logo_url: ''
            });
        }
        setError('');
    }, [company, isOpen, availableSpecialties]);

    if (!isOpen) return null;

    const generateAutoCode = async () => {
        const { supabase } = await import('../lib/supabase');
        const prefix = 'EMP-';
        const { data: existing, error } = await supabase
            .from('third_party_companies')
            .select('code')
            .ilike('code', `${prefix}%`);

        if (error || !existing || existing.length === 0) {
            return `${prefix}001`;
        }

        const numbers = existing
            .map(a => {
                const parts = (a.code || '').split('-');
                return parts.length > 1 ? parseInt(parts[1], 10) : 0;
            })
            .filter(n => !isNaN(n));

        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        return `${prefix}${(maxNumber + 1).toString().padStart(3, '0')}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, logo_url: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.contact_name || !formData.specialty) {
            setError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            setIsLoading(true);
            let finalCode = formData.code;
            if (!formData.id && !finalCode) {
                finalCode = await generateAutoCode();
            }

            const payload: ThirdPartyFormData = {
                id: formData.id,
                code: finalCode,
                name: formData.name,
                cnpj: formData.cnpj || null,
                contact_name: formData.contact_name,
                phone: formData.phone,
                email: formData.email || null,
                specialty: formData.specialty,
                status: formData.status as any,
                logo_url: formData.logo_url || null
            };
            console.log('ThirdPartyModal: FINAL Submitting payload:', payload);
            await onSave(payload);
        } catch (err: any) {
            console.error('ThirdPartyModal: Error during onSave:', err);
            setError(err.message || 'Erro ao salvar empresa parceira.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatPhone = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/\D/g, '');
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength <= 2) return phoneNumber;
        if (phoneNumberLength <= 6) {
            return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
        }
        if (phoneNumberLength <= 10) {
            return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)}-${phoneNumber.slice(6, 10)}`;
        }
        return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
    };

    const formatCNPJ = (value: string) => {
        const cnpj = value.replace(/\D/g, '');
        if (cnpj.length <= 2) return cnpj;
        if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
        if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
        if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
        return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-primary">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                {company ? 'Editar Empresa Parceira' : 'Nova Empresa Parceira'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                Preencha os dados da empresa terceirizada
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form id="third-party-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 config-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-brand-alert rounded-xl text-sm border border-red-100 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-alert" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Logo Upload Section */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-primary-light/50 hover:bg-emerald-50/50 transition-all overflow-hidden"
                                >
                                    {formData.logo_url ? (
                                        <img src={formData.logo_url} alt="Logo preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400 group-hover:text-primary">
                                            <Camera size={24} />
                                            <span className="text-[10px] font-medium mt-1">Logo</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                            <div className="w-full mt-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 text-center">
                                    Ou cole o link da imagem
                                </label>
                                <input
                                    type="text"
                                    value={formData.logo_url}
                                    onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="https://exemplo.com/logo.png"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Razão Social / Fantasia *
                                </label>
                                <div className="relative">
                                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        placeholder="Nome da empresa"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    CNPJ
                                </label>
                                <div className="relative">
                                    <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.cnpj || ''}
                                        onChange={e => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        placeholder="00.000.000/0000-00"
                                        maxLength={18}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Nome do Contato *
                            </label>
                            <input
                                type="text"
                                value={formData.contact_name}
                                onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="Nome do representante principal"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Telefone/WhatsApp
                                </label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        placeholder="contato@empresa.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Especialidade *
                                </label>
                                <div className="relative">
                                    <Wrench size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={formData.specialty}
                                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {availableSpecialties.map(spec => (
                                            <option key={spec.id} value={spec.id}>{spec.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                    <option value="Em Campo">Em Campo</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-6 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            'Salvar Empresa'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThirdPartyModal;
