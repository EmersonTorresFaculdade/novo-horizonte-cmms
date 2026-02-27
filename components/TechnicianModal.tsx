import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Loader2, User, Briefcase, Phone, DollarSign } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

interface TechnicianModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (technician: TechnicianData) => Promise<void>;
    technician?: TechnicianData | null;
}

export interface TechnicianData {
    id?: string;
    name: string;
    specialty: string;
    contact: string;
    status: string;
    avatar?: string;
}

const TechnicianModal: React.FC<TechnicianModalProps> = ({ isOpen, onClose, onSave, technician }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<TechnicianData>({
        name: '',
        specialty: '',
        contact: '',
        status: 'Ativo',
        avatar: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error' | 'confirm' | 'info';
        title: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (technician) {
            setFormData({
                ...technician
            });
        } else {
            setFormData({
                name: '',
                specialty: '',
                contact: '',
                status: 'Ativo',
                avatar: ''
            });
        }
        setErrors({});
    }, [technician, isOpen]);

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, avatar: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }
        if (!formData.specialty.trim()) {
            newErrors.specialty = 'Especialidade é obrigatória';
        }
        if (!formData.contact.trim()) {
            newErrors.contact = 'Contato é obrigatório';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar técnico:', error);
            setFeedback({
                type: 'error',
                title: 'Erro ao Salvar',
                message: 'Ocorreu um erro ao tentar salvar os dados do técnico. Verifique sua conexão e tente novamente.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            {technician ? 'Editar Técnico' : 'Novo Técnico'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {technician ? 'Atualize as informações do técnico' : 'Adicione um novo técnico à equipe'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Avatar Upload */}
                    <div className="flex justify-center mb-6">
                        <div className="relative group">
                            {formData.avatar ? (
                                <img
                                    src={formData.avatar}
                                    alt="Avatar"
                                    className="size-24 rounded-full object-cover border-4 border-slate-100 shadow-lg"
                                />
                            ) : (
                                <div className="size-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-slate-100 shadow-lg flex items-center justify-center">
                                    <User size={40} className="text-primary" />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleImageClick}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <Camera size={24} className="text-white" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <User size={16} />
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`w-full px-4 py-3 rounded-lg border ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                        } focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all`}
                                    placeholder="Ex: João da Silva"
                                />
                                {errors.name && (
                                    <p className="text-sm text-brand-alert mt-1">{errors.name}</p>
                                )}
                            </div>
                        </div>

                        {/* Especialidade e Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <Briefcase size={16} />
                                    Especialidade *
                                </label>
                                <select
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    className={`w-full px-4 py-3 rounded-lg border ${errors.specialty ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                        } focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all`}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Máquinas">Máquinas</option>
                                    <option value="Predial">Predial</option>
                                    <option value="Outros">Outros</option>
                                    <option value="Geral">Geral</option>
                                </select>
                                {errors.specialty && (
                                    <p className="text-sm text-brand-alert mt-1">{errors.specialty}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                    <option value="Em Campo">Em Campo</option>
                                </select>
                            </div>
                        </div>

                        {/* Contato */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <Phone size={16} />
                                Contato *
                            </label>
                            <input
                                type="tel"
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                className={`w-full px-4 py-3 rounded-lg border ${errors.contact ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                    } focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all`}
                                placeholder="(11) 99999-9999"
                            />
                            {errors.contact && (
                                <p className="text-sm text-brand-alert mt-1">{errors.contact}</p>
                            )}
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            technician ? 'Atualizar' : 'Criar Técnico'
                        )}
                    </button>
                </div>
            </div>

            {/* Feedback Modal para Erros */}
            {feedback && (
                <FeedbackModal
                    isOpen={!!feedback}
                    onClose={() => setFeedback(null)}
                    type={feedback.type}
                    title={feedback.title}
                    message={feedback.message}
                />
            )}
        </div>
    );
};

export default TechnicianModal;
