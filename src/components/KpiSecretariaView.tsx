import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  CalendarCheck,
  Users,
  Target,
  DollarSign,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { useEmpresa } from '../context/EmpresaContext';
import { useCrm } from '../context/CrmContext';
import {
  fetchKpisMesAtual,
  fetchHistoricoKpis,
  salvarSnapshotKpi,
  ResultadoCalculoKpi,
} from '../services/supabaseService';
import { KpiSecretariaMensal } from '../types';

export const KpiSecretariaView: React.FC = () => {
  const { empresaAtivaId } = useEmpresa();
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
  const [abaAtiva, setAbaAtiva] = useState<'kpis' | 'reguas' | 'historico'>('kpis');

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
      {/* CABEÇALHO UNIFICADO */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Comissão & KPIs
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
              BON-001
            </span>
            {mesCongelado ? (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-200">
                <Lock className="w-3 h-3 text-slate-500" />
                Mês Congelado
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Em Acompanhamento
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Acompanhamento de metas, presença, conversão e bonificação mensal da recepção.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Seletor Mês/Ano */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="select-mes-ano-kpi"
              value={mesAnoSelecionado}
              onChange={(e) => setMesAnoSelecionado(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
            >
              {opcoesMeses.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Atualizar */}
          <button
            id="btn-atualizar-kpis"
            onClick={carregarDados}
            disabled={carregando}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>

          {/* Congelar */}
          <button
            id="btn-congelar-mes-modal"
            onClick={() => setModalCongelarAberto(true)}
            disabled={carregando}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mesCongelado
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'bg-amber-800 hover:bg-amber-900 text-white'
            }`}
          >
            {mesCongelado ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {mesCongelado ? 'Re-congelar Mês' : 'Congelar Mês'}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* PAINEL DE RESUMO PRINCIPAL */}
      {/* ------------------------------------------------------------------- */}
      {kpiAtual && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Card Principal: Comissão Total */}
          <div className="md:col-span-1 bg-amber-900 text-white rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-2">
            <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              Comissão Estimada
            </span>
            <div>
              <div className="text-2xl font-black text-white tracking-tight">
                {formatarMoeda(kpiAtual.comissaoTotal)}
              </div>
              <p className="text-[11px] text-amber-200 mt-0.5">
                Total acumulado do mês
              </p>
            </div>
            <div className="pt-2 border-t border-amber-800/80">
              {kpiAtual.travaComparecimentoOk ? (
                <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Trava Comparecimento OK
                </span>
              ) : (
                <span className="text-[10px] font-bold text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Trava Bloqueada (&lt;75%)
                </span>
              )}
            </div>
          </div>

          {/* KPI 1: Captação */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">1. Captação</span>
              <span className="p-1 rounded bg-slate-100 text-slate-600">
                <CalendarCheck className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {kpiAtual.consultasRealizadas} <span className="text-xs font-normal text-slate-500">consultas</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {kpiAtual.travaComparecimentoOk
                  ? `Bônus: ${formatarMoeda(kpiAtual.bonusCaptacao)}`
                  : 'Zerado (Trava <75%)'}
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-800 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (kpiAtual.consultasRealizadas / 50) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 2: Comparecimento */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">2. Comparecimento</span>
              <span className="p-1 rounded bg-slate-100 text-slate-600">
                <Users className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {kpiAtual.taxaComparecimento}%
              </div>
              <p className="text-[11px] text-slate-500">
                Bônus: {formatarMoeda(kpiAtual.bonusComparecimento)}
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${kpiAtual.taxaComparecimento >= 75 ? 'bg-emerald-600' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, kpiAtual.taxaComparecimento)}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 3: Fechamento */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">3. Fechamento</span>
              <span className="p-1 rounded bg-slate-100 text-slate-600">
                <Target className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {kpiAtual.taxaFechamento}%
              </div>
              <p className="text-[11px] text-slate-500">
                Bônus: {formatarMoeda(kpiAtual.bonusFechamento)}
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-800 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, kpiAtual.taxaFechamento)}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 4: Faturamento */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">4. Faturamento</span>
              <span className="p-1 rounded bg-slate-100 text-slate-600">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {formatarMoeda(kpiAtual.faturamentoRealizado)}
              </div>
              <p className="text-[11px] text-slate-500">
                {kpiAtual.percentualMetaFaturamento}% da meta (Bônus: {formatarMoeda(kpiAtual.bonusFaturamento)})
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, kpiAtual.percentualMetaFaturamento)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SELETOR DE ABAS */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-2 flex items-center gap-2">
          <button
            onClick={() => setAbaAtiva('kpis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              abaAtiva === 'kpis'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Detalhamento do Mês
          </button>
          <button
            onClick={() => setAbaAtiva('reguas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              abaAtiva === 'reguas'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Réguas da Política BON-001
          </button>
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              abaAtiva === 'historico'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Histórico ({historico.length})
          </button>
        </div>

        <div className="p-5">
          {/* ABA 1: DETALHAMENTO DO MÊS */}
          {abaAtiva === 'kpis' && kpiAtual && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pilar 1 & Pilar 2 */}
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-amber-800" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        1. Captação & Comparecimento
                      </h3>
                    </div>
                    {kpiAtual.travaComparecimentoOk ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Trava OK (≥75%)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Trava Bloqueada (&lt;75%)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Consultas Atendidas</span>
                      <strong className="text-slate-900 text-sm">{kpiAtual.consultasRealizadas}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bônus Captação</span>
                      <strong className="text-slate-900 text-sm">{formatarMoeda(kpiAtual.bonusCaptacao)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Taxa Presença</span>
                      <strong className="text-slate-900 text-sm">{kpiAtual.taxaComparecimento}%</strong>
                      <span className="text-[10px] text-slate-400 block">({kpiAtual.consultasRealizadas} de {kpiAtual.totalAgendamentos})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bônus Presença</span>
                      <strong className="text-slate-900 text-sm">{formatarMoeda(kpiAtual.bonusComparecimento)}</strong>
                    </div>
                  </div>
                </div>

                {/* Pilar 3 & Pilar 4 */}
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-800" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        2. Fechamento & Faturamento
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Meta: R$ 80.000
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Taxa Fechamento</span>
                      <strong className="text-slate-900 text-sm">{kpiAtual.taxaFechamento}%</strong>
                      <span className="text-[10px] text-slate-400 block">({kpiAtual.leadsVendaFeita} de {kpiAtual.leadsPosConsulta})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bônus Fechamento</span>
                      <strong className="text-slate-900 text-sm">{formatarMoeda(kpiAtual.bonusFechamento)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Faturamento Realizado</span>
                      <strong className="text-slate-900 text-sm">{formatarMoeda(kpiAtual.faturamentoRealizado)}</strong>
                      <span className="text-[10px] text-slate-400 block">({kpiAtual.percentualMetaFaturamento}% da meta)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bônus Faturamento</span>
                      <strong className="text-slate-900 text-sm">{formatarMoeda(kpiAtual.bonusFaturamento)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela resumida de apuração do mês */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Pilar de Bonificação</th>
                      <th className="p-2.5">Métrica Atingida</th>
                      <th className="p-2.5">Status da Regra</th>
                      <th className="p-2.5 text-right">Valor Bônus (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-900">1. Captação (Consultas)</td>
                      <td className="p-2.5">{kpiAtual.consultasRealizadas} consultas</td>
                      <td className="p-2.5">
                        {kpiAtual.travaComparecimentoOk ? (
                          <span className="text-emerald-700 font-medium">✓ Trava Liberada</span>
                        ) : (
                          <span className="text-rose-600 font-bold">⚠️ Trava &lt;75% Zerou</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatarMoeda(kpiAtual.bonusCaptacao)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-900">2. Taxa de Comparecimento</td>
                      <td className="p-2.5">{kpiAtual.taxaComparecimento}% ({kpiAtual.consultasRealizadas}/{kpiAtual.totalAgendamentos})</td>
                      <td className="p-2.5">
                        {kpiAtual.taxaComparecimento >= 75 ? (
                          <span className="text-emerald-700 font-medium">Elegível</span>
                        ) : (
                          <span className="text-rose-600 font-bold">Abaixo do Mínimo (75%)</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatarMoeda(kpiAtual.bonusComparecimento)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-900">3. Taxa de Fechamento</td>
                      <td className="p-2.5">{kpiAtual.taxaFechamento}% ({kpiAtual.leadsVendaFeita}/{kpiAtual.leadsPosConsulta})</td>
                      <td className="p-2.5">Follow-up Pós-Consulta</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatarMoeda(kpiAtual.bonusFechamento)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-900">4. Faturamento Mensal</td>
                      <td className="p-2.5">{formatarMoeda(kpiAtual.faturamentoRealizado)} ({kpiAtual.percentualMetaFaturamento}%)</td>
                      <td className="p-2.5">Meta R$ 80.000,00</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatarMoeda(kpiAtual.bonusFaturamento)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider text-[11px] text-slate-500">
                        Total Geral da Comissão:
                      </td>
                      <td className="p-2.5 text-right text-sm font-black text-amber-900">
                        {formatarMoeda(kpiAtual.comissaoTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ABA 2: RÉGUAS DA POLÍTICA BON-001 */}
          {abaAtiva === 'reguas' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Régua 1 */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-900 flex justify-between items-center">
                  <span>1. Captação (Consultas)</span>
                  <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Exige Presença ≥ 75%</span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Faixa</th>
                      <th className="p-2 text-right">Bônus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="p-2">&lt; 30 consultas</td><td className="p-2 text-right text-slate-400 font-semibold">R$ 0,00</td></tr>
                    <tr><td className="p-2">30 a 39 consultas</td><td className="p-2 text-right font-bold text-slate-900">R$ 300,00</td></tr>
                    <tr><td className="p-2">40 a 49 consultas</td><td className="p-2 text-right font-bold text-slate-900">R$ 400,00</td></tr>
                    <tr><td className="p-2 font-bold text-slate-900">≥ 50 consultas</td><td className="p-2 text-right font-bold text-amber-900">R$ 500,00</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Régua 2 */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-900 flex justify-between items-center">
                  <span>2. Taxa de Comparecimento</span>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Trava de Segurança</span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Faixa</th>
                      <th className="p-2 text-right">Bônus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="p-2 text-rose-600 font-semibold">&lt; 75% (Trava)</td><td className="p-2 text-right text-rose-600 font-bold">R$ 0,00</td></tr>
                    <tr><td className="p-2">75% a 85%</td><td className="p-2 text-right font-bold text-slate-900">R$ 300,00</td></tr>
                    <tr><td className="p-2">86% a 95%</td><td className="p-2 text-right font-bold text-slate-900">R$ 500,00</td></tr>
                    <tr><td className="p-2 font-bold text-slate-900">&gt; 95%</td><td className="p-2 text-right font-bold text-amber-900">R$ 700,00</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Régua 3 */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-900">
                  3. Taxa de Fechamento (Follow-up)
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Faixa</th>
                      <th className="p-2 text-right">Bônus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="p-2">&lt; 30%</td><td className="p-2 text-right text-slate-400 font-semibold">R$ 0,00</td></tr>
                    <tr><td className="p-2">30% a 45%</td><td className="p-2 text-right font-bold text-slate-900">R$ 400,00</td></tr>
                    <tr><td className="p-2">46% a 60%</td><td className="p-2 text-right font-bold text-slate-900">R$ 700,00</td></tr>
                    <tr><td className="p-2 font-bold text-slate-900">&gt; 60%</td><td className="p-2 text-right font-bold text-amber-900">R$ 1.000,00</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Régua 4 */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-900">
                  4. Faturamento (Meta R$ 80.000)
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Faixa (% Meta)</th>
                      <th className="p-2 text-right">Bônus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="p-2">&lt; 71% (&lt; R$ 56.8k)</td><td className="p-2 text-right text-slate-400 font-semibold">R$ 0,00</td></tr>
                    <tr><td className="p-2">71% a 85% (R$ 56.8k - R$ 68k)</td><td className="p-2 text-right font-bold text-slate-900">R$ 1.000,00</td></tr>
                    <tr><td className="p-2">86% a 99% (R$ 68.8k - R$ 79.2k)</td><td className="p-2 text-right font-bold text-slate-900">R$ 1.400,00</td></tr>
                    <tr><td className="p-2 font-bold text-slate-900">100% a 119% (R$ 80k - R$ 95.2k)</td><td className="p-2 text-right font-bold text-emerald-800">R$ 2.000,00</td></tr>
                    <tr><td className="p-2 font-bold text-slate-900">≥ 120% (≥ R$ 96k)</td><td className="p-2 text-right font-bold text-amber-900">R$ 3.000,00</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 3: HISTÓRICO DE SNAPSHOTS */}
          {abaAtiva === 'historico' && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Mês / Ano</th>
                    <th className="p-2.5">Consultas</th>
                    <th className="p-2.5">% Presença</th>
                    <th className="p-2.5">% Conversão</th>
                    <th className="p-2.5">Faturamento</th>
                    <th className="p-2.5">Comissão Total</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {historico.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900">{h.mesAno || h.mes_ano}</td>
                      <td className="p-2.5">{h.consultasRealizadas || h.consultas_realizadas}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (h.taxaComparecimento || h.taxa_comparecimento || 0) >= 75
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {h.taxaComparecimento || h.taxa_comparecimento}%
                        </span>
                      </td>
                      <td className="p-2.5">{h.taxaFechamento || h.taxa_fechamento}%</td>
                      <td className="p-2.5 font-semibold text-slate-900">
                        {formatarMoeda(h.faturamentoRealizado || h.faturamento_realizado || 0)}
                      </td>
                      <td className="p-2.5 font-bold text-amber-900">
                        {formatarMoeda(h.comissaoTotal || h.comissao_total || 0)}
                      </td>
                      <td className="p-2.5">
                        {h.fechado ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Lock className="w-3 h-3 text-slate-500" /> Congelado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Unlock className="w-3 h-3 text-emerald-600" /> Aberto
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => {
                            setMesAnoSelecionado(h.mesAno || h.mes_ano || mesAnoSelecionado);
                            setAbaAtiva('kpis');
                          }}
                          className="text-amber-800 hover:text-amber-950 font-bold hover:underline text-xs cursor-pointer"
                        >
                          Visualizar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {historico.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500 text-xs">
                        Nenhum histórico congelado gravado até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL DE CONFIRMAÇÃO PARA CONGELAR / FECHAR MÊS */}
      {/* ------------------------------------------------------------------- */}
      {modalCongelarAberto && kpiAtual && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-800">
                  <Lock className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
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

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Confirma o congelamento oficial do mês <strong className="text-slate-900">{mesAnoSelecionado}</strong>? A apuração será gravada no histórico de forma permanente.
              </p>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consultas Atendidas:</span>
                  <span className="font-bold text-slate-800">{kpiAtual.consultasRealizadas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxa Comparecimento:</span>
                  <span className="font-bold text-slate-800">{kpiAtual.taxaComparecimento}% ({kpiAtual.travaComparecimentoOk ? 'Liberado' : 'Bloqueado'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxa Fechamento:</span>
                  <span className="font-bold text-slate-800">{kpiAtual.taxaFechamento}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Faturamento Realizado:</span>
                  <span className="font-bold text-slate-800">{formatarMoeda(kpiAtual.faturamentoRealizado)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-xs font-bold text-slate-900">
                  <span>Comissão Total:</span>
                  <span className="text-amber-900 font-black">{formatarMoeda(kpiAtual.comissaoTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalCongelarAberto(false)}
                className="px-3.5 py-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCongelarMes}
                disabled={salvandoSnapshot}
                className="px-3.5 py-2 rounded-lg text-white bg-amber-800 hover:bg-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {salvandoSnapshot ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Confirmar & Congelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
