import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  DollarSign,
  Clock,
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Info,
  Calendar,
  Layers,
  HelpCircle,
  Award,
  Users,
  ChevronDown,
  ChevronUp,
  Flame,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import {
  ProcedimentoClinica,
  CriarProcedimentoPayload,
  AtualizarProcedimentoPayload,
  EstatisticasProcedimento,
} from '../types';

type TipoOrdenacao = 'procura' | 'conversao' | 'faturamento' | 'duracao' | 'alfabetica';

export const ControleProcedimentosView: React.FC = () => {
  const {
    procedimentos,
    estatisticasProcedimentos,
    criarProcedimento,
    atualizarProcedimento,
    excluirProcedimento,
    verificarEExecutarReativacaoAutomatica,
  } = useCrm();

  // Estados de busca, ordenação e filtro
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<TipoOrdenacao>('procura');

  // Estados dos modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [procedimentoEmEdicao, setProcedimentoEmEdicao] = useState<ProcedimentoClinica | null>(null);

  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [procedimentoDetalhado, setProcedimentoDetalhado] = useState<ProcedimentoClinica | null>(null);

  const [modalReativacaoResultado, setModalReativacaoResultado] = useState<{
    aberto: boolean;
    totalReativados: number;
    detalhes: Array<{ leadId: string; leadNome: string; procedimentoNome: string; diasPassados: number; limiteDias: number }>;
  }>({
    aberto: false,
    totalReativados: 0,
    detalhes: [],
  });

  const [isProcessandoReativacao, setIsProcessandoReativacao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Formulário de Cadastro/Edição
  const [formNome, setFormNome] = useState('');
  const [formCategoria, setFormCategoria] = useState('Estética Facial');
  const [formValor, setFormValor] = useState('1200');
  const [formFormatosPagamento, setFormFormatosPagamento] = useState(
    'À vista com 5% de desconto via Pix ou até 6x sem juros no cartão de crédito.'
  );
  const [formDuracaoDias, setFormDuracaoDias] = useState('120');
  const [formDescricao, setFormDescricao] = useState('');
  const [formOrientacoes, setFormOrientacoes] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);

  // Lista de categorias únicas para o filtro
  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set<string>();
    procedimentos.forEach((p) => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats);
  }, [procedimentos]);

  const abrirModalCriacao = () => {
    setProcedimentoEmEdicao(null);
    setFormNome('');
    setFormCategoria('Estética Facial');
    setFormValor('1200');
    setFormFormatosPagamento(
      'À vista com 5% de desconto via Pix ou até 6x sem juros no cartão de crédito.'
    );
    setFormDuracaoDias('120');
    setFormDescricao('');
    setFormOrientacoes('');
    setFormAtivo(true);
    setModalFormAberto(true);
  };

  const abrirModalEdicao = (proc: ProcedimentoClinica) => {
    setProcedimentoEmEdicao(proc);
    setFormNome(proc.nome);
    setFormCategoria(proc.categoria || 'Estética Facial');
    setFormValor(String(proc.valor));
    setFormFormatosPagamento(proc.formatosPagamento);
    setFormDuracaoDias(String(proc.duracaoDias));
    setFormDescricao(proc.descricao || '');
    setFormOrientacoes(proc.orientacoes || '');
    setFormAtivo(proc.ativo);
    setModalFormAberto(true);
  };

  const abrirModalDetalhes = (proc: ProcedimentoClinica) => {
    setProcedimentoDetalhado(proc);
    setModalDetalhesAberto(true);
  };

  const fecharModalForm = () => {
    setModalFormAberto(false);
    setProcedimentoEmEdicao(null);
  };

  const handleSalvarProcedimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('Por favor, informe o nome do procedimento.');
      return;
    }

    const valorNum = Number(formValor.replace(/[^0-9.]/g, '')) || 0;
    const duracaoNum = Number(formDuracaoDias) || 120;

    if (procedimentoEmEdicao) {
      const payload: AtualizarProcedimentoPayload = {
        nome: formNome,
        categoria: formCategoria,
        valor: valorNum,
        formatosPagamento: formFormatosPagamento,
        duracaoDias: duracaoNum,
        descricao: formDescricao,
        orientacoes: formOrientacoes,
        ativo: formAtivo,
      };
      await atualizarProcedimento(procedimentoEmEdicao.id, payload);
      setMensagemSucesso(`Procedimento "${formNome}" atualizado com sucesso!`);
    } else {
      const payload: CriarProcedimentoPayload = {
        nome: formNome,
        categoria: formCategoria,
        valor: valorNum,
        formatosPagamento: formFormatosPagamento,
        duracaoDias: duracaoNum,
        descricao: formDescricao,
        orientacoes: formOrientacoes,
        ativo: formAtivo,
      };
      await criarProcedimento(payload);
      setMensagemSucesso(`Procedimento "${formNome}" cadastrado com sucesso!`);
    }

    setTimeout(() => setMensagemSucesso(null), 4000);
    fecharModalForm();
  };

  const handleAlternarStatus = async (proc: ProcedimentoClinica) => {
    await atualizarProcedimento(proc.id, { ativo: !proc.ativo });
  };

  const handleExcluir = async (proc: ProcedimentoClinica) => {
    if (
      window.confirm(
        `Tem certeza que deseja remover o procedimento "${proc.nome}"? Os históricos existentes serão preservados.`
      )
    ) {
      await excluirProcedimento(proc.id);
      setMensagemSucesso(`Procedimento "${proc.nome}" removido.`);
      setTimeout(() => setMensagemSucesso(null), 3000);
    }
  };

  const handleExecutarReativacao = async () => {
    setIsProcessandoReativacao(true);
    try {
      const resultado = await verificarEExecutarReativacaoAutomatica();
      setModalReativacaoResultado({
        aberto: true,
        totalReativados: resultado.totalReativados,
        detalhes: resultado.detalhes,
      });
    } catch (err) {
      console.error('Erro ao executar reativação:', err);
    } finally {
      setIsProcessandoReativacao(false);
    }
  };

  // Filtragem e ordenação das estatísticas
  const estatisticasFiltradasEOrdenadas = useMemo(() => {
    return estatisticasProcedimentos
      .filter((item) => {
        const matchBusca =
          item.nome.toLowerCase().includes(busca.toLowerCase()) ||
          item.categoria.toLowerCase().includes(busca.toLowerCase()) ||
          item.formatosPagamento.toLowerCase().includes(busca.toLowerCase());

        const matchCat = categoriaFiltro === 'todos' || item.categoria === categoriaFiltro;

        return matchBusca && matchCat;
      })
      .sort((a, b) => {
        if (ordenacao === 'procura') return b.totalProcura - a.totalProcura;
        if (ordenacao === 'conversao') return b.taxaConversao - a.taxaConversao;
        if (ordenacao === 'faturamento') return b.faturamentoTotal - a.faturamentoTotal;
        if (ordenacao === 'duracao') return b.duracaoDias - a.duracaoDias;
        if (ordenacao === 'alfabetica') return a.nome.localeCompare(b.nome);
        return 0;
      });
  }, [estatisticasProcedimentos, busca, categoriaFiltro, ordenacao]);

  // Resumo de Destaques
  const campeaoProcura = useMemo(() => {
    if (estatisticasProcedimentos.length === 0) return null;
    return [...estatisticasProcedimentos].sort((a, b) => b.totalProcura - a.totalProcura)[0];
  }, [estatisticasProcedimentos]);

  const campeaoConversao = useMemo(() => {
    if (estatisticasProcedimentos.length === 0) return null;
    return [...estatisticasProcedimentos].sort((a, b) => b.taxaConversao - a.taxaConversao)[0];
  }, [estatisticasProcedimentos]);

  const faturamentoTotalGeral = useMemo(() => {
    return estatisticasProcedimentos.reduce((acc, item) => acc + item.faturamentoTotal, 0);
  }, [estatisticasProcedimentos]);

  const totalPrestesAReativar = useMemo(() => {
    return estatisticasProcedimentos.reduce((acc, item) => acc + item.pacientesPrestesAVencer, 0);
  }, [estatisticasProcedimentos]);

  return (
    <div id="controle-procedimentos-container" className="space-y-6">
      {/* Toast de Sucesso */}
      <AnimatePresence>
        {mensagemSucesso && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-sm text-xs font-semibold flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
            <button
              onClick={() => setMensagemSucesso(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CABEÇALHO DO CONTROLE DE PROCEDIMENTOS */}
      <div className="bg-white rounded-sm p-5 sm:p-6 border border-[#D9D6D0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#5C3A22]/10 text-[#5C3A22] border border-[#5C3A22]/20">
              Catálogo Clínico & Regras de Reativação
            </span>
            <span className="text-xs text-[#6E6E6E]">
              {procedimentos.length} procedimento(s) cadastrado(s)
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#1A1A1A] mt-1">
            Controle de Procedimentos, Valores & Inteligência de Vendas
          </h2>
          <p className="text-xs text-[#6E6E6E] mt-0.5 max-w-3xl">
            Gerencie a tabela de valores e condições de pagamento para suporte direto do executor
            com a paciente, configure a duração em dias para disparo automático da aba Reativação e
            acompanhe quais procedimentos mais atraem e mais convertem.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            id="btn-executar-reativacao-automatica"
            onClick={handleExecutarReativacao}
            disabled={isProcessandoReativacao}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-[#F2EFEA] hover:bg-[#E5E0D8] text-[#5C3A22] border border-[#D9D6D0] rounded-sm transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Verifica todos os pacientes em pós-procedimento e transfere automaticamente para a aba Reativação os que atingiram o prazo limite."
          >
            <Zap className={`w-3.5 h-3.5 text-[#5C3A22] ${isProcessandoReativacao ? 'animate-spin' : ''}`} />
            <span>{isProcessandoReativacao ? 'Verificando...' : 'Verificar Reativações'}</span>
          </button>

          <button
            type="button"
            id="btn-novo-procedimento"
            onClick={abrirModalCriacao}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#5C3A22] hover:bg-[#4A2E1B] text-white rounded-sm transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Procedimento</span>
          </button>
        </div>
      </div>

      {/* CARDS DE INTELIGÊNCIA COMERCIAL (DESTAQUES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mais Procurado */}
        <div className="bg-white rounded-sm p-4 border border-[#D9D6D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6E6E6E] uppercase tracking-wider">
              Mais Procurado
            </span>
            <div className="w-7 h-7 rounded-sm bg-amber-50 text-amber-700 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-[#1A1A1A] truncate" title={campeaoProcura?.nome}>
              {campeaoProcura ? campeaoProcura.nome : 'Nenhum'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-[#5C3A22]">
                {campeaoProcura?.totalProcura || 0} leads com interesse
              </span>
              <span className="text-[10px] text-[#6E6E6E]">
                ({campeaoProcura?.taxaConversao || 0}% conv.)
              </span>
            </div>
          </div>
        </div>

        {/* Maior Conversão */}
        <div className="bg-white rounded-sm p-4 border border-[#D9D6D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6E6E6E] uppercase tracking-wider">
              Maior Conversão
            </span>
            <div className="w-7 h-7 rounded-sm bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-[#1A1A1A] truncate" title={campeaoConversao?.nome}>
              {campeaoConversao ? campeaoConversao.nome : 'Nenhum'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-emerald-700">
                {campeaoConversao?.taxaConversao || 0}% taxa de sucesso
              </span>
              <span className="text-[10px] text-[#6E6E6E]">
                ({campeaoConversao?.totalConvertidos || 0} vendas)
              </span>
            </div>
          </div>
        </div>

        {/* Faturamento Estimado/Realizado */}
        <div className="bg-white rounded-sm p-4 border border-[#D9D6D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6E6E6E] uppercase tracking-wider">
              Faturamento em Procedimentos
            </span>
            <div className="w-7 h-7 rounded-sm bg-[#F2EFEA] text-[#5C3A22] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-[#1A1A1A]">
              {faturamentoTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="text-[10px] text-[#6E6E6E] mt-0.5">
              Receita agregada por vendas registradas no CRM
            </div>
          </div>
        </div>

        {/* Radar de Reativação */}
        <div className="bg-white rounded-sm p-4 border border-[#D9D6D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6E6E6E] uppercase tracking-wider">
              Alerta de Reativação
            </span>
            <div className="w-7 h-7 rounded-sm bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-[#1A1A1A]">
              {totalPrestesAReativar} paciente(s)
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5 font-medium">
              A vencer nos próximos 20 dias (entrada auto na Reativação)
            </div>
          </div>
        </div>
      </div>

      {/* REGRAS & INSTRUÇÕES DA AUTOMAÇÃO */}
      <div className="bg-[#F2EFEA]/60 rounded-sm p-4 border border-[#D9D6D0] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-[#5C3A22]">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#5C3A22] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Regra de Automação do Ciclo Clínico:</span> Cada paciente que
            estiver em situação <span className="font-bold">"Pós procedimento"</span> e atingir o prazo limite
            de duração (em dias) configurado para o procedimento, será{' '}
            <span className="font-bold">automaticamente direcionado para a aba Reativação</span> com o
            motivo registrado na linha do tempo.
          </div>
        </div>
        <button
          type="button"
          onClick={handleExecutarReativacao}
          className="px-3 py-1 bg-white hover:bg-[#F2EFEA] text-[#5C3A22] border border-[#D9D6D0] rounded-sm font-bold text-[11px] uppercase tracking-wider shrink-0 cursor-pointer shadow-xs"
        >
          Executar Agora
        </button>
      </div>

      {/* BARRA DE FILTROS E PESQUISA */}
      <div className="bg-white rounded-sm p-4 border border-[#D9D6D0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por procedimento, categoria ou forma de pagamento..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A]"
            />
          </div>

          {busca && (
            <button
              onClick={() => setBusca('')}
              className="text-xs text-[#6E6E6E] hover:text-[#1A1A1A] underline cursor-pointer shrink-0"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por Categoria */}
          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#6E6E6E]" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A] font-medium"
            >
              <option value="todos">Todas Categorias</option>
              {categoriasDisponiveis.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#6E6E6E] font-medium">Ordenar:</span>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as TipoOrdenacao)}
              className="px-2.5 py-1.5 text-xs bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A] font-medium"
            >
              <option value="procura">🔥 Mais Procurados</option>
              <option value="conversao">🎯 Maior Conversão (%)</option>
              <option value="faturamento">💰 Maior Faturamento (R$)</option>
              <option value="duracao">⏳ Duração do Efeito</option>
              <option value="alfabetica">🔤 Ordem Alfabética</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABELA PRINCIPAL DE PROCEDIMENTOS & ESTATÍSTICAS */}
      <div className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F2EFEA] border-b border-[#D9D6D0] text-[#1A1A1A] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Procedimento & Categoria</th>
                <th className="py-3 px-3">Valor de Tabela</th>
                <th className="py-3 px-3">Formatos de Pagamento (Executor)</th>
                <th className="py-3 px-3 text-center">Duração / Gatilho</th>
                <th className="py-3 px-3 text-center">Procura (Leads)</th>
                <th className="py-3 px-3 text-center">Conversão</th>
                <th className="py-3 px-3 text-right">Faturamento</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D6D0]">
              {estatisticasFiltradasEOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#6E6E6E]">
                    Nenhum procedimento encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                estatisticasFiltradasEOrdenadas.map((item, idx) => {
                  const procOriginal = procedimentos.find((p) => p.id === item.id);
                  if (!procOriginal) return null;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#F2EFEA]/30 transition-colors ${
                        !item.ativo ? 'opacity-60 bg-gray-50/50' : ''
                      }`}
                    >
                      {/* Procedimento & Categoria */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                          {idx === 0 && ordenacao === 'procura' && (
                            <span title="Mais procurado" className="text-amber-600">
                              🔥
                            </span>
                          )}
                          {idx === 0 && ordenacao === 'conversao' && (
                            <span title="Maior conversão" className="text-emerald-600">
                              ⭐
                            </span>
                          )}
                          <span>{item.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xs bg-[#5C3A22]/10 text-[#5C3A22]">
                            {item.categoria}
                          </span>
                          {procOriginal.descricao && (
                            <span
                              className="text-[10px] text-[#6E6E6E] truncate max-w-[180px]"
                              title={procOriginal.descricao}
                            >
                              {procOriginal.descricao}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Valor de Tabela */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-[#1A1A1A]">
                          {item.valor.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </div>
                        {item.ticketMedio !== item.valor && item.ticketMedio > 0 && (
                          <div className="text-[10px] text-[#6E6E6E]">
                            Médio:{' '}
                            {item.ticketMedio.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </div>
                        )}
                      </td>

                      {/* Formatos de Pagamento */}
                      <td className="py-3 px-3 max-w-[260px]">
                        <div
                          className="text-[#1A1A1A] line-clamp-2 cursor-pointer hover:text-[#5C3A22] transition-colors"
                          onClick={() => abrirModalDetalhes(procOriginal)}
                          title="Clique para ver o roteiro completo de pagamento e atendimento"
                        >
                          <div className="flex items-center gap-1 font-medium text-[11px]">
                            <CreditCard className="w-3 h-3 text-[#5C3A22] shrink-0" />
                            <span className="truncate">{item.formatosPagamento}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => abrirModalDetalhes(procOriginal)}
                          className="text-[10px] text-[#5C3A22] hover:underline font-semibold mt-0.5 block"
                        >
                          Ver roteiro para o executor &rarr;
                        </button>
                      </td>

                      {/* Duração / Gatilho */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-bold text-[#1A1A1A] bg-[#F2EFEA] px-2 py-0.5 rounded-sm border border-[#D9D6D0]">
                          <Clock className="w-3 h-3 text-[#5C3A22]" />
                          <span>{item.duracaoDias} dias</span>
                        </div>
                        <div className="text-[9px] text-[#6E6E6E] mt-0.5">
                          {item.pacientesPosProcedimento} em pós / {item.pacientesPrestesAVencer} a vencer
                        </div>
                      </td>

                      {/* Procura (Leads) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-bold text-[#1A1A1A] text-sm">
                          {item.totalProcura}
                        </div>
                        <div className="text-[10px] text-[#6E6E6E]">interessados</div>
                      </td>

                      {/* Conversão */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-bold text-emerald-700 text-sm">
                          {item.taxaConversao}%
                        </div>
                        <div className="text-[10px] text-[#6E6E6E]">
                          {item.totalConvertidos} venda(s)
                        </div>
                      </td>

                      {/* Faturamento */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-[#1A1A1A]">
                          {item.faturamentoTotal.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </div>
                        <div className="text-[10px] text-[#6E6E6E]">
                          {item.totalConvertidos > 0 ? 'Total apurado' : 'Estimado'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleAlternarStatus(procOriginal)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${
                            item.ativo
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                          }`}
                          title="Clique para ativar ou desativar"
                        >
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirModalEdicao(procOriginal)}
                            className="p-1.5 text-[#6E6E6E] hover:text-[#5C3A22] hover:bg-[#F2EFEA] rounded-sm transition-colors cursor-pointer"
                            title="Editar procedimento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluir(procOriginal)}
                            className="p-1.5 text-[#6E6E6E] hover:text-rose-700 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                            title="Excluir procedimento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      <AnimatePresence>
        {modalFormAberto && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-sm border border-[#D9D6D0] shadow-xl w-full max-w-xl p-5 sm:p-6 space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-[#D9D6D0] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-[#F2EFEA] text-[#5C3A22] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">
                      {procedimentoEmEdicao ? 'Editar Procedimento' : 'Novo Procedimento Clínico'}
                    </h3>
                    <p className="text-[11px] text-[#6E6E6E]">
                      Defina valores, roteiro de pagamento e prazo de reativação
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fecharModalForm}
                  className="text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSalvarProcedimento} className="space-y-3.5 text-xs">
                {/* Nome do Procedimento */}
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">
                    Nome do Procedimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Toxina Botulínica (Botox Facial Completo)"
                    className="w-full px-3 py-2 bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A] font-medium"
                  />
                </div>

                {/* Categoria e Valor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1A1A1A] mb-1">
                      Categoria Clínica
                    </label>
                    <input
                      type="text"
                      list="categorias-sugeridas"
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      placeholder="Ex: Toxinas & Injetáveis"
                      className="w-full px-3 py-2 bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A]"
                    />
                    <datalist id="categorias-sugeridas">
                      <option value="Toxinas & Injetáveis" />
                      <option value="Preenchedores & Labial" />
                      <option value="Bioestimuladores de Colágeno" />
                      <option value="Harmonização Facial" />
                      <option value="Fios de Sustentação" />
                      <option value="Estética Facial & Limpeza" />
                      <option value="Laser & Rejuvenescimento" />
                      <option value="Enzimas & Corporal" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1A1A] mb-1">
                      Valor de Tabela (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="50"
                      value={formValor}
                      onChange={(e) => setFormValor(e.target.value)}
                      placeholder="Ex: 1200"
                      className="w-full px-3 py-2 bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A] font-semibold"
                    />
                  </div>
                </div>

                {/* Formatos de Pagamento (Instrução ao Executor) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#1A1A1A] flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-[#5C3A22]" />
                      <span>Formatos de Pagamento & Condições (Guia do Executor) *</span>
                    </label>
                    <span className="text-[10px] text-[#6E6E6E]">Visível no atendimento</span>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={formFormatosPagamento}
                    onChange={(e) => setFormFormatosPagamento(e.target.value)}
                    placeholder="Ex: À vista com 5% de desconto via Pix ou até 6x sem juros no cartão de crédito. Pacote com 2 sessões em até 10x."
                    className="w-full px-3 py-2 bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A]"
                  />
                </div>

                {/* Duração Estimada do Efeito (em dias) & Atalhos */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#1A1A1A] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#5C3A22]" />
                      <span>Duração Estimada do Efeito (em dias) *</span>
                    </label>
                    <span className="text-[10px] font-semibold text-[#5C3A22]">
                      Gatilho de Reativação Automática
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      required
                      min="1"
                      value={formDuracaoDias}
                      onChange={(e) => setFormDuracaoDias(e.target.value)}
                      placeholder="120"
                      className="w-32 px-3 py-2 bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A] font-bold"
                    />
                    <span className="text-xs text-[#6E6E6E]">dias até a reativação</span>
                  </div>

                  {/* Atalhos rápidos de dias */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-[#6E6E6E]">Atalhos:</span>
                    {[
                      { rotulo: '30 dias (Limpeza)', dias: '30' },
                      { rotulo: '60 dias (Peeling)', dias: '60' },
                      { rotulo: '120 dias (Botox)', dias: '120' },
                      { rotulo: '180 dias (6 meses)', dias: '180' },
                      { rotulo: '300 dias (10 meses)', dias: '300' },
                      { rotulo: '365 dias (1 ano)', dias: '365' },
                      { rotulo: '540 dias (Bioestimulador)', dias: '540' },
                    ].map((at) => (
                      <button
                        key={at.dias}
                        type="button"
                        onClick={() => setFormDuracaoDias(at.dias)}
                        className={`text-[10px] px-2 py-0.5 rounded-xs border transition-colors cursor-pointer ${
                          formDuracaoDias === at.dias
                            ? 'bg-[#5C3A22] text-white border-[#5C3A22]'
                            : 'bg-[#F2EFEA] text-[#5C3A22] border-[#D9D6D0] hover:bg-[#E5E0D8]'
                        }`}
                      >
                        {at.rotulo}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descrição Clínica & Orientações */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1A1A1A] mb-1">
                      Descrição Resumida
                    </label>
                    <textarea
                      rows={2}
                      value={formDescricao}
                      onChange={(e) => setFormDescricao(e.target.value)}
                      placeholder="Benefícios clínicos, indicação e áreas tratadas..."
                      className="w-full px-3 py-2 bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1A1A] mb-1">
                      Dica de Conversão para o Executor
                    </label>
                    <textarea
                      rows={2}
                      value={formOrientacoes}
                      onChange={(e) => setFormOrientacoes(e.target.value)}
                      placeholder="Argumento de valor ao comunicar com a paciente..."
                      className="w-full px-3 py-2 bg-[#F2EFEA]/30 border border-[#D9D6D0] rounded-sm focus:outline-none focus:border-[#5C3A22] text-[#1A1A1A]"
                    />
                  </div>
                </div>

                {/* Status Ativo */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="form-ativo"
                    checked={formAtivo}
                    onChange={(e) => setFormAtivo(e.target.checked)}
                    className="w-4 h-4 rounded text-[#5C3A22] focus:ring-[#5C3A22]"
                  />
                  <label htmlFor="form-ativo" className="text-xs font-semibold text-[#1A1A1A] cursor-pointer">
                    Procedimento ativo para captação e estatísticas comerciais
                  </label>
                </div>

                {/* Botões do Modal */}
                <div className="flex items-center justify-end gap-2 border-t border-[#D9D6D0] pt-3">
                  <button
                    type="button"
                    onClick={fecharModalForm}
                    className="px-4 py-2 text-xs font-bold text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA] rounded-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#5C3A22] hover:bg-[#4A2E1B] text-white rounded-sm transition-all shadow-xs cursor-pointer"
                  >
                    {procedimentoEmEdicao ? 'Salvar Alterações' : 'Cadastrar Procedimento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE DETALHES & ROTEIRO PARA O EXECUTOR */}
      <AnimatePresence>
        {modalDetalhesAberto && procedimentoDetalhado && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-sm border border-[#D9D6D0] shadow-xl w-full max-w-lg p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#D9D6D0] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-[#F2EFEA] text-[#5C3A22] flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">
                      {procedimentoDetalhado.nome}
                    </h3>
                    <span className="text-[10px] font-semibold text-[#5C3A22]">
                      {procedimentoDetalhado.categoria}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalDetalhesAberto(false)}
                  className="text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-[#F2EFEA]/50 p-3 rounded-sm border border-[#D9D6D0] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#6E6E6E]">Valor de Tabela:</span>
                    <span className="font-bold text-base text-[#1A1A1A]">
                      {procedimentoDetalhado.valor.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#6E6E6E]">Duração do Efeito:</span>
                    <span className="font-semibold text-[#5C3A22]">
                      {procedimentoDetalhado.duracaoDias} dias (Gatilho de Reativação)
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#1A1A1A] mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#5C3A22]" />
                    <span>Formatos de Pagamento para Informar à Paciente:</span>
                  </h4>
                  <div className="bg-white p-3 rounded-sm border border-[#D9D6D0] text-[#1A1A1A] leading-relaxed">
                    {procedimentoDetalhado.formatosPagamento}
                  </div>
                </div>

                {procedimentoDetalhado.orientacoes && (
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#5C3A22]" />
                      <span>Roteiro / Argumentário para o Executor:</span>
                    </h4>
                    <div className="bg-emerald-50/60 p-3 rounded-sm border border-emerald-200 text-emerald-950 leading-relaxed">
                      {procedimentoDetalhado.orientacoes}
                    </div>
                  </div>
                )}

                {procedimentoDetalhado.descricao && (
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] mb-1">Descrição Clínica:</h4>
                    <p className="text-[#6E6E6E]">{procedimentoDetalhado.descricao}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-[#D9D6D0] pt-3">
                <button
                  type="button"
                  onClick={() => setModalDetalhesAberto(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#5C3A22] text-white rounded-sm hover:bg-[#4A2E1B] cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE RESULTADO DA REATIVAÇÃO AUTOMÁTICA */}
      <AnimatePresence>
        {modalReativacaoResultado.aberto && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-sm border border-[#D9D6D0] shadow-xl w-full max-w-lg p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#D9D6D0] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">
                      Resultado da Reativação Automática
                    </h3>
                    <p className="text-[11px] text-[#6E6E6E]">
                      Processamento de prazos dos procedimentos
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setModalReativacaoResultado({ aberto: false, totalReativados: 0, detalhes: [] })
                  }
                  className="text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {modalReativacaoResultado.totalReativados > 0 ? (
                  <>
                    <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {modalReativacaoResultado.totalReativados} paciente(s) atingiram o prazo limite e foram
                        transferidos automaticamente para a aba <strong>Reativação</strong>!
                      </span>
                    </div>

                    <div className="border border-[#D9D6D0] rounded-sm max-h-48 overflow-y-auto divide-y divide-[#D9D6D0]">
                      {modalReativacaoResultado.detalhes.map((det, index) => (
                        <div key={index} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-[#1A1A1A]">{det.leadNome}</div>
                            <div className="text-[10px] text-[#6E6E6E]">
                              {det.procedimentoNome} (limite de {det.limiteDias} dias)
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-blue-50 text-blue-800 border border-blue-200">
                            {det.diasPassados} dias passados
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-[#F2EFEA] border border-[#D9D6D0] text-[#1A1A1A] rounded-sm text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                    <div className="font-bold text-sm">Nenhum novo vencimento detectado no momento</div>
                    <div className="text-xs text-[#6E6E6E]">
                      Todos os pacientes em acompanhamento estão dentro dos prazos vigentes de eficácia dos procedimentos.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-[#D9D6D0] pt-3">
                <button
                  type="button"
                  onClick={() =>
                    setModalReativacaoResultado({ aberto: false, totalReativados: 0, detalhes: [] })
                  }
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#5C3A22] text-white rounded-sm hover:bg-[#4A2E1B] cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
