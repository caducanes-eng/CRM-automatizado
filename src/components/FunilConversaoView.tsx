import React, { useState, useMemo } from 'react';
import {
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Flame,
  CalendarCheck,
  Sparkles,
  RotateCcw,
  Sprout,
  UserX,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Calendar,
  Percent,
  Layers,
  Award,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { Lead, SituacaoLead, StatusVenda } from '../types';
import { formatarMoeda, formatarDataBR } from '../utils/formatters';

interface EtapaFunilMeta {
  id: string;
  titulo: string;
  subtitulo: string;
  icone: React.ElementType;
  situacoesAssociadas: SituacaoLead[];
  corBadge: string;
  corBorda: string;
  corBarra: string;
}

const ETAPAS_FUNIL_METAS: EtapaFunilMeta[] = [
  {
    id: 'captacao',
    titulo: '1. Em captação',
    subtitulo: 'Primeiro contato e qualificação do paciente',
    icone: Flame,
    situacoesAssociadas: ['Em captação'],
    corBadge: 'bg-[#F4EFEA] text-[#5C3A22] border-[#D9CBBF]',
    corBorda: 'border-[#5C3A22]',
    corBarra: 'bg-[#5C3A22]',
  },
  {
    id: 'consulta',
    titulo: '2. Consulta & Avaliação',
    subtitulo: 'Consulta agendada ou realizada',
    icone: CalendarCheck,
    situacoesAssociadas: ['Consulta agendada', 'Pós consulta'],
    corBadge: 'bg-[#EEF4F7] text-[#2B586E] border-[#C5DAE4]',
    corBorda: 'border-[#2B586E]',
    corBarra: 'bg-[#2B586E]',
  },
  {
    id: 'procedimento',
    titulo: '3. Procedimento & Execução',
    subtitulo: 'Procedimento agendado ou concluído',
    icone: Sparkles,
    situacoesAssociadas: ['Procedimento agendado', 'Pós procedimento'],
    corBadge: 'bg-[#EDF6F1] text-[#2D5C43] border-[#C2DFCA]',
    corBorda: 'border-[#2D5C43]',
    corBarra: 'bg-[#2D5C43]',
  },
  {
    id: 'relacionamento',
    titulo: '4. Relacionamento & Reativação',
    subtitulo: 'Leads em fluxo de nutrição ou retorno',
    icone: Sprout,
    situacoesAssociadas: ['Nutrição', 'Reativação'],
    corBadge: 'bg-[#F2F6ED] text-[#435C2B] border-[#D3E1C5]',
    corBorda: 'border-[#435C2B]',
    corBarra: 'bg-[#435C2B]',
  },
];

export const FunilConversaoView: React.FC = () => {
  const { leads, compras, abrirFichaLead } = useCrm();
  const { config } = useEmpresa();

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';
  const corSidebar = config.estetica?.corSidebar || '#1A1A1A';

  // Filtros
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos');
  const [etapaSelecionadaId, setEtapaSelecionadaId] = useState<string | null>(null);

  // Lista de responsáveis únicos
  const responsaveisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.responsavel && !l.deleted_at) set.add(l.responsavel);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Leads válidos filtrados pelo responsável
  const leadsFiltrados = useMemo(() => {
    return leads.filter((l) => {
      if (l.deleted_at) return false;
      if (filtroResponsavel !== 'todos' && l.responsavel !== filtroResponsavel) {
        return false;
      }
      return true;
    });
  }, [leads, filtroResponsavel]);

  // Mapeamento de compras por lead
  const comprasPorLead = useMemo(() => {
    const map = new Map<string, number>();
    compras.forEach((c) => {
      if (!c.deleted_at) {
        const total = map.get(c.leadId) || 0;
        map.set(c.leadId, total + (c.valor || 0));
      }
    });
    return map;
  }, [compras]);

  // Métricas Gerais do Funil
  const metricasGerais = useMemo(() => {
    const total = leadsFiltrados.length;
    const vendasFeitas = leadsFiltrados.filter((l) => l.statusVenda === 'Venda feita').length;
    const emProcesso = leadsFiltrados.filter((l) => l.statusVenda === 'Em processo').length;
    const perdidos = leadsFiltrados.filter((l) => l.statusVenda === 'Perdido').length;

    // Faturamento Total realizado nos leads filtrados
    let totalFaturado = 0;
    leadsFiltrados.forEach((l) => {
      totalFaturado += comprasPorLead.get(l.id) || 0;
    });

    // Pipeline Potencial (Soma dos leads em processo)
    const pipelinePotencial = leadsFiltrados
      .filter((l) => l.statusVenda === 'Em processo')
      .reduce((acc, l) => acc + (l.possivelValor || 0), 0);

    // Taxa de Conversão Geral
    const taxaConversaoGeral = total > 0 ? (vendasFeitas / total) * 100 : 0;
    const taxaPerdaGeral = total > 0 ? (perdidos / total) * 100 : 0;

    // Ticket Médio
    const ticketMedio = vendasFeitas > 0 ? totalFaturado / vendasFeitas : 0;

    return {
      total,
      vendasFeitas,
      emProcesso,
      perdidos,
      totalFaturado,
      pipelinePotencial,
      taxaConversaoGeral,
      taxaPerdaGeral,
      ticketMedio,
    };
  }, [leadsFiltrados, comprasPorLead]);

  // Dados calculados por Etapa do Funil
  const dadosEtapas = useMemo(() => {
    const totalLeads = leadsFiltrados.length;

    return ETAPAS_FUNIL_METAS.map((etapaMeta, index) => {
      const leadsDestaEtapa = leadsFiltrados.filter((l) =>
        etapaMeta.situacoesAssociadas.includes(l.situacao)
      );

      const quantidade = leadsDestaEtapa.length;
      const percentualDoTotal = totalLeads > 0 ? (quantidade / totalLeads) * 100 : 0;

      // Soma de compras e potenciais
      let valorRealizado = 0;
      let valorPotencial = 0;
      leadsDestaEtapa.forEach((l) => {
        valorRealizado += comprasPorLead.get(l.id) || 0;
        valorPotencial += l.possivelValor || 0;
      });

      return {
        ...etapaMeta,
        index,
        leads: leadsDestaEtapa,
        quantidade,
        percentualDoTotal,
        valorRealizado,
        valorPotencial,
      };
    });
  }, [leadsFiltrados, comprasPorLead]);

  // Leads a exibir na tabela de detalhamento
  const leadsDetalhamento = useMemo(() => {
    if (!etapaSelecionadaId) return leadsFiltrados;
    const meta = ETAPAS_FUNIL_METAS.find((m) => m.id === etapaSelecionadaId);
    if (!meta) return leadsFiltrados;
    return leadsFiltrados.filter((l) => meta.situacoesAssociadas.includes(l.situacao));
  }, [leadsFiltrados, etapaSelecionadaId]);

  return (
    <div
      id="tela-funil-conversao"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-200"
    >
      {/* BARRA DE FILTROS SUPERIOR */}
      <div className="flex items-center justify-end pb-2">
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-sm border border-[#D9D6D0] shadow-2xs">
          <Users className="w-4 h-4 text-[#8F887E]" />
          <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Responsável:</span>
          <select
            id="select-filtro-responsavel-funil"
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className="text-xs font-semibold text-[#1A1A1A] bg-transparent border-0 focus:outline-hidden cursor-pointer"
          >
            <option value="todos">Toda a Clínica (Geral)</option>
            {responsaveisDisponiveis.map((resp) => (
              <option key={resp} value={resp}>
                {resp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =========================================================================
          CARDS DE INDICADORES PRINCIPAIS (KPIs)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Taxa Geral de Conversão */}
        <div className="bg-white p-5 rounded-sm border border-[#D9D6D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E]">
              Taxa Geral de Conversão
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#EDF6F1] border border-[#C2DFCA] flex items-center justify-center text-[#2D5C43]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-[#1A1A1A] font-mono">
                {metricasGerais.taxaConversaoGeral.toFixed(1)}%
              </span>
              <span className="text-xs font-bold text-[#2D5C43]">
                {metricasGerais.vendasFeitas} vendas
              </span>
            </div>
            <p className="text-xs text-[#6E6E6E] mt-1">
              De {metricasGerais.total} oportunidades registradas
            </p>
          </div>
        </div>

        {/* KPI 2: Faturamento Realizado */}
        <div className="bg-[#1A1A1A] text-white p-5 rounded-sm border border-[#1A1A1A] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9D6D0]">
              Faturamento Realizado
            </span>
            <div className="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center text-[#C5A265]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white block font-mono">
              {formatarMoeda(metricasGerais.totalFaturado)}
            </span>
            <p className="text-xs text-[#D9D6D0] mt-1">
              Ticket Médio: <strong className="text-white">{formatarMoeda(metricasGerais.ticketMedio)}</strong>
            </p>
          </div>
        </div>

        {/* KPI 3: Pipeline em Processo */}
        <div className="bg-white p-5 rounded-sm border border-[#D9D6D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E]">
              Pipeline em Processo
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#F4EFEA] border border-[#D9CBBF] flex items-center justify-center text-[#5C3A22]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-[#5C3A22] font-mono">
                {formatarMoeda(metricasGerais.pipelinePotencial)}
              </span>
            </div>
            <p className="text-xs text-[#6E6E6E] mt-1">
              {metricasGerais.emProcesso} oportunidades em andamento
            </p>
          </div>
        </div>

        {/* KPI 4: Taxa de Perda */}
        <div className="bg-white p-5 rounded-sm border border-[#D9D6D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E]">
              Taxa de Perdas / Descarte
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#F5EEED] border border-[#DAC0BD] flex items-center justify-center text-[#7A322C]">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-[#7A322C] font-mono">
                {metricasGerais.taxaPerdaGeral.toFixed(1)}%
              </span>
              <span className="text-xs text-[#6E6E6E]">
                {metricasGerais.perdidos} perdidos
              </span>
            </div>
            <p className="text-xs text-[#6E6E6E] mt-1">
              Oportunidades arquivadas ou sem fechamento
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REPRESENTAÇÃO VISUAL PROGRESSIVA DO FUNIL
         ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9D6D0] pb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wide text-[#1A1A1A] uppercase flex items-center gap-2">
              <span className="text-[#5C3A22]">01</span>
              <span>Passagem & Distribuição do Funil</span>
            </h2>
            <p className="text-xs text-[#6E6E6E]">
              Clique em qualquer etapa para filtrar a lista detalhada de pacientes abaixo.
            </p>
          </div>

          {etapaSelecionadaId && (
            <button
              type="button"
              onClick={() => setEtapaSelecionadaId(null)}
              className="text-xs font-bold text-[#5C3A22] hover:text-[#1A1A1A] uppercase tracking-wider cursor-pointer"
            >
              ✕ Mostrar todas as etapas
            </button>
          )}
        </div>

        {/* Barras do Funil */}
        <div className="space-y-4">
          {dadosEtapas.map((etapa) => {
            const Icone = etapa.icone;
            const isSelecionada = etapaSelecionadaId === etapa.id;

            return (
              <div
                key={etapa.id}
                onClick={() =>
                  setEtapaSelecionadaId(isSelecionada ? null : etapa.id)
                }
                className={`p-4 rounded-sm border transition-all cursor-pointer ${
                  isSelecionada
                    ? 'bg-[#F2EFEA] border-[#5C3A22] ring-1 ring-[#5C3A22] shadow-xs'
                    : 'bg-[#F8F7F4]/50 border-[#D9D6D0] hover:bg-[#F2EFEA]/60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-sm flex items-center justify-center border shadow-2xs ${etapa.corBadge}`}
                    >
                      <Icone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">
                          {etapa.titulo}
                        </h3>
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-white text-[#1A1A1A] border border-[#D9D6D0]">
                          {etapa.quantidade} {etapa.quantidade === 1 ? 'paciente' : 'pacientes'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6E6E6E]">{etapa.subtitulo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#8F887E] block">
                        Volume Potencial
                      </span>
                      <span className="font-bold text-[#1A1A1A] font-mono">
                        {formatarMoeda(etapa.valorPotencial)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#8F887E] block">
                        % do Pipeline
                      </span>
                      <span className="font-bold text-[#5C3A22] font-mono">
                        {etapa.percentualDoTotal.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra Visual Proporcional */}
                <div className="w-full bg-[#E5E2DC] h-3 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.max(etapa.percentualDoTotal, 4)}%`,
                    }}
                    className={`h-full transition-all duration-500 rounded-full ${etapa.corBarra}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TABELA DETALHADA DE PACIENTES POR ETAPA DO FUNIL
         ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#D9D6D0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wide text-[#1A1A1A] uppercase flex items-center gap-2">
              <span className="text-[#5C3A22]">02</span>
              <span>
                {etapaSelecionadaId
                  ? `Pacientes em "${ETAPAS_FUNIL_METAS.find((m) => m.id === etapaSelecionadaId)?.titulo}"`
                  : 'Detalhamento Completo de Pacientes no Funil'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-[#F2EFEA] text-[#1A1A1A] border border-[#D9D6D0]">
                {leadsDetalhamento.length} paciente(s)
              </span>
            </h2>
            <p className="text-xs text-[#6E6E6E]">
              Acesse rapidamente a ficha clínica de cada oportunidade.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="tabela-ar-thead">
              <tr>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Paciente</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Situação</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Interesse</th>
                <th className="py-3 px-3 text-right font-bold uppercase tracking-wider text-[11px]">Possível Valor</th>
                <th className="py-3 px-3 text-right font-bold uppercase tracking-wider text-[11px]">Total Realizado</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Status da Venda</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Responsável</th>
                <th className="py-3 px-4 text-center font-bold uppercase tracking-wider text-[11px]">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D6D0]">
              {leadsDetalhamento.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8F887E]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-8 h-8 mx-auto text-[#8F887E]" />
                      <p className="text-xs font-semibold text-[#1A1A1A]">Nenhum paciente nesta etapa.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leadsDetalhamento.map((lead, idx) => {
                  const totalComprado = comprasPorLead.get(lead.id) || 0;
                  const isEven = idx % 2 === 1;
                  const rowBg = isEven ? 'bg-[#F2EFEA]/40' : 'bg-white';

                  return (
                    <tr
                      key={lead.id}
                      className={`${rowBg} hover:bg-[#F2EFEA] transition-colors border-b border-[#D9D6D0]/60`}
                    >
                      <td className="py-3 px-4 font-bold">
                        <button
                          type="button"
                          onClick={() => abrirFichaLead(lead.id)}
                          className="text-left text-[#1A1A1A] hover:text-[#5C3A22] flex items-center gap-1.5 group cursor-pointer"
                        >
                          <span>{lead.nome}</span>
                          <ExternalLink className="w-3 h-3 text-[#8F887E] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-sm bg-white text-[#1A1A1A] border border-[#D9D6D0] text-[11px]">
                          {lead.situacao}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#1A1A1A] max-w-[160px] truncate">
                        {lead.interesse || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[#1A1A1A] font-mono">
                        {lead.possivelValor > 0 ? formatarMoeda(lead.possivelValor) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold font-mono">
                        {totalComprado > 0 ? (
                          <span className="text-[#5C3A22] bg-[#F2EFEA] px-2 py-0.5 rounded-sm border border-[#5C3A22]/20">
                            {formatarMoeda(totalComprado)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                            lead.statusVenda === 'Venda feita'
                              ? 'bg-[#EDF5F0] text-[#1E4D30] border border-[#BED8C7]'
                              : lead.statusVenda === 'Perdido'
                              ? 'bg-[#F5EEED] text-[#7A322C] border border-[#DAC0BD]'
                              : 'bg-[#F4EFEA] text-[#5C3A22] border border-[#D9CBBF]'
                          }`}
                        >
                          {lead.statusVenda}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#1A1A1A]">{lead.responsavel}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => abrirFichaLead(lead.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-[#1A1A1A] hover:bg-[#5C3A22] text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <span>Ficha</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
