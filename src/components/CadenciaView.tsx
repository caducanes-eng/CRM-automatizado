import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CalendarCheck,
  Sparkles,
  RotateCcw,
  Search,
  User,
  ArrowUpDown,
  Filter,
  Calendar,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  X,
  BookOpen,
  Copy,
  Check,
  MessageSquare,
  Lightbulb,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { SituacaoLead, Lead } from '../types';
import { formatarDataBR } from '../utils/formatters';
import {
  calcularDiasCorridos,
  calcularEtapaEsperada,
  calcularStatusCadencia,
  verificarSeDeveContatarHoje,
  obterOpcoesCadenciaPorSituacao,
  StatusCadencia,
  obterProximaEtapa,
  avancarProximaEtapa,
  reiniciarCadencia,
  verificarSeTodasEtapasConcluidas,
} from '../utils/cadencia';
import {
  obterIntencaoDaEtapa,
  GUIA_INTENCOES_OFICIAL,
} from '../utils/guiaIntencoes';

interface CadenciaViewProps {
  situacao: SituacaoLead;
  titulo: string;
  subtitulo: string;
}

type FiltroStatus = 'Todos' | 'Contatar hoje' | StatusCadencia;

export const CadenciaView: React.FC<CadenciaViewProps> = ({
  situacao,
  titulo,
  subtitulo,
}) => {
  const {
    leads,
    definirEtapaPorSituacao,
    abrirFichaLead,
  } = useCrm();

  // Modal de confirmação: "Etapa realizada? Concluída ou cancelar"
  const [modalEtapaLead, setModalEtapaLead] = useState<Lead | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [copiadoMensagem, setCopiadoMensagem] = useState<boolean>(false);
  const [mostrarGuiaCompleto, setMostrarGuiaCompleto] = useState<boolean>(false);

  // Estados de busca e filtros locais
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('Todos');
  const [ordenacao, setOrdenacao] = useState<{
    campo: 'nome' | 'dataEntrada' | 'diasCorridos' | 'status';
    direcao: 'asc' | 'desc';
  }>({
    campo: 'diasCorridos',
    direcao: 'desc',
  });

  // Abrir caixa de confirmação da etapa ao clicar na célula
  const handleAbrirModalEtapa = (lead: Lead) => {
    setModalEtapaLead(lead);
  };

  // Concluir etapa realizada e calcular automaticamente o próximo passo
  const handleConcluirEtapaLead = async () => {
    if (!modalEtapaLead) return;
    const leadAtual = leads.find((l) => l.id === modalEtapaLead.id) || modalEtapaLead;
    const etapaArmazenada = leadAtual.etapaPorSituacao?.[situacao];
    const res = avancarProximaEtapa(situacao, etapaArmazenada);
    await definirEtapaPorSituacao(leadAtual.id, situacao, res.proximaEtapa);
    setModalEtapaLead(null);
    setFeedbackToast(
      res.todasConcluidas
        ? `Todas as etapas da cadência concluídas para ${leadAtual.nome}!`
        : `Etapa concluída para ${leadAtual.nome}! Próximo passo: ${res.proximaEtapa}`
    );
    setTimeout(() => setFeedbackToast(null), 3200);
  };

  // Reiniciar sequência de cadência desde o primeiro contato
  const handleReiniciarCadenciaLead = async () => {
    if (!modalEtapaLead) return;
    const leadAtual = leads.find((l) => l.id === modalEtapaLead.id) || modalEtapaLead;
    const primeira = reiniciarCadencia(situacao);
    await definirEtapaPorSituacao(leadAtual.id, situacao, primeira);
    setModalEtapaLead(null);
    setFeedbackToast(`Cadência reiniciada para ${leadAtual.nome}.`);
    setTimeout(() => setFeedbackToast(null), 3200);
  };

  // Opções de cadência oficiais para esta situação
  const opcoesCadencia = useMemo(() => {
    return obterOpcoesCadenciaPorSituacao(situacao);
  }, [situacao]);

  // Ícone temático da situação
  const getIconeSituacao = () => {
    switch (situacao) {
      case 'Em captação':
        return <Flame className="w-5 h-5 text-[#5C3A22]" />;
      case 'Pós consulta':
        return <CalendarCheck className="w-5 h-5 text-[#5C3A22]" />;
      case 'Pós procedimento':
        return <Sparkles className="w-5 h-5 text-[#5C3A22]" />;
      case 'Reativação':
        return <RotateCcw className="w-5 h-5 text-[#5C3A22]" />;
      default:
        return <Clock className="w-5 h-5 text-[#5C3A22]" />;
    }
  };

  // 1. Filtrar SOMENTE leads cuja situação atual seja a situação da tela
  const leadsDaSituacao = useMemo(() => {
    return leads.filter((lead) => lead.situacao === situacao && !lead.deleted_at);
  }, [leads, situacao]);

  // 2. Mapeamento enriquecido com cálculos de cadência para cada lead
  const leadsProcessados = useMemo(() => {
    return leadsDaSituacao.map((lead) => {
      const diasCorridos = calcularDiasCorridos(lead.dataEntrada);
      const etapaArmazenada = lead.etapaPorSituacao?.[situacao];
      const proximaEtapa = obterProximaEtapa(situacao, etapaArmazenada);
      const etapaEsperada = calcularEtapaEsperada(situacao, diasCorridos);
      const statusCadencia = calcularStatusCadencia(situacao, proximaEtapa, etapaEsperada);
      const deveContatarHoje = verificarSeDeveContatarHoje(situacao, diasCorridos, statusCadencia, etapaArmazenada);

      return {
        ...lead,
        diasCorridos,
        etapaArmazenada,
        proximaEtapa,
        etapaEsperada,
        statusCadencia,
        deveContatarHoje,
      };
    });
  }, [leadsDaSituacao, situacao]);

  // 3. Métricas de resumo
  const metricas = useMemo(() => {
    const total = leadsProcessados.length;
    const contatarHoje = leadsProcessados.filter((l) => l.deveContatarHoje).length;
    const emDia = leadsProcessados.filter((l) => l.statusCadencia === 'Em dia').length;
    const atrasados = leadsProcessados.filter((l) => l.statusCadencia === 'Atrasado').length;
    const adiantados = leadsProcessados.filter((l) => l.statusCadencia === 'Adiantado').length;
    const semEtapa = leadsProcessados.filter(
      (l) => l.statusCadencia === 'Sem etapa selecionada'
    ).length;

    return { total, contatarHoje, emDia, atrasados, adiantados, semEtapa };
  }, [leadsProcessados]);

  // 4. Filtragem e ordenação da tabela
  const leadsExibidos = useMemo(() => {
    return leadsProcessados
      .filter((lead) => {
        // Filtro por termo de busca
        if (termoBusca.trim()) {
          const termo = termoBusca.toLowerCase().trim();
          const matchNome = lead.nome.toLowerCase().includes(termo);
          const matchResp = lead.responsavel?.toLowerCase().includes(termo);
          const matchInteresse = lead.interesse?.toLowerCase().includes(termo);
          if (!matchNome && !matchResp && !matchInteresse) return false;
        }

        // Filtro por status
        if (filtroStatus !== 'Todos') {
          if (filtroStatus === 'Contatar hoje') {
            if (!lead.deveContatarHoje) return false;
          } else if (lead.statusCadencia !== filtroStatus) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const fator = ordenacao.direcao === 'asc' ? 1 : -1;
        if (ordenacao.campo === 'nome') {
          return a.nome.localeCompare(b.nome) * fator;
        }
        if (ordenacao.campo === 'dataEntrada') {
          return a.dataEntrada.localeCompare(b.dataEntrada) * fator;
        }
        if (ordenacao.campo === 'diasCorridos') {
          return (a.diasCorridos - b.diasCorridos) * fator;
        }
        if (ordenacao.campo === 'status') {
          return a.statusCadencia.localeCompare(b.statusCadencia) * fator;
        }
        return 0;
      });
  }, [leadsProcessados, termoBusca, filtroStatus, ordenacao]);

  // Manipulador de mudança de etapa
  const handleMudarEtapa = (leadId: string, novaEtapa: string) => {
    definirEtapaPorSituacao(leadId, situacao, novaEtapa);
  };

  // Alternar ordenação
  const handleToggleOrdenacao = (campo: 'nome' | 'dataEntrada' | 'diasCorridos' | 'status') => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Renderizador do Badge de Status
  const renderStatusBadge = (status: StatusCadencia, todasConcluidas?: boolean) => {
    if (todasConcluidas) {
      return (
        <span
          id="status-badge-concluido"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Concluído</span>
        </span>
      );
    }

    switch (status) {
      case 'Atrasado':
        return (
          <span
            id="status-badge-atrasado"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Em atraso</span>
          </span>
        );
      case 'Em dia':
        return (
          <span
            id="status-badge-em-dia"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-emerald-50/80 text-emerald-900 border border-emerald-200 shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Em dia</span>
          </span>
        );
      case 'Adiantado':
        return (
          <span
            id="status-badge-adiantado"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-sky-50 text-sky-900 border border-sky-200 shadow-2xs"
          >
            <TrendingUp className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span>Adiantado</span>
          </span>
        );
      case 'Sem etapa selecionada':
      default:
        return (
          <span
            id="status-badge-sem-etapa"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-[#F2EFEA] text-[#8F887E] border border-[#D9D6D0]"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#8F887E] shrink-0" />
            <span>Sem etapa</span>
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
    >
      {/* RESUMO DE STATUS DA CADÊNCIA */}
      <div className="bg-white rounded-sm p-4 sm:p-5 border border-[#D9D6D0] shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Contatar Hoje */}
          <button
            id="card-filtro-contatar-hoje"
            type="button"
            onClick={() => setFiltroStatus(filtroStatus === 'Contatar hoje' ? 'Todos' : 'Contatar hoje')}
            className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${
              filtroStatus === 'Contatar hoje'
                ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-600 shadow-xs'
                : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                Contatar Hoje
              </span>
              <Calendar className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-950 mt-1">
              {metricas.contatarHoje}
            </p>
          </button>

          {/* Em Dia */}
          <button
            id="card-filtro-em-dia"
            type="button"
            onClick={() => setFiltroStatus(filtroStatus === 'Em dia' ? 'Todos' : 'Em dia')}
            className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${
              filtroStatus === 'Em dia'
                ? 'bg-white border-[#5C3A22] ring-1 ring-[#5C3A22] shadow-xs'
                : 'bg-[#F2EFEA]/40 border-[#D9D6D0] hover:bg-[#F2EFEA]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                Em Dia
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#5C3A22]" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mt-1">
              {metricas.emDia}
            </p>
          </button>

          {/* Atrasados */}
          <button
            id="card-filtro-atrasados"
            type="button"
            onClick={() => setFiltroStatus(filtroStatus === 'Atrasado' ? 'Todos' : 'Atrasado')}
            className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${
              filtroStatus === 'Atrasado'
                ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500 shadow-xs'
                : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Atrasados
              </span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-rose-950 mt-1">
              {metricas.atrasados}
            </p>
          </button>

          {/* Adiantados */}
          <button
            id="card-filtro-adiantados"
            type="button"
            onClick={() => setFiltroStatus(filtroStatus === 'Adiantado' ? 'Todos' : 'Adiantado')}
            className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${
              filtroStatus === 'Adiantado'
                ? 'bg-white border-[#5C3A22] ring-1 ring-[#5C3A22] shadow-xs'
                : 'bg-[#F2EFEA]/40 border-[#D9D6D0] hover:bg-[#F2EFEA]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#5C3A22] uppercase tracking-wider">
                Adiantados
              </span>
              <TrendingUp className="w-4 h-4 text-[#5C3A22]" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#5C3A22] mt-1">
              {metricas.adiantados}
            </p>
          </button>

          {/* Sem Etapa */}
          <button
            id="card-filtro-sem-etapa"
            type="button"
            onClick={() =>
              setFiltroStatus(
                filtroStatus === 'Sem etapa selecionada' ? 'Todos' : 'Sem etapa selecionada'
              )
            }
            className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${
              filtroStatus === 'Sem etapa selecionada'
                ? 'bg-white border-[#8F887E] ring-1 ring-[#8F887E] shadow-xs'
                : 'bg-[#F2EFEA]/40 border-[#D9D6D0] hover:bg-[#F2EFEA]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#8F887E] uppercase tracking-wider">
                Sem Etapa
              </span>
              <AlertTriangle className="w-4 h-4 text-[#8F887E]" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mt-1">
              {metricas.semEtapa}
            </p>
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS & PESQUISA COM MENU SUSPENSO */}
      <div className="bg-white rounded-sm p-4 border border-[#D9D6D0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F887E]" />
          <input
            id="input-busca-cadencia"
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por paciente, responsável..."
            className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/30 text-[#1A1A1A] placeholder:text-[#8F887E] focus:bg-white focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-medium"
          />
          {termoBusca && (
            <button
              type="button"
              onClick={() => setTermoBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F887E] hover:text-[#1A1A1A] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <label htmlFor="select-status-cadencia" className="flex items-center gap-1.5 text-xs text-[#1A1A1A] font-bold uppercase tracking-wider shrink-0 cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-[#8F887E]" />
            <span>Status:</span>
          </label>

          <select
            id="select-status-cadencia"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
            className="h-9 px-3 text-xs sm:text-sm font-medium rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden cursor-pointer"
          >
            <option value="Todos">Todos os status ({metricas.total})</option>
            <option value="Contatar hoje">Contatar hoje ({metricas.contatarHoje})</option>
            <option value="Em dia">Em dia ({metricas.emDia})</option>
            <option value="Atrasado">Atrasados ({metricas.atrasados})</option>
            <option value="Adiantado">Adiantados ({metricas.adiantados})</option>
            <option value="Sem etapa selecionada">Sem etapa ({metricas.semEtapa})</option>
          </select>
        </div>
      </div>

      {/* TABELA OFICIAL DE CADÊNCIA (Preto #1A1A1A thead + alternada) */}
      <div className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="tabela-cadencia-leads" className="w-full text-left text-xs border-collapse">
            <thead className="tabela-ar-thead bg-[#1A1A1A] text-white">
              <tr className="text-white border-b border-black/30">
                {/* 1. Nome */}
                <th scope="col" className="py-3 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-white">
                  <button
                    type="button"
                    onClick={() => handleToggleOrdenacao('nome')}
                    className="flex items-center gap-1.5 text-white hover:text-white/80 font-bold cursor-pointer"
                  >
                    <span className="text-white font-bold">Paciente</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </button>
                </th>

                {/* 2. Data de entrada */}
                <th scope="col" className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-white">
                  <button
                    type="button"
                    onClick={() => handleToggleOrdenacao('dataEntrada')}
                    className="flex items-center gap-1.5 text-white hover:text-white/80 font-bold cursor-pointer"
                  >
                    <span className="text-white font-bold">Data de entrada</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </button>
                </th>

                {/* 3. Dias corridos */}
                <th scope="col" className="py-3 px-4 text-center font-bold uppercase tracking-wider text-[11px] text-white">
                  <button
                    type="button"
                    onClick={() => handleToggleOrdenacao('diasCorridos')}
                    className="inline-flex items-center gap-1.5 text-white hover:text-white/80 font-bold cursor-pointer"
                  >
                    <span className="text-white font-bold">Dias corridos</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </button>
                </th>

                {/* 4. Etapa atual */}
                <th scope="col" className="py-3 px-4 min-w-[200px] font-bold uppercase tracking-wider text-[11px] text-white">
                  <span className="text-white font-bold">Etapa atual</span>
                </th>

                {/* 5. Etapa esperada */}
                <th scope="col" className="py-3 px-4 min-w-[180px] font-bold uppercase tracking-wider text-[11px] text-white">
                  <span className="text-white font-bold">Etapa esperada</span>
                </th>

                {/* 6. Status */}
                <th scope="col" className="py-3 px-4 text-center font-bold uppercase tracking-wider text-[11px] text-white">
                  <button
                    type="button"
                    onClick={() => handleToggleOrdenacao('status')}
                    className="inline-flex items-center gap-1.5 text-white hover:text-white/80 font-bold cursor-pointer"
                  >
                    <span className="text-white font-bold">Status</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </button>
                </th>

                {/* Ações / Ficha */}
                <th scope="col" className="py-3 px-4 text-right font-bold uppercase tracking-wider text-[11px] text-white">
                  <span className="text-white font-bold">Ficha</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#D9D6D0]">
              {leadsExibidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-[#8F887E]">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-sm bg-[#F2EFEA] flex items-center justify-center text-[#8F887E]">
                        <User className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-[#1A1A1A]">
                        Nenhum paciente nesta situação
                      </p>
                      <p className="text-[11px] text-[#6E6E6E]">
                        {termoBusca || filtroStatus !== 'Todos'
                          ? 'Tente limpar os filtros de busca.'
                          : `Não há nenhum paciente com a situação "${situacao}".`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leadsExibidos.map((lead, idx) => {
                  const isEven = idx % 2 === 1;
                  const rowBg = isEven ? 'bg-[#F2EFEA]/50 hover:bg-[#F2EFEA]' : 'bg-white hover:bg-[#F2EFEA]/30';
                  const etapaArmazenada = lead.etapaPorSituacao?.[situacao];
                  const todasConcluidas = verificarSeTodasEtapasConcluidas(situacao, etapaArmazenada);
                  const proximaEtapaCalculada = obterProximaEtapa(situacao, etapaArmazenada);

                  return (
                    <tr
                      key={lead.id}
                      id={`lead-row-${lead.id}`}
                      className={`${rowBg} transition-colors group border-b border-[#D9D6D0]/60`}
                    >
                      {/* 1. Nome */}
                      <td className="py-3 px-4 sm:px-6">
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => abrirFichaLead(lead.id)}
                            className="text-left font-bold text-[#1A1A1A] hover:text-[#5C3A22] flex items-center gap-1.5 cursor-pointer"
                            title="Abrir ficha detalhada do paciente"
                          >
                            <span>{lead.nome}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity text-[#8F887E]" />
                          </button>

                          <div className="flex items-center gap-2 text-[11px] text-[#6E6E6E]">
                            {lead.interesse && (
                              <span className="truncate max-w-[180px] sm:max-w-xs text-[#1A1A1A]">
                                {lead.interesse}
                              </span>
                            )}
                            {lead.responsavel && (
                              <span className="hidden sm:inline text-[#8F887E]">
                                • {lead.responsavel}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Data de entrada */}
                      <td className="py-3 px-4 text-xs font-semibold text-[#1A1A1A] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8F887E] shrink-0" />
                          <span>{formatarDataBR(lead.dataEntrada)}</span>
                        </div>
                      </td>

                      {/* 3. Dias corridos */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-sm text-xs font-bold border transition-colors ${
                            lead.statusCadencia === 'Atrasado'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : lead.statusCadencia === 'Adiantado'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-white text-[#1A1A1A] border-[#D9D6D0]'
                          }`}
                        >
                          {lead.diasCorridos === 0
                            ? 'Hoje (0d)'
                            : lead.diasCorridos === 1
                            ? '1 dia'
                            : `${lead.diasCorridos} dias`}
                        </span>
                      </td>

                      {/* 4. Próxima Etapa (Clicável para abrir: "Etapa realizada? Concluída ou cancelar") */}
                      <td className="py-3 px-4">
                        <button
                          id={`btn-etapa-cadencia-${lead.id}`}
                          type="button"
                          onClick={() => handleAbrirModalEtapa(lead)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold border transition-all cursor-pointer shadow-2xs group max-w-full text-left ${
                            todasConcluidas
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : lead.statusCadencia === 'Atrasado'
                              ? 'bg-rose-50/60 text-rose-900 border-rose-300 hover:bg-rose-100 hover:border-rose-400'
                              : 'bg-white text-[#1A1A1A] border-[#D9D6D0] hover:border-[#5C3A22] hover:bg-[#F2EFEA]'
                          }`}
                          title="Clique para responder: Etapa realizada? Concluída ou cancelar"
                        >
                          {todasConcluidas ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : lead.statusCadencia === 'Atrasado' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-[#5C3A22] group-hover:text-emerald-700 shrink-0" />
                          )}
                          <span className="truncate">{proximaEtapaCalculada}</span>
                        </button>
                      </td>

                      {/* 5. Etapa esperada */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-[#F2EFEA] text-[#1A1A1A] border border-[#D9D6D0]">
                          <Clock className="w-3 h-3 text-[#5C3A22] shrink-0" />
                          <span>{lead.etapaEsperada}</span>
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {renderStatusBadge(lead.statusCadencia, todasConcluidas)}
                      </td>

                      {/* Botão Ação / Ficha */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => abrirFichaLead(lead.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-[#1A1A1A] hover:bg-[#5C3A22] text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          title="Abrir ficha clínica"
                        >
                          <span>Ficha</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer com contagem da tabela */}
        <div className="p-3.5 bg-[#F2EFEA] border-t border-[#D9D6D0] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6E6E6E]">
          <span>
            Exibindo <strong>{leadsExibidos.length}</strong> de <strong>{leadsDaSituacao.length}</strong>{' '}
            pacientes em {situacao}
          </span>
          <span className="text-[11px] text-[#6E6E6E]">
            Dra. Agda Rodrigues • POP-COM-001
          </span>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div
          id="toast-feedback-etapa-cadencia"
          className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] text-white px-4 py-3 rounded-sm shadow-xl border border-[#5C3A22] text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Modal de Confirmação: Layout Limpo e Direto */}
      {modalEtapaLead && (
        <div
          id="modal-confirmacao-cadencia-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setModalEtapaLead(null)}
        >
          <div
            id="modal-confirmacao-cadencia-container"
            className="bg-white rounded-sm shadow-2xl border border-[#D9D6D0] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Limpo */}
            <div className="px-5 py-4 bg-[#1A1A1A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A882]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Atualizar Etapa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEtapaLead(null)}
                className="text-white/70 hover:text-white cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Limpo */}
            <div className="p-5 space-y-4">
              {/* Identificação do Paciente */}
              <div className="p-3 bg-[#F8F7F4] rounded-sm border border-[#D9D6D0] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#8F887E] uppercase tracking-wider block">
                    Paciente
                  </span>
                  <span className="text-sm font-bold text-[#1A1A1A] truncate block">
                    {modalEtapaLead.nome}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-white border border-[#D9D6D0] text-[#1A1A1A] shrink-0">
                  {situacao}
                </span>
              </div>

              {/* Etapa Atual & Intuito/Finalidade */}
              {(() => {
                const etapaArmazenada = modalEtapaLead.etapaPorSituacao?.[situacao];
                const todasJaConcluidas = verificarSeTodasEtapasConcluidas(situacao, etapaArmazenada);
                const etapaAtualCalculada = obterProximaEtapa(situacao, etapaArmazenada);
                const previsaoAvanco = avancarProximaEtapa(situacao, etapaArmazenada);
                const dadosIntencao = obterIntencaoDaEtapa(situacao, etapaAtualCalculada);

                if (todasJaConcluidas) {
                  return (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-sm text-center space-y-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                      <p className="text-xs font-bold text-emerald-900">
                        Todas as etapas da cadência já foram concluídas!
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Deseja reiniciar a sequência de acompanhamento?
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* Etapa Atual */}
                    <div className="p-3 bg-[#F2EFEA] border border-[#D9D6D0] rounded-sm">
                      <span className="text-[10px] font-bold text-[#8A6142] uppercase tracking-wider block">
                        Etapa a ser concluída:
                      </span>
                      <span className="text-sm font-bold text-[#1A1A1A] block mt-0.5">
                        {etapaAtualCalculada}
                      </span>
                    </div>

                    {/* Intuito e Finalidade Limpos */}
                    <div className="p-3.5 bg-[#FAF8F5] border border-[#D9D6D0] rounded-sm space-y-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-[#8A6142] uppercase tracking-wider block">
                          Intuito da Mensagem
                        </span>
                        <p className="text-xs font-bold text-[#1A1A1A] mt-0.5">
                          {dadosIntencao.intencao}
                        </p>
                      </div>

                      <div className="border-t border-[#E8E5DF] pt-2">
                        <span className="text-[10px] font-bold text-[#8F887E] uppercase tracking-wider block">
                          Finalidade
                        </span>
                        <p className="text-xs text-[#4A4A4A] mt-0.5 leading-relaxed">
                          {dadosIntencao.finalidade}
                        </p>
                      </div>
                    </div>

                    {/* Próximo Passo */}
                    <div className="text-[11px] text-[#6E6E6E] flex items-center justify-between p-2 rounded-sm bg-emerald-50/70 border border-emerald-200/60">
                      <span>Próxima etapa ao concluir:</span>
                      <strong className="text-emerald-800">{previsaoAvanco.proximaEtapa}</strong>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Ações */}
            <div className="px-5 py-3.5 bg-[#F8F7F4] border-t border-[#D9D6D0] flex items-center justify-end gap-2">
              <button
                id="btn-cancelar-pergunta-cadencia"
                type="button"
                onClick={() => setModalEtapaLead(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] hover:bg-[#F2EFEA] transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              {verificarSeTodasEtapasConcluidas(
                situacao,
                modalEtapaLead.etapaPorSituacao?.[situacao]
              ) ? (
                <button
                  id="btn-reiniciar-pergunta-cadencia"
                  type="button"
                  onClick={handleReiniciarCadenciaLead}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm bg-[#5C3A22] hover:bg-[#4A2E1B] text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>
              ) : (
                <button
                  id="btn-confirmar-pergunta-cadencia"
                  type="button"
                  onClick={handleConcluirEtapaLead}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Concluir</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
