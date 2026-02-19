import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Wrench, Droplet, Zap, X, Clock, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  day: number;
  month: number; // 0-11
  year: number;
  title: string;
  type: string;
  color: string;
  icon: React.ReactNode;
  status: string;
  priority: string;
  asset_name: string;
  technician_name: string;
  description: string;
}

interface Asset {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  name: string;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form Data
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);


  // Fetch Data on Mount
  useEffect(() => {
    fetchResources();
    fetchEvents();
  }, []);

  // Fetch Events when month changes (or initial load)
  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchResources = async () => {
    const { data: assetsData } = await supabase.from('assets').select('id, name');
    const { data: techData } = await supabase.from('technicians').select('id, name');
    if (assetsData) setAssets(assetsData);
    if (techData) setTechnicians(techData);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Get start and end of current month view
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id, 
          issue, 
          status, 
          priority, 
          date, 
          assets (name), 
          technicians (name)
        `)
        .gte('date', startOfMonth.toISOString())
        .lte('date', endOfMonth.toISOString());

      if (error) throw error;

      if (data) {
        const mappedEvents: CalendarEvent[] = data.map((order: any) => {
          const date = new Date(order.date);
          return {
            id: order.id,
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            title: order.issue || 'Sem título',
            type: order.priority === 'Preventiva' ? 'preventiva' : 'rotina', // Simplification
            color: getEventColor(order.priority),
            icon: getEventIcon(order.priority),
            status: order.status,
            priority: order.priority,
            asset_name: order.assets?.name || 'Desconhecido',
            technician_name: order.technicians?.name || 'Não atribuído',
            description: order.issue
          };
        });
        setEvents(mappedEvents);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'baixa': return 'bg-green-100 text-green-700 border-green-200';
      case 'média': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'alta': return 'bg-red-100 text-red-700 border-red-200';
      case 'crítica': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getEventIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'baixa': return <CheckCircle2 size={12} />;
      case 'média': return <Wrench size={12} />;
      case 'alta': return <AlertTriangle size={12} />;
      case 'crítica': return <Zap size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };



  // Calendar Helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const getEventsForDay = (day: number) => {
    return events.filter(e =>
      e.day === day &&
      e.month === currentDate.getMonth() &&
      e.year === currentDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="flex flex-col gap-6 h-full relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Calendário de Manutenção</h2>
          <p className="text-sm text-slate-500">Planejamento preventivo e inspeções de rotina.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-md text-slate-600"><ChevronLeft size={20} /></button>
            <span className="px-4 font-bold text-slate-800 min-w-[140px] text-center">{capitalizedMonthName}</span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-md text-slate-600"><ChevronRight size={20} /></button>
          </div>

        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold uppercase text-slate-500 bg-slate-50">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100 gap-px border-b border-slate-200">
          {/* Previous Month Padding */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50 p-2 min-h-[100px]"></div>
          ))}

          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day}
                className={`bg-white p-2 min-h-[100px] hover:bg-slate-50 transition-colors cursor-pointer group relative ${isCurrentDay ? 'bg-blue-50/30' : ''}`}

              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium size-7 flex items-center justify-center rounded-full ${isCurrentDay ? 'bg-primary text-white' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  {isCurrentDay && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 rounded">Hoje</span>}
                </div>

                <div className="mt-2 space-y-1.5">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                      className={`text-[10px] p-1.5 rounded flex items-center gap-1.5 font-medium truncate border hover:brightness-95 cursor-pointer ${evt.color}`}
                    >
                      {evt.icon}
                      <span className="truncate">{evt.title}</span>
                    </div>
                  ))}
                </div>


              </div>
            );
          })}

          {/* Next Month Padding to fill grid */}
          {Array.from({ length: 42 - (daysInMonth + firstDay) }).map((_, i) => (
            <div key={`next-empty-${i}`} className="bg-slate-50/50 p-2 min-h-[100px]"></div>
          ))}
        </div>
      </div>



      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`h-2 ${selectedEvent.color.split(' ')[0]}`}></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-900 pr-4">{selectedEvent.title}</h3>
                <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={16} className="text-slate-400" />
                  <span>{selectedEvent.day}/{selectedEvent.month + 1}/{selectedEvent.year}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Wrench size={16} className="text-slate-400" />
                  <span>{selectedEvent.asset_name}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <User size={16} className="text-slate-400" />
                  <span>{selectedEvent.technician_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} className="text-slate-400" />
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedEvent.color}`}>{selectedEvent.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${(status => {
                    if (status === 'Concluído') return 'bg-green-100 text-green-600 border-green-200';
                    if (status === 'Em Manutenção') return 'bg-purple-100 text-purple-600 border-purple-200';
                    if (status === 'Aguardando Peça') return 'bg-amber-100 text-amber-600 border-amber-200';
                    if (status === 'Pendente') return 'bg-orange-100 text-orange-600 border-orange-200';
                    return 'bg-slate-100 text-slate-600 border-slate-200';
                  })(selectedEvent.status)}`}>{selectedEvent.status}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Fechar</button>
                <button
                  onClick={() => navigate(`/work-orders/${selectedEvent.id}`)}
                  className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;