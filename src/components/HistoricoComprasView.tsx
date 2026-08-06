import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Trophy,
  Crown,
  Sparkles,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Plus,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Megaphone,
  Gift,
  Star,
  X,
  TrendingUp,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { Compra, Lead, CriarCompraPayload } from '../types';

export const HistoricoComprasView: React.FC = () => {
  const {
    compras,
    leads,
    obterFichaPorLead,
    abrirFichaLead,
    lancarCompra,
    removerCompra,
  } = useCrm();

  const { config } = useEmpresa();
  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';
  const corSidebar = config.estetica?.corSidebar || '#1A1A1A';

  // Estados de Filtro
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  const [dataInicioFiltro, setDataInicioFiltro] = useState<string>('');
  const [dataFimFiltro, setDataFimFiltro] = useState<string>('');
  const [leadFiltroId, setLeadFiltroId] = useState<string>('Todos');
  const [ordenacao, setOrdenacao] = useState<'recente' | 'antiga' | 'maior_valor' | 'menor_valor'>('recente');

  // Estados de UI e Modais
  const [modalNovaCompraAberta, setModalNovaCompraAberta] = useState(false);
  const [modalCampanhaFidelizacaoAberta, setModalCampanhaFidelizacaoAberta] = useState(false);
  const [copiadoFeedback, setCopiadoFeedback] = useState(false);
  const [notificacaoSucesso, setNotificacaoSucesso] = useState<string | null>(null);

  // Form de Nova Compra
  const [formLeadId, setFormLeadId] = useState<string>('');
  const [formProcedimento, setFormProcedimento] = useState<string>('');
  const [formValor, setFormValor] = useState<string>('');
  const [formData, setFormData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formErro, setFormErro] = useState<string | null>(null);

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

  // Mapa rápido de leads por ID para lookup O(1)
  const leadsMap = useMemo(() => {
    const map = new Map<string, Lead>();
    leads.forEach((l) => map.set(l.id, l));
    return map;
  }, [leads]);

  // Lista de compras ativas (sem soft delete)
  const comprasValidas = useMemo(() => {
    return compras.filter((c) => !c.deleted_at);
  }, [compras]);

  // =========================================================================
  // TOP 10 CLIENTES QUE MAIS COMPRARAM (SOMA DE VALOR POR LEAD, DECRESCENTE)
  // =========================================================================
  const rankingTopClientes = useMemo(() => {
    const agrupamento = new Map<
      string,
      {
        leadId: string;
        leadNome: string;
        totalValor: number;
        qtdCompras: number;
        ultimaCompraData: string;
        ultimoProcedimento: string;
      }
    >();

    comprasValidas.forEach((compra) => {
      const lead = leadsMap.get(compra.leadId);
      const leadNome = lead ? lead.nome : `Cliente (ID: ${compra.leadId.slice(0, 8)})`;

      const atual = agrupamento.get(compra.leadId) || {
        leadId: compra.leadId,
        leadNome,
        totalValor: 0,
        qtdCompras: 0,
        ultimaCompraData: compra.data,
        ultimoProcedimento: compra.procedimento,
      };

      atual.totalValor += compra.valor || 0;
      atual.qtdCompras += 1;

      // Guarda a compra mais recente
      if (compra.data >= atual.ultimaCompraData) {
        atual.ultimaCompraData = compra.data;
        atual.ultimoProcedimento = compra.procedimento;
      }

      agrupamento.set(compra.leadId, atual);
    });

    // Ordenar de forma decrescente pelo totalValor e limitar aos 10 primeiros
    return Array.from(agrupamento.values())
      .sort((a, b) => b.totalValor - a.totalValor)
      .slice(0, 10);
  }, [comprasValidas, leadsMap]);

  // =========================================================================
  // LISTAGEM DE COMPRAS COM FILTROS E ORDENAÇÃO
  // =========================================================================
  const comprasFiltradas = useMemo(() => {
    return comprasValidas
      .filter((compra) => {
        const lead = leadsMap.get(compra.leadId);
        const leadNome = lead ? lead.nome.toLowerCase() : '';
        const procedimento = compra.procedimento.toLowerCase();

        // Filtro por Lead específico
        if (leadFiltroId !== 'Todos' && compra.leadId !== leadFiltroId) {
          return false;
        }

        // Filtro por Data Inicial
        if (dataInicioFiltro && compra.data < dataInicioFiltro) {
          return false;
        }

        // Filtro por Data Final
        if (dataFimFiltro && compra.data > dataFimFiltro) {
          return false;
        }

        // Filtro de Texto Livre (nome do lead ou procedimento)
        if (buscaTexto.trim()) {
          const termo = buscaTexto.toLowerCase().trim();
          const matchNome = leadNome.includes(termo);
          const matchProc = procedimento.includes(termo);
          return matchNome || matchProc;
        }

        return true;
      })
      .sort((a, b) => {
        if (ordenacao === 'recente') {
          return b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at);
        }
        if (ordenacao === 'antiga') {
          return a.data.localeCompare(b.data) || a.created_at.localeCompare(b.created_at);
        }
        if (ordenacao === 'maior_valor') {
          return b.valor - a.valor;
        }
        if (ordenacao === 'menor_valor') {
          return a.valor - b.valor;
        }
        return 0;
      });
  }, [comprasValidas, leadsMap, leadFiltroId, dataInicioFiltro, dataFimFiltro, buscaTexto, ordenacao]);

  // Indicadores Gerais
  const totalFaturado = useMemo(() => {
    return comprasFiltradas.reduce((acc, c) => acc + (c.valor || 0), 0);
  }, [comprasFiltradas]);

  const totalGeralCompras = comprasFiltradas.length;
  const ticketMedioGeral = totalGeralCompras > 0 ? totalFaturado / totalGeralCompras : 0;

  const clientesUnicosCompradores = useMemo(() => {
    const ids = new Set(comprasFiltradas.map((c) => c.leadId));
    return ids.size;
  }, [comprasFiltradas]);

  // Atalhos de Período
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

  const limparFiltros = () => {
    setBuscaTexto('');
    setDataInicioFiltro('');
    setDataFimFiltro('');
    setLeadFiltroId('Todos');
    setOrdenacao('recente');
  };

  const temFiltrosAtivos =
    buscaTexto !== '' ||
    dataInicioFiltro !== '' ||
    dataFimFiltro !== '' ||
    leadFiltroId !== 'Todos' ||
    ordenacao !== 'recente';

  // Handler: Submeter Nova Compra
  const handleLancarCompra = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro(null);

    if (!formLeadId) {
      setFormErro('Selecione o paciente/cliente que realizou a compra.');
      return;
    }

    if (!formProcedimento.trim()) {
      setFormErro('Informe o procedimento realizado.');
      return;
    }

    const valorNum = parseFloat(formValor.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      setFormErro('Informe um valor de compra válido (maior que zero).');
      return;
    }

    const payload: CriarCompraPayload = {
      leadId: formLeadId,
      procedimento: formProcedimento.trim(),
      valor: valorNum,
      data: formData || new Date().toISOString().split('T')[0],
    };

    lancarCompra(payload);

    const leadComprador = leadsMap.get(formLeadId);
    setNotificacaoSucesso(
      `Compra de ${formatarMoeda(valorNum)} para "${leadComprador?.nome || 'Paciente'}" lançada com sucesso!`
    );
    setTimeout(() => setNotificacaoSucesso(null), 4000);

    // Reset Form & Fechar Modal
    setFormLeadId('');
    setFormProcedimento('');
    setFormValor('');
    setModalNovaCompraAberta(false);
  };

  // Handler: Remover Compra
  const handleRemoverCompra = (compraId: string, procedimento: string, valor: number) => {
    if (window.confirm(`Deseja realmente excluir a compra de "${procedimento}" no valor de ${formatarMoeda(valor)}?`)) {
      removerCompra(compraId);
      setNotificacaoSucesso(`Compra removida com sucesso.`);
      setTimeout(() => setNotificacaoSucesso(null), 3000);
    }
  };

  // Copiar Lista do Top 10 para Campanha VIP
  const handleCopiarTopClientes = () => {
    const linhas: string[] = [];
    linhas.push('🏆 TOP 10 CLIENTES QUE MAIS COMPRARAM - CAMPANHA DE FIDELIZAÇÃO VIP:');
    linhas.push('================================================================');

    rankingTopClientes.forEach((item, idx) => {
      const ficha = obterFichaPorLead(item.leadId);
      const tel = ficha?.telefone || 'Sem telefone';
      const ticketMedio = item.qtdCompras > 0 ? item.totalValor / item.qtdCompras : 0;

      linhas.push(
        `#${idx + 1} - ${item.leadNome} | Tel: ${tel} | Total: ${formatarMoeda(
          item.totalValor
        )} | ${item.qtdCompras} compras (Ticket Médio: ${formatarMoeda(
          ticketMedio
        )}) | Última: ${formatarDataBR(item.ultimaCompraData)} (${item.ultimoProcedimento})`
      );
    });

    navigator.clipboard.writeText(linhas.join('\n'));
    setCopiadoFeedback(true);
    setTimeout(() => setCopiadoFeedback(false), 2500);
  };

  return (
    <div
      id="tela-historico-compras"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-200"
    >
      {/* Ações Rápidas no Topo */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-1">
        {/* Botão de Campanha de Fidelização */}
        <button
          id="btn-campanha-fidelizacao"
          type="button"
          onClick={() => setModalCampanhaFidelizacaoAberta(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
        >
          <Gift className="w-3.5 h-3.5 text-[#5C3A22]" />
          <span>Campanha Fidelização VIP</span>
        </button>

        {/* Botão para Lançar Nova Compra */}
        <button
          id="btn-lancar-nova-compra"
          type="button"
          onClick={() => setModalNovaCompraAberta(true)}
          style={{ backgroundColor: corPrimaria }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:brightness-110 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Lançar Nova Compra</span>
        </button>
      </div>

      {/* =========================================================================
          NOTIFICAÇÃO DE SUCESSO
         ========================================================================= */}
      {notificacaoSucesso && (
        <div
          id="alerta-sucesso-compras"
          className="p-3.5 rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center justify-between shadow-2xs animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notificacaoSucesso}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificacaoSucesso(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* =========================================================================
          RANKING TOP 10 CLIENTES QUE MAIS COMPRARAM (REQUISITO EXPLÍCITO NO TOPO)
         ========================================================================= */}
      <div
        id="bloco-top-10-ranking-clientes"
        className="rounded-sm text-white p-5 sm:p-6 shadow-md border border-black/20 relative overflow-hidden"
        style={{ backgroundColor: corSidebar }}
      >
        {/* Top Header do Ranking */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold shadow-xs shrink-0"
              style={{ backgroundColor: corPrimaria }}
            >
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight uppercase">
                  Top 10 pacientes que mais compraram
                </h3>
                <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-white/15 text-[#F2EFEA] border border-white/20 uppercase tracking-wider">
                  Ranking VIP & Fidelização
                </span>
              </div>
              <p className="text-xs text-[#D9D6D0] mt-0.5">
                Soma acumulada de valor por paciente (ordem decrescente) para direcionar mimos, bônus e ofertas exclusivas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copiar-top-10"
              type="button"
              onClick={handleCopiarTopClientes}
              title="Copiar lista de telefones e valores do Top 10 para campanha no WhatsApp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
            >
              {copiadoFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Top 10 Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#F2EFEA]" />
                  <span>Copiar Top 10</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setModalCampanhaFidelizacaoAberta(true)}
              style={{ backgroundColor: corPrimaria }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:brightness-110 transition-colors cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5 text-white" />
              <span>Criar Campanha VIP</span>
            </button>
          </div>
        </div>

        {/* Grade/Tabela do Top 10 */}
        <div className="mt-5 relative z-10">
          {rankingTopClientes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {rankingTopClientes.map((item, index) => {
                const ficha = obterFichaPorLead(item.leadId);
                const isPrimeiro = index === 0;
                const isSegundo = index === 1;
                const isTerceiro = index === 2;
                const ticketMedioLead = item.qtdCompras > 0 ? item.totalValor / item.qtdCompras : 0;

                return (
                  <div
                    key={item.leadId}
                    id={`card-top-cliente-${index + 1}`}
                    className={`rounded-sm p-3.5 transition-all flex flex-col justify-between relative group border ${
                      isPrimeiro
                        ? 'bg-white/10 border-white/40 shadow-xs'
                        : isSegundo
                        ? 'bg-white/5 border-white/20'
                        : isTerceiro
                        ? 'bg-white/5 border-white/20'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    {/* Top da medalha + Nome */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        {/* Posição com Badge Visual */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-6 h-6 rounded-sm flex items-center justify-center text-xs font-black shrink-0 text-white"
                            style={{ backgroundColor: isPrimeiro ? corPrimaria : 'rgba(255,255,255,0.15)' }}
                          >
                            {index + 1}º
                          </span>

                          {isPrimeiro && (
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-white text-[#1A1A1A] uppercase tracking-wider flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" />
                              Ouro
                            </span>
                          )}
                          {isSegundo && (
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-[#E5E2DC] text-[#1A1A1A] uppercase tracking-wider">
                              Prata
                            </span>
                          )}
                          {isTerceiro && (
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-[#D9D6D0] text-[#1A1A1A] uppercase tracking-wider">
                              Bronze
                            </span>
                          )}
                        </div>

                        {/* Botão de abrir Ficha do Lead */}
                        <button
                          type="button"
                          onClick={() => abrirFichaLead(item.leadId)}
                          title="Abrir Ficha Completa do Paciente"
                          className="p-1 rounded-sm text-[#D9D6D0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Nome do Lead */}
                      <button
                        type="button"
                        onClick={() => abrirFichaLead(item.leadId)}
                        className="text-left font-bold text-white hover:underline transition-colors line-clamp-1 block text-sm cursor-pointer"
                        title={item.leadNome}
                      >
                        {item.leadNome}
                      </button>

                      {/* Telefone */}
                      {ficha?.telefone ? (
                        <span className="text-[11px] text-[#D9D6D0] font-mono block mt-0.5 truncate">
                          {ficha.telefone}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#8F887E] block mt-0.5">
                          {item.qtdCompras} procedimento(s)
                        </span>
                      )}
                    </div>

                    {/* Valor Total Comprado + Detalhes */}
                    <div className="mt-3 pt-2.5 border-t border-white/10">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9D6D0]">
                          Total Comprado:
                        </span>
                        <span className="text-xs text-[#D9D6D0] font-mono">
                          {item.qtdCompras}x
                        </span>
                      </div>
                      <span className="text-base sm:text-lg font-black text-white block tracking-tight font-mono">
                        {formatarMoeda(item.totalValor)}
                      </span>

                      {/* Ticket Médio */}
                      <div className="flex items-center justify-between text-[11px] text-[#D9D6D0] mt-1">
                        <span>Ticket médio:</span>
                        <span className="font-semibold text-white font-mono">{formatarMoeda(ticketMedioLead)}</span>
                      </div>

                      {/* Último Procedimento */}
                      <div className="mt-1.5 text-[10px] text-[#D9D6D0]/80 truncate" title={item.ultimoProcedimento}>
                        Último: <span className="text-white font-medium">{item.ultimoProcedimento}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-[#D9D6D0] text-xs">
              Nenhuma compra registrada ainda para gerar o Ranking Top 10.
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          CARDS COM INDICADORES RESUMIDOS DE COMPRAS
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CARD 1: TOTAL FATURADO EM COMPRAS */}
        <div
          id="card-total-faturado"
          className="p-4 sm:p-5 rounded-sm bg-white border border-[#D9D6D0] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E]">
              Faturamento em Compras
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-900 block font-mono">
              {formatarMoeda(totalFaturado)}
            </span>
            <span className="text-[11px] text-[#8F887E] block mt-0.5">
              Soma das vendas filtradas
            </span>
          </div>
        </div>

        {/* CARD 2: QUANTIDADE DE COMPRAS */}
        <div
          id="card-qtd-compras"
          className="p-4 sm:p-5 rounded-sm bg-white border border-[#D9D6D0] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E]">
              Total de Vendas
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#F2EFEA] border border-[#D9D6D0] flex items-center justify-center text-[#1A1A1A]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] block font-mono">
              {totalGeralCompras}
            </span>
            <span className="text-[11px] text-[#8F887E] block mt-0.5">
              Procedimentos faturados
            </span>
          </div>
        </div>

        {/* CARD 3: TICKET MÉDIO GERAL */}
        <div
          id="card-ticket-medio-compras"
          className="p-4 sm:p-5 rounded-sm bg-white border border-[#D9D6D0] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E]">
              Ticket Médio Geral
            </span>
            <div className="w-8 h-8 rounded-sm bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] block font-mono">
              {formatarMoeda(ticketMedioGeral)}
            </span>
            <span className="text-[11px] text-[#8F887E] block mt-0.5">
              Por procedimento lançado
            </span>
          </div>
        </div>

        {/* CARD 4: CLIENTES COMPRADORES ÚNICOS */}
        <div
          id="card-clientes-unicos"
          className="p-4 sm:p-5 rounded-sm bg-white border border-[#D9D6D0] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E]">
              Pacientes Compradores
            </span>
            <div className="w-8 h-8 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] flex items-center justify-center text-[#1A1A1A]">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] block font-mono">
              {clientesUnicosCompradores}
            </span>
            <span className="text-[11px] text-[#8F887E] block mt-0.5">
              Pacientes com compras ativas
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE FILTROS E BUSCA NA LISTAGEM DE COMPRAS
         ========================================================================= */}
      <div
        id="barra-filtros-historico-compras"
        className="bg-white p-4 rounded-sm border border-[#D9D6D0] shadow-xs space-y-3.5"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Campo de Busca Livre */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8F887E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="busca-compras-input"
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar por paciente ou procedimento..."
              className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] text-[#1A1A1A] placeholder:text-[#8F887E] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Filtro por Paciente */}
          <div className="w-full lg:w-56">
            <select
              id="filtro-compra-lead"
              value={leadFiltroId}
              onChange={(e) => setLeadFiltroId(e.target.value)}
              className="w-full h-9 px-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
            >
              <option value="Todos">Todos os Pacientes</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenação */}
          <div className="w-full lg:w-48">
            <select
              id="filtro-compra-ordenacao"
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="w-full h-9 px-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
            >
              <option value="recente">Mais recentes primeiro</option>
              <option value="antiga">Mais antigas primeiro</option>
              <option value="maior_valor">Maior valor primeiro</option>
              <option value="menor_valor">Menor valor primeiro</option>
            </select>
          </div>
        </div>

        {/* Linha 2: Filtros de Período e Botões Rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D9D6D0]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6E6E]">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#1A1A1A]">Período:</span>
            <input
              type="date"
              value={dataInicioFiltro}
              onChange={(e) => setDataInicioFiltro(e.target.value)}
              className="h-8 px-2 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:outline-hidden"
            />
            <span>até</span>
            <input
              type="date"
              value={dataFimFiltro}
              onChange={(e) => setDataFimFiltro(e.target.value)}
              className="h-8 px-2 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:outline-hidden"
            />

            {/* Atalhos Rápidos */}
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => aplicarFiltroPeriodoRapido(7)}
                className="px-2 py-1 text-[11px] rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] font-bold uppercase tracking-wider cursor-pointer"
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => aplicarFiltroPeriodoRapido(30)}
                className="px-2 py-1 text-[11px] rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] font-bold uppercase tracking-wider cursor-pointer"
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => aplicarFiltroPeriodoRapido('este-mes')}
                className="px-2 py-1 text-[11px] rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] font-bold uppercase tracking-wider cursor-pointer"
              >
                Este Mês
              </button>
              <button
                type="button"
                onClick={() => aplicarFiltroPeriodoRapido('tudo')}
                className="px-2 py-1 text-[11px] rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] font-bold uppercase tracking-wider cursor-pointer"
              >
                Tudo
              </button>
            </div>
          </div>

          {temFiltrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="text-xs font-bold uppercase tracking-wider text-[#5C3A22] hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          TABELA DE COMPRAS LANÇADAS
         ========================================================================= */}
      <div
        id="tabela-historico-compras"
        className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr style={{ backgroundColor: corSidebar }} className="text-white border-b border-black/20 text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3 px-4 sm:px-5">Data da Venda</th>
                <th className="py-3 px-4 sm:px-5">Paciente</th>
                <th className="py-3 px-4 sm:px-5">Procedimento</th>
                <th className="py-3 px-4 sm:px-5">Valor</th>
                <th className="py-3 px-4 sm:px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D6D0] text-[#1A1A1A]">
              {comprasFiltradas.length > 0 ? (
                comprasFiltradas.map((compra) => {
                  const lead = leadsMap.get(compra.leadId);
                  const ficha = obterFichaPorLead(compra.leadId);

                  return (
                    <tr
                      key={compra.id}
                      id={`linha-compra-${compra.id}`}
                      className="hover:bg-[#F8F7F4] transition-colors"
                    >
                      {/* Data */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[#1A1A1A]">
                          <Calendar className="w-3.5 h-3.5 text-[#8F887E]" />
                          <span className="font-medium">{formatarDataBR(compra.data)}</span>
                        </div>
                      </td>

                      {/* Paciente */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div>
                          <button
                            type="button"
                            onClick={() => abrirFichaLead(compra.leadId)}
                            className="font-bold text-[#1A1A1A] hover:underline text-left cursor-pointer block"
                          >
                            {lead?.nome || `Paciente (ID: ${compra.leadId.slice(0, 8)})`}
                          </button>
                          <div className="flex items-center gap-2 text-[11px] text-[#6E6E6E] mt-0.5">
                            {lead?.situacao && (
                              <span className="px-1.5 py-0.2 rounded-sm bg-[#F2EFEA] border border-[#D9D6D0] font-medium text-[10px] text-[#1A1A1A]">
                                {lead.situacao}
                              </span>
                            )}
                            {ficha?.telefone && (
                              <span className="font-mono text-[#8F887E]">{ficha.telefone}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Procedimento */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <span className="font-semibold text-[#1A1A1A] block">
                          {compra.procedimento}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <span className="font-bold text-[#1A1A1A] font-mono text-xs sm:text-sm bg-[#F2EFEA] px-2.5 py-1 rounded-sm border border-[#D9D6D0]">
                          {formatarMoeda(compra.valor)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => abrirFichaLead(compra.leadId)}
                            title="Abrir ficha do paciente"
                            className="px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider text-[#1A1A1A] bg-[#F2EFEA] hover:bg-[#E5E2DC] border border-[#D9D6D0] transition-colors cursor-pointer"
                          >
                            Ficha
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoverCompra(compra.id, compra.procedimento, compra.valor)}
                            title="Excluir lançamento"
                            className="p-1 rounded-sm text-[#8F887E] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center text-[#8F887E] space-y-2">
                      <div className="w-12 h-12 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] flex items-center justify-center text-[#8F887E]">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-[#1A1A1A] text-sm">
                        Nenhuma compra encontrada
                      </p>
                      <p className="text-xs text-[#6E6E6E] text-center">
                        {temFiltrosAtivos
                          ? 'Nenhuma compra corresponde aos filtros aplicados. Tente limpar os filtros.'
                          : 'Nenhuma compra registrada ainda. Clique em "Lançar Nova Compra" para registrar a primeira.'}
                      </p>
                      {temFiltrosAtivos ? (
                        <button
                          type="button"
                          onClick={limparFiltros}
                          className="mt-2 text-xs font-bold uppercase tracking-wider text-[#5C3A22] hover:underline cursor-pointer"
                        >
                          Limpar todos os filtros
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModalNovaCompraAberta(true)}
                          style={{ backgroundColor: corPrimaria }}
                          className="mt-2 px-3 py-1.5 rounded-sm text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Lançar Nova Compra
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
            Exibindo <strong>{comprasFiltradas.length}</strong> de <strong>{comprasValidas.length}</strong> compras registradas • Total do período:{' '}
            <strong className="text-emerald-800 font-bold font-mono">{formatarMoeda(totalFaturado)}</strong>
          </span>
          <span className="text-[11px] text-[#8F887E]">
            Dica: Clique no nome do paciente para abrir a ficha completa e ver todo o histórico
          </span>
        </div>
      </div>

      {/* =========================================================================
          MODAL: LANÇAR NOVA COMPRA DIRETAMENTE NO HISTÓRICO
         ========================================================================= */}
      {modalNovaCompraAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            id="modal-lancar-nova-compra"
            className="bg-white w-full max-w-lg rounded-sm shadow-2xl border border-[#D9D6D0] overflow-hidden flex flex-col"
          >
            {/* Header do Modal */}
            <div
              className="p-4 sm:p-5 text-white flex items-center justify-between border-b border-black/20"
              style={{ backgroundColor: corSidebar }}
            >
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide">Lançar Nova Compra</h3>
              <button
                type="button"
                onClick={() => setModalNovaCompraAberta(false)}
                className="text-[#8F887E] hover:text-white p-1 rounded-sm hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLancarCompra} className="p-5 space-y-4 text-xs text-[#1A1A1A]">
              {formErro && (
                <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {formErro}
                </div>
              )}

              {/* 1. Selecionar Lead */}
              <div className="space-y-1">
                <label htmlFor="form-compra-lead" className="font-bold uppercase tracking-wider text-[11px] text-[#1A1A1A] block">
                  Paciente / Cliente: <span className="text-rose-500">*</span>
                </label>
                <select
                  id="form-compra-lead"
                  value={formLeadId}
                  onChange={(e) => setFormLeadId(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-xs sm:text-sm font-medium rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                >
                  <option value="">-- Selecione o paciente --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome} ({l.situacao})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Procedimento */}
              <div className="space-y-1">
                <label htmlFor="form-compra-procedimento" className="font-bold uppercase tracking-wider text-[11px] text-[#1A1A1A] block">
                  Procedimento Realizado: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="form-compra-procedimento"
                  type="text"
                  value={formProcedimento}
                  onChange={(e) => setFormProcedimento(e.target.value)}
                  placeholder="Ex: Toxina Botulínica Terço Superior, Harmonização Facial..."
                  required
                  className="w-full h-9 px-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] placeholder:text-[#8F887E] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* 3. Valor (R$) e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="form-compra-valor" className="font-bold uppercase tracking-wider text-[11px] text-[#1A1A1A] block">
                    Valor Pago (R$): <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8F887E] font-bold text-xs">
                      R$
                    </span>
                    <input
                      id="form-compra-valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formValor}
                      onChange={(e) => setFormValor(e.target.value)}
                      placeholder="0,00"
                      required
                      className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm font-bold rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="form-compra-data" className="font-bold uppercase tracking-wider text-[11px] text-[#1A1A1A] block">
                    Data da Venda: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-compra-data"
                    type="date"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="pt-4 border-t border-[#D9D6D0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovaCompraAberta(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm bg-white border border-[#D9D6D0] hover:bg-[#F2EFEA] text-[#1A1A1A] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: corPrimaria }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm text-white shadow-xs cursor-pointer flex items-center gap-1.5 hover:brightness-110"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Salvar Compra</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CAMPANHA DE FIDELIZAÇÃO & PROMOÇÃO VIP (TOP CLIENTES)
         ========================================================================= */}
      {modalCampanhaFidelizacaoAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            id="modal-campanha-fidelizacao"
            className="bg-white w-full max-w-2xl rounded-sm shadow-2xl border border-[#D9D6D0] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header do Modal */}
            <div
              className="p-4 sm:p-5 text-white flex items-center justify-between border-b border-black/20"
              style={{ backgroundColor: corSidebar }}
            >
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide">Campanha de Fidelização VIP</h3>
              <button
                type="button"
                onClick={() => setModalCampanhaFidelizacaoAberta(false)}
                className="text-[#8F887E] hover:text-white p-1 rounded-sm hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-5 space-y-5 overflow-y-auto text-xs text-[#1A1A1A]">
              {/* Diagnóstico da Base VIP */}
              <div className="p-4 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-2">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#5C3A22]" />
                  Estratégia de Fidelização para os Maiores Compradores
                </span>
                <p className="leading-relaxed text-[#6E6E6E]">
                  Os 10 maiores pacientes somam um total de{' '}
                  <strong className="text-[#1A1A1A] font-bold font-mono">
                    {formatarMoeda(rankingTopClientes.reduce((acc, c) => acc + c.totalValor, 0))}
                  </strong>{' '}
                  em procedimentos realizados. Pacientes de alto ticket têm alto potencial de recompra contínua quando
                  reconhecidos com privilégios exclusivos.
                </p>
              </div>

              {/* Estratégias Recomendadas */}
              <div className="space-y-2.5">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] block">
                  3 Estratégias de Fidelização Recomendadas para Clínicas:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] space-y-1">
                    <span className="font-bold text-[#1A1A1A] block">1. Upgrade Exclusivo</span>
                    <p className="text-[11px] text-[#6E6E6E] leading-relaxed">
                      Ofereça uma sessão cortesia de LED terapia ou peeling revitalizante no próximo procedimento.
                    </p>
                  </div>

                  <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] space-y-1">
                    <span className="font-bold text-[#1A1A1A] block">2. Agenda VIP Prioritária</span>
                    <p className="text-[11px] text-[#6E6E6E] leading-relaxed">
                      Reserva prioritária de horários nobres aos sábados e fins de tarde.
                    </p>
                  </div>

                  <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] space-y-1">
                    <span className="font-bold text-[#1A1A1A] block">3. Gift Card de Aniversário</span>
                    <p className="text-[11px] text-[#6E6E6E] leading-relaxed">
                      Crédito especial de fidelidade no mês do aniversário do paciente VIP.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modelo de Mensagem para WhatsApp */}
              <div className="space-y-2">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] block">
                  Script de Mensagem VIP para WhatsApp:
                </span>
                <div className="p-3.5 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] text-[#1A1A1A] leading-relaxed select-all text-xs font-medium">
                  "Olá, [Nome]! Tudo bem? Passando para agradecer imensamente pela sua confiança e carinho conosco.
                  Você faz parte do nosso seleto grupo de pacientes VIP e preparamos um benefício especial e exclusivo
                  para o seu próximo agendamento neste mês. Quando tiver um momento, me avise para
                  eu te explicar o seu benefício!"
                </div>
              </div>

              {/* Botão de Cópia da Lista VIP */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopiarTopClientes}
                  className="w-full p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA] hover:bg-[#E5E2DC] flex items-center justify-center gap-2 font-bold text-[#1A1A1A] uppercase tracking-wider transition-colors cursor-pointer text-xs"
                >
                  {copiadoFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Lista dos 10 Pacientes VIP Copiada com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#5C3A22]" />
                      <span>Copiar Contatos do Top 10 para Campanha no WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-[#F8F7F4] p-4 border-t border-[#D9D6D0] flex justify-end">
              <button
                type="button"
                onClick={() => setModalCampanhaFidelizacaoAberta(false)}
                style={{ backgroundColor: corPrimaria }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm text-white cursor-pointer hover:brightness-110"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
