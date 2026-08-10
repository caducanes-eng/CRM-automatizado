import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useEmpresa } from './EmpresaContext';
import {
  Lead,
  FichaLead,
  Compra,
  ProcedimentoClinica,
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
} from '../types';
import {
  ID_EMPRESA_PADRAO,
  SEED_LEADS,
  SEED_FICHAS,
  SEED_COMPRAS,
  SEED_RESPONSAVEIS,
  SEED_PROCEDIMENTOS,
} from '../data/seedData';

const STORAGE_KEYS = {
  LEADS: 'crm_estetica_leads_v1',
  FICHAS: 'crm_estetica_fichas_v1',
  COMPRAS: 'crm_estetica_compras_v1',
  RESPONSAVEIS: 'crm_estetica_responsaveis_v1',
  PROCEDIMENTOS: 'crm_estetica_procedimentos_v1',
};

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

interface CrmContextType {
  // Dados brutos filtrados pela empresa ativa
  leads: Lead[];
  fichas: FichaLead[];
  compras: Compra[];
  responsaveis: string[];
  procedimentos: ProcedimentoClinica[];

  // Dados globais (todas as empresas para gestão da plataforma)
  todosLeads: Lead[];
  todasCompras: Compra[];
  todosProcedimentos: ProcedimentoClinica[];

  // Estatísticas e Inteligência de Procedimentos
  estatisticasProcedimentos: EstatisticasProcedimento[];

  // Status Firebase Firestore
  isFirestoreConnected: boolean;
  isSyncing: boolean;

  // Controle Global da Ficha do Lead
  leadFichaAbertoId: string | null;
  isFichaLeadOpen: boolean;
  abrirFichaLead: (leadId: string) => void;
  fecharFichaLead: () => void;

  // Operações de Lead
  criarLead: (payload: CriarLeadPayload) => Promise<Lead>;
  atualizarLead: (leadId: string, dados: AtualizarLeadPayload) => Promise<Lead | null>;
  excluirLead: (leadId: string, hardDelete?: boolean) => Promise<boolean>;
  obterLeadPorId: (leadId: string) => Lead | undefined;
  reativarLead: (leadId: string, novaSituacao?: SituacaoLead) => Promise<Lead | null>;
  marcarComoPerdido: (leadId: string, motivo: string, dataPerda?: string) => Promise<Lead | null>;

  // Gestão de Situação & Etapa
  definirEtapaPorSituacao: (leadId: string, situacao: SituacaoLead, etapa: string) => Promise<Lead | null>;
  definirEtapaSituacaoAtual: (leadId: string, etapa: string) => Promise<Lead | null>;
  obterEtapaAtual: (lead: Lead) => string;
  definirStatusGrupoNutricao: (leadId: string, status: StatusGrupoNutricao) => Promise<Lead | null>;

  // Operações de Ficha Complementar
  obterFichaPorLead: (leadId: string) => FichaLead | undefined;
  atualizarFichaLead: (leadId: string, dados: AtualizarFichaPayload) => Promise<FichaLead | null>;

  // Operações de Compras
  lancarCompra: (payload: CriarCompraPayload) => Promise<Compra>;
  removerCompra: (compraId: string) => Promise<boolean>;
  obterComprasPorLead: (leadId: string) => Compra[];

  // Operações de Procedimentos da Clínica (CRUD & Inteligência)
  criarProcedimento: (payload: CriarProcedimentoPayload) => Promise<ProcedimentoClinica>;
  atualizarProcedimento: (id: string, dados: AtualizarProcedimentoPayload) => Promise<ProcedimentoClinica | null>;
  excluirProcedimento: (id: string) => Promise<boolean>;
  obterProcedimentoPorId: (id: string) => ProcedimentoClinica | undefined;
  obterProcedimentoPorNomeOuInteresse: (termo: string) => ProcedimentoClinica | undefined;
  verificarEExecutarReativacaoAutomatica: () => Promise<{
    totalReativados: number;
    detalhes: Array<{ leadId: string; leadNome: string; procedimentoNome: string; diasPassados: number; limiteDias: number }>;
  }>;

  // Gestão de Responsáveis
  adicionarResponsavel: (nome: string) => void;
  removerResponsavel: (nome: string) => void;

  // Utilitários & Importação / Exportação
  importarLeadsEmLote: (
    leadsParaImportar: ImportarLeadItem[],
    modoDuplicados?: 'criar_todos' | 'ignorar_duplicados' | 'atualizar_duplicados'
  ) => Promise<ResultadoImportacao>;
  resetarDadosExemplo: () => Promise<void>;
  limparTodosLeads: () => Promise<{ totalRemovidos: number }>;
}

