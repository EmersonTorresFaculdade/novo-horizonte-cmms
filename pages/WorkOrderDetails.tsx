import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
   ChevronRight,
   MapPin,
   AlertOctagon,
   Save,
   Settings,
   Plus,
   Trash2,
   Package,
   User,
   Pencil,
   AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';

interface WorkOrder {
   id: string;
   order_number: string;
   issue: string; // Descrição limpa
   failure_type: string; // Novo campo
   technical_report?: string; // Novo campo
   status: string;
   priority: string;
   hourly_rate?: number;
   created_at: string;
   updated_at: string;
   asset_id: string;
   technician_id: string | null;
   requester_id: string | null;
   assets: {
      name: string;
      sector: string;
      model: string;
      manufacturer: string;
   };
   technicians: {
      name: string;
   } | null;
   users?: {
      name: string;
      role: string;
   } | null;
}

interface Technician {
   id: string;
   name: string;
   hourly_rate?: number;
}

interface InventoryItem {
   id: string;
   name: string;
   quantity: number;
   unit_value: number;
}

interface WorkOrderPart {
   id: string;
   item_id: string;
   quantity: number;
   inventory_items: {
      name: string;
      unit_value: number;
   };
}

const WorkOrderDetails = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const location = useLocation();
   const { user } = useAuth();
   const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';

   // Determine mode based on URL
   const isEditing = location.pathname.endsWith('/edit');

   const [loading, setLoading] = useState(true);
   const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
   const [technicians, setTechnicians] = useState<Technician[]>([]);

   // Parts
   const [availableParts, setAvailableParts] = useState<InventoryItem[]>([]);
   const [usedParts, setUsedParts] = useState<WorkOrderPart[]>([]);
   const [selectedPartId, setSelectedPartId] = useState('');
   const [partQuantity, setPartQuantity] = useState(1);

   // Form State
   const [status, setStatus] = useState('');
   const [selectedTechId, setSelectedTechId] = useState('');
   const [report, setReport] = useState('');
   const [hourlyRate, setHourlyRate] = useState<number>(0);

   // Edit Fields (Admin)
   const [editIssue, setEditIssue] = useState('');
   const [editPriority, setEditPriority] = useState('');
   const [editFailureType, setEditFailureType] = useState('');

   const [saving, setSaving] = useState(false);

   useEffect(() => {
      if (id) {
         fetchOrderDetails();
         fetchTechnicians();
         fetchParts();
      }
   }, [id]);

   const fetchOrderDetails = async () => {
      try {
         // Fetch Order
         const { data, error } = await supabase
            .from('work_orders')
            .select(`
                *,
                assets (name, sector, model, manufacturer),
                technicians (name),
                users (name, role)
            `)
            .eq('id', id)
            .single();

         if (error) throw error;
         // Cast data to WorkOrder to handle new columns not yet in Supabase types
         const workOrderData = data as unknown as WorkOrder;

         setWorkOrder(workOrderData);
         setStatus(workOrderData.status);
         setEditIssue(workOrderData.issue);
         setEditPriority(workOrderData.priority);
         setEditFailureType(workOrderData.failure_type || 'mecanica'); // Default fallback
         setReport(workOrderData.technical_report || ''); // Populate report state
         setHourlyRate(workOrderData.hourly_rate || 0);

         if (workOrderData.technician_id) setSelectedTechId(workOrderData.technician_id);

         // Fetch Used Parts
         const { data: partsData } = await supabase
            .from('work_order_parts')
            .select(`
                id, item_id, quantity,
                inventory_items (name, unit_value)
            `)
            .eq('work_order_id', id);

         if (partsData) setUsedParts(partsData);

      } catch (error) {
         console.error('Error fetching order:', error);
      } finally {
         setLoading(false);
      }
   };

   const fetchTechnicians = async () => {
      const { data } = await supabase.from('technicians').select('id, name, hourly_rate');
      if (data) setTechnicians(data);
   };

   const fetchParts = async () => {
      const { data } = await supabase.from('inventory_items').select('*').gt('quantity', 0);
      if (data) setAvailableParts(data);
   };

   const handleSave = async () => {
      setSaving(true);
      try {
         const { error } = await supabase
            .from('work_orders')
            .update({
               technician_id: selectedTechId || null,
               status: status,
               issue: editIssue,
               priority: editPriority,
               failure_type: editFailureType,
               technical_report: report,
               hourly_rate: hourlyRate,
               updated_at: new Date().toISOString()
            })
            .eq('id', id);

         if (error) throw error;

         // Trigger Notification
         if (workOrder) {
            await NotificationService.notifyWorkOrderUpdated({
               id: workOrder.id,
               title: `Atualização OS: ${workOrder.order_number}`,
               description: editIssue,
               priority: editPriority,
               status: status,
               assetId: workOrder.asset_id,
               locationId: '',
               assignedTo: selectedTechId || undefined,
               requesterId: workOrder.requester_id || undefined,
               technical_report: report
            });
         }

         alert('Alterações salvas com sucesso!');
         // Navigate back to details view
         navigate(`/work-orders/${id}`);
         fetchOrderDetails();
      } catch (error) {
         console.error('Error updating order:', error);
         alert(`Erro ao salvar: ${(error as any).message || 'Erro desconhecido'}`);
      } finally {
         setSaving(false);
      }
   };

   const handleAddPart = async () => {
      if (!selectedPartId) return;
      try {
         const { error } = await supabase
            .from('work_order_parts')
            .insert({
               work_order_id: id,
               item_id: selectedPartId,
               quantity: partQuantity
            });

         if (error) throw error;

         fetchOrderDetails();
         setSelectedPartId('');
         setPartQuantity(1);
      } catch (error) {
         console.error('Error adding part:', error);
         alert('Erro ao adicionar peça.');
      }
   };

   const handleRemovePart = async (partId: string) => {
      if (!confirm('Tem certeza que deseja remover esta peça?')) return;
      try {
         const { error } = await supabase
            .from('work_order_parts')
            .delete()
            .eq('id', partId);

         if (error) throw error;
         fetchOrderDetails();
      } catch (error) {
         console.error('Error removing part:', error);
         alert('Erro ao remover peça.');
      }
   };

   if (loading) return <div className="p-8 text-center">Carregando detalhes...</div>;
   if (!workOrder) return <div className="p-8 text-center">Ordem de serviço não encontrada.</div>;

   return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
         {/* Breadcrumb / Title */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="text-xl font-bold font-mono text-primary">#{workOrder.order_number || workOrder.id.substring(0, 6)}</span>
               <span className="text-2xl font-bold text-slate-800">- {workOrder.assets?.name}</span>

               {/* Show Checkmark if completed */}
               {workOrder.status === 'Concluído' ?
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">CONCLUÍDO</span>
                  : <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 uppercase">{workOrder.status}</span>
               }
            </div>
            <div className="flex items-center gap-2">
               {isEditing ? (
                  <button
                     onClick={() => navigate(`/work-orders/${id}`)}
                     className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors"
                  >
                     Cancelar Edição
                  </button>
               ) : (
                  isAdmin && (
                     <button
                        onClick={() => navigate(`/work-orders/${id}/edit`)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-primary transition-colors"
                        title="Editar Ordem de Serviço"
                     >
                        <Pencil size={20} />
                     </button>
                  )
               )}
               <button onClick={() => navigate('/work-orders')} className="rounded-full hover:bg-slate-100 p-2 text-slate-500 transition-colors">
                  <ChevronRight size={24} />
               </button>
            </div>
         </div>

         {/* Info Grid */}
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 grid grid-cols-2 gap-8">
            <div className="space-y-1">
               <p className="text-xs text-slate-500 font-medium uppercase">Solicitante</p>
               <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">
                     {workOrder.users?.name || 'Usuário do Sistema'}
                  </p>
               </div>
            </div>
            <div className="space-y-1 text-right">
               <p className="text-xs text-slate-500 font-medium uppercase">Abertura</p>
               <p className="text-sm font-semibold text-slate-900">{new Date(workOrder.created_at).toLocaleString('pt-BR')}</p>
            </div>
         </div>

         {/* Issue Description & Priority (Editable if Admin) */}
         <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 relative group">
            <div className="flex justify-between items-center mb-3">
               <p className="text-xs text-slate-500 font-medium uppercase flex items-center gap-2">
                  Descrição do Problema
                  {isAdmin && <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1"><Pencil size={10} /> Editável</span>}
               </p>

               <div className="flex items-center gap-2">
                  {/* Priority Badge / Selector */}
                  {isAdmin ? (
                     <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        disabled={!isEditing}
                        className={`text-xs font-bold uppercase border rounded px-2 py-1 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                        ${editPriority === 'Alta' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                              editPriority === 'Média' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                 'bg-blue-100 text-blue-800 border-blue-200'}`}
                     >
                        <option value="Baixa">Prioridade: Baixa</option>
                        <option value="Média">Prioridade: Média</option>
                        <option value="Alta">Prioridade: Alta</option>
                        <option value="Crítica">Prioridade: Crítica</option>
                     </select>
                  ) : (
                     <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ml-2
                      ${workOrder.priority === 'Alta' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                           workOrder.priority === 'Média' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                        Prioridade: {workOrder.priority}
                     </span>
                  )}
               </div>
            </div>

            {isAdmin ? (
               <textarea
                  value={editIssue}
                  onChange={(e) => setEditIssue(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-white p-3 rounded-md border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 font-medium disabled:bg-slate-50 disabled:text-slate-500"
                  rows={3}
               />
            ) : (
               <p className="text-slate-800 font-medium text-lg leading-relaxed">{workOrder.issue}</p>
            )}
         </div>

         {/* Call Management Section (Gestão do Chamado) */}
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
               <Settings size={18} className="text-slate-400" />
               Gestão do Chamado
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                  <select
                     value={status}
                     onChange={(e) => setStatus(e.target.value)}
                     disabled={!isEditing}
                     className="w-full p-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  >
                     <option>Pendente</option>
                     <option>Em Manutenção</option>
                     <option>Aguardando Peça</option>
                     <option>Concluído</option>
                     <option>Cancelado</option>
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Falha</label>
                  <select
                     value={editFailureType}
                     onChange={(e) => setEditFailureType(e.target.value)}
                     disabled={!isEditing}
                     className="w-full p-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-slate-50 disabled:text-slate-500 capitalize"
                  >
                     <option value="mecanica">Mecânica</option>
                     <option value="eletrica">Elétrica</option>
                     <option value="hidraulica">Hidráulica</option>
                     <option value="software">Software</option>
                     <option value="outro">Outro</option>
                  </select>
               </div>
            </div>

            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Técnico Responsável</label>
                  <select
                     value={selectedTechId}
                     onChange={(e) => {
                        const techId = e.target.value;
                        setSelectedTechId(techId);
                        if (techId) {
                           const tech = technicians.find(t => t.id === techId);
                           if (tech && tech.hourly_rate) {
                              setHourlyRate(tech.hourly_rate);
                           }
                        }
                     }}
                     disabled={!isEditing}
                     className="w-full p-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  >
                     <option value="">-- Selecione --</option>
                     {technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                     ))}
                  </select>
               </div>

               {selectedTechId && (
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        Valor Hora (R$)
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-normal">Editável</span>
                     </label>
                     <input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        disabled={!isEditing}
                        className="w-full p-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="0.00"
                        step="0.01"
                     />
                  </div>
               )}
            </div>

            <div className="space-y-2 mb-6 mt-6">
               <label className="text-xs font-bold text-slate-500 uppercase">Relatório Técnico / Solução</label>
               <textarea
                  rows={4}
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Descreva o serviço realizado..."
                  className="w-full p-4 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary/20 outline-none resize-none disabled:bg-slate-50 disabled:text-slate-500"
               ></textarea>
            </div>

            {isEditing && (
               <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                     onClick={handleSave}
                     disabled={saving}
                     className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-70"
                  >
                     <Save size={18} />
                     {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
               </div>
            )}
         </div>

         {/* Parts Section */}
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
               <Package size={18} className="text-slate-400" />
               Peças Utilizadas
            </h3>

            {usedParts.length > 0 && (
               <div className="mb-6 space-y-2 border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b grid grid-cols-12 text-xs font-bold text-slate-500 uppercase">
                     <div className="col-span-6">Item</div>
                     <div className="col-span-2 text-right">Qtd</div>
                     <div className="col-span-3 text-right">Valor Unit.</div>
                     <div className="col-span-1"></div>
                  </div>
                  {usedParts.map(part => (
                     <div key={part.id} className="grid grid-cols-12 items-center px-4 py-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <div className="col-span-6 font-medium text-slate-700">{part.inventory_items?.name}</div>
                        <div className="col-span-2 text-right text-slate-600">{part.quantity}</div>
                        <div className="col-span-3 text-right text-slate-600">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(part.inventory_items?.unit_value || 0)}
                        </div>
                        <div className="col-span-1 text-right">
                           {isEditing && (
                              <button
                                 onClick={() => handleRemovePart(part.id)}
                                 className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-all"
                                 title="Remover peça"
                              >
                                 <Trash2 size={16} />
                              </button>
                           )}
                        </div>
                     </div>
                  ))}
                  <div className="bg-slate-50 px-4 py-3 grid grid-cols-12 text-xs font-bold text-slate-700">
                     <div className="col-span-8 text-right pr-4">TOTAL PEÇAS:</div>
                     <div className="col-span-3 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                           usedParts.reduce((acc, part) => acc + (part.quantity * (part.inventory_items?.unit_value || 0)), 0)
                        )}
                     </div>
                     <div className="col-span-1"></div>
                  </div>
               </div>
            )}

            {isEditing && (
               <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                     <Package size={18} className="text-slate-400" />
                     Adicionar Peças
                  </h3>
                  <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                     <select
                        value={selectedPartId}
                        onChange={(e) => setSelectedPartId(e.target.value)}
                        className="flex-1 p-2.5 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20"
                     >
                        <option value="">Selecione uma peça para adicionar...</option>
                        {availableParts.map(part => (
                           <option key={part.id} value={part.id}>
                              {part.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(part.unit_value)} (Estoque: {part.quantity})
                           </option>
                        ))}
                     </select>
                     <input
                        type="number"
                        value={partQuantity}
                        onChange={(e) => setPartQuantity(parseInt(e.target.value))}
                        min={1}
                        className="w-20 p-2.5 rounded-lg border border-slate-300 text-center text-sm outline-none focus:ring-2 focus:ring-primary/20"
                     />
                     <button
                        onClick={handleAddPart}
                        disabled={!selectedPartId}
                        className="bg-primary text-white p-2.5 rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                     >
                        <Plus size={18} />
                     </button>
                  </div>
               </div>
            )}

         </div>
      </div>
   );
};

export default WorkOrderDetails;