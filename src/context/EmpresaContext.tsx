import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  Empresa,
  EmpresaMembro,
  PlataformaAdmin,
  PapelEmpresa,
  StatusEmpresa,
  StatusAcessoUsuario,
  CriarEmpresaPayload,
  AtualizarEmpresaPayload,
  ConfiguracoesEmpresa,
  EsteticaPlataforma,
  ESTETICAS_PRESET,
} from '../types';
import {
  ID_EMPRESA_PADRAO,
  SEED_EMPRESAS,
  SEED_EMPRESA_MEMBROS,
  SEED_PLATAFORMA_ADMINS,
} from '../data/seedData';
import { obterCoresSidebarCompletas, aplicarVariaveisCss } from '../utils/estetica';
import { supabaseService, supabaseMapper } from '../services/supabaseService';
import { isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';
import { useAuth } from './AuthContext';

const STORAGE_KEYS = {
  EMPRESAS: 'crm_multiempresa_empresas_v1',
  MEMBROS: 'crm_multiempresa_membros_v1',
  PLATAFORMA_ADMINS: 'crm_multiempresa_plat_admins_v1',
  EMPRESA_ATIVA_ID: 'crm_multiempresa_empresa_ativa_id_v1',
};

export const CONFIGURACOES_PADRAO_EMPRESA: ConfiguracoesEmpresa = {
  nomeEmpresa: 'Dra. Agda Rodrigues',
  subtitulo: 'Harmonização Facial & Medicina Estética',
  tipoLogo: 'monograma',
  monogramaIniciais: 'AR',
  logoAltura: 'padrao',
  logoAjusteLateral: 'total',
  logoFundoHeader: 'integrado',
  cnpj: '45.123.456/0001-89',
  registroProfissional: 'CRM/SP 198.432 - RQE 87.654',
  telefone: '(11) 98765-4321',
  email: 'contato@agdarodrigues.med.br',
  endereco: 'Av. Brigadeiro Faria Lima, 3477 - 14º andar, Itaim Bibi - São Paulo/SP',
  horarioFuncionamento: 'Segunda a Sexta: 08h às 20h | Sábado: 08h às 14h',
  unidadePadrao: 'Consultório Principal - Sala 1402',
  estetica: ESTETICAS_PRESET[0],
  esteticasSalvas: ESTETICAS_PRESET,
  updated_at: new Date().toISOString(),
};

export const CONFIGURACOES_PADRAO = CONFIGURACOES_PADRAO_EMPRESA;

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

interface EmpresaContextType {
  // Lista de empresas e membros
  empresas: Empresa[];
  empresaMembros: EmpresaMembro[];
  plataformaAdmins: PlataformaAdmin[];

  // Empresa ativa no contexto atual
  empresaAtivaId: string;
  empresaAtiva: Empresa | null;
  definirEmpresaAtivaId: (id: string) => void;

  // Papéis e status
  isPlataformaAdmin: boolean;
  membroAtual: EmpresaMembro | null;
  statusAcesso: StatusAcessoUsuario;
  isEmpresaSuspensa: boolean;
  isCarregando: boolean;

  // Operações de Empresa (Exclusivo Gestor Plataforma)
  criarEmpresa: (payload: CriarEmpresaPayload) => Promise<Empresa>;
  atualizarEmpresa: (empresaId: string, payload: AtualizarEmpresaPayload) => Promise<Empresa | null>;
  suspenderEmpresa: (empresaId: string) => Promise<boolean>;
  reativarEmpresa: (empresaId: string) => Promise<boolean>;
  excluirEmpresa: (empresaId: string) => Promise<boolean>;

  // Gestão de Membros & Vínculos
  vincularUsuarioEmpresa: (
    userId: string,
    empresaId: string,
    papel: PapelEmpresa,
    dadosUsuario?: { nome?: string; email?: string; cargo?: string }
  ) => Promise<EmpresaMembro>;
  transferirUsuarioEmpresa: (
    userId: string,
    novaEmpresaId: string,
    novoPapel?: PapelEmpresa
  ) => Promise<boolean>;
  alterarPapelMembro: (membroId: string, novoPapel: PapelEmpresa) => Promise<boolean>;
  removerAcessoUsuario: (membroId: string) => Promise<boolean>;

  // Gestão de Admins Globais da Plataforma
  promoverParaAdminPlataforma: (userId: string, email: string, nome?: string) => Promise<boolean>;
  removerAdminPlataforma: (userId: string) => Promise<boolean>;

  // Configurações & Estética da Empresa Ativa
  config: ConfiguracoesEmpresa;
  isCarregandoConfig: boolean;
  atualizarConfig: (novosDados: Partial<ConfiguracoesEmpresa>) => Promise<boolean>;
  aplicarEstetica: (estetica: EsteticaPlataforma) => Promise<boolean>;
  salvarNovaEstetica: (novaEstetica: EsteticaPlataforma) => Promise<boolean>;
  removerEsteticaSalva: (idPreset: string) => Promise<boolean>;
  resetarConfiguracoes: () => Promise<boolean>;
  uploadLogoArquivo: (file: File) => Promise<{ sucesso: boolean; mensagem?: string }>;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export const EmpresaProvider: React.FC<{
  children: ReactNode;
  userAuthEmail?: string | null;
  userAuthId?: string | null;
}> = ({ children, userAuthEmail, userAuthId }) => {
  // Tenta obter os dados do usuário autenticado a partir do AuthContext
  let authUserEmail = userAuthEmail || '';
  let authUserId = userAuthId || '';
  let authEmpresaId = '';

  try {
    const auth = useAuth();
    if (auth?.user) {
      authUserEmail = auth.user.email || authUserEmail;
      authUserId = auth.user.uid || authUserId;
      authEmpresaId =
        auth.usuarioLogado?.empresa_id ||
        auth.usuarioLogado?.empresaId ||
        auth.responsavelAtivo?.empresa_id ||
        auth.user.empresa_id ||
        '';
    }
  } catch (e) {
    // Caso o AuthProvider não esteja envelopando (ex: renderização isolada)
  }

  // 1. Estados das Empresas
  const [empresas, setEmpresas] = useState<Empresa[]>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEYS.EMPRESAS);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar empresas do storage:', e);
    }
    return SEED_EMPRESAS;
  });

  // 2. Estados dos Membros
  const [empresaMembros, setEmpresaMembros] = useState<EmpresaMembro[]>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEYS.MEMBROS);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar membros do storage:', e);
    }
    return SEED_EMPRESA_MEMBROS;
  });

  // 3. Admins da Plataforma
  const [plataformaAdmins, setPlataformaAdmins] = useState<PlataformaAdmin[]>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEYS.PLATAFORMA_ADMINS);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar admins da plataforma do storage:', e);
    }
    return SEED_PLATAFORMA_ADMINS;
  });

  // 4. Empresa Ativa Selecionada
  const [empresaAtivaId, setEmpresaAtivaId] = useState<string>(() => {
    if (authEmpresaId) return authEmpresaId;
    try {
      const salvo = localStorage.getItem(STORAGE_KEYS.EMPRESA_ATIVA_ID);
      if (salvo) return salvo;
    } catch (e) {}
    return ID_EMPRESA_PADRAO;
  });

  const [isCarregando, setIsCarregando] = useState<boolean>(false);
  const [isCarregandoConfig, setIsCarregandoConfig] = useState<boolean>(false);

  // Sincroniza a empresa ativa quando o usuário logado muda de empresa
  useEffect(() => {
    if (authEmpresaId && authEmpresaId !== empresaAtivaId) {
      setEmpresaAtivaId(authEmpresaId);
    }
  }, [authEmpresaId]);

  // Persistência local imediata
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EMPRESAS, JSON.stringify(empresas));
    } catch (e) {}
  }, [empresas]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBROS, JSON.stringify(empresaMembros));
    } catch (e) {}
  }, [empresaMembros]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLATAFORMA_ADMINS, JSON.stringify(plataformaAdmins));
    } catch (e) {}
  }, [plataformaAdmins]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EMPRESA_ATIVA_ID, empresaAtivaId);
    } catch (e) {}
  }, [empresaAtivaId]);

  // Sincronização em tempo real de Empresas via Supabase
  const carregarEmpresasSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const client = getSupabaseClient();
      if (!client) return;
      const { data, error } = await client
        .from('empresas')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (!error && data && data.length > 0) {
        const list = data.map(supabaseMapper.dbToEmpresa);
        setEmpresas(list);
      }
    } catch (e) {
      console.warn('Aviso sobre carregamento de empresas do Supabase:', e);
    }
  }, []);

  useEffect(() => {
    let channel: any = null;

    const iniciarEmpresasRealtime = () => {
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (e) {}
        channel = null;
      }

      if (isSupabaseConfigured()) {
        carregarEmpresasSupabase();
        const client = getSupabaseClient();
        if (client) {
          channel = client
            .channel('empresa_realtime_channel_' + Date.now())
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'empresas' },
              () => {
                carregarEmpresasSupabase();
              }
            )
            .subscribe();
        }
      }
    };

    iniciarEmpresasRealtime();

    const handleConfigOrFocus = () => {
      iniciarEmpresasRealtime();
    };

    window.addEventListener('supabase-config-changed', handleConfigOrFocus);
    window.addEventListener('focus', handleConfigOrFocus);

    return () => {
      window.removeEventListener('supabase-config-changed', handleConfigOrFocus);
      window.removeEventListener('focus', handleConfigOrFocus);
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (e) {}
      }
    };
  }, [carregarEmpresasSupabase]);

  // Verificar se o usuário autenticado é Gestor Geral da Plataforma
  const isPlataformaAdmin = useMemo<boolean>(() => {
    const emailLimpo = (authUserEmail || '').trim().toLowerCase();
    const idLimpo = (authUserId || '').trim();

    if (emailLimpo === 'caducanes@gmail.com') return true;

    const estaNaLista = plataformaAdmins.some(
      (p) =>
        (p.email && p.email.trim().toLowerCase() === emailLimpo && emailLimpo !== '') ||
        (p.userId && p.userId === idLimpo && idLimpo !== '')
    );
    if (estaNaLista) return true;

    if (emailLimpo === 'gestao@agdarodrigues.med.br') return true;

    return false;
  }, [authUserEmail, authUserId, plataformaAdmins]);

  // Membro atual do usuário
  const membroAtual = useMemo<EmpresaMembro | null>(() => {
    const emailLimpo = (authUserEmail || '').trim().toLowerCase();
    const idLimpo = (authUserId || '').trim();

    const membro = empresaMembros.find(
      (m) =>
        m.ativo &&
        ((m.usuarioEmail && m.usuarioEmail.trim().toLowerCase() === emailLimpo && emailLimpo !== '') ||
          m.userId === idLimpo)
    );

    return membro || null;
  }, [authUserEmail, authUserId, empresaMembros]);

  // Se o usuário não for admin da plataforma e pertencer a uma empresa, fixa a empresa ativa nele
  useEffect(() => {
    if (!isPlataformaAdmin && membroAtual && membroAtual.empresaId) {
      setEmpresaAtivaId(membroAtual.empresaId);
    }
  }, [isPlataformaAdmin, membroAtual]);

  // Empresa ativa atual
  const empresaAtiva = useMemo<Empresa | null>(() => {
    const found = empresas.find((e) => e.id === empresaAtivaId);
    if (found) return found;
    return empresas.find((e) => e.id === ID_EMPRESA_PADRAO) || empresas[0] || null;
  }, [empresas, empresaAtivaId]);

  // Status de Acesso
  const isEmpresaSuspensa = useMemo<boolean>(() => {
    if (isPlataformaAdmin) return false;
    return empresaAtiva?.status === 'suspensa';
  }, [isPlataformaAdmin, empresaAtiva]);

  const statusAcesso = useMemo<StatusAcessoUsuario>(() => {
    if (isPlataformaAdmin) return 'ativo';
    const email = (authUserEmail || '').trim();
    const id = (authUserId || '').trim();
    if (!email && !id) return 'pendente';
    if (!membroAtual) return 'pendente';
    if (isEmpresaSuspensa) return 'empresa_suspensa';
    return 'ativo';
  }, [isPlataformaAdmin, authUserEmail, authUserId, membroAtual, isEmpresaSuspensa]);

  // Configuração visual da Empresa Ativa
  const config = useMemo<ConfiguracoesEmpresa>(() => {
    const padrao = CONFIGURACOES_PADRAO_EMPRESA;
    if (!empresaAtiva) return padrao;

    const esteticaSegura: EsteticaPlataforma = {
      ...padrao.estetica,
      ...(empresaAtiva.estetica || {}),
    };

    const esteticasSalvasSeguras =
      empresaAtiva.esteticasSalvas && Array.isArray(empresaAtiva.esteticasSalvas) && empresaAtiva.esteticasSalvas.length > 0
        ? empresaAtiva.esteticasSalvas
        : ESTETICAS_PRESET;

    return {
      nomeEmpresa: empresaAtiva.nome || padrao.nomeEmpresa,
      subtitulo: empresaAtiva.subtitulo || padrao.subtitulo,
      tipoLogo: empresaAtiva.tipoLogo || 'monograma',
      logoUrl: empresaAtiva.logoUrl || '',
      monogramaIniciais:
        empresaAtiva.monogramaIniciais ||
        (empresaAtiva.nome
          ? empresaAtiva.nome
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          : 'AR'),
      logoAltura: empresaAtiva.logoAltura || 'padrao',
      logoAjusteLateral: empresaAtiva.logoAjusteLateral || 'total',
      logoFundoHeader: empresaAtiva.logoFundoHeader || 'integrado',
      cnpj: empresaAtiva.cnpj || padrao.cnpj,
      registroProfissional:
        empresaAtiva.registroProfissional || padrao.registroProfissional,
      telefone: empresaAtiva.telefone || padrao.telefone,
      email: empresaAtiva.email || padrao.email,
      endereco: empresaAtiva.endereco || padrao.endereco,
      horarioFuncionamento:
        empresaAtiva.horarioFuncionamento || padrao.horarioFuncionamento,
      unidadePadrao: empresaAtiva.unidadePadrao || padrao.unidadePadrao,
      estetica: esteticaSegura,
      esteticasSalvas: esteticasSalvasSeguras,
      updated_at: empresaAtiva.updated_at || new Date().toISOString(),
    };
  }, [empresaAtiva]);

  // Aplica as variáveis CSS
  useEffect(() => {
    if (config.estetica) {
      aplicarVariaveisCss(config.estetica);
    }
  }, [config.estetica]);

  // OPERAÇÕES DE GESTÃO DA PLATAFORMA (SUPER ADMIN)
  const criarEmpresa = useCallback(
    async (payload: CriarEmpresaPayload): Promise<Empresa> => {
      const timestamp = new Date().toISOString();
      const id = generateId('empresa');
      const iniciais =
        payload.monogramaIniciais ||
        payload.nome
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

      const novaEmpresa: Empresa = {
        id,
        nome: payload.nome.trim(),
        subtitulo: payload.subtitulo?.trim() || '',
        cnpj: payload.cnpj?.trim() || '',
        telefone: payload.telefone?.trim() || '',
        email: payload.email?.trim().toLowerCase() || '',
        endereco: payload.endereco?.trim() || '',
        unidadePadrao: payload.unidadePadrao?.trim() || 'Matriz',
        status: payload.status || 'ativa',
        tipoLogo: payload.tipoLogo || 'monograma',
        monogramaIniciais: iniciais,
        estetica: ESTETICAS_PRESET[0],
        esteticasSalvas: ESTETICAS_PRESET,
        adminPrincipalEmail: payload.adminEmail?.trim().toLowerCase(),
        adminPrincipalNome: payload.adminNome?.trim(),
        totalUsuarios: 1,
        totalPacientes: 0,
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
      };

      setEmpresas((prev) => [novaEmpresa, ...prev]);

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.salvarEmpresa(novaEmpresa);
        } catch (e) {
          console.warn('Erro ao salvar empresa no Supabase:', e);
        }
      }

      return novaEmpresa;
    },
    []
  );

  const atualizarEmpresa = useCallback(
    async (empresaId: string, payload: AtualizarEmpresaPayload): Promise<Empresa | null> => {
      const timestamp = new Date().toISOString();
      let atualizada: Empresa | null = null;

      setEmpresas((prev) =>
        prev.map((e) => {
          if (e.id !== empresaId) return e;

          atualizada = {
            ...e,
            nome: payload.nome !== undefined ? payload.nome.trim() : e.nome,
            subtitulo: payload.subtitulo !== undefined ? payload.subtitulo.trim() : e.subtitulo,
            cnpj: payload.cnpj !== undefined ? payload.cnpj.trim() : e.cnpj,
            registroProfissional:
              payload.registroProfissional !== undefined ? payload.registroProfissional.trim() : e.registroProfissional,
            telefone: payload.telefone !== undefined ? payload.telefone.trim() : e.telefone,
            email: payload.email !== undefined ? payload.email.trim().toLowerCase() : e.email,
            endereco: payload.endereco !== undefined ? payload.endereco.trim() : e.endereco,
            horarioFuncionamento:
              payload.horarioFuncionamento !== undefined ? payload.horarioFuncionamento.trim() : e.horarioFuncionamento,
            unidadePadrao: payload.unidadePadrao !== undefined ? payload.unidadePadrao.trim() : e.unidadePadrao,
            status: payload.status !== undefined ? payload.status : e.status,
            tipoLogo: payload.tipoLogo !== undefined ? payload.tipoLogo : e.tipoLogo,
            logoUrl: payload.logoUrl !== undefined ? payload.logoUrl : e.logoUrl,
            monogramaIniciais:
              payload.monogramaIniciais !== undefined ? payload.monogramaIniciais.trim().toUpperCase() : e.monogramaIniciais,
            logoAltura: payload.logoAltura !== undefined ? payload.logoAltura : e.logoAltura,
            logoAjusteLateral: payload.logoAjusteLateral !== undefined ? payload.logoAjusteLateral : e.logoAjusteLateral,
            logoFundoHeader: payload.logoFundoHeader !== undefined ? payload.logoFundoHeader : e.logoFundoHeader,
            estetica: payload.estetica !== undefined ? payload.estetica : e.estetica,
            esteticasSalvas: payload.esteticasSalvas !== undefined ? payload.esteticasSalvas : e.esteticasSalvas,
            updated_at: timestamp,
            version: e.version + 1,
          };
          return atualizada;
        })
      );

      if (atualizada && isSupabaseConfigured()) {
        try {
          await supabaseService.salvarEmpresa(atualizada);
        } catch (e) {
          console.warn('Erro ao atualizar empresa no Supabase:', e);
        }
      }

      return atualizada;
    },
    []
  );

  const suspenderEmpresa = useCallback(
    async (empresaId: string): Promise<boolean> => {
      const res = await atualizarEmpresa(empresaId, { status: 'suspensa' });
      return res !== null;
    },
    [atualizarEmpresa]
  );

  const reativarEmpresa = useCallback(
    async (empresaId: string): Promise<boolean> => {
      const res = await atualizarEmpresa(empresaId, { status: 'ativa' });
      return res !== null;
    },
    [atualizarEmpresa]
  );

  const excluirEmpresa = useCallback(
    async (empresaId: string): Promise<boolean> => {
      setEmpresas((prev) => prev.filter((e) => e.id !== empresaId));
      if (empresaAtivaId === empresaId) {
        setEmpresaAtivaId(ID_EMPRESA_PADRAO);
      }
      return true;
    },
    [empresaAtivaId]
  );

  // VÍNCULOS E MEMBROS
  const vincularUsuarioEmpresa = useCallback(
    async (
      userId: string,
      empresaId: string,
      papel: PapelEmpresa,
      dadosUsuario?: { nome?: string; email?: string; cargo?: string }
    ): Promise<EmpresaMembro> => {
      const timestamp = new Date().toISOString();
      const id = generateId('membro');

      const novoMembro: EmpresaMembro = {
        id,
        userId,
        empresaId,
        papel,
        ativo: true,
        usuarioNome: dadosUsuario?.nome,
        usuarioEmail: dadosUsuario?.email,
        usuarioCargo: dadosUsuario?.cargo,
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
      };

      setEmpresaMembros((prev) => [novoMembro, ...prev]);
      return novoMembro;
    },
    []
  );

  const transferirUsuarioEmpresa = useCallback(
    async (userId: string, novaEmpresaId: string, novoPapel?: PapelEmpresa): Promise<boolean> => {
      const timestamp = new Date().toISOString();
      setEmpresaMembros((prev) =>
        prev.map((m) => {
          if (m.userId !== userId) return m;
          return {
            ...m,
            empresaId: novaEmpresaId,
            papel: novoPapel || m.papel,
            updated_at: timestamp,
            version: m.version + 1,
          };
        })
      );
      return true;
    },
    []
  );

  const alterarPapelMembro = useCallback(
    async (membroId: string, novoPapel: PapelEmpresa): Promise<boolean> => {
      const timestamp = new Date().toISOString();
      setEmpresaMembros((prev) =>
        prev.map((m) => {
          if (m.id !== membroId) return m;
          return {
            ...m,
            papel: novoPapel,
            updated_at: timestamp,
            version: m.version + 1,
          };
        })
      );
      return true;
    },
    []
  );

  const removerAcessoUsuario = useCallback(async (membroId: string): Promise<boolean> => {
    setEmpresaMembros((prev) => prev.filter((m) => m.id !== membroId));
    return true;
  }, []);

  // ADMINS PLATAFORMA
  const promoverParaAdminPlataforma = useCallback(
    async (userId: string, email: string, nome?: string): Promise<boolean> => {
      const timestamp = new Date().toISOString();
      const novoAdmin: PlataformaAdmin = {
        id: generateId('admin'),
        userId,
        email: email.trim().toLowerCase(),
        nome,
        criadoPor: 'Gestão Master',
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
      };
      setPlataformaAdmins((prev) => [novoAdmin, ...prev]);
      return true;
    },
    []
  );

  const removerAdminPlataforma = useCallback(async (userId: string): Promise<boolean> => {
    setPlataformaAdmins((prev) => prev.filter((p) => p.userId !== userId));
    return true;
  }, []);

  // CONFIGURAÇÃO DA EMPRESA ATIVA
  const atualizarConfig = useCallback(
    async (novosDados: Partial<ConfiguracoesEmpresa>): Promise<boolean> => {
      setIsCarregandoConfig(true);
      try {
        if (!empresaAtivaId) return false;

        const payloadAtualizacao: AtualizarEmpresaPayload = {};

        if (novosDados.nomeEmpresa !== undefined) payloadAtualizacao.nome = novosDados.nomeEmpresa;
        if (novosDados.subtitulo !== undefined) payloadAtualizacao.subtitulo = novosDados.subtitulo;
        if (novosDados.cnpj !== undefined) payloadAtualizacao.cnpj = novosDados.cnpj;
        if (novosDados.registroProfissional !== undefined) payloadAtualizacao.registroProfissional = novosDados.registroProfissional;
        if (novosDados.telefone !== undefined) payloadAtualizacao.telefone = novosDados.telefone;
        if (novosDados.email !== undefined) payloadAtualizacao.email = novosDados.email;
        if (novosDados.endereco !== undefined) payloadAtualizacao.endereco = novosDados.endereco;
        if (novosDados.horarioFuncionamento !== undefined) payloadAtualizacao.horarioFuncionamento = novosDados.horarioFuncionamento;
        if (novosDados.unidadePadrao !== undefined) payloadAtualizacao.unidadePadrao = novosDados.unidadePadrao;
        if (novosDados.tipoLogo !== undefined) payloadAtualizacao.tipoLogo = novosDados.tipoLogo;
        if (novosDados.logoUrl !== undefined) payloadAtualizacao.logoUrl = novosDados.logoUrl;
        if (novosDados.monogramaIniciais !== undefined) payloadAtualizacao.monogramaIniciais = novosDados.monogramaIniciais;
        if (novosDados.logoAltura !== undefined) payloadAtualizacao.logoAltura = novosDados.logoAltura;
        if (novosDados.logoAjusteLateral !== undefined) payloadAtualizacao.logoAjusteLateral = novosDados.logoAjusteLateral;
        if (novosDados.logoFundoHeader !== undefined) payloadAtualizacao.logoFundoHeader = novosDados.logoFundoHeader;
        if (novosDados.estetica !== undefined) payloadAtualizacao.estetica = novosDados.estetica;
        if (novosDados.esteticasSalvas !== undefined) payloadAtualizacao.esteticasSalvas = novosDados.esteticasSalvas;

        const res = await atualizarEmpresa(empresaAtivaId, payloadAtualizacao);
        return res !== null;
      } catch (e) {
        console.error('Erro ao atualizar configurações da empresa:', e);
        return false;
      } finally {
        setIsCarregandoConfig(false);
      }
    },
    [empresaAtivaId, atualizarEmpresa]
  );

  const aplicarEstetica = useCallback(
    async (estetica: EsteticaPlataforma): Promise<boolean> => {
      aplicarVariaveisCss(estetica);
      return await atualizarConfig({ estetica });
    },
    [atualizarConfig]
  );

  const salvarNovaEstetica = useCallback(
    async (novaEstetica: EsteticaPlataforma): Promise<boolean> => {
      try {
        const esteticasAtuais = config.esteticasSalvas || ESTETICAS_PRESET;
        const indexExistente = esteticasAtuais.findIndex((e) => e.idPreset === novaEstetica.idPreset);
        let novaLista: EsteticaPlataforma[];

        if (indexExistente >= 0) {
          novaLista = [...esteticasAtuais];
          novaLista[indexExistente] = novaEstetica;
        } else {
          novaLista = [...esteticasAtuais, novaEstetica];
        }

        if (empresaAtivaId) {
          await atualizarEmpresa(empresaAtivaId, { estetica: novaEstetica });
        }

        return await atualizarConfig({
          estetica: novaEstetica,
          esteticasSalvas: novaLista,
        });
      } catch (e) {
        console.error('Erro ao salvar nova estética:', e);
        return false;
      }
    },
    [config.esteticasSalvas, empresaAtivaId, atualizarEmpresa, atualizarConfig]
  );

  const removerEsteticaSalva = useCallback(
    async (idPreset: string): Promise<boolean> => {
      try {
        const esteticasAtuais = config.esteticasSalvas || ESTETICAS_PRESET;
        if (ESTETICAS_PRESET.some((p) => p.idPreset === idPreset)) {
          return false;
        }

        const novaLista = esteticasAtuais.filter((e) => e.idPreset !== idPreset);
        return await atualizarConfig({ esteticasSalvas: novaLista });
      } catch (e) {
        console.error('Erro ao remover estética:', e);
        return false;
      }
    },
    [config.esteticasSalvas, atualizarConfig]
  );

  const uploadLogoArquivo = useCallback(
    async (file: File): Promise<{ sucesso: boolean; mensagem?: string }> => {
      if (!file) {
        return { sucesso: false, mensagem: 'Nenhum arquivo selecionado.' };
      }

      const tiposPermitidos = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
      if (!tiposPermitidos.includes(file.type)) {
        return {
          sucesso: false,
          mensagem: 'Formato inválido. Utilize PNG, SVG, WEBP ou JPEG.',
        };
      }

      const maxBytes = 2 * 1024 * 1024;
      if (file.size > maxBytes) {
        return {
          sucesso: false,
          mensagem: 'O arquivo excede o limite de 2MB. Otimize a imagem antes de enviar.',
        };
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const dataUrl = reader.result as string;
            await atualizarConfig({
              logoUrl: dataUrl,
              tipoLogo: 'imagem',
            });
            resolve({ sucesso: true, mensagem: 'Logo carregada com sucesso!' });
          } catch (e) {
            resolve({ sucesso: false, mensagem: 'Erro ao processar imagem.' });
          }
        };
        reader.onerror = () => {
          resolve({ sucesso: false, mensagem: 'Falha ao ler arquivo do dispositivo.' });
        };
        reader.readAsDataURL(file);
      });
    },
    [atualizarConfig]
  );

  const resetarConfiguracoes = useCallback(async (): Promise<boolean> => {
    return atualizarConfig(CONFIGURACOES_PADRAO_EMPRESA);
  }, [atualizarConfig]);

  return (
    <EmpresaContext.Provider
      value={{
        empresas,
        empresaMembros,
        plataformaAdmins,
        empresaAtivaId,
        empresaAtiva,
        definirEmpresaAtivaId: setEmpresaAtivaId,
        isPlataformaAdmin,
        membroAtual,
        statusAcesso,
        isEmpresaSuspensa,
        isCarregando,
        criarEmpresa,
        atualizarEmpresa,
        suspenderEmpresa,
        reativarEmpresa,
        excluirEmpresa,
        vincularUsuarioEmpresa,
        transferirUsuarioEmpresa,
        alterarPapelMembro,
        removerAcessoUsuario,
        promoverParaAdminPlataforma,
        removerAdminPlataforma,
        config,
        isCarregandoConfig,
        atualizarConfig,
        aplicarEstetica,
        salvarNovaEstetica,
        removerEsteticaSalva,
        resetarConfiguracoes,
        uploadLogoArquivo,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = (): EmpresaContextType => {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa deve ser utilizado dentro de um EmpresaProvider');
  }
  return context;
};
