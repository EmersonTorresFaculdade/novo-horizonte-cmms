import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, AlertTriangle, Package, QrCode, Tag, DollarSign, Search, Edit, Trash2, Plus, Save, Eraser, Download, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FeedbackModal from '../components/FeedbackModal';

interface InventoryItem {
    id: string;
    sku: string;
    name: string;
    quantity: number;
    unit_value: number;
    min_stock: number;
    status: string;
}

const Inventory = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error' | 'confirm' | 'info';
        title: string;
        message: string;
        onConfirm?: () => void;
    } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        quantity: 0,
        unit_value: 0,
        min_stock: 5 // Default minimum stock
    });

    const [stats, setStats] = useState({
        totalItems: 0,
        totalValue: 0,
        criticalStock: 0
    });

    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadInventory();
    }, []);

    useEffect(() => {
        calculateStats();
    }, [items]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('name');

            if (error) throw error;

            // Ensure numbers are numbers, not strings from Postgres
            const formattedData = (data || []).map((item: any) => ({
                ...item,
                quantity: Number(item.quantity) || 0,
                unit_value: Number(item.unit_value) || 0,
                min_stock: Number(item.min_stock) || 5
            }));

            setItems(formattedData);
        } catch (error) {
            console.error('Erro ao carregar estoque:', error);
            setFeedback({
                type: 'error',
                title: 'Erro de Carregamento',
                message: 'Não foi possível carregar os itens do estoque.'
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const totalItems = items.length;
        const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.unit_value), 0);
        // Critical stock: Status explicitly indicative OR quantity <= min_stock
        const criticalStock = items.filter(item =>
            ['Baixo Estoque', 'Esgotado', 'Atenção'].includes(item.status) || item.quantity <= item.min_stock
        ).length;

        setStats({ totalItems, totalValue, criticalStock });
    };

    const determineStatus = (qty: number, min: number) => {
        if (qty <= 0) return 'Esgotado';
        if (qty <= min) return 'Baixo Estoque';
        return 'Normal';
    };

    const handleSave = async () => {
        try {
            if (!formData.sku || !formData.name) {
                setFeedback({
                    type: 'error',
                    title: 'Campos Obrigatórios',
                    message: 'O SKU e a Descrição da peça são obrigatórios.'
                });
                return;
            }

            const qty = Number(formData.quantity);
            const val = Number(formData.unit_value);
            const min = Number(formData.min_stock);

            const status = determineStatus(qty, min);
            const payload = {
                sku: formData.sku,
                name: formData.name,
                quantity: qty,
                unit_value: val,
                min_stock: min,
                status
            };

            if (isEditing && editingId) {
                const { error } = await supabase
                    .from('inventory_items')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
                setFeedback({
                    type: 'success',
                    title: 'Peça Atualizada',
                    message: 'Os dados da peça foram atualizados no estoque.'
                });
            } else {
                const { error } = await supabase
                    .from('inventory_items')
                    .insert([payload]);
                if (error) throw error;
                setFeedback({
                    type: 'success',
                    title: 'Peça Cadastrada',
                    message: 'A nova peça foi adicionada ao inventário.'
                });
            }

            resetForm();
            loadInventory();
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            setFeedback({
                type: 'error',
                title: 'Erro ao Salvar',
                message: error.message || 'Ocorreu um erro ao tentar salvar os dados da peça.'
            });
        }
    };

    const handleEdit = (item: InventoryItem) => {
        setFormData({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unit_value: item.unit_value,
            min_stock: item.min_stock
        });
        setEditingId(item.id);
        setIsEditing(true);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        setFeedback({
            type: 'confirm',
            title: 'Excluir Peça?',
            message: 'Deseja realmente remover esta peça do inventário? Esta ação é permanente.',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('inventory_items')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                    setFeedback({
                        type: 'success',
                        title: 'Peça Removida',
                        message: 'O item foi excluído do estoque com sucesso.'
                    });
                    loadInventory();
                } catch (error: any) {
                    console.error('Erro ao excluir:', error);
                    setFeedback({
                        type: 'error',
                        title: 'Erro ao Excluir',
                        message: error.message || 'Não foi possível excluir a peça selecionada.'
                    });
                }
            }
        });
    };

    const resetForm = () => {
        setFormData({ sku: '', name: '', quantity: 0, unit_value: 0, min_stock: 5 });
        setIsEditing(false);
        setEditingId(null);
    };

    const handleExportCSV = () => {
        try {
            const headers = ['SKU', 'Nome', 'Quantidade', 'Minimo', 'Valor Unit.', 'Valor Total', 'Status'];
            const csvContent = [
                headers.join(','),
                ...items.map(item => [
                    item.sku,
                    `"${item.name}"`,
                    item.quantity,
                    item.min_stock,
                    item.unit_value.toFixed(2),
                    (item.quantity * item.unit_value).toFixed(2),
                    item.status
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `estoque_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            setFeedback({
                type: 'error',
                title: 'Erro na Exportação',
                message: 'Ocorreu um erro ao gerar o arquivo CSV do estoque.'
            });
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gerenciamento de Estoque</h2>
                    <p className="text-sm text-slate-500">Cadastro de novas peças e controle de inventário.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                    >
                        <Download size={18} /> Exportar CSV
                    </button>
                    {/* Botão Novo removido pois o formulário já está na tela, mas poderíamos usar para scrollar até ele */}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total de Itens</p>
                        <h3 className="text-2xl font-bold mt-1 text-slate-900">{stats.totalItems}</h3>
                    </div>
                    <div className="p-2 bg-emerald-50/50 rounded-lg text-primary"><Package size={20} /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Valor em Estoque</p>
                        <h3 className="text-2xl font-bold mt-1 text-slate-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
                        </h3>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg text-primary"><DollarSign size={20} /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-start justify-between ring-1 ring-brand-alert/10">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Estoque Crítico</p>
                        <h3 className="text-2xl font-bold mt-1 text-brand-alert">{stats.criticalStock}</h3>
                        <p className="text-xs text-brand-alert mt-1">Itens abaixo de 5 un.</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg text-brand-alert"><AlertTriangle size={20} /></div>
                </div>
            </div>

            {/* Form */}
            <div ref={formRef} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 transition-all">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-primary/10 text-primary rounded-full">
                            {isEditing ? <Edit size={16} /> : <Plus size={16} />}
                        </div>
                        <h3 className="font-bold text-slate-900">
                            {isEditing ? 'Editar Peça' : 'Novo Cadastro'}
                        </h3>
                    </div>
                    {isEditing && (
                        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Código (SKU)</label>
                        <div className="relative">
                            <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ex: P-1023"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Descrição da Peça</label>
                        <div className="relative">
                            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ex: Rolamento Esférico 20mm Inox"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Valor Unit. (R$)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                            <input
                                type="number"
                                placeholder="0,00"
                                value={formData.unit_value}
                                onChange={(e) => setFormData({ ...formData, unit_value: Number(e.target.value) })}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Quantidade</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-sm font-medium text-slate-700">Estoque Mínimo</label>
                        <div className="relative">
                            <AlertTriangle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="number"
                                placeholder="5"
                                value={formData.min_stock}
                                onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2 items-end">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2"
                        >
                            <Eraser size={16} /> Limpar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-sm"
                        >
                            <Save size={16} /> {isEditing ? 'Atualizar' : 'Salvar Cadastro'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Inventário Atual</h3>
                    <div className="relative w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar peça..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 size={32} className="animate-spin text-primary" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center p-12 text-slate-500">
                            Nenhum item encontrado.
                        </div>
                    ) : (
                        <table className="min-w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-3">Código</th>
                                    <th className="px-6 py-3 w-1/3">Descrição</th>
                                    <th className="px-6 py-3">Valor Unit.</th>
                                    <th className="px-6 py-3">Valor Total</th>
                                    <th className="px-6 py-3">Min.</th>
                                    <th className="px-6 py-3">Estoque</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{item.sku}</td>
                                        <td className="px-6 py-4">{item.name}</td>
                                        <td className="px-6 py-4">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_value)}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_value * item.quantity)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{item.min_stock}</td>
                                        <td className={`px-6 py-4 font-bold ${item.quantity <= item.min_stock ? 'text-brand-alert' : 'text-slate-900'}`}>
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                                                ${item.status === 'Normal' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    item.status === 'Atenção' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                        'bg-red-50 text-red-700 border-red-100'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-slate-400 hover:text-brand-alert hover:bg-red-50 p-1 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Feedback Modal Reutilizável */}
            {feedback && (
                <FeedbackModal
                    isOpen={!!feedback}
                    onClose={() => setFeedback(null)}
                    type={feedback.type}
                    title={feedback.title}
                    message={feedback.message}
                    onConfirm={feedback.onConfirm}
                />
            )}
        </div>
    );
};

export default Inventory;