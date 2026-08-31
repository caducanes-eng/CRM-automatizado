import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabaseService, ID_EMPRESA_PADRAO, normalizarUuid } from '../services/supabaseService';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  logRealtimeEvent,
  setRealtimeStatus,
} from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useEmpresa } from './EmpresaContext';
import {
  Lead,
  FichaLead,
  Compra,
  ProcedimentoClinica,
  UsuarioColaborador,
  CriarLeadPayload,
  AtualizarLeadPayload,
  AtualizarFichaPayload,
  CriarCompraPayload,
  CriarProcedimentoPayload,
  AtualizarProcedimentoPayload,
  EstatisticasProcedimento,
  SituacaoLead,
  StatusVenda,
  StatusGrupoNutricao,
  ImportarLeadItem,
  ResultadoImportacao,
  OrigemLead,
} from '../types';
import { SEED_RESPONSAVEIS, SEED_PROCEDIMENTOS } from '../data/seedData';
import { obterOpcoesCadenciaPorSituacao } from '../utils/cadencia';

function generateId(_prefix?: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-4${s4().substr(0, 3)}-${s4()}-${s4()}${s4()}${s4()}`;
}

export function casarProcedimentoComTexto(
  termo: string,
  listaProcedimentos: ProcedimentoClinica[]
): ProcedimentoClinica | undefined {
  if (!termo || !listaProcedimentos || listaProcedimentos.length === 0) return undefined;

  const normalizar = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

  const termoNorm = normalizar(termo);
  if (!termoNorm) return undefined;

  for (const proc of listaProcedimentos) {
    const nomeNorm = normalizar(proc.nome);
    if (termoNorm === nomeNorm) return proc;
  }

  for (const proc of listaProcedimentos) {
    const nomeNorm = normalizar(proc.nome);
    if (termoNorm.includes(nomeNorm) || nomeNorm.includes(termoNorm)) return proc;
  }

  const keywordsMap: Array<{ chaves: string[]; matchNome: string }> = [
    { chaves: ['botox', 'toxina', 'botulinica', 'baby botox'], matchNome: 'toxina' },
    { chaves: ['preenchimento', 'labial', 'labio', 'acido hialuronico', 'kysse', 'preencher'], matchNome: 'preenchimento' },
    { chaves: ['bioestimulador', 'sculptra', 'radiesse', 'elleva', 'colageno'], matchNome: 'bioestimulador' },
    { chaves: ['harmonizacao', 'full face', 'harmonizar'], matchNome: 'harmonizacao' },
    { chaves: ['fios', 'pdo', 'sustentacao', 'lifting'], matchNome: 'fios' },
    { chaves: ['papada', 'deoxicolico', 'lipo enzimatica'], matchNome: 'papada' },
    { chaves: ['limpeza de pele', 'extracao', 'ouro', 'cravos', 'facial profunda'], matchNome: 'limpeza' },
    { chaves: ['peeling', 'manchas', 'renovacao cutanea', 'acido retinoico'], matchNome: 'peeling' },
    { chaves: ['lavieen', 'laser', 'thulium', 'bb laser', 'rejuvenescimento'], matchNome: 'lavieen' },
  ];

  for (const item of keywordsMap) {
    const contem = item.chaves.some((k) => termoNorm.includes(k));
    if (contem) {
      const match = listaProcedimentos.find((p) => normalizar(p.nome).includes(item.matchNome));
      if (match) return match;
    }
  }

  return undefined;
}

interface CrmContextType {
  leads: Lead[];
  fichas: FichaLead[];
  compras: Compra[];
  procedimentos: ProcedimentoClinica[];
  usuarios: UsuarioColaborador[];
  responsaveis: string[];
  isLoading: boolean;
  isFirestoreConnected: boolean;
  isSyncing: boolean;

  // Controle Global da Ficha do Lead / Modais
  leadFichaAbertoId: string | null;
  isFichaLeadOpen: boolean;
  leadSelecionadoModal: Lead | null;
  abrirFichaLead: (leadId: string) => void;
  fecharFichaLead: () => void;
  abrirModalFichaLead: (lead: Lead) => void;
  fecharModalFichaLead: () => void;

  // Getters
  obterLeadPorId: (leadId: string) => Lead | undefined;
  obterFichaPorLead: (leadId: string) => FichaLead | undefined;
  obterComprasPorLead: (leadId: string) => Compra[];
  obterProcedimentoPorId: (id: string) => ProcedimentoClinica | undefined;
  obterProcedimentoPorNomeOuInteresse: (termo: string) => ProcedimentoClinica | undefined;
  obterEtapaAtual: (lead: Lead) => string;

  // Dados Globais e Estatísticas
  todosLeads: Lead[];
  todasCompras: Compra[];
  todosProcedimentos: ProcedimentoClinica[];
  estatisticasProcedimentos: EstatisticasProcedimento[];

  // Operações
  carregarDadosCompletos: () => Promise<void>;
  criarLead: (payload: CriarLeadPayload) => Promise<Lead>;
  adicionarLead: (payload: CriarLeadPayload) => Promise<boolean>;
  atualizarLead: (leadId: string, dados: AtualizarLeadPayload) => Promise<Lead | null>;
  excluirLead: (leadId: string, hardDelete?: boolean) => Promise<boolean>;
  reativarLead: (leadId: string, novaSituacao?: SituacaoLead) => Promise<Lead | null>;
  marcarComoPerdido: (leadId: string, motivo: string, dataPerda?: string) => Promise<Lead | null>;
  definirEtapaPorSituacao: (leadId: string, situacao: SituacaoLead, etapa: string) => Promise<Lead | null>;
  definirEtapaSituacaoAtual: (leadId: string, etapa: string) => Promise<Lead | null>;
  registrarContatoHoje: (leadId: string) => Promise<Lead | null>;
  definirStatusGrupoNutricao: (leadId: string, status: StatusGrupoNutricao) => Promise<Lead | null>;
  atualizarFichaLead: (leadId: string, dados: AtualizarFichaPayload) => Promise<FichaLead | null>;
  salvarFichaExtra: (leadId: string, payload: AtualizarFichaPayload) => Promise<boolean>;
  lancarCompra: (payload: CriarCompraPayload) => Promise<Compra>;
  registrarCompra: (payload: CriarCompraPayload) => Promise<boolean>;
  removerCompra: (compraId: string) => Promise<boolean>;
  criarProcedimento: (payload: CriarProcedimentoPayload) => Promise<ProcedimentoClinica>;
  salvarProcedimento: (payload: CriarProcedimentoPayload) => Promise<boolean>;
  atualizarProcedimento: (id: string, dados: AtualizarProcedimentoPayload) => Promise<ProcedimentoClinica | null>;
  excluirProcedimento: (id: string) => Promise<boolean>;
  verificarEExecutarReativacaoAutomatica: () => Promise<{
    totalReativados: number;
    detalhes: Array<{ leadId: string; leadNome: string; procedimentoNome: string; diasPassados: number; limiteDias: number }>;
  }>;
  adicionarResponsavel: (nome: string) => void;
  removerResponsavel: (nome: string) => void;
  importarLeadsEmLote: (
    leadsParaImportar: ImportarLeadItem[],
    modoDuplicados?: 'criar_todos' | 'ignorar_duplicados' | 'atualizar_duplicados'
  ) => Promise<ResultadoImportacao>;
  importarLeadsEmMassa: (itens: ImportarLeadItem[]) => Promise<ResultadoImportacao>;
  resetarDadosExemplo: () => Promise<void>;
  limparTodosLeads: () => Promise<{ totalRemovidos: number }>;
}

const CrmContext = createContext<CrmContextType>({} as CrmContextType);

export const CrmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, usuarios } = useAuth();
  const { config, empresaAtivaId } = useEmpresa();

  const empresaIdEfetiva = normalizarUuid(empresaAtivaId || ID_EMPRESA_PADRAO);

  // Estados principais brutos (todas as clínicas carregadas na memória)
  const [todosLeadsRaw, setTodosLeadsRaw] = useState<Lead[]>([]);
  const [todasFichasRaw, setTodasFichasRaw] = useState<FichaLead[]>([]);
  const [todasComprasRaw, setTodasComprasRaw] = useState<Compra[]>([]);
  const [todosProcedimentosRaw, setTodosProcedimentosRaw] = useState<ProcedimentoClinica[]>([]);
  const [usuariosState, setUsuariosState] = useState<UsuarioColaborador[]>([]);
  const [responsaveisCustom, setResponsaveisCustom] = useState<string[]>(SEED_RESPONSAVEIS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Connection flags
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Verificador estrito e seguro de pertencimento à clínica ativa
  const pertenceAEmpresaAtiva = useCallback(
    (itemEmpresaId?: string | null) => {
      const ativaNorm = normalizarUuid(empresaIdEfetiva);
      const itemNorm = itemEmpresaId ? normalizarUuid(itemEmpresaId) : normalizarUuid(ID_EMPRESA_PADRAO);
      return itemNorm === ativaNorm;
    },
    [empresaIdEfetiva]
  );

  // Dados isolados e filtrados exclusivamente para a clínica ativa
  const leads = useMemo(
    () =>
      todosLeadsRaw.filter(
        (l) => !l.deleted_at && pertenceAEmpresaAtiva(l.empresaId || (l as any).empresa_id)
      ),
    [todosLeadsRaw, pertenceAEmpresaAtiva]
  );

  const fichas = useMemo(
    () =>
      todasFichasRaw.filter(
        (f) => !f.deleted_at && pertenceAEmpresaAtiva(f.empresaId || (f as any).empresa_id)
      ),
    [todasFichasRaw, pertenceAEmpresaAtiva]
  );

  const compras = useMemo(
    () =>
      todasComprasRaw.filter(
        (c) => !c.deleted_at && pertenceAEmpresaAtiva(c.empresaId || (c as any).empresa_id)
      ),
    [todasComprasRaw, pertenceAEmpresaAtiva]
  );

  const procedimentos = useMemo(
    () =>
      todosProcedimentosRaw.filter(
        (p) => !p.deleted_at && pertenceAEmpresaAtiva(p.empresaId || (p as any).empresa_id)
      ),
    [todosProcedimentosRaw, pertenceAEmpresaAtiva]
  );

  // Colaboradores da clínica ativa
  const colaboradoresClinicaAtiva = useMemo(() => {
    const list = usuariosState.length > 0 ? usuariosState : (usuarios || []);
    return list.filter((u) => {
      if (u.deleted_at || u.ativo === false) return false;
      const empId = u.empresaId || (u as any).empresa_id;
      return pertenceAEmpresaAtiva(empId);
    });
  }, [usuariosState, usuarios, pertenceAEmpresaAtiva]);

  // Lista de responsáveis exclusivos da clínica ativa
  const responsaveis = useMemo(() => {
    if (colaboradoresClinicaAtiva.length > 0) {
      return colaboradoresClinicaAtiva.map((u) => u.nome);
    }
    if (empresaIdEfetiva === ID_EMPRESA_PADRAO) {
      return responsaveisCustom;
    }
    return ['Gestão Geral'];
  }, [colaboradoresClinicaAtiva, empresaIdEfetiva, responsaveisCustom]);

  // Ficha Lead Modal Controls
  const [leadFichaAbertoId, setLeadFichaAbertoId] = useState<string | null>(null);
  const [isFichaLeadOpen, setIsFichaLeadOpen] = useState<boolean>(false);
  const [leadSelecionadoModal, setLeadSelecionadoModal] = useState<Lead | null>(null);

  const abrirFichaLead = useCallback((leadId: string) => {
    setLeadFichaAbertoId(leadId);
    setIsFichaLeadOpen(true);
    const target = leads.find((l) => l.id === leadId) || todosLeadsRaw.find((l) => l.id === leadId);
    if (target) setLeadSelecionadoModal(target);
  }, [leads, todosLeadsRaw]);

  const fecharFichaLead = useCallback(() => {
    setIsFichaLeadOpen(false);
    setLeadFichaAbertoId(null);
    setLeadSelecionadoModal(null);
  }, []);

  const abrirModalFichaLead = useCallback((lead: Lead) => {
    setLeadSelecionadoModal(lead);
    setLeadFichaAbertoId(lead.id);
    setIsFichaLeadOpen(true);
  }, []);

  const fecharModalFichaLead = useCallback(() => {
    fecharFichaLead();
  }, [fecharFichaLead]);

  // Carregamento inicial e sinc de dados pelo Supabase e Firestore
  const carregarDadosCompletos = useCallback(async () => {
    try {
      setIsLoading(true);
      const dados = await supabaseService.carregarDadosCompletos();
      if (dados) {
        setTodosLeadsRaw(dados.leads || []);
        setTodasFichasRaw(dados.fichas || []);
        setTodasComprasRaw(dados.compras || []);
        setTodosProcedimentosRaw(dados.procedimentos || []);
        setUsuariosState(dados.usuarios || []);
        if (dados.usuarios && dados.usuarios.length > 0) {
          const nomes = dados.usuarios.filter((u) => !u.deleted_at && u.ativo !== false).map((u) => u.nome);
          if (nomes.length > 0) setResponsaveisCustom(nomes);
        }
        setRealtimeStatus('CONECTADO');
      } else {
        setRealtimeStatus('ERRO');
      }
    } catch (error: any) {
      setRealtimeStatus('ERRO');
      console.warn('Aviso ao carregar dados do Supabase:', error?.message || error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarrega dados ao autenticar, alterar configuração ou focar na janela
  useEffect(() => {
    carregarDadosCompletos();

    const handleConfigChange = () => {
      console.log('🔄 Evento supabase-config-changed recebido. Recarregando dados...');
      carregarDadosCompletos();
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Janela reativada. Sincronizando dados em tempo real...');
        carregarDadosCompletos();
      }
    };

    window.addEventListener('supabase-config-changed', handleConfigChange);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('supabase-config-changed', handleConfigChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user, carregarDadosCompletos]);

  // Supabase Realtime WebSocket Listener com suporte a re-inicialização dinâmica
  useEffect(() => {
    let activeChannel: any = null;

    const iniciarRealtime = () => {
      if (activeChannel) {
        try {
          activeChannel.unsubscribe();
        } catch (e) {}
        activeChannel = null;
      }

      if (!isSupabaseConfigured()) {
        setRealtimeStatus('DESCONECTADO');
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        setRealtimeStatus('DESCONECTADO');
        return;
      }

      setRealtimeStatus('CONECTANDO');
      logRealtimeEvent('SISTEMA', 'SYSTEM', 'Iniciando escuta Realtime no Supabase');

      activeChannel = client
        .channel('crm_realtime_data_channel_' + Date.now())
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'leads' },
          (payload) => {
            logRealtimeEvent('leads', payload.eventType as any, 'Alteração em tempo real na tabela de leads');
            const newRow = payload.new as Record<string, any> | undefined;
            const oldRow = payload.old as Record<string, any> | undefined;
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (newRow && !newRow.deleted_at) {
                carregarDadosCompletos();
              } else if (newRow && newRow.deleted_at) {
                setTodosLeadsRaw((prev) => prev.filter((l) => l.id !== newRow.id));
              }
            } else if (payload.eventType === 'DELETE' && oldRow?.id) {
              setTodosLeadsRaw((prev) => prev.filter((l) => l.id !== oldRow.id));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fichas_leads' },
          () => {
            logRealtimeEvent('fichas_leads', 'UPDATE', 'Ficha atualizada em tempo real');
            carregarDadosCompletos();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fichas_lead' },
          () => {
            logRealtimeEvent('fichas_lead', 'UPDATE', 'Ficha atualizada em tempo real');
            carregarDadosCompletos();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'compras' },
          () => {
            logRealtimeEvent('compras', 'UPDATE', 'Compra atualizada em tempo real');
            carregarDadosCompletos();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'procedimentos' },
          () => {
            logRealtimeEvent('procedimentos', 'UPDATE', 'Procedimento atualizado em tempo real');
            carregarDadosCompletos();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'usuarios' },
          () => {
            logRealtimeEvent('usuarios', 'UPDATE', 'Usuário/colaborador alterado em tempo real');
            carregarDadosCompletos();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'empresas' },
          () => {
            logRealtimeEvent('empresas', 'UPDATE', 'Dados da empresa alterados em tempo real');
            carregarDadosCompletos();
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('CONECTADO');
            logRealtimeEvent('SISTEMA', 'SYSTEM', 'Conectado com sucesso ao canal de Realtime!');
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setRealtimeStatus('ERRO');
          }
        });
    };

    iniciarRealtime();

    const handleConfigOrFocus = () => {
      iniciarRealtime();
    };

    window.addEventListener('supabase-config-changed', handleConfigOrFocus);
    window.addEventListener('focus', handleConfigOrFocus);

    return () => {
      window.removeEventListener('supabase-config-changed', handleConfigOrFocus);
      window.removeEventListener('focus', handleConfigOrFocus);
      if (activeChannel) {
        try {
          activeChannel.unsubscribe();
        } catch (e) {}
      }
    };
  }, [carregarDadosCompletos]);

  // Sincroniza responsáveis se usuarios context mudar
  useEffect(() => {
    if (usuarios && usuarios.length > 0) {
      const nomes = usuarios.filter((u) => !u.deleted_at && u.ativo !== false).map((u) => u.nome);
      if (nomes.length > 0) {
        setResponsaveisCustom(nomes);
      }
    }
  }, [usuarios]);

  // Getters
  const obterLeadPorId = useCallback((leadId: string) => leads.find((l) => l.id === leadId), [leads]);
  const obterFichaPorLead = useCallback((leadId: string) => fichas.find((f) => f.leadId === leadId), [fichas]);
  const obterComprasPorLead = useCallback((leadId: string) => compras.filter((c) => c.leadId === leadId), [compras]);
  const obterProcedimentoPorId = useCallback((id: string) => procedimentos.find((p) => p.id === id), [procedimentos]);
  const obterProcedimentoPorNomeOuInteresse = useCallback(
    (termo: string) => casarProcedimentoComTexto(termo, procedimentos),
    [procedimentos]
  );
  const obterEtapaAtual = useCallback(
    (lead: Lead) => lead.etapaPorSituacao?.[lead.situacao] || '',
    []
  );

  // Operações Lead
  const criarLead = useCallback(
    async (payload: CriarLeadPayload): Promise<Lead> => {
      const timestamp = new Date().toISOString();
      const hoje = timestamp.split('T')[0];
      const leadId = (payload as any).id ? normalizarUuid((payload as any).id) : generateId('lead');
      const eId = normalizarUuid((payload as any).empresaId || (payload as any).empresa_id || empresaIdEfetiva);
      const situacao: SituacaoLead = payload.situacao || 'Em captação';

      const statusGrupoNutricao: StatusGrupoNutricao | undefined =
        situacao === 'Nutrição'
          ? payload.statusGrupoNutricao || 'Ativo'
          : payload.statusGrupoNutricao;

      const etapaPorSituacao = payload.etapaInicial
        ? { [situacao]: payload.etapaInicial }
        : {};

      const novoLead: Lead = {
        id: leadId,
        empresaId: eId,
        empresa_id: eId,
        nome: payload.nome.trim(),
        situacao: situacao,
        etapaPorSituacao: etapaPorSituacao,
        interesse: payload.interesse?.trim() || '',
        possivelValor: Number(payload.possivelValor) || 0,
        statusVenda: payload.statusVenda || 'Em processo',
        dataEntrada: payload.dataEntrada || hoje,
        dataEntradaSituacao: { [situacao]: payload.dataEntrada || hoje },
        dataUltimoContato: payload.dataUltimoContato || (payload.etapaPorSituacao ? hoje : undefined),
        dataUltimoContatoPorSituacao: payload.dataUltimoContatoPorSituacao || (payload.etapaPorSituacao ? { [situacao]: hoje } : {}),
        dataUltimaAcao: timestamp,
        responsavel: payload.responsavel || responsaveis[0] || 'Secretária 1',
        dataAgendamento: payload.dataAgendamento,
        horarioAgendamento: payload.horarioAgendamento,
        profissionalAgendamento: payload.profissionalAgendamento,
        tipoConsulta: payload.tipoConsulta,
        unidadeAgendamento: payload.unidadeAgendamento,
        observacoesAgendamento: payload.observacoesAgendamento,
        statusConfirmacaoAgendamento: payload.statusConfirmacaoAgendamento || 'Agendada',
        statusGrupoNutricao: statusGrupoNutricao,
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
      };

      const novaFicha: FichaLead = {
        id: generateId('ficha'),
        leadId: leadId,
        empresaId: eId,
        empresa_id: eId,
        telefone: payload.ficha?.telefone || '',
        origemLead: (payload.ficha?.origemLead as OrigemLead) || 'WhatsApp',
        dataNascimento: payload.ficha?.dataNascimento || '',
        endereco: payload.ficha?.endereco || '',
        observacoes: payload.ficha?.observacoes || '',
        motivoPerda: payload.ficha?.motivoPerda || '',
        dataPerda: payload.ficha?.dataPerda || '',
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
      };

      // Atualização otimista
      setTodosLeadsRaw((prev) => [novoLead, ...prev]);
      setTodasFichasRaw((prev) => [novaFicha, ...prev]);

      try {
        await supabaseService.salvarLead(novoLead, eId);
        await supabaseService.salvarFicha(novaFicha, eId);
      } catch (err) {
        console.error('Erro ao salvar lead no Supabase:', err);
      }

      return novoLead;
    },
    [empresaIdEfetiva, responsaveis]
  );

  const adicionarLead = useCallback(
    async (payload: CriarLeadPayload): Promise<boolean> => {
      try {
        await criarLead(payload);
        return true;
      } catch (e) {
        return false;
      }
    },
    [criarLead]
  );

  const atualizarLead = useCallback(
    async (leadId: string, dados: AtualizarLeadPayload): Promise<Lead | null> => {
      let leadAtualizado: Lead | null = null;
      let fichaAtualizada: FichaLead | null = null;
      const timestamp = new Date().toISOString();
      const hoje = timestamp.split('T')[0];

      setTodosLeadsRaw((prev) =>
        prev.map((lead) => {
          if (lead.id !== leadId) return lead;

          const enteringNutricao = dados.situacao === 'Nutrição' && lead.situacao !== 'Nutrição';
          const statusGrupoNutricao =
            dados.statusGrupoNutricao !== undefined
              ? dados.statusGrupoNutricao
              : enteringNutricao && !lead.statusGrupoNutricao
              ? 'Ativo'
              : lead.statusGrupoNutricao;

          const etapaPorSituacao = {
            ...lead.etapaPorSituacao,
            ...(dados.etapaPorSituacao || {}),
          };

          const markingPerdido = dados.statusVenda === 'Perdido' && lead.statusVenda !== 'Perdido';
          const situacaoPerda =
            dados.situacaoPerda !== undefined
              ? dados.situacaoPerda
              : markingPerdido
              ? lead.situacao
              : lead.situacaoPerda;

          const dataPerda =
            dados.dataPerda !== undefined
              ? dados.dataPerda
              : markingPerdido && !lead.dataPerda
              ? hoje
              : lead.dataPerda;

          const motivoPerda = dados.motivoPerda !== undefined ? dados.motivoPerda : lead.motivoPerda;

          // Rastreamento de entrada na situação atual
          const changingSituation = Boolean(dados.situacao && dados.situacao !== lead.situacao);
          const dataEntradaSituacao = {
            ...(lead.dataEntradaSituacao || {}),
            ...(changingSituation ? { [dados.situacao!]: hoje } : {}),
            ...(dados.dataEntradaSituacao || {}),
          };

          // Rastreamento de data do último contato / ação
          const stepChanged = Boolean(dados.etapaPorSituacao);
          const dataUltimoContato =
            dados.dataUltimoContato !== undefined
              ? dados.dataUltimoContato
              : stepChanged
              ? hoje
              : lead.dataUltimoContato;

          const currentSituacao = dados.situacao || lead.situacao;
          const dataUltimoContatoPorSituacao = {
            ...(lead.dataUltimoContatoPorSituacao || {}),
            ...(stepChanged || dados.dataUltimoContato ? { [currentSituacao]: hoje } : {}),
            ...(dados.dataUltimoContatoPorSituacao || {}),
          };

          const dataUltimaAcao = dados.dataUltimaAcao || timestamp;

          const eId = normalizarUuid(lead.empresaId || (lead as any).empresa_id || empresaIdEfetiva);
          leadAtualizado = {
            ...lead,
            ...dados,
            empresaId: eId,
            empresa_id: eId,
            etapaPorSituacao,
            statusGrupoNutricao,
            situacaoPerda,
            dataPerda,
            motivoPerda,
            dataEntradaSituacao,
            dataUltimoContato,
            dataUltimoContatoPorSituacao,
            dataUltimaAcao,
            nome: dados.nome !== undefined ? dados.nome.trim() : lead.nome,
            interesse: dados.interesse !== undefined ? dados.interesse.trim() : lead.interesse,
            possivelValor: dados.possivelValor !== undefined ? Number(dados.possivelValor) || 0 : lead.possivelValor,
            updated_at: timestamp,
            version: (lead.version || 1) + 1,
          };
          return leadAtualizado;
        })
      );

      if (dados.motivoPerda !== undefined || dados.dataPerda !== undefined || dados.statusVenda === 'Perdido') {
        setTodasFichasRaw((prev) =>
          prev.map((f) => {
            if (f.leadId !== leadId) return f;
            const fEid = normalizarUuid(f.empresaId || (f as any).empresa_id || empresaIdEfetiva);
            fichaAtualizada = {
              ...f,
              empresaId: fEid,
              empresa_id: fEid,
              motivoPerda: dados.motivoPerda !== undefined ? dados.motivoPerda : f.motivoPerda,
              dataPerda: dados.dataPerda !== undefined ? dados.dataPerda : f.dataPerda || hoje,
              updated_at: timestamp,
              version: (f.version || 1) + 1,
            };
            return fichaAtualizada;
          })
        );
      }

      if (leadAtualizado) {
        try {
          const leadEid = normalizarUuid((leadAtualizado as Lead).empresaId || empresaIdEfetiva);
          await supabaseService.salvarLead(leadAtualizado, leadEid);
          if (fichaAtualizada) {
            await supabaseService.salvarFicha(fichaAtualizada, leadEid);
          }
        } catch (e) {
          console.error('Erro ao atualizar lead no Supabase:', e);
        }
      }

      return leadAtualizado;
    },
    [empresaIdEfetiva]
  );

  const reativarLead = useCallback(
    async (leadId: string, novaSituacao: SituacaoLead = 'Reativação'): Promise<Lead | null> => {
      return atualizarLead(leadId, {
        statusVenda: 'Em processo',
        situacao: novaSituacao,
      });
    },
    [atualizarLead]
  );

  const marcarComoPerdido = useCallback(
    async (leadId: string, motivo: string, dataPerda?: string): Promise<Lead | null> => {
      const hoje = new Date().toISOString().split('T')[0];
      return atualizarLead(leadId, {
        statusVenda: 'Perdido',
        motivoPerda: motivo,
        dataPerda: dataPerda || hoje,
      });
    },
    [atualizarLead]
  );

  const excluirLead = useCallback(
    async (leadId: string, hardDelete = false): Promise<boolean> => {
      setTodosLeadsRaw((prev) => prev.filter((l) => l.id !== leadId));
      setTodasFichasRaw((prev) => prev.filter((f) => f.leadId !== leadId));
      setTodasComprasRaw((prev) => prev.filter((c) => c.leadId !== leadId));

      try {
        await supabaseService.softDeleteLead(leadId);
        return true;
      } catch (e) {
        console.error('Erro ao excluir lead no Supabase:', e);
        return false;
      }
    },
    []
  );

  const definirEtapaPorSituacao = useCallback(
    async (leadId: string, situacao: SituacaoLead, etapa: string): Promise<Lead | null> => {
      const target = leads.find((l) => l.id === leadId);
      const mapaAtualizado = { ...(target?.etapaPorSituacao || {}), [situacao]: etapa };
      const hoje = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();

      // Se a etapa concluída em Nutrição for a última da cadência oficial (ou Todas as etapas concluídas),
      // transicionar automaticamente o lead da situação 'Nutrição' para 'Reativação'
      if (situacao === 'Nutrição') {
        const opcoesNutricao = obterOpcoesCadenciaPorSituacao('Nutrição');
        const ultimoContatoNutricao = opcoesNutricao.length > 0 ? opcoesNutricao[opcoesNutricao.length - 1] : null;

        const isUltimoOuConcluido =
          etapa === 'Todas as etapas concluídas' ||
          (ultimoContatoNutricao && etapa === ultimoContatoNutricao);

        if (isUltimoOuConcluido) {
          return atualizarLead(leadId, {
            situacao: 'Reativação',
            etapaPorSituacao: mapaAtualizado,
            dataUltimoContato: hoje,
            dataUltimoContatoPorSituacao: {
              ...(target?.dataUltimoContatoPorSituacao || {}),
              [situacao]: hoje,
              Reativação: hoje,
            },
            dataUltimaAcao: timestamp,
          });
        }
      }

      return atualizarLead(leadId, {
        etapaPorSituacao: mapaAtualizado,
        dataUltimoContato: hoje,
        dataUltimoContatoPorSituacao: {
          ...(target?.dataUltimoContatoPorSituacao || {}),
          [situacao]: hoje,
        },
        dataUltimaAcao: timestamp,
      });
    },
    [leads, atualizarLead]
  );

  const definirEtapaSituacaoAtual = useCallback(
    async (leadId: string, etapa: string): Promise<Lead | null> => {
      const target = leads.find((l) => l.id === leadId);
      if (!target) return null;
      return definirEtapaPorSituacao(leadId, target.situacao, etapa);
    },
    [leads, definirEtapaPorSituacao]
  );

  const registrarContatoHoje = useCallback(
    async (leadId: string): Promise<Lead | null> => {
      const target = leads.find((l) => l.id === leadId);
      if (!target) return null;
      const hoje = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();
      return atualizarLead(leadId, {
        dataUltimoContato: hoje,
        dataUltimoContatoPorSituacao: {
          ...(target.dataUltimoContatoPorSituacao || {}),
          [target.situacao]: hoje,
        },
        dataUltimaAcao: timestamp,
      });
    },
    [leads, atualizarLead]
  );

  const definirStatusGrupoNutricao = useCallback(
    async (leadId: string, status: StatusGrupoNutricao): Promise<Lead | null> => {
      return atualizarLead(leadId, {
        statusGrupoNutricao: status,
      });
    },
    [atualizarLead]
  );

  const atualizarFichaLead = useCallback(
    async (leadId: string, dados: AtualizarFichaPayload): Promise<FichaLead | null> => {
      const timestamp = new Date().toISOString();
      const fichaExistente = fichas.find((f) => f.leadId === leadId) || todasFichasRaw.find((f) => f.leadId === leadId);
      const eId = normalizarUuid(fichaExistente?.empresaId || (fichaExistente as any)?.empresa_id || empresaIdEfetiva);

      let fichaAtualizada: FichaLead;
      if (fichaExistente) {
        fichaAtualizada = {
          ...fichaExistente,
          ...dados,
          empresaId: eId,
          empresa_id: eId,
          updated_at: timestamp,
          version: (fichaExistente.version || 1) + 1,
        };
      } else {
        fichaAtualizada = {
          id: generateId('ficha'),
          empresaId: eId,
          empresa_id: eId,
          leadId,
          telefone: dados.telefone || '',
          origemLead: dados.origemLead || 'WhatsApp',
          dataNascimento: dados.dataNascimento || '',
          endereco: dados.endereco || '',
          observacoes: dados.observacoes || '',
          motivoPerda: dados.motivoPerda || '',
          dataPerda: dados.dataPerda || '',
          created_at: timestamp,
          updated_at: timestamp,
          version: 1,
        };
      }

      setTodasFichasRaw((prev) => {
        const existe = prev.some((f) => f.leadId === leadId);
        if (existe) {
          return prev.map((f) => (f.leadId === leadId ? fichaAtualizada : f));
        }
        return [...prev, fichaAtualizada];
      });

      try {
        await supabaseService.salvarFicha(fichaAtualizada, eId);
      } catch (e) {
        console.error('Erro ao salvar ficha no Supabase:', e);
      }

      return fichaAtualizada;
    },
    [fichas, todasFichasRaw, empresaIdEfetiva]
  );

  const salvarFichaExtra = useCallback(
    async (leadId: string, payload: AtualizarFichaPayload): Promise<boolean> => {
      const result = await atualizarFichaLead(leadId, payload);
      return !!result;
    },
    [atualizarFichaLead]
  );

  // Operações Compra
  const lancarCompra = useCallback(
    async (payload: CriarCompraPayload): Promise<Compra> => {
      const timestamp = new Date().toISOString();
      const hoje = timestamp.split('T')[0];
      const leadAssociado = todosLeadsRaw.find((l) => l.id === payload.leadId);
      const eId = normalizarUuid((payload as any).empresaId || leadAssociado?.empresaId || empresaIdEfetiva);

      const novaCompra: Compra = {
        id: generateId('compra'),
        empresaId: eId,
        empresa_id: eId,
        leadId: payload.leadId,
        data: payload.data || hoje,
        procedimento: payload.procedimento.trim(),
        valor: Number(payload.valor) || 0,
        formaPagamento: 'Pix / Cartão',
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
      };

      setTodasComprasRaw((prev) => [novaCompra, ...prev]);

      // Ao lançar compra, muda o statusVenda do lead para 'Venda feita'
      await atualizarLead(payload.leadId, { statusVenda: 'Venda feita' });

      try {
        await supabaseService.salvarCompra(novaCompra, eId);
      } catch (e) {
        console.error('Erro ao salvar compra no Supabase:', e);
      }

      return novaCompra;
    },
    [empresaIdEfetiva, todosLeadsRaw, atualizarLead]
  );

  const registrarCompra = useCallback(
    async (payload: CriarCompraPayload): Promise<boolean> => {
      try {
        await lancarCompra(payload);
        return true;
      } catch (e) {
        return false;
      }
    },
    [lancarCompra]
  );

  const removerCompra = useCallback(
    async (compraId: string): Promise<boolean> => {
      setTodasComprasRaw((prev) => prev.filter((c) => c.id !== compraId));
      try {
        await supabaseService.softDeleteCompra(compraId);
        return true;
      } catch (e) {
        console.error('Erro ao remover compra no Supabase:', e);
        return false;
      }
    },
    []
  );

  // Operações Procedimentos
  const criarProcedimento = useCallback(
    async (payload: CriarProcedimentoPayload): Promise<ProcedimentoClinica> => {
      const timestamp = new Date().toISOString();
      const eId = normalizarUuid((payload as any).empresaId || empresaIdEfetiva);
      const novoProc: ProcedimentoClinica = {
        id: generateId('proc'),
        empresaId: eId,
        empresa_id: eId,
        nome: payload.nome.trim(),
        categoria: payload.categoria?.trim() || 'Injetáveis',
        valor: Number(payload.valor) || 0,
        formatosPagamento: payload.formatosPagamento.trim(),
        duracaoDias: Number(payload.duracaoDias) || 180,
        descricao: payload.descricao?.trim() || '',
        orientacoes: payload.orientacoes?.trim() || '',
        ativo: payload.ativo !== false,
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
      };

      setTodosProcedimentosRaw((prev) => [...prev, novoProc]);

      try {
        await supabaseService.salvarProcedimento(novoProc, eId);
      } catch (e) {
        console.error('Erro ao criar procedimento no Supabase:', e);
      }

      return novoProc;
    },
    [empresaIdEfetiva]
  );

  const salvarProcedimento = useCallback(
    async (payload: CriarProcedimentoPayload): Promise<boolean> => {
      try {
        await criarProcedimento(payload);
        return true;
      } catch (e) {
        return false;
      }
    },
    [criarProcedimento]
  );

  const atualizarProcedimento = useCallback(
    async (id: string, dados: AtualizarProcedimentoPayload): Promise<ProcedimentoClinica | null> => {
      let procAtualizado: ProcedimentoClinica | null = null;
      const timestamp = new Date().toISOString();

      setTodosProcedimentosRaw((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const eId = normalizarUuid(p.empresaId || (p as any).empresa_id || empresaIdEfetiva);
          procAtualizado = {
            ...p,
            ...dados,
            empresaId: eId,
            empresa_id: eId,
            nome: dados.nome !== undefined ? dados.nome.trim() : p.nome,
            categoria: dados.categoria !== undefined ? dados.categoria.trim() : p.categoria,
            valor: dados.valor !== undefined ? Number(dados.valor) || 0 : p.valor,
            duracaoDias: dados.duracaoDias !== undefined ? Number(dados.duracaoDias) || p.duracaoDias : p.duracaoDias,
            updated_at: timestamp,
            version: (p.version || 1) + 1,
          };
          return procAtualizado;
        })
      );

      if (procAtualizado) {
        try {
          const procEid = normalizarUuid((procAtualizado as ProcedimentoClinica).empresaId || empresaIdEfetiva);
          await supabaseService.salvarProcedimento(procAtualizado, procEid);
        } catch (e) {
          console.error('Erro ao atualizar procedimento no Supabase:', e);
        }
      }

      return procAtualizado;
    },
    [empresaIdEfetiva]
  );

  const excluirProcedimento = useCallback(
    async (id: string): Promise<boolean> => {
      setTodosProcedimentosRaw((prev) => prev.filter((p) => p.id !== id));
      try {
        await supabaseService.softDeleteProcedimento(id);
        return true;
      } catch (e) {
        console.error('Erro ao excluir procedimento no Supabase:', e);
        return false;
      }
    },
    []
  );

  // Inteligência de Reativação Automática
  const verificarEExecutarReativacaoAutomatica = useCallback(async () => {
    const hoje = new Date();
    let totalReativados = 0;
    const detalhes: Array<{ leadId: string; leadNome: string; procedimentoNome: string; diasPassados: number; limiteDias: number }> = [];

    const leadsPosProc = leads.filter((l) => l.situacao === 'Pós procedimento' && !l.deleted_at);

    for (const lead of leadsPosProc) {
      const comprasLead = compras.filter((c) => c.leadId === lead.id && !c.deleted_at);
      if (comprasLead.length === 0) continue;

      const ultimaCompra = [...comprasLead].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
      const procRelacionado = casarProcedimentoComTexto(ultimaCompra.procedimento || lead.interesse, procedimentos);

      const duracaoLimite = procRelacionado?.duracaoDias || 180;
      const dataCompra = new Date(ultimaCompra.data);
      const diffTime = Math.abs(hoje.getTime() - dataCompra.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= duracaoLimite) {
        await reativarLead(lead.id, 'Reativação');
        totalReativados++;
        detalhes.push({
          leadId: lead.id,
          leadNome: lead.nome,
          procedimentoNome: ultimaCompra.procedimento,
          diasPassados: diffDays,
          limiteDias: duracaoLimite,
        });
      }
    }

    return { totalReativados, detalhes };
  }, [leads, compras, procedimentos, reativarLead]);

  // Gestão de Responsáveis
  const adicionarResponsavel = useCallback((nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    setResponsaveisCustom((prev) => (prev.includes(limpo) ? prev : [...prev, limpo]));
  }, []);

  const removerResponsavel = useCallback((nome: string) => {
    setResponsaveisCustom((prev) => prev.filter((r) => r !== nome));
  }, []);

  // Importação em Lote
  const importarLeadsEmLote = useCallback(
    async (
      leadsParaImportar: ImportarLeadItem[],
      _modoDuplicados?: 'criar_todos' | 'ignorar_duplicados' | 'atualizar_duplicados'
    ): Promise<ResultadoImportacao> => {
      let criados = 0;
      let erros = 0;
      const errosDetalhes: string[] = [];

      for (const item of leadsParaImportar) {
        try {
          await criarLead({
            empresaId: empresaIdEfetiva,
            nome: item.nome,
            situacao: item.situacao || 'Em captação',
            etapaInicial: item.etapaInicial,
            interesse: item.interesse,
            possivelValor: item.possivelValor,
            statusVenda: item.statusVenda || 'Em processo',
            dataEntrada: item.dataEntrada,
            responsavel: item.responsavel,
            ficha: {
              telefone: item.telefone,
              origemLead: (item.origemLead as OrigemLead) || 'WhatsApp',
              observacoes: item.observacoes,
              dataNascimento: item.dataNascimento,
              endereco: item.endereco,
            },
          });
          criados++;
        } catch (e: any) {
          erros++;
          errosDetalhes.push(`Erro ao importar ${item.nome}: ${e?.message || 'Falha ao salvar'}`);
        }
      }

      return {
        totalCriados: criados,
        totalAtualizados: 0,
        totalIgnorados: 0,
        totalErros: erros,
        errosDetalhes,
      };
    },
    [criarLead, empresaIdEfetiva]
  );

  const importarLeadsEmMassa = useCallback(
    async (itens: ImportarLeadItem[]) => {
      return importarLeadsEmLote(itens, 'criar_todos');
    },
    [importarLeadsEmLote]
  );

  const resetarDadosExemplo = useCallback(async () => {
    await carregarDadosCompletos();
  }, [carregarDadosCompletos]);

  const limparTodosLeads = useCallback(async () => {
    const count = leads.length;
    for (const lead of leads) {
      await excluirLead(lead.id, true);
    }
    return { totalRemovidos: count };
  }, [leads, excluirLead]);

  // Cálculo das estatísticas de procedimentos
  const estatisticasProcedimentos = useMemo<EstatisticasProcedimento[]>(() => {
    const hoje = new Date();

    return procedimentos.map((proc) => {
      const leadsProc = leads.filter((l) => {
        if (l.deleted_at) return false;
        const match = casarProcedimentoComTexto(l.interesse, [proc]);
        return !!match || l.interesse.toLowerCase().includes(proc.nome.toLowerCase());
      });

      const comprasProc = compras.filter((c) => {
        if (c.deleted_at) return false;
        const match = casarProcedimentoComTexto(c.procedimento, [proc]);
        return !!match || c.procedimento.toLowerCase().includes(proc.nome.toLowerCase());
      });

      const totalProcura = leadsProc.length;
      const totalConvertidos = comprasProc.length;
      const faturamentoTotal = comprasProc.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
      const taxaConversao = totalProcura > 0 ? Math.min(100, Math.round((totalConvertidos / totalProcura) * 100)) : 0;
      const ticketMedio = totalConvertidos > 0 ? faturamentoTotal / totalConvertidos : proc.valor;

      const pacientesPosProcedimento = leads.filter(
        (l) => l.situacao === 'Pós procedimento' && !l.deleted_at && casarProcedimentoComTexto(l.interesse, [proc])
      ).length;

      let pacientesPrestesAVencer = 0;
      comprasProc.forEach((c) => {
        const dCompra = new Date(c.data);
        const diffDays = Math.ceil(Math.abs(hoje.getTime() - dCompra.getTime()) / (1000 * 60 * 60 * 24));
        const diasRestantes = proc.duracaoDias - diffDays;
        if (diasRestantes > 0 && diasRestantes <= 15) {
          pacientesPrestesAVencer++;
        }
      });

      const pacientesReativadosPrazo = leads.filter(
        (l) => l.situacao === 'Reativação' && !l.deleted_at && casarProcedimentoComTexto(l.interesse, [proc])
      ).length;

      return {
        id: proc.id,
        nome: proc.nome,
        categoria: proc.categoria,
        valor: proc.valor,
        formatosPagamento: proc.formatosPagamento,
        duracaoDias: proc.duracaoDias,
        totalProcura,
        totalConvertidos,
        taxaConversao,
        faturamentoTotal,
        ticketMedio,
        pacientesPosProcedimento,
        pacientesPrestesAVencer,
        pacientesReativadosPrazo,
        ativo: proc.ativo,
      };
    });
  }, [procedimentos, leads, compras]);

  return (
    <CrmContext.Provider
      value={{
        leads,
        fichas,
        compras,
        procedimentos,
        usuarios: usuariosState,
        responsaveis,
        isLoading,
        isFirestoreConnected,
        isSyncing,

        leadFichaAbertoId,
        isFichaLeadOpen,
        leadSelecionadoModal,
        abrirFichaLead,
        fecharFichaLead,
        abrirModalFichaLead,
        fecharModalFichaLead,

        obterLeadPorId,
        obterFichaPorLead,
        obterComprasPorLead,
        obterProcedimentoPorId,
        obterProcedimentoPorNomeOuInteresse,
        obterEtapaAtual,

        todosLeads: todosLeadsRaw,
        todasCompras: todasComprasRaw,
        todosProcedimentos: todosProcedimentosRaw,
        estatisticasProcedimentos,

        carregarDadosCompletos,
        criarLead,
        adicionarLead,
        atualizarLead,
        excluirLead,
        reativarLead,
        marcarComoPerdido,
        definirEtapaPorSituacao,
        definirEtapaSituacaoAtual,
        registrarContatoHoje,
        definirStatusGrupoNutricao,
        atualizarFichaLead,
        salvarFichaExtra,
        lancarCompra,
        registrarCompra,
        removerCompra,
        criarProcedimento,
        salvarProcedimento,
        atualizarProcedimento,
        excluirProcedimento,
        verificarEExecutarReativacaoAutomatica,
        adicionarResponsavel,
        removerResponsavel,
        importarLeadsEmLote,
        importarLeadsEmMassa,
        resetarDadosExemplo,
        limparTodosLeads,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => useContext(CrmContext);
