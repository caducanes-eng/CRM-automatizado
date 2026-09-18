import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  User,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Flame,
  RotateCcw,
  Check,
  X,
  CalendarClock,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';
import { Tarefa, StatusTarefa, PrioridadeTarefa } from '../types';
import { formatarDataBR } from '../utils/formatters';

type FiltroData = 'todas' | 'hoje' | 'atrasadas' | 'futuras' | 'concluidas';

export const TarefasView: React.FC = () => {
  const {
    tarefas,
    indicadoresTarefas,
    criarTarefa,
    atualizarStatusTarefa,
    excluirTarefa,
    leads,
    abrirFichaLead,
  } = useCrm();

  const { user, usuarios } = useAuth();
  const { config } = useEmpresa();

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';

  // Estados locais de filtro e busca
  const [filtroData, setFiltroData] = useState<FiltroData>('hoje');
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas');

  // Modal de criação de tarefa
  const [modalNovaTarefaAberto, setModalNovaTarefaAberto] = useState(false);
  const [tituloNova, setTituloNova] = useState('');
  const [descricaoNova, setDescricaoNova] = useState('');
  const [dataNova, setDataNova] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaNova, setHoraNova] = useState('14:00');
  const [prioridadeNova, setPrioridadeNova] = useState<PrioridadeTarefa>('normal');
  const [leadIdNova, setLeadIdNova] = useState<string>('');
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);

  // Modal de conclusão com observação
  const [tarefaConcluindo, setTarefaConcluindo] = useState<Tarefa | null>(null);
  const [observacaoConclusao, setObservacaoConclusao] = useState('');

  // Toast de feedback
  const [feedback, setFeedback] = useState<string | null>(null);

  const dispararFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Tarefas enriquecidas com dados do lead
  const tarefasProcessadas = useMemo(() => {
    const mapaLeads = new Map(leads.map((l) => [l.id, l]));

    return tarefas.map((t) => {
      const leadAssociado = (t.leadId || t.lead_id) ? mapaLeads.get(t.leadId || t.lead_id!) : undefined;
      const dataIso = (t.dataAgendada || t.data_agendada || '').slice(0, 10);
      let categoriaTempo: 'hoje' | 'atrasada' | 'futura' = 'hoje';

      if (dataIso < hoje) {
        categoriaTempo = 'atrasada';
      } else if (dataIso > hoje) {
        categoriaTempo = 'futura';
      }

      return {
        ...t,
        leadAssociado,
        categoriaTempo,
        dataIso,
      };
    });
  }, [tarefas, leads, hoje]);

  // Filtragem
  const tarefasFiltradas = useMemo(() => {
    return tarefasProcessadas.filter((t) => {
      // 1. Filtro de Abas
      if (filtroData === 'hoje') {
        if (t.status !== 'pendente' || t.categoriaTempo !== 'hoje') return false;
      } else if (filtroData === 'atrasadas') {
        if (t.status !== 'pendente' || t.categoriaTempo !== 'atrasada') return false;
      } else if (filtroData === 'futuras') {
        if (t.status !== 'pendente' || t.categoriaTempo !== 'futura') return false;
      } else if (filtroData === 'concluidas') {
        if (t.status !== 'concluida') return false;
      }

      // 2. Filtro de prioridade
      if (filtroPrioridade !== 'todas' && t.prioridade !== filtroPrioridade) {
        return false;
      }

      // 3. Busca por texto
      if (termoBusca.trim()) {
        const termo = termoBusca.toLowerCase();
        const matchTitulo = t.titulo.toLowerCase().includes(termo);
        const matchDesc = (t.descricao || '').toLowerCase().includes(termo);
        const matchLead = (t.leadAssociado?.nome || '').toLowerCase().includes(termo);
        if (!matchTitulo && !matchDesc && !matchLead) return false;
      }

      return true;
    });
  }, [tarefasProcessadas, filtroData, filtroPrioridade, termoBusca]);

  // Ações de criação
  const handleCriarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloNova.trim()) return;

    setSalvandoTarefa(true);
    try {
      await criarTarefa({
        titulo: tituloNova.trim(),
        descricao: descricaoNova.trim(),
        dataAgendada: dataNova,
        horaAgendada: horaNova || undefined,
        prioridade: prioridadeNova,
        leadId: leadIdNova || null,
        usuarioResponsavelId: user?.uid || null,
      });

      setModalNovaTarefaAberto(false);
      setTituloNova('');
      setDescricaoNova('');
      setLeadIdNova('');
      dispararFeedback('Tarefa agendada com sucesso no Supabase!');
    } catch (err) {
      console.error(err);
    } finally {
      setSalvandoTarefa(false);
    }
  };

  // Concluir tarefa
  const handleConfirmarConclusao = async () => {
    if (!tarefaConcluindo) return;
    await atualizarStatusTarefa(
      tarefaConcluindo.id,
      'concluida',
      observacaoConclusao.trim() || undefined
    );
    setTarefaConcluindo(null);
    setObservacaoConclusao('');
    dispararFeedback('Tarefa concluída com sucesso!');
  };

  // Reabrir tarefa
  const handleReabrirTarefa = async (tarefa: Tarefa) => {
    await atualizarStatusTarefa(tarefa.id, 'pendente');
    dispararFeedback('Tarefa reaberta como pendente.');
  };

  // Excluir tarefa
  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente remover esta tarefa?')) {
      await excluirTarefa(id);
      dispararFeedback('Tarefa removida.');
    }
  };

  const getBadgePrioridade = (p: PrioridadeTarefa) => {
    switch (p) {
      case 'urgente':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            Urgente
          </span>
        );
      case 'alta':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            Alta
          </span>
        );
      case 'baixa':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
            Baixa
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200">
            Normal
          </span>
        );
    }
  };

  return (
    <div id="tarefas-view-root" className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          id="toast-tarefas-feedback"
          className="fixed top-4 right-4 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-sm shadow-xl flex items-center gap-2 border border-emerald-500 animate-in fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{feedback}</span>
        </div>
      )}

      {/* HEADER DA SESSÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D6D0] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-sm text-white shadow-xs"
              style={{ backgroundColor: corPrimaria }}
            >
              <CheckSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] uppercase">
              Tarefas & Agendamentos
            </h1>
          </div>
          <p className="text-xs text-[#6E6E6E] mt-1">
            Controle central de tarefas diárias, lembretes de contato e cadências operacionais sincronizadas com o Supabase.
          </p>
        </div>

        <button
          id="btn-abrir-modal-nova-tarefa"
          type="button"
          onClick={() => setModalNovaTarefaAberto(true)}
          style={{ backgroundColor: corPrimaria }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* CARDS DE INDICADORES (VIEW VW_INDICADORES_TAREFAS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Hoje */}
        <button
          id="card-filtro-tarefas-hoje"
          type="button"
          onClick={() => setFiltroData('hoje')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtroData === 'hoje'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-white border-[#D9D6D0] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Hoje</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-950 mt-1">
            {indicadoresTarefas.tarefasHoje}
          </p>
          <span className="text-[10px] text-amber-800 font-medium">Agendadas para hoje</span>
        </button>

        {/* Atrasadas */}
        <button
          id="card-filtro-tarefas-atrasadas"
          type="button"
          onClick={() => setFiltroData('atrasadas')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtroData === 'atrasadas'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20 shadow-xs'
              : 'bg-white border-[#D9D6D0] hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900">Atrasadas</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-extrabold text-rose-950 mt-1">
            {indicadoresTarefas.tarefasAtrasadas}
          </p>
          <span className="text-[10px] text-rose-800 font-medium">Requer atenção imediata</span>
        </button>

        {/* Futuras */}
        <button
          id="card-filtro-tarefas-futuras"
          type="button"
          onClick={() => setFiltroData('futuras')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtroData === 'futuras'
              ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-400/20 shadow-xs'
              : 'bg-white border-[#D9D6D0] hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900">Futuras</span>
            <Calendar className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-extrabold text-sky-950 mt-1">
            {indicadoresTarefas.tarefasFuturas}
          </p>
          <span className="text-[10px] text-sky-800 font-medium">Próximos dias</span>
        </button>

        {/* Concluídas */}
        <button
          id="card-filtro-tarefas-concluidas"
          type="button"
          onClick={() => setFiltroData('concluidas')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtroData === 'concluidas'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
              : 'bg-white border-[#D9D6D0] hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-950 mt-1">
            {indicadoresTarefas.tarefasConcluidas}
          </p>
          <span className="text-[10px] text-emerald-800 font-medium">Finalizadas</span>
        </button>

        {/* Todas */}
        <button
          id="card-filtro-tarefas-todas"
          type="button"
          onClick={() => setFiltroData('todas')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtroData === 'todas'
              ? 'bg-[#F2EFEA] border-[#8A6142] ring-2 ring-[#8A6142]/20 shadow-xs'
              : 'bg-white border-[#D9D6D0] hover:border-[#8A6142]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">Todas</span>
            <CheckSquare className="w-4 h-4 text-[#8A6142]" />
          </div>
          <p className="text-2xl font-extrabold text-[#1A1A1A] mt-1">
            {tarefas.length}
          </p>
          <span className="text-[10px] text-[#6E6E6E] font-medium">
            {indicadoresTarefas.totalPendentes} pendentes
          </span>
        </button>
      </div>

      {/* BARRA DE FILTROS & BUSCA */}
      <div className="bg-white p-3 sm:p-4 rounded-sm border border-[#D9D6D0] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8F887E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-busca-tarefas"
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por título, paciente ou descrição..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-[#5C3A22]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label htmlFor="select-filtro-prioridade" className="text-xs font-semibold text-[#6E6E6E] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Prioridade:
          </label>
          <select
            id="select-filtro-prioridade"
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className="text-xs py-1.5 px-2 bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-[#5C3A22]"
          >
            <option value="todas">Todas</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="normal">Normal</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
      </div>

      {/* LISTAGEM DE TAREFAS */}
      <div className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden">
        {tarefasFiltradas.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
              Nenhuma tarefa encontrada neste filtro
            </h3>
            <p className="text-xs text-[#6E6E6E] mt-1 max-w-sm mx-auto">
              Tudo em dia! Você pode criar novas tarefas manuais ou as cadências operacionais gerarão os próximos agendamentos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E2DC]">
            {tarefasFiltradas.map((tarefa) => {
              const isConcluida = tarefa.status === 'concluida';
              const isAtrasada = tarefa.categoriaTempo === 'atrasada' && !isConcluida;
              const isHoje = tarefa.categoriaTempo === 'hoje' && !isConcluida;

              return (
                <div
                  key={tarefa.id}
                  id={`tarefa-item-${tarefa.id}`}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isConcluida
                      ? 'bg-neutral-50/50 opacity-75'
                      : isAtrasada
                      ? 'bg-rose-50/30 hover:bg-rose-50/50'
                      : isHoje
                      ? 'bg-amber-50/20 hover:bg-amber-50/40'
                      : 'hover:bg-[#F8F7F4]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Botão Checkbox de Conclusão */}
                    <button
                      id={`btn-toggle-tarefa-${tarefa.id}`}
                      type="button"
                      onClick={() => {
                        if (isConcluida) {
                          handleReabrirTarefa(tarefa);
                        } else {
                          setTarefaConcluindo(tarefa);
                          setObservacaoConclusao('');
                        }
                      }}
                      title={isConcluida ? 'Reabrir tarefa' : 'Concluir tarefa'}
                      className={`mt-0.5 w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        isConcluida
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-[#8F887E] hover:border-emerald-600 bg-white'
                      }`}
                    >
                      {isConcluida && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm font-bold tracking-tight text-[#1A1A1A] ${
                            isConcluida ? 'line-through text-[#8F887E]' : ''
                          }`}
                        >
                          {tarefa.titulo}
                        </h4>
                        {getBadgePrioridade(tarefa.prioridade)}

                        {tarefa.situacaoOrigem && (
                          <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-[#F2EFEA] text-[#5C3A22] border border-[#D9D6D0]">
                            {tarefa.situacaoOrigem}
                          </span>
                        )}

                        {tarefa.etapaCadencia && (
                          <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono bg-white text-[#1A1A1A] border border-[#D9D6D0]">
                            {tarefa.etapaCadencia}
                          </span>
                        )}
                      </div>

                      {tarefa.descricao && (
                        <p className="text-xs text-[#4A4A4A] line-clamp-2">
                          {tarefa.descricao}
                        </p>
                      )}

                      {/* Paciente Vinculado */}
                      {tarefa.leadAssociado && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => abrirFichaLead(tarefa.leadAssociado!.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#5C3A22] hover:underline cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>{tarefa.leadAssociado.nome}</span>
                            <ExternalLink className="w-3 h-3 text-[#8A6142]" />
                          </button>
                          <span className="text-xs text-[#8F887E]">• {tarefa.leadAssociado.situacao}</span>
                        </div>
                      )}

                      {isConcluida && tarefa.observacaoConclusao && (
                        <p className="text-xs italic text-emerald-800 bg-emerald-50 px-2 py-1 rounded-xs border border-emerald-200 mt-1">
                          Observação: {tarefa.observacaoConclusao}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lado Direito: Datas & Ações */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E2DC]">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A1A]">
                        <Calendar className="w-3.5 h-3.5 text-[#8F887E]" />
                        <span>{formatarDataBR(tarefa.dataIso)}</span>
                        {tarefa.horaAgendada && (
                          <span className="text-[#6E6E6E] font-normal">às {tarefa.horaAgendada.slice(0, 5)}</span>
                        )}
                      </div>

                      {isAtrasada && (
                        <span className="text-[10px] font-bold text-rose-600 block">
                          Atrasada
                        </span>
                      )}
                      {isHoje && (
                        <span className="text-[10px] font-bold text-amber-700 block">
                          Agendada para hoje
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id={`btn-excluir-tarefa-${tarefa.id}`}
                        type="button"
                        onClick={() => handleExcluir(tarefa.id)}
                        title="Excluir tarefa"
                        className="p-1.5 text-[#8F887E] hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: NOVA TAREFA */}
      <AnimatePresence>
        {modalNovaTarefaAberto && (
          <div
            id="modal-nova-tarefa-backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-sm border border-[#D9D6D0] shadow-2xl overflow-hidden"
            >
              <div
                className="px-5 py-4 text-white flex items-center justify-between"
                style={{ backgroundColor: corPrimaria }}
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Nova Tarefa / Agendamento</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNovaTarefaAberto(false)}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCriarTarefa} className="p-5 space-y-4">
                <div>
                  <label htmlFor="input-titulo-tarefa" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                    Título da Tarefa *
                  </label>
                  <input
                    id="input-titulo-tarefa"
                    type="text"
                    required
                    value={tituloNova}
                    onChange={(e) => setTituloNova(e.target.value)}
                    placeholder="Ex: Ligar para confirmar presença na consulta"
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-[#5C3A22]"
                  />
                </div>

                <div>
                  <label htmlFor="select-lead-tarefa" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                    Vincular a Paciente (Opcional)
                  </label>
                  <select
                    id="select-lead-tarefa"
                    value={leadIdNova}
                    onChange={(e) => setLeadIdNova(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-[#5C3A22]"
                  >
                    <option value="">Nenhum (Tarefa geral da clínica)</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} ({l.situacao})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-data-tarefa" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                      Data Agendada *
                    </label>
                    <input
                      id="input-data-tarefa"
                      type="date"
                      required
                      value={dataNova}
                      onChange={(e) => setDataNova(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-[#5C3A22]"
                    />
                  </div>

                  <div>
                    <label htmlFor="input-hora-tarefa" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                      Horário
                    </label>
                    <input
                      id="input-hora-tarefa"
                      type="time"
                      value={horaNova}
                      onChange={(e) => setHoraNova(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-[#5C3A22]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="select-prioridade-tarefa" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                    Prioridade
                  </label>
                  <select
                    id="select-prioridade-tarefa"
                    value={prioridadeNova}
                    onChange={(e) => setPrioridadeNova(e.target.value as PrioridadeTarefa)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-[#5C3A22]"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="textarea-desc-tarefa" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                    Descrição / Instruções
                  </label>
                  <textarea
                    id="textarea-desc-tarefa"
                    rows={3}
                    value={descricaoNova}
                    onChange={(e) => setDescricaoNova(e.target.value)}
                    placeholder="Instruções de contato, orientações ou contexto da tarefa..."
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-[#5C3A22]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E2DC]">
                  <button
                    type="button"
                    onClick={() => setModalNovaTarefaAberto(false)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-confirmar-criar-tarefa"
                    type="submit"
                    disabled={salvandoTarefa}
                    style={{ backgroundColor: corPrimaria }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white rounded-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    {salvandoTarefa ? 'Salvando no Banco...' : 'Salvar Tarefa'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONCLUIR TAREFA COM OBSERVAÇÃO */}
      <AnimatePresence>
        {tarefaConcluindo && (
          <div
            id="modal-concluir-tarefa-backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-sm border border-[#D9D6D0] shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Concluir Tarefa
                  </h3>
                  <p className="text-xs text-[#6E6E6E]">{tarefaConcluindo.titulo}</p>
                </div>
              </div>

              <div>
                <label htmlFor="textarea-obs-conclusao" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                  Observações da Conclusão (Opcional)
                </label>
                <textarea
                  id="textarea-obs-conclusao"
                  rows={3}
                  value={observacaoConclusao}
                  onChange={(e) => setObservacaoConclusao(e.target.value)}
                  placeholder="Ex: Paciente atendeu e confirmou que estará presente..."
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#D9D6D0] rounded-sm focus:outline-hidden focus:bg-white focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E2DC]">
                <button
                  type="button"
                  onClick={() => setTarefaConcluindo(null)}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirmar-conclusao-tarefa"
                  type="button"
                  onClick={handleConfirmarConclusao}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-emerald-700 rounded-sm hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  Confirmar Conclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
