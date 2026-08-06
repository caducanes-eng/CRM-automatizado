import React, { useState, useMemo } from 'react';
import {
  UserX,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Search,
  RotateCcw,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Tag,
  RefreshCw,
  X,
  SlidersHorizontal,
  Megaphone,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Users,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { Lead, OrigemLead, SituacaoLead, TODAS_ORIGENS, MOTIVOS_PERDA_PADRAO } from '../types';

export const LeadsPerdidosView: React.FC = () => {
  const { leads, obterFichaPorLead, abrirFichaLead, reativarLead } = useCrm();
  const { config } = useEmpresa();

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';
  const corSidebar = config.estetica?.corSidebar || '#1A1A1A';

  // Estados de Filtros
  const [origemFiltro, setOrigemFiltro] = useState<string>('Todas');
  const [dataInicioFiltro, setDataInicioFiltro] = useState<string>('');
  const [dataFimFiltro, setDataFimFiltro] = useState<string>('');
  const [motivoFiltro, setMotivoFiltro] = useState<string>('Todos');
  const [situacaoFiltro, setSituacaoFiltro] = useState<string>('Todas');
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  // Estados de UI / Campanha de Recuperação
  const [copiadoFeedback, setCopiadoFeedback] = useState(false);
  const [showPainelInsights, setShowPainelInsights] = useState(true);
  const [modalCampanhaAberta, setModalCampanhaAberta] = useState(false);
  const [leadReativadoNotificacao, setLeadReativadoNotificacao] = useState<string | null>(null);

  // Formatação de Moeda BRL
  const formatarMoeda = (valor?: number): string => {
    return (valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  };

  // Formatação de Data DD/MM/AAAA
  const formatarDataBR = (dataIso?: string): string => {
    if (!dataIso) return '-';
    const partes = dataIso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataIso;
  };

  // 1. Filtrar TODOS os leads com statusVenda === "Perdido"
  const todosLeadsPerdidos = useMemo(() => {
    return leads.filter((l) => l.statusVenda === 'Perdido' && !l.deleted_at);
  }, [leads]);

  // 2. Aplicar filtros dinâmicos
  const leadsFiltrados = useMemo(() => {
    return todosLeadsPerdidos.filter((lead) => {
      const ficha = obterFichaPorLead(lead.id);
      const origem = ficha?.origemLead || 'Outro';
      const motivo = ficha?.motivoPerda || lead.motivoPerda || 'Não informado';
      const dataPerda = ficha?.dataPerda || lead.dataPerda || lead.updated_at.split('T')[0];
      const situacaoQuandoPerdido = lead.situacaoPerda || lead.situacao;

      // Filtro por Origem
      if (origemFiltro !== 'Todas' && origem !== origemFiltro) {
        return false;
      }

      // Filtro por Motivo da Perda
      if (motivoFiltro !== 'Todos' && !motivo.toLowerCase().includes(motivoFiltro.toLowerCase())) {
        return false;
      }

      // Filtro por Situação em que estava
      if (situacaoFiltro !== 'Todas' && situacaoQuandoPerdido !== situacaoFiltro) {
        return false;
      }

      // Filtro por Faixa de Data da Perda
      if (dataInicioFiltro && dataPerda < dataInicioFiltro) {
        return false;
      }
      if (dataFimFiltro && dataPerda > dataFimFiltro) {
        return false;
      }

      // Filtro por Busca de Texto Livre
      if (buscaTexto.trim()) {
        const termo = buscaTexto.toLowerCase().trim();
        const nomeMatch = lead.nome.toLowerCase().includes(termo);
        const interesseMatch = lead.interesse ? lead.interesse.toLowerCase().includes(termo) : false;
        const motivoMatch = motivo.toLowerCase().includes(termo);
        const responsavelMatch = lead.responsavel.toLowerCase().includes(termo);
        const telMatch = ficha?.telefone ? ficha.telefone.toLowerCase().includes(termo) : false;
        return nomeMatch || interesseMatch || motivoMatch || responsavelMatch || telMatch;
      }

      return true;
    });
  }, [
    todosLeadsPerdidos,
    origemFiltro,
    motivoFiltro,
    situacaoFiltro,
    dataInicioFiltro,
    dataFimFiltro,
    buscaTexto,
    obterFichaPorLead,
  ]);

  // =========================================================================
  // CÁLCULO DOS INDICADORES EM DESTAQUE NO TOPO (Métricas Oficiais)
  // =========================================================================
  const totalLeadsPerdidos = leadsFiltrados.length;
  const valorTotalPerdido = useMemo(() => {
    return leadsFiltrados.reduce((acc, lead) => acc + (lead.possivelValor || 0), 0);
  }, [leadsFiltrados]);

  const ticketMedioPerdido = totalLeadsPerdidos > 0 ? valorTotalPerdido / totalLeadsPerdidos : 0;

  // =========================================================================
  // ANÁLISE DE PADRÕES PARA O GESTOR (Inteligência & Campanhas de Resgate)
  // =========================================================================
  const padroes = useMemo(() => {
    const contagemPorOrigem: Record<string, { count: number; valor: number }> = {};
    const contagemPorMotivo: Record<string, { count: number; valor: number }> = {};
    const matrizOrigemMotivo: Record<string, Record<string, number>> = {};

    leadsFiltrados.forEach((lead) => {
      const ficha = obterFichaPorLead(lead.id);
      const origem = ficha?.origemLead || 'Outro';
      const motivo = ficha?.motivoPerda || lead.motivoPerda || 'Não informado';
      const valor = lead.possivelValor || 0;

      // Origem
      if (!contagemPorOrigem[origem]) contagemPorOrigem[origem] = { count: 0, valor: 0 };
      contagemPorOrigem[origem].count += 1;
      contagemPorOrigem[origem].valor += valor;

      // Motivo
      if (!contagemPorMotivo[motivo]) contagemPorMotivo[motivo] = { count: 0, valor: 0 };
      contagemPorMotivo[motivo].count += 1;
      contagemPorMotivo[motivo].valor += valor;

      // Cruzamento Origem x Motivo
      if (!matrizOrigemMotivo[origem]) matrizOrigemMotivo[origem] = {};
      matrizOrigemMotivo[origem][motivo] = (matrizOrigemMotivo[origem][motivo] || 0) + 1;
    });

    // Encontrar Top Origem
    const topOrigens = Object.entries(contagemPorOrigem).sort((a, b) => b[1].count - a[1].count);
    const principalOrigem = topOrigens[0] ? { nome: topOrigens[0][0], ...topOrigens[0][1] } : null;

    // Encontrar Top Motivo
    const topMotivos = Object.entries(contagemPorMotivo).sort((a, b) => b[1].count - a[1].count);
    const principalMotivo = topMotivos[0] ? { nome: topMotivos[0][0], ...topMotivos[0][1] } : null;

    // Identificar padrão principal
    let destaqueCruzado: string | null = null;
    if (principalOrigem && matrizOrigemMotivo[principalOrigem.nome]) {
      const motivosOrigem = Object.entries(matrizOrigemMotivo[principalOrigem.nome]).sort(
        (a, b) => b[1] - a[1]
      );
      if (motivosOrigem[0] && principalOrigem.count > 0) {
        const perc = Math.round((motivosOrigem[0][1] / principalOrigem.count) * 100);
        destaqueCruzado = `${perc}% dos leads perdidos do ${principalOrigem.nome} citaram "${motivosOrigem[0][0]}"`;
      }
    }

    return {
      topOrigens,
      topMotivos,
      principalOrigem,
      principalMotivo,
      destaqueCruzado,
    };
  }, [leadsFiltrados, obterFichaPorLead]);

  // Aplicar filtros rápidos de período
  const aplicarFiltroPeriodoRapido = (dias: number | 'este-mes' | 'tudo') => {
    const hoje = new Date();
    const hojeIso = hoje.toISOString().split('T')[0];

    if (dias === 'tudo') {
      setDataInicioFiltro('');
      setDataFimFiltro('');
      return;
    }

    if (dias === 'este-mes') {
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      setDataInicioFiltro(primeiroDiaMes);
      setDataFimFiltro(hojeIso);
      return;
    }

    const dataPassada = new Date(hoje.getTime() - dias * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    setDataInicioFiltro(dataPassada);
    setDataFimFiltro(hojeIso);
  };

  const limparTodosFiltros = () => {
    setOrigemFiltro('Todas');
    setMotivoFiltro('Todos');
    setSituacaoFiltro('Todas');
    setDataInicioFiltro('');
    setDataFimFiltro('');
    setBuscaTexto('');
  };

  const temFiltrosAtivos =
    origemFiltro !== 'Todas' ||
    motivoFiltro !== 'Todos' ||
    situacaoFiltro !== 'Todas' ||
    dataInicioFiltro !== '' ||
    dataFimFiltro !== '' ||
    buscaTexto !== '';

  // Handler: Reativar Lead individual
  const handleReativarLead = (leadId: string, nomeLead: string) => {
    reativarLead(leadId);
    setLeadReativadoNotificacao(`Lead "${nomeLead}" foi reativado com sucesso e movido para a etapa de Reativação!`);
    setTimeout(() => {
      setLeadReativadoNotificacao(null);
    }, 4000);
  };

  // Handler: Reativar todos os leads filtrados em lote
  const handleReativarTodosFiltrados = () => {
    if (leadsFiltrados.length === 0) return;

    if (
      window.confirm(
        `Deseja realmente reativar todos os ${leadsFiltrados.length} leads filtrados e movê-los para a etapa de Reativação?`
      )
    ) {
      leadsFiltrados.forEach((l) => reativarLead(l.id));
      setLeadReativadoNotificacao(
        `${leadsFiltrados.length} leads foram reativados em lote com sucesso e movidos para Reativação!`
      );
      setModalCampanhaAberta(false);
      setTimeout(() => {
        setLeadReativadoNotificacao(null);
      }, 5000);
    }
  };

  // Handler: Copiar dados da campanha para envio no WhatsApp
  const handleCopiarContatosCampanha = () => {
    if (leadsFiltrados.length === 0) return;

    const linhas: string[] = [];
    linhas.push('📋 LISTA DE CONTATOS PARA CAMPANHA DE RECUPERAÇÃO / RESGATE:');
    linhas.push('===========================================================');

    leadsFiltrados.forEach((l, idx) => {
      const ficha = obterFichaPorLead(l.id);
      const tel = ficha?.telefone || 'Sem telefone';
      const motivo = ficha?.motivoPerda || l.motivoPerda || 'Não informado';
      const origem = ficha?.origemLead || 'Outro';

      linhas.push(
        `${idx + 1}. Nome: ${l.nome} | Tel: ${tel} | Interesse: ${l.interesse || 'Geral'} | Motivo: ${motivo} | Origem: ${origem}`
      );
    });

    navigator.clipboard.writeText(linhas.join('\n'));
    setCopiadoFeedback(true);
    setTimeout(() => setCopiadoFeedback(false), 2500);
  };

  return (
    <div
      id="tela-leads-perdidos"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-200"
    >
      {/* =========================================================================
          CABEÇALHO DA TELA
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#D9D6D0] pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-sm bg-rose-900 flex items-center justify-center text-white shadow-xs shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] uppercase">
                Leads perdidos
              </h2>
              <span className="px-2.5 py-0.5 rounded-sm text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
                statusVenda = "Perdido"
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6E6E6E] mt-0.5">
              Análise de perdas, motivos de descarte e modelagem de campanhas de recuperação
            </p>
          </div>
        </div>

        {/* Ações Rápidas no Topo */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Campanha de Recuperação */}
          <button
            id="btn-abrir-modelador-campanha"
            type="button"
            onClick={() => setModalCampanhaAberta(true)}
            style={{ backgroundColor: corPrimaria }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:brightness-110 transition-all cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5 text-white" />
            <span>Modelar Campanha de Resgate</span>
          </button>

          {/* Copiar Lista de Contatos */}
          <button
            id="btn-copiar-contatos-perdidos"
            type="button"
            onClick={handleCopiarContatosCampanha}
            title="Copiar lista de telefones e dados para WhatsApp"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white border border-[#D9D6D0] hover:bg-[#F2EFEA] text-xs font-bold uppercase tracking-wider text-[#1A1A1A] shadow-2xs transition-colors cursor-pointer"
          >
            {copiadoFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Lista Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#5C3A22]" />
                <span>Exportar / Copiar Lista</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          NOTIFICAÇÃO DE REATIVAÇÃO DE LEAD
         ========================================================================= */}
      {leadReativadoNotificacao && (
        <div
          id="alerta-lead-reativado"
          className="p-3.5 rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center justify-between shadow-2xs animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{leadReativadoNotificacao}</span>
          </div>
          <button
            type="button"
            onClick={() => setLeadReativadoNotificacao(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* =========================================================================
          DOIS INDICADORES EM DESTAQUE NO TOPO (REQUISITO EXPLÍCITO)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* INDICADOR 1: TOTAL DE LEADS PERDIDOS (DESTAQUE) */}
        <div
          id="card-total-leads-perdidos"
          className="p-5 rounded-sm text-white shadow-md border border-black/20 flex flex-col justify-between relative overflow-hidden"
          style={{ backgroundColor: corSidebar }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9D6D0]">
              Total de leads perdidos
            </span>
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: corPrimaria }}
            >
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                {totalLeadsPerdidos}
              </span>
              {todosLeadsPerdidos.length > 0 && temFiltrosAtivos && (
                <span className="text-xs text-[#D9D6D0]">
                  de {todosLeadsPerdidos.length} no total
                </span>
              )}
            </div>
            <p className="text-xs text-[#D9D6D0] mt-1">
              Oportunidades marcadas com status "Perdido"
            </p>
          </div>
        </div>

        {/* INDICADOR 2: VALOR TOTAL PERDIDO (DESTAQUE) */}
        <div
          id="card-valor-total-perdido"
          className="p-5 rounded-sm bg-rose-950 text-white shadow-md border border-rose-800 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
              Valor total perdido
            </span>
            <div className="w-8 h-8 rounded-sm bg-rose-800/80 flex items-center justify-center text-rose-200">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white block font-mono">
              {formatarMoeda(valorTotalPerdido)}
            </span>
            <p className="text-xs text-rose-200/90 mt-1">
              Soma do potencial estimado (possivelValor)
            </p>
          </div>
        </div>

        {/* INDICADOR COMPLEMENTAR 3: TICKET MÉDIO PERDIDO */}
        <div
          id="card-ticket-medio-perdido"
          className="p-4 sm:p-5 rounded-sm bg-white border border-[#D9D6D0] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E]">
              Ticket Médio Perdido
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] flex items-center justify-center text-[#1A1A1A]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] block font-mono">
              {formatarMoeda(ticketMedioPerdido)}
            </span>
            <span className="text-[11px] text-[#8F887E] block mt-0.5">
              Por oportunidade não convertida
            </span>
          </div>
        </div>

        {/* INDICADOR COMPLEMENTAR 4: PADRÃO PREDOMINANTE */}
        <div
          id="card-padrao-predominante"
          className="p-4 sm:p-5 rounded-sm bg-white border border-[#D9D6D0] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
              Principal Padrão
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#F2EFEA] border border-[#D9D6D0] flex items-center justify-center text-[#5C3A22]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-sm font-bold text-[#1A1A1A] block truncate" title={padroes.principalMotivo?.nome}>
              {padroes.principalMotivo?.nome || 'Nenhum'}
            </span>
            <span className="text-[11px] text-[#6E6E6E] font-semibold block mt-0.5">
              {padroes.principalOrigem
                ? `Maioria via ${padroes.principalOrigem.nome} (${padroes.principalOrigem.count} leads)`
                : 'Sem dados suficientes'}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAINEL INTELIGENTE DE IDENTIFICAÇÃO DE PADRÕES PARA O GESTOR
         ========================================================================= */}
      <div
        id="painel-padroes-gestor"
        className="rounded-sm bg-white border border-[#D9D6D0] shadow-xs overflow-hidden"
      >
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#D9D6D0]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 text-white"
              style={{ backgroundColor: corSidebar }}
            >
              <BarChart3 className="w-4 h-4" style={{ color: corSecundaria }} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                Padrões Identificados & Diagnóstico para Recuperação
              </h3>
              <p className="text-[11px] text-[#6E6E6E]">
                Descubra onde estão os gargalos de conversão para calibrar ofertas e mensagens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {padroes.destaqueCruzado && (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-sm border border-amber-300 inline-flex items-center gap-1.5 uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                {padroes.destaqueCruzado}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowPainelInsights(!showPainelInsights)}
              className="p-1.5 text-[#8F887E] hover:text-[#1A1A1A] rounded-sm hover:bg-[#F8F7F4] transition-colors cursor-pointer"
            >
              {showPainelInsights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showPainelInsights && (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Bloco 1: Distribuição por Origem */}
            <div className="p-3.5 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-2.5">
              <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Perdas por Origem do Lead</span>
                <span className="text-[#8F887E] font-normal">Qtd / Valor</span>
              </span>
              <div className="space-y-1.5">
                {padroes.topOrigens.length > 0 ? (
                  padroes.topOrigens.map(([origem, dados]) => {
                    const perc = totalLeadsPerdidos > 0 ? Math.round((dados.count / totalLeadsPerdidos) * 100) : 0;
                    return (
                      <div key={origem} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setOrigemFiltro(origem)}
                            className="font-semibold text-[#1A1A1A] hover:underline cursor-pointer"
                          >
                            {origem} ({dados.count})
                          </button>
                          <span className="text-[#6E6E6E] font-mono">
                            {formatarMoeda(dados.valor)} <strong className="text-[#1A1A1A]">({perc}%)</strong>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#D9D6D0] rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all"
                            style={{ width: `${perc}%`, backgroundColor: corPrimaria }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-[#8F887E]">Nenhum dado com os filtros atuais</span>
                )}
              </div>
            </div>

            {/* Bloco 2: Distribuição por Motivo */}
            <div className="p-3.5 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-2.5">
              <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Perdas por Motivo Declarado</span>
                <span className="text-[#8F887E] font-normal">Qtd / Valor</span>
              </span>
              <div className="space-y-1.5">
                {padroes.topMotivos.length > 0 ? (
                  padroes.topMotivos.slice(0, 4).map(([motivo, dados]) => {
                    const perc = totalLeadsPerdidos > 0 ? Math.round((dados.count / totalLeadsPerdidos) * 100) : 0;
                    return (
                      <div key={motivo} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setMotivoFiltro(motivo)}
                            className="font-semibold text-[#1A1A1A] hover:underline truncate max-w-[200px] text-left cursor-pointer"
                            title={motivo}
                          >
                            {motivo}
                          </button>
                          <span className="text-[#6E6E6E] font-mono shrink-0">
                            {dados.count}x • {formatarMoeda(dados.valor)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#D9D6D0] rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-rose-600 rounded-sm transition-all"
                            style={{ width: `${perc}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-[#8F887E]">Nenhum dado com os filtros atuais</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          BARRA COMPLETA DE FILTROS (ORIGEM + FAIXA DE DATAS + BUSCA + MOTIVO)
         ========================================================================= */}
      <div
        id="barra-filtros-leads-perdidos"
        className="bg-white p-4 rounded-sm border border-[#D9D6D0] shadow-xs space-y-3.5"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Campo de Busca Livre */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8F887E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-busca-leads-perdidos"
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar por nome, interesse, motivo ou responsável..."
              className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] placeholder:text-[#8F887E] text-[#1A1A1A] focus:bg-white focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
            />
            {buscaTexto && (
              <button
                type="button"
                onClick={() => setBuscaTexto('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F887E] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro: Origem do Lead */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="select-filtro-origem" className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] shrink-0">
              Origem:
            </label>
            <select
              id="select-filtro-origem"
              value={origemFiltro}
              onChange={(e) => setOrigemFiltro(e.target.value)}
              className="h-9 px-3 text-xs sm:text-sm font-semibold rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:outline-hidden cursor-pointer"
            >
              <option value="Todas">Todas as Origens</option>
              {TODAS_ORIGENS.map((orig) => (
                <option key={orig} value={orig}>
                  {orig}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Motivo da Perda */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="select-filtro-motivo" className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] shrink-0">
              Motivo:
            </label>
            <select
              id="select-filtro-motivo"
              value={motivoFiltro}
              onChange={(e) => setMotivoFiltro(e.target.value)}
              className="h-9 px-3 text-xs sm:text-sm font-semibold rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:outline-hidden cursor-pointer max-w-[190px] truncate"
            >
              <option value="Todos">Todos os Motivos</option>
              {MOTIVOS_PERDA_PADRAO.map((mot) => (
                <option key={mot} value={mot}>
                  {mot}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 2: Faixa de Data da Perda + Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D9D6D0] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#1A1A1A] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#5C3A22]" />
              Data da Perda:
            </span>

            {/* Data Inicial (De) */}
            <div className="flex items-center gap-1">
              <span className="text-[#6E6E6E] text-[11px]">De</span>
              <input
                id="input-filtro-data-inicio"
                type="date"
                value={dataInicioFiltro}
                onChange={(e) => setDataInicioFiltro(e.target.value)}
                className="h-8 px-2 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:outline-hidden"
              />
            </div>

            {/* Data Final (Até) */}
            <div className="flex items-center gap-1">
              <span className="text-[#6E6E6E] text-[11px]">Até</span>
              <input
                id="input-filtro-data-fim"
                type="date"
                value={dataFimFiltro}
                onChange={(e) => setDataFimFiltro(e.target.value)}
                className="h-8 px-2 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:outline-hidden"
              />
            </div>

            {/* Atalhos Rápidos de Período */}
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => aplicarFiltroPeriodoRapido(7)}
                className="px-2 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] cursor-pointer"
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => aplicarFiltroPeriodoRapido(30)}
                className="px-2 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] cursor-pointer"
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => aplicarFiltroPeriodoRapido('este-mes')}
                className="px-2 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] cursor-pointer"
              >
                Este Mês
              </button>
            </div>
          </div>

          {/* Botão Limpar Filtros */}
          {temFiltrosAtivos && (
            <button
              id="btn-limpar-filtros-perdidos"
              type="button"
              onClick={limparTodosFiltros}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-rose-700 hover:text-rose-900 cursor-pointer hover:underline"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          TABELA OFICIAL DE LEADS PERDIDOS
         ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr style={{ backgroundColor: corSidebar }} className="text-white border-b border-black/20 text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3 px-4 sm:px-5">Nome</th>
                <th className="py-3 px-4 sm:px-5">Situação ao Perder</th>
                <th className="py-3 px-4 sm:px-5">Interesse</th>
                <th className="py-3 px-4 sm:px-5">Valor Perdido</th>
                <th className="py-3 px-4 sm:px-5">Origem</th>
                <th className="py-3 px-4 sm:px-5">Motivo da Perda</th>
                <th className="py-3 px-4 sm:px-5">Data da Perda</th>
                <th className="py-3 px-4 sm:px-5">Responsável</th>
                <th className="py-3 px-4 sm:px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D6D0] text-[#1A1A1A]">
              {leadsFiltrados.length > 0 ? (
                leadsFiltrados.map((lead) => {
                  const ficha = obterFichaPorLead(lead.id);
                  const origem = ficha?.origemLead || 'Outro';
                  const motivo = ficha?.motivoPerda || lead.motivoPerda || 'Não informado';
                  const dataPerda = ficha?.dataPerda || lead.dataPerda || lead.updated_at.split('T')[0];
                  const situacaoPerda = lead.situacaoPerda || lead.situacao;

                  return (
                    <tr
                      key={lead.id}
                      id={`linha-lead-perdido-${lead.id}`}
                      className="hover:bg-[#F8F7F4] transition-colors"
                    >
                      {/* 1. Nome */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <div>
                          <button
                            type="button"
                            onClick={() => abrirFichaLead(lead.id)}
                            className="font-bold text-[#1A1A1A] hover:underline text-left cursor-pointer block"
                          >
                            {lead.nome}
                          </button>
                          {ficha?.telefone && (
                            <span className="text-[11px] text-[#8F887E] font-mono block">
                              {ficha.telefone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Situação em que estava */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#F2EFEA] text-[#1A1A1A] border border-[#D9D6D0] uppercase tracking-wider">
                          {situacaoPerda}
                        </span>
                      </td>

                      {/* 3. Interesse */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <span className="font-medium text-[#1A1A1A] text-xs block">
                          {lead.interesse || <span className="text-[#8F887E]">-</span>}
                        </span>
                      </td>

                      {/* 4. Valor perdido */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <span className="font-bold text-rose-800 font-mono text-xs sm:text-sm bg-rose-50 px-2 py-0.5 rounded-sm border border-rose-200">
                          {formatarMoeda(lead.possivelValor)}
                        </span>
                      </td>

                      {/* 5. Origem do lead */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#F8F7F4] text-[#1A1A1A] border border-[#D9D6D0] uppercase tracking-wider">
                          {origem}
                        </span>
                      </td>

                      {/* 6. Motivo da perda */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="max-w-xs">
                          <span className="font-medium text-[#1A1A1A] text-xs block">
                            {motivo}
                          </span>
                        </div>
                      </td>

                      {/* 7. Data da perda */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[#1A1A1A]">
                          <Calendar className="w-3.5 h-3.5 text-[#8F887E]" />
                          <span className="font-medium">{formatarDataBR(dataPerda)}</span>
                        </div>
                      </td>

                      {/* 8. Responsável */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <span className="text-[#1A1A1A] font-medium">{lead.responsavel}</span>
                      </td>

                      {/* Ações: Reativar e Ver Ficha */}
                      <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            id={`btn-reativar-lead-${lead.id}`}
                            type="button"
                            onClick={() => handleReativarLead(lead.id, lead.nome)}
                            title="Reativar lead e mover para etapa de Reativação"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-sm transition-colors cursor-pointer uppercase tracking-wider"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-600" />
                            <span>Reativar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => abrirFichaLead(lead.id)}
                            className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-sm text-[#1A1A1A] bg-[#F2EFEA] hover:bg-[#E5E2DC] border border-[#D9D6D0] transition-colors cursor-pointer"
                          >
                            Ficha
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center text-[#8F887E] space-y-2">
                      <div className="w-12 h-12 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] flex items-center justify-center text-[#8F887E]">
                        <UserX className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-[#1A1A1A] text-sm">
                        Nenhum lead perdido encontrado
                      </p>
                      <p className="text-xs text-[#6E6E6E] text-center">
                        {temFiltrosAtivos
                          ? 'Nenhum lead atende aos critérios de filtro selecionados. Tente limpar os filtros.'
                          : 'Parabéns! No momento não há leads marcados como perdidos.'}
                      </p>
                      {temFiltrosAtivos && (
                        <button
                          type="button"
                          onClick={limparTodosFiltros}
                          className="mt-2 text-xs font-bold uppercase tracking-wider text-[#5C3A22] hover:underline cursor-pointer"
                        >
                          Limpar todos os filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela com somatório */}
        <div className="px-4 py-3 bg-[#F8F7F4] border-t border-[#D9D6D0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6E6E6E] gap-2">
          <span>
            Exibindo <strong>{leadsFiltrados.length}</strong> de <strong>{todosLeadsPerdidos.length}</strong> lead(s) perdidos • Total filtrado:{' '}
            <strong className="text-rose-700 font-mono font-bold">{formatarMoeda(valorTotalPerdido)}</strong>
          </span>
          <span className="text-[11px] text-[#8F887E]">
            Dica: Clique em "Reativar" para transferir uma oportunidade diretamente para a esteira de Reativação
          </span>
        </div>
      </div>

      {/* =========================================================================
          MODAL: MODELADOR DE CAMPANHA DE RECUPERAÇÃO / RESGATE
         ========================================================================= */}
      {modalCampanhaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            id="modal-campanha-recuperacao"
            className="bg-white w-full max-w-2xl rounded-sm shadow-2xl border border-[#D9D6D0] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header do Modal */}
            <div
              className="p-4 sm:p-5 text-white flex items-center justify-between border-b border-black/20"
              style={{ backgroundColor: corSidebar }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-sm text-white flex items-center justify-center font-bold shadow-xs"
                  style={{ backgroundColor: corPrimaria }}
                >
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold uppercase tracking-tight">Modelar Campanha de Recuperação</h3>
                  <p className="text-xs text-[#D9D6D0]">
                    Estratégia baseada nos padrões dos {leadsFiltrados.length} leads filtrados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCampanhaAberta(false)}
                className="text-[#8F887E] hover:text-white p-1 rounded-sm hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-5 space-y-5 overflow-y-auto text-xs text-[#1A1A1A]">
              {/* Diagnóstico Rápido */}
              <div className="p-3.5 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-1.5">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#5C3A22]" />
                  Diagnóstico da Base Selecionada
                </span>
                <p className="leading-relaxed text-[#6E6E6E]">
                  Você está selecionando <strong className="text-[#1A1A1A]">{leadsFiltrados.length} oportunidades</strong> que somam{' '}
                  <strong className="text-rose-800 font-mono">{formatarMoeda(valorTotalPerdido)}</strong> em potencial.
                  {padroes.principalMotivo && (
                    <span>
                      {' '}
                      O motivo predominante é <strong className="text-[#1A1A1A]">"{padroes.principalMotivo.nome}"</strong> ({padroes.principalMotivo.count} leads).
                    </span>
                  )}
                </p>
              </div>

              {/* Sugestão de Copy / Abordagem de Resgate */}
              <div className="space-y-2">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] block">
                  Sugestão de Mensagem de Resgate para WhatsApp:
                </span>
                <div className="p-3.5 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] text-[#1A1A1A] leading-relaxed select-all font-medium">
                  "Olá, [Nome]! Tudo bem? Aqui é da clínica. Percebi que você estava interessada em [Procedimento].
                  Abrimos uma condição muito especial e exclusiva para esta semana com horários prioritários e
                  condições diferenciadas de parcelamento. Gostaria que eu te explicasse como funciona?"
                </div>
              </div>

              {/* Ações em Lote */}
              <div className="space-y-3 pt-2 border-t border-[#D9D6D0]">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] block">
                  Ações Rápidas em Lote:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleCopiarContatosCampanha}
                    className="p-3 rounded-sm border border-[#D9D6D0] hover:bg-[#F2EFEA] bg-[#F8F7F4] flex items-start gap-2.5 transition-all text-left cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-[#5C3A22] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#1A1A1A] block text-xs">Copiar Dados dos Leads</span>
                      <span className="text-[11px] text-[#6E6E6E] block">
                        Copia nome, telefone e interesse para enviar no WhatsApp
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleReativarTodosFiltrados}
                    className="p-3 rounded-sm border border-emerald-200 hover:border-emerald-400 bg-emerald-50/70 hover:bg-emerald-50 flex items-start gap-2.5 transition-all text-left cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-950 block text-xs">Reativar Todos em Lote</span>
                      <span className="text-[11px] text-emerald-800 block">
                        Muda o status para "Em processo" e move para Reativação
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-[#F8F7F4] p-4 border-t border-[#D9D6D0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalCampanhaAberta(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm bg-white border border-[#D9D6D0] hover:bg-[#E5E2DC] text-[#1A1A1A] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
