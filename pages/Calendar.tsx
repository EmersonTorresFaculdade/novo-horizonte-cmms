import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Bell,
  Filter,
  Calendar as CalIcon,
  Wrench,
  Droplet,
  Zap,
  X,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Download,
  Building2,
  ShieldAlert,
  Hammer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Category {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const CATEGORIES: Record<string, Category> = {
  'Elétrica': { id: 'elétrica', label: 'ELÉTRICA', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200', icon: <Zap size={10} /> },
  'Hidráulica': { id: 'hidráulica', label: 'HIDRÁULICA', color: 'text-primary', bgColor: 'bg-blue-100', borderColor: 'border-primary-light/20', icon: <Droplet size={10} /> },
  'HVAC': { id: 'hvac', label: 'HVAC', color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200', icon: <Wrench size={10} /> },
  'Civil': { id: 'civil', label: 'CIVIL', color: 'text-rose-600', bgColor: 'bg-rose-100', borderColor: 'border-rose-200', icon: <Hammer size={10} /> },
  'Segurança': { id: 'segurança', label: 'SEGURANÇA', color: 'text-pink-600', bgColor: 'bg-pink-100', borderColor: 'border-pink-200', icon: <ShieldAlert size={10} /> },
};

const BR_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Ano Novo',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-02-18': 'Cinzas',
  '2026-04-03': 'Sexta-feira Santa',
  '2026-04-05': 'Páscoa',
  '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia do Trabalho',
  '2026-06-04': 'Corpus Christi',
  '2026-09-07': 'Independência',
  '2026-10-12': 'Nª Sra Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-15': 'Proclamação da República',
  '2026-11-20': 'Consciência Negra',
  '2026-12-25': 'Natal'
};

interface CalendarEvent {
  id: string;
  order_number: string;
  date: string;
  title: string;
  category: string;
  asset_name: string;
  sector: string;
  technician: {
    name: string;
    avatar?: string | null;
  } | null;
  requester_name: string;
  status: string;
  priority: string;
  maintenance_category: string;
}

export const STATUS_COLORS: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  'Pendente': { color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' },
  'Em Manutenção': { color: 'text-primary', bgColor: 'bg-blue-100', borderColor: 'border-primary-light/20' },
  'Concluído': { color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200' },
  'Cancelado': { color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-slate-200' },
};

const Calendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTower, setSelectedTower] = useState('Todas as Torres');
  const [selectedCategory, setSelectedCategory] = useState('Todas as Categorias');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [isAgendaExpanded, setIsAgendaExpanded] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    month: number;
    year: number;
    x: number;
    y: number;
    holiday?: string | null;
    events: CalendarEvent[];
  } | null>(null);

  // Filter Helper: Check if a date string matches the selected month/year without timezone shift issues
  const isDateInSelectedMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const [year, month] = dateStr.split('-').map(Number);
    return year === selectedYear && month === (selectedMonth + 1);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('work_orders')
        .select(`
               id, order_number, issue, status, priority, date, failure_type, maintenance_category,
               assets (name, sector),
               technicians (name, avatar),
               users:users!requester_id (name)
            `)
        .order('date', { ascending: true });

      if (!isAdmin && user?.id) {
        query = query.eq('requester_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          order_number: item.order_number || 'N/A',
          date: item.date,
          title: item.issue,
          category: mapFailureTypeToCategory(item.failure_type),
          asset_name: item.assets?.name || 'Geral',
          sector: item.assets?.sector || 'N/A',
          technician: item.technicians ? { name: item.technicians.name, avatar: item.technicians.avatar } : null,
          requester_name: item.users?.name || 'Solicitante',
          status: item.status,
          priority: item.priority,
          maintenance_category: item.maintenance_category || 'Equipamento'
        }));
        setEvents(mapped);
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapFailureTypeToCategory = (type: string) => {
    if (!type) return 'Civil';
    const t = type.toLowerCase();
    if (t.includes('eletrica') || t.includes('elétrica')) return 'Elétrica';
    if (t.includes('hidraulica') || t.includes('hidráulica')) return 'Hidráulica';
    if (t.includes('ar') || t.includes('hvac') || t.includes('refrigeracao')) return 'HVAC';
    if (t.includes('seguranca') || t.includes('segurança')) return 'Segurança';
    return 'Civil';
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getMiniCalendarDays = (monthIndex: number, year: number) => {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const prevDaysInMonth = new Date(year, monthIndex, 0).getDate();

    const days: { day: number; currentMonth: boolean; hasEvent?: boolean }[] = [];

    // Prev month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevDaysInMonth - i, currentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const hasEvent = permittedEvents.some(e => {
        const d = new Date(e.date);
        return d.getDate() === i && d.getMonth() === monthIndex && d.getFullYear() === year;
      });
      days.push({ day: i, currentMonth: true, hasEvent });
    }

    // Next month days to fill 42 cells
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false });
    }

    return days;
  };

  // 1. First filter by permission (global for this user)
  const permittedEvents = events.filter(e => {
    const allowedCategories: string[] = [];
    if (user?.manage_equipment) allowedCategories.push('Equipamento');
    if (user?.manage_predial) allowedCategories.push('Predial');
    if (user?.manage_others) allowedCategories.push('Outros');

    return allowedCategories.includes(e.maintenance_category || 'Equipamento');
  });

  // 2. Then apply UI filters (search, status, etc) for the Agenda/List view
  const filteredEvents = permittedEvents.filter(e => {
    const isMonthMatch = isDateInSelectedMonth(e.date);
    const isSearchMatch = !searchTerm || (e.title + e.asset_name).toLowerCase().includes(searchTerm.toLowerCase());
    const isCategoryMatch = selectedCategory === 'Todas as Categorias' || e.category === selectedCategory;
    const isStatusMatch = selectedStatus === 'Todos' || e.status === selectedStatus;
    const isTowerMatch = selectedTower === 'Todas as Torres' || e.asset_name.includes(selectedTower.replace('Torre ', ''));

    return isMonthMatch && isSearchMatch && isCategoryMatch && isStatusMatch && isTowerMatch;
  });

  return (
    <div className="flex flex-col gap-8 h-full">
      {/* Top Bar - Header & Global Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Calendário de Manutenção</h2>
          <div className="mt-1 flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{filteredEvents.length} Atividades este mês</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center p-1 bg-slate-100/50 border border-slate-200 rounded-2xl shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'annual' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
            >
              Anual
            </button>
          </div>
        </div>
      </div>



      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Side: Planning / Monthly Grid */}
        {!isAgendaExpanded && (
          <div className="lg:col-span-8 space-y-8 bg-white/40 border border-white/60 rounded-3xl p-8 backdrop-blur-xl shadow-inner-white flex flex-col min-h-[700px]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  {viewMode === 'monthly' ? `${months[selectedMonth]} ${selectedYear}` : `Planejamento ${selectedYear}`}
                </h3>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {Object.entries(STATUS_COLORS).map(([name, config]) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className={`size-1.5 rounded-full ${config.bgColor.replace('100', '500')}`}></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{name}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-brand-alert"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Feriado</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => {
                    if (viewMode === 'monthly') {
                      if (selectedMonth === 0) {
                        setSelectedMonth(11);
                        setSelectedYear(y => y - 1);
                      } else {
                        setSelectedMonth(m => m - 1);
                      }
                    } else {
                      setSelectedYear(y => y - 1);
                    }
                  }}
                  className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-slate-900 transition-all font-bold"
                >
                  <ChevronLeft size={16} strokeWidth={3} />
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    setSelectedMonth(today.getMonth());
                    setSelectedYear(today.getFullYear());
                  }}
                  className="px-3 py-1 text-[10px] font-black text-primary hover:bg-white rounded-md transition-all uppercase tracking-widest"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    if (viewMode === 'monthly') {
                      if (selectedMonth === 11) {
                        setSelectedMonth(0);
                        setSelectedYear(y => y + 1);
                      } else {
                        setSelectedMonth(m => m + 1);
                      }
                    } else {
                      setSelectedYear(y => y + 1);
                    }
                  }}
                  className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-slate-900 transition-all font-bold"
                >
                  <ChevronRight size={16} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {viewMode === 'monthly' ? (
                /* NEW REAL MONTHLY GRID */
                <div className="h-full flex flex-col gap-4">
                  <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">
                    <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
                  </div>
                  <div className="grid grid-cols-7 grid-rows-6 gap-3 flex-1">
                    {getMiniCalendarDays(selectedMonth, selectedYear).map((d, i) => {
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                      const isHoliday = d.currentMonth && BR_HOLIDAYS_2026[dateStr];
                      const holidayName = isHoliday ? BR_HOLIDAYS_2026[dateStr] : null;

                      const today = new Date();
                      const isToday = d.currentMonth &&
                        d.day === today.getDate() &&
                        selectedMonth === today.getMonth() &&
                        selectedYear === today.getFullYear();

                      const dayEvents = d.currentMonth ? permittedEvents.filter(e => {
                        const ed = new Date(e.date);
                        return ed.getDate() === d.day && ed.getMonth() === selectedMonth && ed.getFullYear() === selectedYear;
                      }) : [];

                      return (
                        <div
                          key={i}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredCell({
                              day: d.day,
                              month: selectedMonth,
                              year: selectedYear,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                              holiday: holidayName,
                              events: dayEvents
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`relative group flex flex-col p-3 rounded-2xl border transition-all ${d.currentMonth
                            ? isToday
                              ? 'bg-emerald-50/50/50 border-primary-light/20 ring-2 ring-primary-light/10'
                              : 'bg-white border-slate-100 hover:border-primary-light/30 hover:shadow-lg hover:shadow-slate-200/50'
                            : 'bg-slate-50/30 border-transparent text-slate-200'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-base font-black ${d.currentMonth
                              ? isHoliday ? 'text-brand-alert' : isToday ? 'text-primary' : 'text-slate-900'
                              : 'text-slate-200'
                              }`}>
                              {d.day}
                            </span>
                            {isHoliday && (
                              <div className="size-1.5 rounded-full bg-brand-alert"></div>
                            )}
                          </div>

                          {holidayName && (
                            <span className="text-[8px] font-black text-red-400 uppercase tracking-tighter truncate mb-1">
                              {holidayName}
                            </span>
                          )}

                          <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                            {dayEvents.slice(0, 2).map(e => {
                              const s = STATUS_COLORS[e.status] || STATUS_COLORS['Pendente'];
                              return (
                                <div
                                  key={e.id}
                                  className={`h-1.5 rounded-full ${s.bgColor.replace('100', '500')}/80 w-full`}
                                  title={`${e.order_number}: ${e.title}`}
                                ></div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <span className="text-[8px] font-bold text-slate-400">+{dayEvents.length - 2} mais</span>
                            )}
                          </div>

                          {isToday && (
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                              <div className="size-1.5 rounded-full bg-primary animate-ping"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ANNUAL VIEW */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-10 gap-x-8">
                  {months.map((name, idx) => (
                    <div key={name} className={`space-y-4 group cursor-pointer transition-all ${idx === selectedMonth ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`} onClick={() => setSelectedMonth(idx)}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors uppercase tracking-widest">{name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {permittedEvents.filter(e => new Date(e.date).getMonth() === idx && new Date(e.date).getFullYear() === selectedYear).length} tarefas
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-7 text-[8px] font-black text-slate-300 uppercase tracking-tighter text-center">
                          <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
                        </div>
                        <div className="grid grid-cols-7 gap-px rounded-md overflow-hidden bg-slate-50 border border-slate-100 shadow-sm">
                          {getMiniCalendarDays(idx, selectedYear).map((d, i) => {
                            const dateStr = `${selectedYear}-${String(idx + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                            const isHoliday = d.currentMonth && BR_HOLIDAYS_2026[dateStr];
                            const holidayName = isHoliday ? BR_HOLIDAYS_2026[dateStr] : null;

                            const today = new Date();
                            const isToday = d.currentMonth &&
                              d.day === today.getDate() &&
                              idx === today.getMonth() &&
                              selectedYear === today.getFullYear();

                            const dayEvents = d.currentMonth ? permittedEvents.filter(e => {
                              const ed = new Date(e.date);
                              return ed.getDate() === d.day && ed.getMonth() === idx && ed.getFullYear() === selectedYear;
                            }) : [];

                            return (
                              <div
                                key={i}
                                onMouseEnter={(e) => {
                                  if (!d.currentMonth) return;
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredCell({
                                    day: d.day,
                                    month: idx,
                                    year: selectedYear,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top,
                                    holiday: holidayName,
                                    events: dayEvents
                                  });
                                }}
                                onMouseLeave={() => setHoveredCell(null)}
                                className={`aspect-square flex items-center justify-center text-[10px] min-h-[22px] transition-all relative ${d.currentMonth
                                  ? isToday
                                    ? 'text-primary bg-emerald-50/50 font-black ring-2 ring-primary-light/20 rounded-sm'
                                    : isHoliday
                                      ? 'text-brand-alert bg-red-50/50 font-black'
                                      : 'text-slate-600 bg-white font-medium hover:bg-slate-50 hover:text-primary'
                                  : 'text-slate-200 bg-slate-50/50'
                                  }`}
                              >
                                <div className="relative">
                                  {d.day}
                                  {dayEvents.length > 0 && d.currentMonth && (
                                    <div className={`absolute -top-1 -right-1 size-1 rounded-full ${(STATUS_COLORS[dayEvents[0].status] || STATUS_COLORS['Pendente']).bgColor.replace('100', '500')}`}></div>
                                  )}
                                  {isHoliday && d.currentMonth && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-0.5 rounded-full bg-brand-alert"></div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Side: Agenda Side Panel */}
        <div className={`${isAgendaExpanded ? 'lg:col-span-12' : 'lg:col-span-4'} flex flex-col gap-6 h-full min-h-[600px]`}>
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-6 flex-1 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-black text-slate-900 shrink-0">Agenda do Mês <span className="text-slate-400 font-normal">({months[selectedMonth].substring(0, 3)})</span></h3>

              {isAgendaExpanded && (
                <div className="flex-1 max-w-md relative group mx-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Filtrar atividades na agenda..."
                    className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}

              <button
                onClick={() => setIsAgendaExpanded(!isAgendaExpanded)}
                className="text-[10px] font-bold text-primary hover:text-primary-dark uppercase tracking-widest transition-all shrink-0"
              >
                {isAgendaExpanded ? 'Fechar' : 'Ver tudo'}
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar ${isAgendaExpanded ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 !space-y-0' : ''}`}>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-400">
                  <div className="size-8 rounded-full border-2 border-slate-200 border-t-primary-light animate-spin"></div>
                  <p className="text-xs font-bold uppercase tracking-widest">Carregando Agenda...</p>
                </div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map(event => {
                  const cat = CATEGORIES[event.category] || CATEGORIES['Civil'];
                  const stat = STATUS_COLORS[event.status] || STATUS_COLORS['Pendente'];
                  const date = new Date(event.date);
                  return (
                    <div
                      key={event.id}
                      onClick={() => navigate(`/work-orders/${event.id}`)}
                      className={`group p-5 bg-white border-2 ${stat.borderColor} rounded-2xl hover:shadow-lg hover:shadow-slate-200/60 transition-all cursor-pointer relative overflow-hidden active:scale-95`}
                    >
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${stat.bgColor.replace('100', '500')}`}></div>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary bg-emerald-50/50 px-2 py-0.5 rounded-md border border-primary-light/10 uppercase tracking-tighter">
                              OS #{event.order_number}
                            </span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()} • {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 leading-tight group-hover:text-primary transition-colors uppercase pt-1">
                            {event.asset_name}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-500 line-clamp-2 leading-relaxed">
                            {event.title}
                          </p>
                        </div>
                        <div className={`px-2 py-0.5 ${stat.bgColor} ${stat.color} rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0`}>
                          {cat.icon}
                          {event.requester_name || 'Solicitante'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            <Building2 size={12} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{event.sector}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-1">
                          <div className="size-6 rounded-full bg-emerald-50/50 border border-primary-light/10 flex items-center justify-center overflow-hidden">
                            {event.technician?.avatar ? (
                              <img
                                src={event.technician.avatar}
                                alt={event.technician.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={12} className="text-primary-light/80" />
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">
                            {event.technician?.name || 'Aguardando'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-4 text-slate-300">
                  <CalIcon size={48} className="opacity-20" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Nenhuma tarefa agendada</p>
                    <p className="text-[10px] font-medium max-w-[180px]">Não há manutenções programadas para os filtros selecionados.</p>
                  </div>
                </div>
              )}
            </div>

            <button className="w-full py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-600 font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95">
              <Download size={16} className="text-slate-400" />
              Baixar Relatório Mensal (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* HOVER TOOLTIP */}
      {
        hoveredCell && (hoveredCell.events.length > 0 || hoveredCell.holiday) && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4"
            style={{ left: hoveredCell.x, top: hoveredCell.y }}
          >
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-4 min-w-[200px] animate-in fade-in zoom-in duration-200">
              {hoveredCell.holiday && (
                <div className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-2 rounded-full bg-brand-alert"></div>
                    <span className="text-[10px] font-black text-brand-alert uppercase tracking-widest">Feriado Nacional</span>
                  </div>
                  <p className="text-sm font-black text-slate-900">{hoveredCell.holiday}</p>
                </div>
              )}

              {hoveredCell.events.length > 0 && (
                <div className="space-y-3">
                  {hoveredCell.events.map(event => {
                    const stat = STATUS_COLORS[event.status] || STATUS_COLORS['Pendente'];
                    return (
                      <div key={event.id} className={`p-3 rounded-xl border-2 ${stat.borderColor} ${stat.bgColor.replace('100', '50/50')} space-y-2`}>
                        <div className="flex items-center justify-between gap-4">
                          <span className={`px-2 py-0.5 ${stat.bgColor} ${stat.color} rounded text-[8px] font-black`}>
                            #{event.order_number}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{event.status}</span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-900 leading-tight">{event.asset_name}</p>
                          <p className="text-[10px] font-medium text-slate-500">Solicitante: {event.requester_name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tooltip Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-200 rotate-45"></div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Calendar;