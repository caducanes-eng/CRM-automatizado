import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  CalendarCheck,
  Users,
  Target,
  DollarSign,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Calendar,
  ChevronRight,
  Info,
  Sparkles,
  Layers,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { useEmpresa } from '../context/EmpresaContext';
import { useCrm } from '../context/CrmContext';
import {
  fetchKpisMesAtual,
  fetchHistoricoKpis,
  salvarSnapshotKpi,
  ResultadoCalculoKpi,
  calcularRegraComissao,
} from '../services/supabaseService';
import { KpiSecretariaMensal } from '../types';

export const KpiSecretariaView: React.FC = () => {
  const { empresaAtivaId, config } = useEmpresa();
  const { dispararFeedback } = useCrm();

  // Mês selecionado no formato 'YYYY-MM' (Ex: '2026-08')
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const [carregando, setCarregando] = useState<boolean>(true);
  const [salvandoSnapshot, setSalvandoSnapshot] = useState<boolean>(false);
  const [kpiAtual, setKpiAtual] = useState<ResultadoCalculoKpi | null>(null);
  const [historico, setHistorico] = useState<KpiSecretariaMensal[]>([]);
  const [modalCongelarAberto, setModalCongelarAberto] = useState<boolean>(false);
  const [abaManualAtiva, setAbaManualAtiva] = useState<'kpis' | 'reguas' | 'historico'>('kpis');

  // Cores dinâmicas da clínica
  const corPrimaria = config?.estetica?.corPrimaria || '#5C3A22';

  // Carregar dados ao alterar mês ou empresa
  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resultadoKpis, historicoSnapshots] = await Promise.all([
        fetchKpisMesAtual(empresaAtivaId, mesAnoSelecionado),
        fetchHistoricoKpis(empresaAtivaId),
      ]);

      setKpiAtual(resultadoKpis);
      setHistorico(historicoSnapshots);
    } catch (error) {
      console.error('Erro ao carregar dados de KPIs:', error);
      dispararFeedback('Aviso: Não foi possível sincronizar todos os dados do Supabase.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [empresaAtivaId, mesAnoSelecionado]);

  // Verificar se o mês atual já está congelado no histórico
  const snapshotMesAtual = useMemo(() => {
    return historico.find(
      (h) => (h.mesAno || h.mes_ano) === mesAnoSelecionado
    );
  }, [historico, mesAnoSelecionado]);

  const mesCongelado = Boolean(snapshotMesAtual?.fechado);

  // Ação de Congelar/Fechar Mês
  const handleCongelarMes = async () => {
    if (!kpiAtual) return;
    setSalvandoSnapshot(true);

    try {
      const snapshot: KpiSecretariaMensal = {
        id: snapshotMesAtual?.id || `kpi-snap-${mesAnoSelecionado}`,
        empresaId: empresaAtivaId,
        mesAno: mesAnoSelecionado,
        consultasRealizadas: kpiAtual.consultasRealizadas,
        totalAgendamentos: kpiAtual.totalAgendamentos,
        taxaComparecimento: kpiAtual.taxaComparecimento,
        travaComparecimentoOk: kpiAtual.travaComparecimentoOk,
        leadsPosConsulta: kpiAtual.leadsPosConsulta,
        leadsVendaFeita: kpiAtual.leadsVendaFeita,
        taxaFechamento: kpiAtual.taxaFechamento,
        faturamentoRealizado: kpiAtual.faturamentoRealizado,
        metaFaturamento: kpiAtual.metaFaturamento,
        percentualMetaFaturamento: kpiAtual.percentualMetaFaturamento,
        bonusCaptacao: kpiAtual.bonusCaptacao,
        bonusComparecimento: kpiAtual.bonusComparecimento,
        bonusFechamento: kpiAtual.bonusFechamento,
        bonusFaturamento: kpiAtual.bonusFaturamento,
        comissaoTotal: kpiAtual.comissaoTotal,
        fechado: true,
        fechadoEm: new Date().toISOString(),
        observacoes: `Snapshot de bonificação fechado em ${new Date().toLocaleDateString('pt-BR')}`,
      };

      await salvarSnapshotKpi(snapshot);
      dispararFeedback(`Sucesso! O mês ${mesAnoSelecionado} foi congelado e fechado na política BON-001.`);
      setModalCongelarAberto(false);
      await carregarDados();
    } catch (error) {
      console.error('Erro ao congelar mês:', error);
      dispararFeedback('Erro ao salvar snapshot de comissionamento.');
    } finally {
      setSalvandoSnapshot(false);
    }
  };

  // Opções do seletor de mês/ano (Últimos 12 meses)
  const opcoesMeses = useMemo(() => {
    const lista = [];
    const dataRef = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(dataRef.getFullYear(), dataRef.getMonth() - i, 1);
      const str = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      lista.push({ value: str, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return lista;
  }, []);

  // Formatação de valores monetários
  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ------------------------------------------------------------------- */}
      {/* CABEÇALHO DA SEÇÃO & CONTROLES */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 font-medium text-xs flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-700" />
              Política Formal BON-001
            </span>
            {mesCongelado ? (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-300">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Mês Congelado / Fechado
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Em Acompanhamento (Tempo Real)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            KPIs & Comissionamento da Secretária
          </h1>
          <p className="text-sm text-slate-600">
            Cálculo em tempo real de metas, travas de segurança e bonificação mensal (Dra. Agda Rodrigues).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor Mês/Ano */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <select
              id="select-mes-ano-kpi"
              value={mesAnoSelecionado}
              onChange={(e) => setMesAnoSelecionado(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
            >
              {opcoesMeses.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label} ({op.value})
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Atualização em Tempo Real */}
          <button
            id="btn-atualizar-kpis"
            onClick={carregarDados}
            disabled={carregando}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Recarregar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          </button>

          {/* Botão de Congelar/Fechar Mês */}
          <button
            id="btn-congelar-mes-modal"
            onClick={() => setModalCongelarAberto(true)}
            disabled={carregando}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
              mesCongelado
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'bg-amber-800 hover:bg-amber-900 text-white'
            }`}
          >
            {mesCongelado ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {mesCongelado ? 'Re-congelar Mês' : 'Congelar / Fechar Mês'}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* DESTAQUE PRINCIPAL: COMISSÃO TOTAL ESTIMADA & TRAVA DE COMPARECIMENTO */}
      {/* ------------------------------------------------------------------- */}
      {kpiAtual && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700/80 relative overflow-hidden">
          {/* Textura sutil decorativa */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Bloco do Valor Total */}
            <div className="lg:col-span-5 space-y-3 border-b lg:border-b-0 lg:border-r border-slate-700/80 pb-6 lg:pb-0 lg:pr-6">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Comissão Total Estimada do Mês
              </span>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  {formatarMoeda(kpiAtual.comissaoTotal)}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ mês de referência</span>
              </div>

              {/* TRAVA CRÍTICA DE SEGURANÇA BADGE */}
              <div className="pt-2">
                {kpiAtual.travaComparecimentoOk ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ Trava de Comparecimento OK ({kpiAtual.taxaComparecimento}% ≥ 75%) — Bônus de Captação Liberado</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>⚠️ Trava Bloqueada ({kpiAtual.taxaComparecimento}% &lt; 75%) — Bônus de Captação Zerado</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detalhamento dos 4 Bônus */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Bônus 1 */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 space-y-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  1. Captação
                </p>
                <p className="text-lg font-bold text-white">
                  {kpiAtual.travaComparecimentoOk
                    ? formatarMoeda(kpiAtual.bonusCaptacao)
                    : 'R$ 0,00'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {kpiAtual.travaComparecimentoOk
                    ? `${kpiAtual.consultasRealizadas} consultas`
                    : 'Bloqueado (<75%)'}
                </p>
              </div>

              {/* Bônus 2 */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 space-y-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  2. Comparecimento
                </p>
                <p className="text-lg font-bold text-white">
                  {formatarMoeda(kpiAtual.bonusComparecimento)}
                </p>
                <p className="text-[10px] text-slate-400">{kpiAtual.taxaComparecimento}% de presença</p>
              </div>

              {/* Bônus 3 */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 space-y-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  3. Fechamento
                </p>
                <p className="text-lg font-bold text-white">
                  {formatarMoeda(kpiAtual.bonusFechamento)}
                </p>
                <p className="text-[10px] text-slate-400">{kpiAtual.taxaFechamento}% conversão</p>
              </div>

              {/* Bônus 4 */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 space-y-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  4. Faturamento
                </p>
                <p className="text-lg font-bold text-white">
                  {formatarMoeda(kpiAtual.bonusFaturamento)}
                </p>
                <p className="text-[10px] text-slate-400">{kpiAtual.percentualMetaFaturamento}% da meta</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* GRID DOS 4 CARDS DETALHADOS DE KPIS */}
      {/* ------------------------------------------------------------------- */}
      {kpiAtual && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CARD KPI 1: CAPTAÇÃO (CONSULTAS REALIZADAS) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                  <CalendarCheck className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  KPI 1
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Captação (Consultas)</h3>
                <p className="text-xs text-slate-500">Consultas Atendidas/Realizadas no mês</p>
              </div>

              <div className="pt-1">
                <div className="text-2xl font-black text-slate-900">
                  {kpiAtual.consultasRealizadas}{' '}
                  <span className="text-xs font-normal text-slate-500">consultas</span>
                </div>
              </div>

              {/* Trava aviso */}
              {!kpiAtual.travaComparecimentoOk && (
                <p className="text-[11px] text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200/60 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  Comparecimento &lt; 75% zerou este bônus!
                </p>
              )}

              {/* Barra de Progresso */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Próximo nível: 50+</span>
                  <span className="font-bold text-blue-700">
                    {Math.min(100, Math.round((kpiAtual.consultasRealizadas / 50) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(5, (kpiAtual.consultasRealizadas / 50) * 100))}%`,
                    }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Réguas: &lt;30 (R$0) | 30-39 (R$300) | 40-49 (R$400) | ≥50 (R$500)
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Bônus Conquistado:</span>
              <span className="text-base font-bold text-blue-700">
                {formatarMoeda(kpiAtual.bonusCaptacao)}
              </span>
            </div>
          </div>

          {/* CARD KPI 2: COMPARECIMENTO (% SEM NO-SHOW) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                  <Users className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  KPI 2
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Taxa de Comparecimento</h3>
                <p className="text-xs text-slate-500">% Atendidos / Agendamentos Totais</p>
              </div>

              <div className="pt-1">
                <div className="text-2xl font-black text-slate-900">
                  {kpiAtual.taxaComparecimento}%
                </div>
                <p className="text-xs text-slate-500">
                  {kpiAtual.consultasRealizadas} atendidas de {kpiAtual.totalAgendamentos} agendadas
                </p>
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Mínimo exigido: 75%</span>
                  <span
                    className={`font-bold ${
                      kpiAtual.taxaComparecimento >= 75 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {kpiAtual.taxaComparecimento}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      kpiAtual.taxaComparecimento >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(5, kpiAtual.taxaComparecimento))}%`,
                    }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Réguas: &lt;75% (Trava) | 75-85% (R$300) | 86-95% (R$500) | &gt;95% (R$700)
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Bônus Conquistado:</span>
              <span className="text-base font-bold text-amber-700">
                {formatarMoeda(kpiAtual.bonusComparecimento)}
              </span>
            </div>
          </div>

          {/* CARD KPI 3: FECHAMENTO (FOLLOW-UP PÓS-CONSULTA) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                  <Target className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  KPI 3
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Taxa de Fechamento</h3>
                <p className="text-xs text-slate-500">Vendas Feitas / Leads em Pós-Consulta</p>
              </div>

              <div className="pt-1">
                <div className="text-2xl font-black text-slate-900">
                  {kpiAtual.taxaFechamento}%
                </div>
                <p className="text-xs text-slate-500">
                  {kpiAtual.leadsVendaFeita} fechadas de {kpiAtual.leadsPosConsulta} avaliadas
                </p>
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Meta de excelência: &gt;60%</span>
                  <span className="font-bold text-purple-700">{kpiAtual.taxaFechamento}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(5, kpiAtual.taxaFechamento))}%`,
                    }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Réguas: &lt;30% (R$0) | 30-45% (R$400) | 46-60% (R$700) | &gt;60% (R$1.000)
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Bônus Conquistado:</span>
              <span className="text-base font-bold text-purple-700">
                {formatarMoeda(kpiAtual.bonusFechamento)}
              </span>
            </div>
          </div>

          {/* CARD KPI 4: FATURAMENTO MENSAL VS META */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <DollarSign className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  KPI 4
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Faturamento Mensal</h3>
                <p className="text-xs text-slate-500">Soma de compras / Meta R$ 80.000</p>
              </div>

              <div className="pt-1">
                <div className="text-2xl font-black text-slate-900">
                  {formatarMoeda(kpiAtual.faturamentoRealizado)}
                </div>
                <p className="text-xs text-slate-500">
                  {kpiAtual.percentualMetaFaturamento}% atingido da meta de R$ 80k
                </p>
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Meta 100% (80k)</span>
                  <span className="font-bold text-emerald-700">
                    {kpiAtual.percentualMetaFaturamento}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(5, kpiAtual.percentualMetaFaturamento))}%`,
                    }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Réguas: 71-85% (1k) | 86-99% (1.4k) | 100-119% (2k) | ≥120% (3k)
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Bônus Conquistado:</span>
              <span className="text-base font-bold text-emerald-700">
                {formatarMoeda(kpiAtual.bonusFaturamento)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* NAVEGAÇÃO DE ABAS INTERNAS (RÉGUAS DA POLÍTICA & EVOLUÇÃO) */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 p-2 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setAbaManualAtiva('kpis')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              abaManualAtiva === 'kpis'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-700" />
            Evolução Gráfica dos Meses
          </button>
          <button
            onClick={() => setAbaManualAtiva('reguas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              abaManualAtiva === 'reguas'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4 text-amber-700" />
            Tabela de Réguas Formal (BON-001)
          </button>
          <button
            onClick={() => setAbaManualAtiva('historico')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              abaManualAtiva === 'historico'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-700" />
            Histórico de Snapshots Congelados ({historico.length})
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: GRÁFICO DE EVOLUÇÃO */}
          {abaManualAtiva === 'kpis' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Evolução do Comissionamento & Faturamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhamento histórico dos últimos meses de bonificação
                  </p>
                </div>
              </div>

              {/* GRÁFICO RESPONSIVO EM BARRAS CSS/TAILWIND */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="h-64 flex items-end justify-around gap-2 pt-6">
                  {historico.slice(0, 6).reverse().map((item) => {
                    const altFaturamento = Math.min(100, Math.round(((item.faturamentoRealizado || item.faturamento_realizado || 0) / 100000) * 100));
                    const altComissao = Math.min(100, Math.round(((item.comissaoTotal || item.comissao_total || 0) / 5000) * 100));

                    return (
                      <div key={item.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="flex items-end gap-1.5 h-full w-full max-w-[80px] justify-center">
                          {/* Barra Faturamento */}
                          <div
                            className="w-1/2 bg-slate-300 group-hover:bg-slate-400 rounded-t-md transition-all relative"
                            style={{ height: `${Math.max(8, altFaturamento)}%` }}
                            title={`Faturamento: ${formatarMoeda(item.faturamentoRealizado || item.faturamento_realizado || 0)}`}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded-md whitespace-nowrap z-20 pointer-events-none">
                              {formatarMoeda(item.faturamentoRealizado || item.faturamento_realizado || 0)}
                            </span>
                          </div>
                          {/* Barra Comissão */}
                          <div
                            className="w-1/2 bg-amber-800 group-hover:bg-amber-900 rounded-t-md transition-all relative"
                            style={{ height: `${Math.max(8, altComissao)}%` }}
                            title={`Comissão: ${formatarMoeda(item.comissaoTotal || item.comissao_total || 0)}`}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-900 text-white text-[10px] py-0.5 px-1.5 rounded-md whitespace-nowrap z-20 pointer-events-none">
                              {formatarMoeda(item.comissaoTotal || item.comissao_total || 0)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {item.mesAno || item.mes_ano}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-6 border-t border-slate-200/80 pt-4 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-slate-300"></span>
                    <span>Faturamento Mensal (Escala R$ 100k)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-amber-800"></span>
                    <span>Comissão Total Secretária (Escala R$ 5k)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TABELA DE RÉGUAS FORMAL (BON-001) */}
          {abaManualAtiva === 'reguas' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Réguas de Bonificação da Política BON-001
                </h3>
                <p className="text-xs text-slate-500">
                  Critérios oficiais e faixas para cada um dos 4 pilares de desempenho
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RÉGUA 1: CAPTAÇÃO */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-blue-700" />
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                        1. Captação (Consultas)
                      </h4>
                    </div>
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                      Exige Comparecimento ≥ 75%
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Volume Consultas</th>
                        <th className="p-2.5 text-right">Bônus R$</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5">&lt; 30 consultas</td>
                        <td className="p-2.5 text-right font-bold text-slate-400">R$ 0,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">30 a 39 consultas</td>
                        <td className="p-2.5 text-right font-bold text-blue-700">R$ 300,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">40 a 49 consultas</td>
                        <td className="p-2.5 text-right font-bold text-blue-700">R$ 400,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-blue-900">≥ 50 consultas</td>
                        <td className="p-2.5 text-right font-bold text-blue-900">R$ 500,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* RÉGUA 2: COMPARECIMENTO */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-700" />
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        2. Taxa de Comparecimento
                      </h4>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      Trava de Segurança
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Taxa Presença</th>
                        <th className="p-2.5 text-right">Bônus R$</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5 font-semibold text-rose-600">&lt; 75% (Bloqueia Captação)</td>
                        <td className="p-2.5 text-right font-bold text-rose-600">R$ 0,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">75% a 85%</td>
                        <td className="p-2.5 text-right font-bold text-amber-700">R$ 300,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">86% a 95%</td>
                        <td className="p-2.5 text-right font-bold text-amber-700">R$ 500,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-amber-900">&gt; 95%</td>
                        <td className="p-2.5 text-right font-bold text-amber-900">R$ 700,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* RÉGUA 3: FECHAMENTO */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-700" />
                      <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                        3. Taxa de Fechamento
                      </h4>
                    </div>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Taxa Fechamento</th>
                        <th className="p-2.5 text-right">Bônus R$</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5">&lt; 30%</td>
                        <td className="p-2.5 text-right font-bold text-slate-400">R$ 0,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">30% a 45%</td>
                        <td className="p-2.5 text-right font-bold text-purple-700">R$ 400,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">46% a 60%</td>
                        <td className="p-2.5 text-right font-bold text-purple-700">R$ 700,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-purple-900">&gt; 60%</td>
                        <td className="p-2.5 text-right font-bold text-purple-900">R$ 1.000,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* RÉGUA 4: FATURAMENTO */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        4. Faturamento (Meta R$ 80k)
                      </h4>
                    </div>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">% da Meta (R$)</th>
                        <th className="p-2.5 text-right">Bônus R$</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5">&lt; 71% (&lt; R$ 56.800)</td>
                        <td className="p-2.5 text-right font-bold text-slate-400">R$ 0,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">71% a 85% (R$ 56.8k - R$ 68k)</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">R$ 1.000,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">86% a 99% (R$ 68.8k - R$ 79.2k)</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">R$ 1.400,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-800">100% a 119% (R$ 80k - R$ 95.2k)</td>
                        <td className="p-2.5 text-right font-bold text-emerald-800">R$ 2.000,00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-950">≥ 120% (≥ R$ 96.000)</td>
                        <td className="p-2.5 text-right font-bold text-emerald-950">R$ 3.000,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TABELA DEMONSTRATIVA DE HISTÓRICO */}
          {abaManualAtiva === 'historico' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Histórico de Snapshots Mensais
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registros congelados salvos na tabela `kpis_secretaria_mensal`
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Mês / Ano</th>
                      <th className="p-3">Consultas</th>
                      <th className="p-3">% Comparecimento</th>
                      <th className="p-3">% Fechamento</th>
                      <th className="p-3">Faturamento Realizado</th>
                      <th className="p-3">Bônus Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {historico.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{h.mesAno || h.mes_ano}</td>
                        <td className="p-3">{h.consultasRealizadas || h.consultas_realizadas} consultas</td>
                        <td className="p-3 font-medium">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              (h.taxaComparecimento || h.taxa_comparecimento || 0) >= 75
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {h.taxaComparecimento || h.taxa_comparecimento}%
                          </span>
                        </td>
                        <td className="p-3 font-medium">
                          {h.taxaFechamento || h.taxa_fechamento}%
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          {formatarMoeda(h.faturamentoRealizado || h.faturamento_realizado || 0)}
                        </td>
                        <td className="p-3 font-bold text-amber-800">
                          {formatarMoeda(h.comissaoTotal || h.comissao_total || 0)}
                        </td>
                        <td className="p-3">
                          {h.fechado ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <Lock className="w-3 h-3 text-slate-500" /> Congelado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Unlock className="w-3 h-3 text-emerald-600" /> Aberto
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setMesAnoSelecionado(h.mesAno || h.mes_ano || mesAnoSelecionado);
                              setAbaManualAtiva('kpis');
                            }}
                            className="text-amber-800 hover:text-amber-950 font-bold hover:underline text-xs cursor-pointer"
                          >
                            Visualizar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL DE CONFIRMAÇÃO PARA CONGELAR / FECHAR MÊS */}
      {/* ------------------------------------------------------------------- */}
      {modalCongelarAberto && kpiAtual && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-800">
                  <Lock className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Congelar Mês {mesAnoSelecionado}
                </h3>
              </div>
              <button
                onClick={() => setModalCongelarAberto(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <p>
                Ao congelar o mês <strong className="text-slate-900">{mesAnoSelecionado}</strong>, um snapshot imutável será gravado na tabela <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">public.kpis_secretaria_mensal</code> com os valores apurados abaixo:
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consultas Realizadas:</span>
                  <span className="font-bold text-slate-800">{kpiAtual.consultasRealizadas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxa Comparecimento:</span>
                  <span className="font-bold text-slate-800">{kpiAtual.taxaComparecimento}% ({kpiAtual.travaComparecimentoOk ? 'Elegível' : 'Bloqueada'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxa Fechamento:</span>
                  <span className="font-bold text-slate-800">{kpiAtual.taxaFechamento}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Faturamento Realizado:</span>
                  <span className="font-bold text-slate-800">{formatarMoeda(kpiAtual.faturamentoRealizado)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-amber-900">
                  <span>Comissão Total a Pagar:</span>
                  <span>{formatarMoeda(kpiAtual.comissaoTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setModalCongelarAberto(false)}
                className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCongelarMes}
                disabled={salvandoSnapshot}
                className="px-4 py-2 rounded-xl text-white bg-amber-800 hover:bg-amber-900 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {salvandoSnapshot ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Confirmar & Congelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