// Normalizador e localizador de procedimento por texto livre
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

  // 1. Procura correspondência exata do nome
  for (const proc of listaProcedimentos) {
    const nomeNorm = normalizar(proc.nome);
    if (termoNorm === nomeNorm) return proc;
  }

  // 2. Procura inclusão mútua do nome
  for (const proc of listaProcedimentos) {
    const nomeNorm = normalizar(proc.nome);
    if (termoNorm.includes(nomeNorm) || nomeNorm.includes(termoNorm)) return proc;
  }

  // 3. Procura por palavras-chave semânticas de estética clínica
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

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, usuarios } = useAuth();
  const { empresaAtivaId } = useEmpresa();
  const targetEmpresaId = empresaAtivaId || ID_EMPRESA_PADRAO;

  // Chave de controle de limpeza de dados de teste
  const STORAGE_KEY_LIMPEZA_TESTES = 'crm_estetica_limpeza_testes_v3';

  // 1. Inicialização de Estado com Cache Local / Seeds
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      // Se ainda não executou a limpeza dos dados simulados, limpa o cache antigo
      if (!localStorage.getItem(STORAGE_KEY_LIMPEZA_TESTES)) {
        localStorage.removeItem(STORAGE_KEYS.LEADS);
        localStorage.removeItem(STORAGE_KEYS.FICHAS);
        localStorage.removeItem(STORAGE_KEYS.COMPRAS);
        localStorage.setItem(STORAGE_KEY_LIMPEZA_TESTES, 'true');
        return [];
      }

      const stored = localStorage.getItem(STORAGE_KEYS.LEADS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filtra possíveis leads de teste residuais com ids de prefixo simulado
          const reais = parsed.filter(
            (l: Lead) => !l.id?.startsWith('lead-cap-') && !l.id?.startsWith('lead-pos-') && !l.id?.startsWith('lead-proc-') && !l.id?.startsWith('lead-reat-') && !l.id?.startsWith('lead-nut-') && !l.id?.startsWith('lead-perd-') && !l.id?.startsWith('lead-venda-')
          );
          return reais;
        }
      }
    } catch (e) {
      console.warn('Erro ao ler leads do storage:', e);
    }
    return SEED_LEADS;
  });

  const [fichas, setFichas] = useState<FichaLead[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FICHAS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const reais = parsed.filter(
            (f: FichaLead) => !f.leadId?.startsWith('lead-cap-') && !f.leadId?.startsWith('lead-pos-') && !f.leadId?.startsWith('lead-proc-') && !f.leadId?.startsWith('lead-reat-') && !f.leadId?.startsWith('lead-nut-') && !f.leadId?.startsWith('lead-perd-') && !f.leadId?.startsWith('lead-venda-')
          );
          return reais;
        }
      }
    } catch (e) {
      console.warn('Erro ao ler fichas do storage:', e);
    }
    return SEED_FICHAS;
  });

  const [compras, setCompras] = useState<Compra[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COMPRAS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const reais = parsed.filter(
            (c: Compra) => !c.leadId?.startsWith('lead-cap-') && !c.leadId?.startsWith('lead-pos-') && !c.leadId?.startsWith('lead-proc-') && !c.leadId?.startsWith('lead-reat-') && !c.leadId?.startsWith('lead-nut-') && !c.leadId?.startsWith('lead-perd-') && !c.leadId?.startsWith('lead-venda-')
          );
          return reais;
        }
      }
    } catch (e) {
      console.warn('Erro ao ler compras do storage:', e);
    }
    return SEED_COMPRAS;
  });

  const [responsaveis, setResponsaveis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RESPONSAVEIS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Erro ao ler responsaveis do storage:', e);
    }
    return SEED_RESPONSAVEIS;
  });

  const [procedimentos, setProcedimentos] = useState<ProcedimentoClinica[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROCEDIMENTOS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao ler procedimentos do storage:', e);
    }
    return SEED_PROCEDIMENTOS;
  });

  // Estado de Sincronização Firestore
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Estado Global da Ficha do Lead
  const [leadFichaAbertoId, setLeadFichaAbertoId] = useState<string | null>(null);
  const [isFichaLeadOpen, setIsFichaLeadOpen] = useState<boolean>(false);

  const abrirFichaLead = useCallback((leadId: string) => {
    setLeadFichaAbertoId(leadId);
    setIsFichaLeadOpen(true);
  }, []);

  const fecharFichaLead = useCallback(() => {
    setIsFichaLeadOpen(false);
    setLeadFichaAbertoId(null);
  }, []);

  // 2. Sincronização e Listeners em Tempo Real do Firestore
  useEffect(() => {
    if (!user) {
      setIsFirestoreConnected(false);
      return;
    }

    setIsSyncing(true);

    // Função para verificar procedimentos e limpar leads simulados do Firestore se existirem
    const verificarEPopularFirestore = async () => {
      try {
        // 1. Garantir que o catálogo oficial de procedimentos esteja salvo no Firestore
        const procsSnap = await getDocs(collection(db, 'procedimentos'));
        if (procsSnap.empty) {
          const batch = writeBatch(db);
          for (const proc of SEED_PROCEDIMENTOS) {
            const procRef = doc(db, 'procedimentos', proc.id);
            batch.set(procRef, sanitizeForFirestore(proc));
          }
          await batch.commit();
          console.info('✅ Catálogo oficial de procedimentos sincronizado com o Firestore.');
        }

        // 2. Limpar leads de teste residuais (prefixos simulados) no Firestore
        const leadsSnap = await getDocs(collection(db, 'leads'));
        const batchClean = writeBatch(db);
        let precisaLimpar = false;

        leadsSnap.forEach((d) => {
          const leadId = d.id;
          if (
            leadId.startsWith('lead-cap-') ||
            leadId.startsWith('lead-pos-') ||
            leadId.startsWith('lead-proc-') ||
            leadId.startsWith('lead-reat-') ||
            leadId.startsWith('lead-nut-') ||
            leadId.startsWith('lead-perd-') ||
            leadId.startsWith('lead-venda-')
          ) {
            batchClean.delete(d.ref);
            precisaLimpar = true;
          }
        });

        const fichasSnap = await getDocs(collection(db, 'fichas'));
        fichasSnap.forEach((d) => {
          const fid = d.id;
          const data = d.data() as FichaLead;
          if (
            fid.startsWith('ficha-') ||
            data.leadId?.startsWith('lead-cap-') ||
            data.leadId?.startsWith('lead-pos-') ||
            data.leadId?.startsWith('lead-proc-') ||
            data.leadId?.startsWith('lead-reat-') ||
            data.leadId?.startsWith('lead-nut-') ||
            data.leadId?.startsWith('lead-perd-') ||
            data.leadId?.startsWith('lead-venda-')
          ) {
            batchClean.delete(d.ref);
            precisaLimpar = true;
          }
        });

        const comprasSnap = await getDocs(collection(db, 'compras'));
        comprasSnap.forEach((d) => {
          const cid = d.id;
          const data = d.data() as Compra;
          if (
            cid.startsWith('compra-') ||
            data.leadId?.startsWith('lead-cap-') ||
            data.leadId?.startsWith('lead-pos-') ||
            data.leadId?.startsWith('lead-proc-') ||
            data.leadId?.startsWith('lead-reat-') ||
            data.leadId?.startsWith('lead-nut-') ||
            data.leadId?.startsWith('lead-perd-') ||
            data.leadId?.startsWith('lead-venda-')
          ) {
            batchClean.delete(d.ref);
            precisaLimpar = true;
          }
        });

        if (precisaLimpar) {
          await batchClean.commit();
          console.info('🧹 Banco simulado de testes apagado com sucesso do Firestore.');
        }
      } catch (err) {
        console.warn('Nota sobre inicialização Firestore:', err);
      }
    };

    verificarEPopularFirestore();

    // Listeners em tempo real para as 4 coleções principais
    const unsubscribeLeads = onSnapshot(
      collection(db, 'leads'),
      (snapshot) => {
        const leadsCloud: Lead[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as Lead;
          // Ignora leads mockados antigos
          if (
            !item.id?.startsWith('lead-cap-') &&
            !item.id?.startsWith('lead-pos-') &&
            !item.id?.startsWith('lead-proc-') &&
            !item.id?.startsWith('lead-reat-') &&
            !item.id?.startsWith('lead-nut-') &&
            !item.id?.startsWith('lead-perd-') &&
            !item.id?.startsWith('lead-venda-')
          ) {
            leadsCloud.push(item);
          }
        });
        leadsCloud.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setLeads(leadsCloud);
        setIsFirestoreConnected(true);
        setIsSyncing(false);
      },
      (error) => {
        console.warn('Firestore leads snapshot listener info:', error);
        setIsFirestoreConnected(false);
        setIsSyncing(false);
      }
    );

    const unsubscribeFichas = onSnapshot(
      collection(db, 'fichas'),
      (snapshot) => {
        const fichasCloud: FichaLead[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as FichaLead;
          if (
            !item.leadId?.startsWith('lead-cap-') &&
            !item.leadId?.startsWith('lead-pos-') &&
            !item.leadId?.startsWith('lead-proc-') &&
            !item.leadId?.startsWith('lead-reat-') &&
            !item.leadId?.startsWith('lead-nut-') &&
            !item.leadId?.startsWith('lead-perd-') &&
            !item.leadId?.startsWith('lead-venda-')
          ) {
            fichasCloud.push(item);
          }
        });
        setFichas(fichasCloud);
      },
      (error) => {
        console.warn('Firestore fichas snapshot listener info:', error);
      }
    );

    const unsubscribeCompras = onSnapshot(
      collection(db, 'compras'),
      (snapshot) => {
        const comprasCloud: Compra[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as Compra;
          if (
            !item.leadId?.startsWith('lead-cap-') &&
            !item.leadId?.startsWith('lead-pos-') &&
            !item.leadId?.startsWith('lead-proc-') &&
            !item.leadId?.startsWith('lead-reat-') &&
            !item.leadId?.startsWith('lead-nut-') &&
            !item.leadId?.startsWith('lead-perd-') &&
            !item.leadId?.startsWith('lead-venda-')
          ) {
            comprasCloud.push(item);
          }
        });
        comprasCloud.sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());
        setCompras(comprasCloud);
      },
      (error) => {
        console.warn('Firestore compras snapshot listener info:', error);
      }
    );

    const unsubscribeProcedimentos = onSnapshot(
      collection(db, 'procedimentos'),
      (snapshot) => {
        if (!snapshot.empty) {
          const procsCloud: ProcedimentoClinica[] = [];
          snapshot.forEach((d) => {
            procsCloud.push(d.data() as ProcedimentoClinica);
          });
          setProcedimentos(procsCloud);
        }
      },
      (error) => {
        console.warn('Firestore procedimentos snapshot listener info:', error);
      }
    );

    return () => {
      unsubscribeLeads();
      unsubscribeFichas();
      unsubscribeCompras();
      unsubscribeProcedimentos();
    };
  }, [user?.uid]);

  // Sincronização de responsáveis com os usuários colaboradores cadastrados no sistema
  useEffect(() => {
    if (usuarios && usuarios.length > 0) {
      const nomes = usuarios
        .filter((u) => !u.deleted_at && u.ativo !== false)
        .map((u) => u.nome);
      if (nomes.length > 0) {
        setResponsaveis(nomes);
        try {
          localStorage.setItem(STORAGE_KEYS.RESPONSAVEIS, JSON.stringify(nomes));
        } catch (e) {}
      }
    }
  }, [usuarios]);

  // Sincronização com Cache Local (para resiliência offline)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
    } catch (e) {
      console.error('Erro ao salvar leads no cache local:', e);
    }
  }, [leads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FICHAS, JSON.stringify(fichas));
    } catch (e) {
      console.error('Erro ao salvar fichas no cache local:', e);
    }
  }, [fichas]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(compras));
    } catch (e) {
      console.error('Erro ao salvar compras no cache local:', e);
    }
  }, [compras]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESPONSAVEIS, JSON.stringify(responsaveis));
    } catch (e) {
      console.error('Erro ao salvar responsaveis no cache local:', e);
    }
  }, [responsaveis]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROCEDIMENTOS, JSON.stringify(procedimentos));
    } catch (e) {
      console.error('Erro ao salvar procedimentos no cache local:', e);
    }
  }, [procedimentos]);

  // ----------------------------------------------------
  // MÉTODOS DE LEAD
  // ----------------------------------------------------

  const criarLead = useCallback(
    async (payload: CriarLeadPayload): Promise<Lead> => {
      const timestamp = new Date().toISOString();
      const hoje = timestamp.split('T')[0];
      const leadId = generateId('lead');
      const situacao: SituacaoLead = payload.situacao || 'Em captação';

      const statusGrupoNutricao: StatusGrupoNutricao | undefined =
        situacao === 'Nutrição'
          ? payload.statusGrupoNutricao || 'Ativo'
          : payload.statusGrupoNutricao;

      const dataEntradaNutricao: string | undefined =
        situacao === 'Nutrição'
          ? payload.dataEntradaNutricao || payload.dataEntrada || hoje
          : payload.dataEntradaNutricao;

      // Etapa por situação inicial
      const etapaPorSituacao = payload.etapaInicial
        ? { [situacao]: payload.etapaInicial }
        : situacao === 'Nutrição'
        ? { 'Nutrição': statusGrupoNutricao || 'Ativo' }
        : {};

      const novoLead: Lead = {
        id: leadId,
        empresaId: targetEmpresaId,
        nome: payload.nome.trim(),
        situacao: situacao,
        etapaPorSituacao: etapaPorSituacao,
        interesse: payload.interesse?.trim() || '',
        possivelValor: Number(payload.possivelValor) || 0,
        statusVenda: payload.statusVenda || 'Em processo',
        dataEntrada: payload.dataEntrada || hoje,
        responsavel: payload.responsavel || responsaveis[0] || 'Secretária 1',
        dataEntradaNutricao: dataEntradaNutricao,
        statusGrupoNutricao: statusGrupoNutricao,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        version: 1,
      };

      // Cria a Ficha correspondente (1 para 1)
      const novaFicha: FichaLead = {
        id: generateId('ficha'),
        leadId: leadId,
        empresaId: targetEmpresaId,
        telefone: payload.ficha?.telefone || '',
        origemLead: payload.ficha?.origemLead || 'WhatsApp',
        dataNascimento: payload.ficha?.dataNascimento || '',
        endereco: payload.ficha?.endereco || '',
        observacoes: payload.ficha?.observacoes || '',
        motivoPerda: payload.ficha?.motivoPerda || '',
        dataPerda: payload.ficha?.dataPerda || '',
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        version: 1,
      };

      // 1. Atualização Otimista Local
      setLeads((prev) => [novoLead, ...prev]);
      setFichas((prev) => [novaFicha, ...prev]);

      // 2. Gravação no Firestore
      try {
        if (user) {
          await setDoc(doc(db, 'leads', leadId), sanitizeForFirestore(novoLead));
          await setDoc(doc(db, 'fichas', novaFicha.id), sanitizeForFirestore(novaFicha));
        }
      } catch (err) {
        console.error('Erro ao persistir novo Lead no Firestore:', err);
      }

      return novoLead;
    },
    [responsaveis, user]
  );

  const atualizarLead = useCallback(
    async (leadId: string, dados: AtualizarLeadPayload): Promise<Lead | null> => {
      let leadAtualizado: Lead | null = null;
      let fichaAtualizada: FichaLead | null = null;
      const timestamp = new Date().toISOString();
      const hoje = timestamp.split('T')[0];

      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== leadId) return lead;

          // Se está entrando na situação 'Nutrição' agora
          const enteringNutricao = dados.situacao === 'Nutrição' && lead.situacao !== 'Nutrição';
          const dataEntradaNutricao =
            dados.dataEntradaNutricao !== undefined
              ? dados.dataEntradaNutricao
              : enteringNutricao && !lead.dataEntradaNutricao
              ? hoje
              : lead.dataEntradaNutricao;

          const statusGrupoNutricao =
            dados.statusGrupoNutricao !== undefined
              ? dados.statusGrupoNutricao
              : enteringNutricao && !lead.statusGrupoNutricao
              ? 'Ativo'
              : lead.statusGrupoNutricao;

          // Sincroniza etapa de Nutrição no map se aplicável
          const etapaPorSituacao = { ...lead.etapaPorSituacao };
          if (statusGrupoNutricao && (dados.situacao === 'Nutrição' || lead.situacao === 'Nutrição')) {
            etapaPorSituacao['Nutrição'] = statusGrupoNutricao;
          }

          // Se está sendo marcado como Perdido
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

          const motivoPerda =
            dados.motivoPerda !== undefined
              ? dados.motivoPerda
              : lead.motivoPerda;

          leadAtualizado = {
            ...lead,
            ...dados,
            etapaPorSituacao,
            dataEntradaNutricao,
            statusGrupoNutricao,
            situacaoPerda,
            dataPerda,
            motivoPerda,
            nome: dados.nome !== undefined ? dados.nome.trim() : lead.nome,
            interesse: dados.interesse !== undefined ? dados.interesse.trim() : lead.interesse,
            possivelValor: dados.possivelValor !== undefined ? Number(dados.possivelValor) || 0 : lead.possivelValor,
            updated_at: timestamp,
            version: lead.version + 1,
          };
          return leadAtualizado;
        })
      );

      // Sincroniza motivo e data na ficha complementar se aplicável
      if (dados.motivoPerda !== undefined || dados.dataPerda !== undefined || dados.statusVenda === 'Perdido') {
        setFichas((prev) =>
          prev.map((f) => {
            if (f.leadId !== leadId) return f;
            fichaAtualizada = {
              ...f,
              motivoPerda: dados.motivoPerda !== undefined ? dados.motivoPerda : f.motivoPerda,
              dataPerda: dados.dataPerda !== undefined ? dados.dataPerda : f.dataPerda || hoje,
              updated_at: timestamp,
              version: f.version + 1,
            };
            return fichaAtualizada;
          })
        );
      }

      // Gravação no Firestore
      try {
        if (user && leadAtualizado) {
          await setDoc(doc(db, 'leads', leadId), sanitizeForFirestore(leadAtualizado), { merge: true });
          if (fichaAtualizada) {
            await setDoc(doc(db, 'fichas', (fichaAtualizada as FichaLead).id), sanitizeForFirestore(fichaAtualizada), { merge: true });
          }
        }
      } catch (err) {
        console.error('Erro ao atualizar Lead no Firestore:', err);
      }

      return leadAtualizado;
    },
    [user]
  );

  const reativarLead = useCallback(
    async (leadId: string, novaSituacao: SituacaoLead = 'Reativação'): Promise<Lead | null> => {
      let leadAtualizado: Lead | null = null;
      const timestamp = new Date().toISOString();

      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== leadId) return lead;

          leadAtualizado = {
            ...lead,
            statusVenda: 'Em processo',
            situacao: novaSituacao,
            updated_at: timestamp,
            version: lead.version + 1,
          };
          return leadAtualizado;
        })
      );

      try {
        if (user && leadAtualizado) {
          await setDoc(doc(db, 'leads', leadId), sanitizeForFirestore(leadAtualizado), { merge: true });
        }
      } catch (err) {
        console.error('Erro ao reativar Lead no Firestore:', err);
      }

      return leadAtualizado;
    },
    [user]
  );

  const marcarComoPerdido = useCallback(
    async (leadId: string, motivo: string, dataPerda?: string): Promise<Lead | null> => {
      let leadAtualizado: Lead | null = null;
      let fichaAtualizada: FichaLead | null = null;
      const timestamp = new Date().toISOString();
      const hoje = timestamp.split('T')[0];
      const dataDefinida = dataPerda || hoje;

      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== leadId) return lead;

          leadAtualizado = {
            ...lead,
            statusVenda: 'Perdido',
            motivoPerda: motivo,
            dataPerda: dataDefinida,
            situacaoPerda: lead.situacao,
            updated_at: timestamp,
            version: lead.version + 1,
          };
          return leadAtualizado;
        })
      );

      setFichas((prev) =>
        prev.map((f) => {
          if (f.leadId !== leadId) return f;
          fichaAtualizada = {
            ...f,
            motivoPerda: motivo,
            dataPerda: dataDefinida,
            updated_at: timestamp,
            version: f.version + 1,
          };
          return fichaAtualizada;
        })
      );

      try {
        if (user && leadAtualizado) {
          await setDoc(doc(db, 'leads', leadId), sanitizeForFirestore(leadAtualizado), { merge: true });
          if (fichaAtualizada) {
            await setDoc(doc(db, 'fichas', (fichaAtualizada as FichaLead).id), sanitizeForFirestore(fichaAtualizada), { merge: true });
          }
        }
      } catch (err) {
        console.error('Erro ao marcar lead como perdido no Firestore:', err);
      }

      return leadAtualizado;
    },
    [user]
  );

  const excluirLead = useCallback(
    async (leadId: string, hardDelete = true): Promise<boolean> => {
      const timestamp = new Date().toISOString();

      if (hardDelete) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        setFichas((prev) => prev.filter((f) => f.leadId !== leadId));
        setCompras((prev) => prev.filter((c) => c.leadId !== leadId));

        // Atualiza cache local imediatamente
        try {
          const storedLeads = localStorage.getItem(STORAGE_KEYS.LEADS);
          if (storedLeads) {
            const parsed = JSON.parse(storedLeads);
            localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(parsed.filter((l: Lead) => l.id !== leadId)));
          }
          const storedFichas = localStorage.getItem(STORAGE_KEYS.FICHAS);
          if (storedFichas) {
            const parsed = JSON.parse(storedFichas);
            localStorage.setItem(STORAGE_KEYS.FICHAS, JSON.stringify(parsed.filter((f: FichaLead) => f.leadId !== leadId)));
          }
          const storedCompras = localStorage.getItem(STORAGE_KEYS.COMPRAS);
          if (storedCompras) {
            const parsed = JSON.parse(storedCompras);
            localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(parsed.filter((c: Compra) => c.leadId !== leadId)));
          }
        } catch (e) {
          console.warn('Erro ao atualizar cache local na exclusão:', e);
        }

        try {
          if (user) {
            await deleteDoc(doc(db, 'leads', leadId));

            // Deletar também ficha do lead se existir
            const fichasSnap = await getDocs(collection(db, 'fichas'));
            fichasSnap.forEach(async (d) => {
              const data = d.data();
              if (data.leadId === leadId || d.id === `ficha-${leadId}`) {
                await deleteDoc(d.ref);
              }
            });

            // Deletar compras associadas
            const comprasSnap = await getDocs(collection(db, 'compras'));
            comprasSnap.forEach(async (d) => {
              const data = d.data();
              if (data.leadId === leadId) {
                await deleteDoc(d.ref);
              }
            });
          }
        } catch (err) {
          console.error('Erro ao excluir Lead do Firestore:', err);
        }
      } else {
        // Soft delete obrigatório conforme PROJECT_RULES
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, deleted_at: timestamp, version: l.version + 1 } : l))
        );
        setFichas((prev) =>
          prev.map((f) => (f.leadId === leadId ? { ...f, deleted_at: timestamp, version: f.version + 1 } : f))
        );
        setCompras((prev) =>
          prev.map((c) => (c.leadId === leadId ? { ...c, deleted_at: timestamp, version: c.version + 1 } : c))
        );

        try {
          if (user) {
            await updateDoc(doc(db, 'leads', leadId), { deleted_at: timestamp });
          }
        } catch (err) {
          console.error('Erro ao realizar soft-delete no Firestore:', err);
        }
      }
      return true;
    },
    [user]
  );

  const obterLeadPorId = useCallback(
    (leadId: string): Lead | undefined => {
      return leads.find((l) => l.id === leadId && !l.deleted_at);
    },
    [leads]
  );

  // ----------------------------------------------------
  // GESTÃO DE SITUAÇÃO & ETAPA
  // ----------------------------------------------------

  const definirEtapaPorSituacao = useCallback(
    async (leadId: string, situacao: SituacaoLead, etapa: string): Promise<Lead | null> => {
      let leadAtualizado: Lead | null = null;
      const timestamp = new Date().toISOString();

      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== leadId) return lead;

          const updatedEtapaMap = {
            ...lead.etapaPorSituacao,
            [situacao]: etapa,
          };

          leadAtualizado = {
            ...lead,
            etapaPorSituacao: updatedEtapaMap,
            statusGrupoNutricao:
              situacao === 'Nutrição' && (etapa === 'Ativo' || etapa === 'Removido')
                ? (etapa as StatusGrupoNutricao)
                : lead.statusGrupoNutricao,
            updated_at: timestamp,
            version: lead.version + 1,
          };
          return leadAtualizado;
        })
      );

      try {
        if (user && leadAtualizado) {
          await setDoc(doc(db, 'leads', leadId), sanitizeForFirestore(leadAtualizado), { merge: true });
        }
      } catch (err) {
        console.error('Erro ao atualizar etapa no Firestore:', err);
      }

      return leadAtualizado;
    },
    [user]
  );

  const definirEtapaSituacaoAtual = useCallback(
    async (leadId: string, etapa: string): Promise<Lead | null> => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return null;
      return definirEtapaPorSituacao(leadId, lead.situacao, etapa);
    },
    [leads, definirEtapaPorSituacao]
  );

  const obterEtapaAtual = useCallback((lead: Lead): string => {
    if (!lead || !lead.etapaPorSituacao) return '';
    return lead.etapaPorSituacao[lead.situacao] || '';
  }, []);

  const definirStatusGrupoNutricao = useCallback(
    async (leadId: string, status: StatusGrupoNutricao): Promise<Lead | null> => {
      let leadAtualizado: Lead | null = null;
      const timestamp = new Date().toISOString();

      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== leadId) return lead;

          const updatedEtapaMap = {
            ...lead.etapaPorSituacao,
            'Nutrição': status,
          };

          leadAtualizado = {
            ...lead,
            statusGrupoNutricao: status,
            etapaPorSituacao: updatedEtapaMap,
            updated_at: timestamp,
            version: lead.version + 1,
          };
          return leadAtualizado;
        })
      );

      try {
        if (user && leadAtualizado) {
          await setDoc(doc(db, 'leads', leadId), sanitizeForFirestore(leadAtualizado), { merge: true });
        }
      } catch (err) {
        console.error('Erro ao definir status no grupo no Firestore:', err);
      }

      return leadAtualizado;
    },
    [user]
  );

  // ----------------------------------------------------
  // GESTÃO DE FICHA DO LEAD (1-1)
  // ----------------------------------------------------

  const obterFichaPorLead = useCallback(
    (leadId: string): FichaLead | undefined => {
      return fichas.find((f) => f.leadId === leadId && !f.deleted_at);
    },
    [fichas]
  );

  const atualizarFichaLead = useCallback(
    async (leadId: string, dados: AtualizarFichaPayload): Promise<FichaLead | null> => {
      const timestamp = new Date().toISOString();
      let fichaAtualizada: FichaLead | null = null;

      setFichas((prev) => {
        const index = prev.findIndex((f) => f.leadId === leadId);
        if (index >= 0) {
          const fichaExistente = prev[index];
          fichaAtualizada = {
            ...fichaExistente,
            ...dados,
            updated_at: timestamp,
            version: fichaExistente.version + 1,
          };
          const next = [...prev];
          next[index] = fichaAtualizada;
          return next;
        } else {
          // Cria caso não exista ainda
          fichaAtualizada = {
            id: generateId('ficha'),
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
            deleted_at: null,
            version: 1,
          };
          return [fichaAtualizada, ...prev];
        }
      });

      try {
        if (user && fichaAtualizada) {
          await setDoc(doc(db, 'fichas', (fichaAtualizada as FichaLead).id), sanitizeForFirestore(fichaAtualizada), { merge: true });
        }
      } catch (err) {
        console.error('Erro ao atualizar Ficha no Firestore:', err);
      }

      return fichaAtualizada;
    },
    [user]
  );

  // ----------------------------------------------------
  // GESTÃO DE COMPRAS (N-1)
  // ----------------------------------------------------

  const lancarCompra = useCallback(
    async (payload: CriarCompraPayload): Promise<Compra> => {
      const timestamp = new Date().toISOString();
      const hoje = timestamp.split('T')[0];

      const novaCompra: Compra = {
        id: generateId('compra'),
        leadId: payload.leadId,
        empresaId: targetEmpresaId,
        data: payload.data || hoje,
        procedimento: payload.procedimento.trim(),
        valor: Number(payload.valor) || 0,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        version: 1,
      };

      setCompras((prev) => [novaCompra, ...prev]);

      // Atualiza automaticamente o status do lead para "Venda feita"
      setLeads((prev) =>
        prev.map((l) =>
          l.id === payload.leadId && l.statusVenda !== 'Venda feita'
            ? { ...l, statusVenda: 'Venda feita' as StatusVenda, updated_at: timestamp, version: l.version + 1 }
            : l
        )
      );

      try {
        if (user) {
          await setDoc(doc(db, 'compras', novaCompra.id), sanitizeForFirestore(novaCompra));
          await updateDoc(doc(db, 'leads', payload.leadId), sanitizeForFirestore({
            statusVenda: 'Venda feita',
            updated_at: timestamp,
          }));
        }
      } catch (err) {
        console.error('Erro ao lançar Compra no Firestore:', err);
      }

      return novaCompra;
    },
    [user]
  );

  const removerCompra = useCallback(
    async (compraId: string): Promise<boolean> => {
      const timestamp = new Date().toISOString();
      setCompras((prev) =>
        prev.map((c) => (c.id === compraId ? { ...c, deleted_at: timestamp, version: c.version + 1 } : c))
      );

      try {
        if (user) {
          await updateDoc(doc(db, 'compras', compraId), { deleted_at: timestamp });
        }
      } catch (err) {
        console.error('Erro ao remover Compra no Firestore:', err);
      }

      return true;
    },
    [user]
  );

  const obterComprasPorLead = useCallback(
    (leadId: string): Compra[] => {
      return compras.filter((c) => c.leadId === leadId && !c.deleted_at);
    },
    [compras]
  );

  // ----------------------------------------------------
  // GESTÃO DE PROCEDIMENTOS DA CLÍNICA (CRUD & REGRAS)
  // ----------------------------------------------------

  const criarProcedimento = useCallback(
    async (payload: CriarProcedimentoPayload): Promise<ProcedimentoClinica> => {
      const timestamp = new Date().toISOString();
      const novoId = generateId('proc');
      const novoProc: ProcedimentoClinica = {
        id: novoId,
        empresaId: targetEmpresaId,
        nome: payload.nome.trim(),
        categoria: payload.categoria?.trim() || 'Estética Facial',
        valor: Number(payload.valor) || 0,
        formatosPagamento: payload.formatosPagamento?.trim() || 'À vista com 5% desc. no Pix ou até 6x no cartão de crédito.',
        duracaoDias: Number(payload.duracaoDias) || 120,
        descricao: payload.descricao?.trim() || '',
        orientacoes: payload.orientacoes?.trim() || '',
        ativo: payload.ativo !== undefined ? payload.ativo : true,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        version: 1,
      };

      setProcedimentos((prev) => [novoProc, ...prev]);

      try {
        if (user) {
          await setDoc(doc(db, 'procedimentos', novoId), sanitizeForFirestore(novoProc));
        }
      } catch (err) {
        console.error('Erro ao salvar procedimento no Firestore:', err);
      }

      return novoProc;
    },
    [user]
  );

  const atualizarProcedimento = useCallback(
    async (id: string, dados: AtualizarProcedimentoPayload): Promise<ProcedimentoClinica | null> => {
      const timestamp = new Date().toISOString();
      let procAtualizado: ProcedimentoClinica | null = null;

      setProcedimentos((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          procAtualizado = {
            ...p,
            ...dados,
            nome: dados.nome !== undefined ? dados.nome.trim() : p.nome,
            categoria: dados.categoria !== undefined ? dados.categoria.trim() : p.categoria,
            valor: dados.valor !== undefined ? Number(dados.valor) || 0 : p.valor,
            formatosPagamento: dados.formatosPagamento !== undefined ? dados.formatosPagamento.trim() : p.formatosPagamento,
            duracaoDias: dados.duracaoDias !== undefined ? Number(dados.duracaoDias) || p.duracaoDias : p.duracaoDias,
            descricao: dados.descricao !== undefined ? dados.descricao.trim() : p.descricao,
            orientacoes: dados.orientacoes !== undefined ? dados.orientacoes.trim() : p.orientacoes,
            ativo: dados.ativo !== undefined ? dados.ativo : p.ativo,
            updated_at: timestamp,
            version: p.version + 1,
          };
          return procAtualizado;
        })
      );

      try {
        if (user && procAtualizado) {
          await setDoc(doc(db, 'procedimentos', id), sanitizeForFirestore(procAtualizado), { merge: true });
        }
      } catch (err) {
        console.error('Erro ao atualizar procedimento no Firestore:', err);
      }

      return procAtualizado;
    },
    [user]
  );

  const excluirProcedimento = useCallback(
    async (id: string): Promise<boolean> => {
      const timestamp = new Date().toISOString();
      setProcedimentos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, deleted_at: timestamp, version: p.version + 1 } : p))
      );

      try {
        if (user) {
          await updateDoc(doc(db, 'procedimentos', id), { deleted_at: timestamp });
        }
      } catch (err) {
        console.error('Erro ao excluir procedimento do Firestore:', err);
      }

      return true;
    },
    [user]
  );

  const obterProcedimentoPorId = useCallback(
    (id: string): ProcedimentoClinica | undefined => {
      return procedimentos.find((p) => p.id === id && !p.deleted_at);
    },
    [procedimentos]
  );

  const obterProcedimentoPorNomeOuInteresse = useCallback(
    (termo: string): ProcedimentoClinica | undefined => {
      return casarProcedimentoComTexto(termo, procedimentos.filter((p) => !p.deleted_at));
    },
    [procedimentos]
  );

  // ----------------------------------------------------
  // AUTOMAÇÃO DE REATIVAÇÃO POR PRAZO DO PROCEDIMENTO
  // ----------------------------------------------------

  const verificarEExecutarReativacaoAutomatica = useCallback(async (): Promise<{
    totalReativados: number;
    detalhes: Array<{ leadId: string; leadNome: string; procedimentoNome: string; diasPassados: number; limiteDias: number }>;
  }> => {
    const timestamp = new Date().toISOString();
    const hojeDate = new Date();
    const procsAtivos = procedimentos.filter((p) => !p.deleted_at && p.ativo);
    const detalhes: Array<{ leadId: string; leadNome: string; procedimentoNome: string; diasPassados: number; limiteDias: number }> = [];

    const leadsParaReativar: string[] = [];

    for (const lead of leads) {
      if (lead.deleted_at) continue;

      // Candidatos a reativação automática: pacientes em 'Pós procedimento'
      if (lead.situacao === 'Pós procedimento') {
        const comprasDoLead = compras.filter((c) => c.leadId === lead.id && !c.deleted_at);
        let dataRefStr = lead.dataEntrada;
        let procIdentificado: ProcedimentoClinica | undefined;

        if (comprasDoLead.length > 0) {
          const ultimaCompra = comprasDoLead[0];
          dataRefStr = ultimaCompra.data;
          procIdentificado = casarProcedimentoComTexto(ultimaCompra.procedimento, procsAtivos);
        }

        if (!procIdentificado && lead.interesse) {
          procIdentificado = casarProcedimentoComTexto(lead.interesse, procsAtivos);
        }

        if (!procIdentificado) {
          procIdentificado = procsAtivos[0];
        }

        const limiteDias = procIdentificado ? procIdentificado.duracaoDias : 120;
        const dataRef = new Date(dataRefStr);
        const diffMs = hojeDate.getTime() - dataRef.getTime();
        const diasPassados = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        if (diasPassados >= limiteDias) {
          leadsParaReativar.push(lead.id);
          detalhes.push({
            leadId: lead.id,
            leadNome: lead.nome,
            procedimentoNome: procIdentificado ? procIdentificado.nome : 'Procedimento Realizado',
            diasPassados,
            limiteDias,
          });
        }
      }
    }

    if (leadsParaReativar.length > 0) {
      setLeads((prev) =>
        prev.map((lead) => {
          if (!leadsParaReativar.includes(lead.id)) return lead;

          const det = detalhes.find((d) => d.leadId === lead.id);
          const etapaMsg = det
            ? `Vencimento do Efeito (${det.procedimentoNome} - ${det.limiteDias} dias)`
            : 'Vencimento do Prazo do Procedimento';

          return {
            ...lead,
            situacao: 'Reativação' as SituacaoLead,
            etapaPorSituacao: {
              ...lead.etapaPorSituacao,
              'Reativação': etapaMsg,
            },
            updated_at: timestamp,
            version: lead.version + 1,
          };
        })
      );

      try {
        if (user) {
          const batch = writeBatch(db);
          for (const det of detalhes) {
            const leadRef = doc(db, 'leads', det.leadId);
            batch.update(leadRef, {
              situacao: 'Reativação',
              [`etapaPorSituacao.Reativação`]: `Vencimento do Efeito (${det.procedimentoNome} - ${det.limiteDias} dias)`,
              updated_at: timestamp,
            });
          }
          await batch.commit();
        }
      } catch (err) {
        console.warn('Erro ao atualizar leads reativados no Firestore:', err);
      }
    }

    return {
      totalReativados: leadsParaReativar.length,
      detalhes,
    };
  }, [leads, compras, procedimentos, user]);

  // Executa checagem de reativação automática periodicamente / ao iniciar
  useEffect(() => {
    const timer = setTimeout(() => {
      verificarEExecutarReativacaoAutomatica();
    }, 2000);
    return () => clearTimeout(timer);
  }, [verificarEExecutarReativacaoAutomatica]);

  // ----------------------------------------------------
  // GESTÃO DE RESPONSÁVEIS
  // ----------------------------------------------------

  const adicionarResponsavel = useCallback((nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    setResponsaveis((prev) => (prev.includes(limpo) ? prev : [...prev, limpo]));
  }, []);

  const removerResponsavel = useCallback((nome: string) => {
    setResponsaveis((prev) => prev.filter((r) => r !== nome));
  }, []);

  // ----------------------------------------------------
  // IMPORTAÇÃO DE CLIENTES EM LOTE
  // ----------------------------------------------------

  const importarLeadsEmLote = useCallback(
    async (
      leadsParaImportar: ImportarLeadItem[],
      modoDuplicados: 'criar_todos' | 'ignorar_duplicados' | 'atualizar_duplicados' = 'ignorar_duplicados'
    ): Promise<ResultadoImportacao> => {
      const timestamp = new Date().toISOString();
      const hoje = timestamp.split('T')[0];

      let totalCriados = 0;
      let totalAtualizados = 0;
      let totalIgnorados = 0;
      let totalErros = 0;
      const errosDetalhes: string[] = [];

      const novosLeads: Lead[] = [];
      const novasFichas: FichaLead[] = [];
      const leadsAtualizarMap = new Map<string, Partial<Lead>>();
      const fichasAtualizarMap = new Map<string, Partial<FichaLead>>();

      // Funções auxiliares de normalização para detecção de duplicados
      const normalizar = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .replace(/\s+/g, ' ');

      const normalizarTel = (s: string) => s.replace(/\D/g, '');

      const leadsExistentesMapNome = new Map<string, Lead>();
      const fichasExistentesMapTel = new Map<string, { ficha: FichaLead; leadId: string }>();

      for (const lead of leads) {
        if (!lead.deleted_at) {
          leadsExistentesMapNome.set(normalizar(lead.nome), lead);
        }
      }

      for (const ficha of fichas) {
        if (!ficha.deleted_at && ficha.telefone) {
          const telDigits = normalizarTel(ficha.telefone);
          if (telDigits.length >= 8) {
            fichasExistentesMapTel.set(telDigits, { ficha, leadId: ficha.leadId });
          }
        }
      }

      for (let i = 0; i < leadsParaImportar.length; i++) {
        const item = leadsParaImportar[i];
        if (!item.nome || !item.nome.trim()) {
          totalErros++;
          errosDetalhes.push(`Linha ${i + 1}: Nome do cliente é obrigatório.`);
          continue;
        }

        const nomeNorm = normalizar(item.nome);
        const telDigits = item.telefone ? normalizarTel(item.telefone) : '';

        let leadExistente: Lead | undefined;
        if (leadsExistentesMapNome.has(nomeNorm)) {
          leadExistente = leadsExistentesMapNome.get(nomeNorm);
        } else if (telDigits.length >= 8 && fichasExistentesMapTel.has(telDigits)) {
          const match = fichasExistentesMapTel.get(telDigits);
          if (match) {
            leadExistente = leads.find((l) => l.id === match.leadId && !l.deleted_at);
          }
        }

        if (leadExistente && modoDuplicados === 'ignorar_duplicados') {
          totalIgnorados++;
          continue;
        }

        if (leadExistente && modoDuplicados === 'atualizar_duplicados') {
          // Atualiza dados existentes
          const patchLead: Partial<Lead> = {
            updated_at: timestamp,
            version: leadExistente.version + 1,
          };
          if (item.situacao) patchLead.situacao = item.situacao;
          if (item.interesse) patchLead.interesse = item.interesse.trim();
          if (item.possivelValor !== undefined) patchLead.possivelValor = Number(item.possivelValor) || 0;
          if (item.statusVenda) patchLead.statusVenda = item.statusVenda;
          if (item.responsavel) patchLead.responsavel = item.responsavel;

          leadsAtualizarMap.set(leadExistente.id, patchLead);

          const fichaExistente = fichas.find((f) => f.leadId === leadExistente!.id && !f.deleted_at);
          if (fichaExistente) {
            const patchFicha: Partial<FichaLead> = {
              updated_at: timestamp,
              version: fichaExistente.version + 1,
            };
            if (item.telefone) patchFicha.telefone = item.telefone.trim();
            if (item.origemLead) patchFicha.origemLead = item.origemLead as any;
            if (item.dataNascimento) patchFicha.dataNascimento = item.dataNascimento;
            if (item.endereco) patchFicha.endereco = item.endereco;
            if (item.observacoes) patchFicha.observacoes = item.observacoes;
            fichasAtualizarMap.set(fichaExistente.id, patchFicha);
          }

          totalAtualizados++;
          continue;
        }

        // Criar novo lead
        const leadId = generateId('lead');
        const situacao: SituacaoLead = item.situacao || 'Em captação';
        const etapaPorSituacao = item.etapaInicial
          ? { [situacao]: item.etapaInicial }
          : situacao === 'Nutrição'
          ? { 'Nutrição': 'Ativo' }
          : {};

        const novoLead: Lead = {
          id: leadId,
          nome: item.nome.trim(),
          situacao: situacao,
          etapaPorSituacao,
          interesse: item.interesse?.trim() || '',
          possivelValor: Number(item.possivelValor) || 0,
          statusVenda: item.statusVenda || 'Em processo',
          dataEntrada: item.dataEntrada || hoje,
          responsavel: item.responsavel || responsaveis[0] || 'Secretária 1',
          dataEntradaNutricao: situacao === 'Nutrição' ? hoje : undefined,
          statusGrupoNutricao: situacao === 'Nutrição' ? 'Ativo' : undefined,
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
          version: 1,
        };

        const novaFicha: FichaLead = {
          id: generateId('ficha'),
          leadId: leadId,
          telefone: item.telefone?.trim() || '',
          origemLead: (item.origemLead as any) || 'WhatsApp',
          dataNascimento: item.dataNascimento || '',
          endereco: item.endereco || '',
          observacoes: item.observacoes || '',
          motivoPerda: '',
          dataPerda: '',
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
          version: 1,
        };

        novosLeads.push(novoLead);
        novasFichas.push(novaFicha);
        totalCriados++;

        // Atualiza mapas locais para prevenir duplicação de linhas no mesmo lote
        leadsExistentesMapNome.set(nomeNorm, novoLead);
        if (telDigits.length >= 8) {
          fichasExistentesMapTel.set(telDigits, { ficha: novaFicha, leadId });
        }
      }

      // Aplica as atualizações de estado local
      if (novosLeads.length > 0 || leadsAtualizarMap.size > 0) {
        setLeads((prev) => {
          const listaAtualizada = prev.map((l) => {
            if (leadsAtualizarMap.has(l.id)) {
              return { ...l, ...leadsAtualizarMap.get(l.id) };
            }
            return l;
          });
          return [...novosLeads, ...listaAtualizada];
        });

        setFichas((prev) => {
          const listaAtualizada = prev.map((f) => {
            if (fichasAtualizarMap.has(f.id)) {
              return { ...f, ...fichasAtualizarMap.get(f.id) };
            }
            return f;
          });
          return [...novasFichas, ...listaAtualizada];
        });
      }

      // Gravação no Firestore
      try {
        if (user) {
          const CHUNK_SIZE = 300;
          const allOps: Array<{ path: string; id: string; data: any }> = [];

          for (const l of novosLeads) {
            allOps.push({ path: 'leads', id: l.id, data: sanitizeForFirestore(l) });
          }
          for (const f of novasFichas) {
            allOps.push({ path: 'fichas', id: f.id, data: sanitizeForFirestore(f) });
          }
          for (const [id, patch] of leadsAtualizarMap.entries()) {
            const leadCompleto = leads.find((l) => l.id === id);
            if (leadCompleto) {
              allOps.push({ path: 'leads', id, data: sanitizeForFirestore({ ...leadCompleto, ...patch }) });
            }
          }
          for (const [id, patch] of fichasAtualizarMap.entries()) {
            const fichaCompleta = fichas.find((f) => f.id === id);
            if (fichaCompleta) {
              allOps.push({ path: 'fichas', id, data: sanitizeForFirestore({ ...fichaCompleta, ...patch }) });
            }
          }

          for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
            const chunk = allOps.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            for (const op of chunk) {
              batch.set(doc(db, op.path, op.id), op.data, { merge: true });
            }
            await batch.commit();
          }
        }
      } catch (err) {
        console.error('Erro ao persistir importação em lote no Firestore:', err);
      }

      return {
        totalCriados,
        totalAtualizados,
        totalIgnorados,
        totalErros,
        errosDetalhes,
      };
    },
    [leads, fichas, responsaveis, user]
  );

  // ----------------------------------------------------
  // RESET
  // ----------------------------------------------------

  // ----------------------------------------------------
  // LIMPEZA TOTAL DE LEADS E BANCO SIMULADO
  // ----------------------------------------------------
  const limparTodosLeads = useCallback(async (): Promise<{ totalRemovidos: number }> => {
    const total = leads.length;
    setLeads([]);
    setFichas([]);
    setCompras([]);

    try {
      localStorage.removeItem(STORAGE_KEYS.LEADS);
      localStorage.removeItem(STORAGE_KEYS.FICHAS);
      localStorage.removeItem(STORAGE_KEYS.COMPRAS);
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.FICHAS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify([]));

      if (user) {
        const leadsSnap = await getDocs(collection(db, 'leads'));
        const batch = writeBatch(db);
        leadsSnap.forEach((d) => {
          batch.delete(d.ref);
        });
        const fichasSnap = await getDocs(collection(db, 'fichas'));
        fichasSnap.forEach((d) => {
          batch.delete(d.ref);
        });
        const comprasSnap = await getDocs(collection(db, 'compras'));
        comprasSnap.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
        console.info('🧹 Todos os leads e fichas foram apagados do Firestore.');
      }
    } catch (e) {
      console.error('Erro ao limpar banco de leads:', e);
    }

    return { totalRemovidos: total };
  }, [leads.length, user]);

  const resetarDadosExemplo = useCallback(async () => {
    setLeads(SEED_LEADS);
    setFichas(SEED_FICHAS);
    setCompras(SEED_COMPRAS);
    setResponsaveis(SEED_RESPONSAVEIS);

    try {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(SEED_LEADS));
      localStorage.setItem(STORAGE_KEYS.FICHAS, JSON.stringify(SEED_FICHAS));
      localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(SEED_COMPRAS));
      localStorage.setItem(STORAGE_KEYS.RESPONSAVEIS, JSON.stringify(SEED_RESPONSAVEIS));

      if (user) {
        const batch = writeBatch(db);
        for (const lead of SEED_LEADS) {
          batch.set(doc(db, 'leads', lead.id), sanitizeForFirestore(lead));
        }
        for (const ficha of SEED_FICHAS) {
          batch.set(doc(db, 'fichas', ficha.id), sanitizeForFirestore(ficha));
        }
        for (const compra of SEED_COMPRAS) {
          batch.set(doc(db, 'compras', compra.id), sanitizeForFirestore(compra));
        }
        await batch.commit();
      }
    } catch (e) {
      console.warn('Erro ao resetar dados:', e);
    }
  }, [user]);

  // Filtra apenas itens não deletados para consumo padrão das telas com isolamento por empresa
  const todosLeads = useMemo(() => leads.filter((l) => !l.deleted_at), [leads]);
  const todasCompras = useMemo(() => compras.filter((c) => !c.deleted_at), [compras]);
  const todosProcedimentos = useMemo(() => procedimentos.filter((p) => !p.deleted_at), [procedimentos]);

  const leadsAtivos = useMemo(() => {
    return todosLeads.filter((l) => {
      if (targetEmpresaId === ID_EMPRESA_PADRAO) {
        return !l.empresaId || l.empresaId === ID_EMPRESA_PADRAO;
      }
      return l.empresaId === targetEmpresaId;
    });
  }, [todosLeads, targetEmpresaId]);

  const fichasAtivas = useMemo(() => {
    return fichas.filter((f) => {
      if (f.deleted_at) return false;
      if (targetEmpresaId === ID_EMPRESA_PADRAO) {
        return !f.empresaId || f.empresaId === ID_EMPRESA_PADRAO;
      }
      return f.empresaId === targetEmpresaId;
    });
  }, [fichas, targetEmpresaId]);

  const comprasAtivas = useMemo(() => {
    return todasCompras.filter((c) => {
      if (targetEmpresaId === ID_EMPRESA_PADRAO) {
        return !c.empresaId || c.empresaId === ID_EMPRESA_PADRAO;
      }
      return c.empresaId === targetEmpresaId;
    });
  }, [todasCompras, targetEmpresaId]);

  const procedimentosAtivos = useMemo(() => {
    return todosProcedimentos.filter((p) => {
      if (targetEmpresaId === ID_EMPRESA_PADRAO) {
        return !p.empresaId || p.empresaId === ID_EMPRESA_PADRAO;
      }
      return p.empresaId === targetEmpresaId;
    });
  }, [todosProcedimentos, targetEmpresaId]);

  // Inteligência de Mercado e Métricas dos Procedimentos
  const estatisticasProcedimentos = useMemo((): EstatisticasProcedimento[] => {
    const hojeDate = new Date();

    return procedimentosAtivos.map((proc) => {
      // 1. Leads com interesse correspondente
      const leadsInteresse = leadsAtivos.filter((l) => {
        const match = casarProcedimentoComTexto(l.interesse, [proc]);
        return !!match;
      });

      // 2. Compras registradas deste procedimento
      const comprasProc = comprasAtivas.filter((c) => {
        const match = casarProcedimentoComTexto(c.procedimento, [proc]);
        return !!match;
      });

      // 3. Leads convertidos com compra ou status de venda feita
      const leadsConvertidos = leadsAtivos.filter((l) => {
        const comprou = comprasProc.some((c) => c.leadId === l.id);
        const matchInteresse = casarProcedimentoComTexto(l.interesse, [proc]);
        return comprou || (matchInteresse && l.statusVenda === 'Venda feita');
      });

      const totalProcura = Math.max(leadsInteresse.length, leadsConvertidos.length, comprasProc.length);
      const totalConvertidos = Math.max(comprasProc.length, leadsConvertidos.length);
      const taxaConversao = totalProcura > 0 ? Math.min(100, Math.round((totalConvertidos / totalProcura) * 100)) : 0;

      const faturamentoTotal =
        comprasProc.reduce((sum, c) => sum + (Number(c.valor) || 0), 0) ||
        (totalConvertidos > 0 ? totalConvertidos * proc.valor : 0);

      const ticketMedio = totalConvertidos > 0 ? Math.round(faturamentoTotal / totalConvertidos) : proc.valor;

      // Pacientes em pós-procedimento
      const pacientesPosProcedimento = leadsAtivos.filter((l) => {
        if (l.situacao !== 'Pós procedimento') return false;
        const comprou = comprasProc.some((c) => c.leadId === l.id);
        const match = casarProcedimentoComTexto(l.interesse, [proc]);
        return comprou || !!match;
      }).length;

      // Pacientes prestes a atingir o prazo de reativação (<= 20 dias restantes)
      const pacientesPrestesAVencer = leadsAtivos.filter((l) => {
        if (l.situacao !== 'Pós procedimento') return false;
        const comprou = comprasProc.some((c) => c.leadId === l.id);
        const match = casarProcedimentoComTexto(l.interesse, [proc]);
        if (!comprou && !match) return false;

        const comprasLead = comprasProc.filter((c) => c.leadId === l.id);
        const dataRefStr = comprasLead.length > 0 ? comprasLead[0].data : l.dataEntrada;
        const diasPassados = Math.floor((hojeDate.getTime() - new Date(dataRefStr).getTime()) / (1000 * 60 * 60 * 24));
        const diasRestantes = proc.duracaoDias - diasPassados;
        return diasRestantes > 0 && diasRestantes <= 20;
      }).length;

      // Pacientes que já atingiram o prazo e entraram na aba Reativação
      const pacientesReativadosPrazo = leadsAtivos.filter((l) => {
        if (l.situacao !== 'Reativação') return false;
        const comprou = comprasProc.some((c) => c.leadId === l.id);
        const match = casarProcedimentoComTexto(l.interesse, [proc]);
        return comprou || !!match;
      }).length;

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
  }, [procedimentosAtivos, leadsAtivos, comprasAtivas]);

  // Lista de responsáveis baseada exclusivamente nos colaboradores cadastrados pelo Gestor
  const responsaveisEfetivos = useMemo<string[]>(() => {
    if (usuarios && usuarios.length > 0) {
      const ativos = usuarios
        .filter((u) => !u.deleted_at && u.ativo !== false)
        .map((u) => u.nome.trim())
        .filter(Boolean);
      if (ativos.length > 0) return ativos;
    }
    return responsaveis;
  }, [usuarios, responsaveis]);

  return (
    <CrmContext.Provider
      value={{
        leads: leadsAtivos,
        fichas: fichasAtivas,
        compras: comprasAtivas,
        responsaveis: responsaveisEfetivos,
        procedimentos: procedimentosAtivos,
        todosLeads,
        todasCompras,
        todosProcedimentos,
        estatisticasProcedimentos,
        isFirestoreConnected,
        isSyncing,
        leadFichaAbertoId,
        isFichaLeadOpen,
        abrirFichaLead,
        fecharFichaLead,
        criarLead,
        atualizarLead,
        excluirLead,
        obterLeadPorId,
        reativarLead,
        marcarComoPerdido,
        definirEtapaPorSituacao,
        definirEtapaSituacaoAtual,
        obterEtapaAtual,
        definirStatusGrupoNutricao,
        obterFichaPorLead,
        atualizarFichaLead,
        lancarCompra,
        removerCompra,
        obterComprasPorLead,
        criarProcedimento,
        atualizarProcedimento,
        excluirProcedimento,
        obterProcedimentoPorId,
        obterProcedimentoPorNomeOuInteresse,
        verificarEExecutarReativacaoAutomatica,
        adicionarResponsavel,
        removerResponsavel,
        importarLeadsEmLote,
        resetarDadosExemplo,
        limparTodosLeads,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = (): CrmContextType => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm deve ser utilizado dentro de um CrmProvider');
  }
  return context;
};
