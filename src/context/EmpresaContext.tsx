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
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, sanitizeForFirestore } from '../lib/firebase';
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
    try {
      const salvo = localStorage.getItem(STORAGE_KEYS.EMPRESA_ATIVA_ID);
      if (salvo) return salvo;
    } catch (e) {}
    return ID_EMPRESA_PADRAO;
  });

  const [isCarregando, setIsCarregando] = useState<boolean>(false);
  const [isCarregandoConfig, setIsCarregandoConfig] = useState<boolean>(false);

  // Detecção de usuário logado (via props, session storage ou Firebase Auth)
  const [detectedEmail, setDetectedEmail] = useState<string>(() => {
    if (userAuthEmail) return userAuthEmail;
    try {
      const sess = localStorage.getItem('crm_estetica_session_v1');
      if (sess) {
        const p = JSON.parse(sess);
        if (p && p.email) return p.email;
      }
    } catch (e) {}
    return '';
  });

  const [detectedId, setDetectedId] = useState<string>(() => {
    if (userAuthId) return userAuthId;
    try {
      const sess = localStorage.getItem('crm_estetica_session_v1');
      if (sess) {
        const p = JSON.parse(sess);
        if (p && p.id) return p.id;
      }
    } catch (e) {}
    return '';
  });

  useEffect(() => {
    if (userAuthEmail) setDetectedEmail(userAuthEmail);
    if (userAuthId) setDetectedId(userAuthId);
  }, [userAuthEmail, userAuthId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        if (fbUser.email) setDetectedEmail(fbUser.email);
        if (fbUser.uid) setDetectedId(fbUser.uid);
      }
    });
    return () => unsub();
  }, []);

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

  // Sincronização em tempo real com Firestore para coleções de multiempresa
  useEffect(() => {
    let unsubs: Array<() => void> = [];

    const inicializarFirestoreMultiempresa = async () => {
      try {
        // Inicializar empresas se vazio
        const snapEmpresas = await getDocs(collection(db, 'empresas'));
        if (snapEmpresas.empty) {
          const batch = writeBatch(db);
          for (const emp of SEED_EMPRESAS) {
            batch.set(doc(db, 'empresas', emp.id), sanitizeForFirestore(emp));
          }
          await batch.commit();
        }

        // Inicializar membros se vazio
        const snapMembros = await getDocs(collection(db, 'empresa_membros'));
        if (snapMembros.empty) {
          const batch = writeBatch(db);
          for (const m of SEED_EMPRESA_MEMBROS) {
            batch.set(doc(db, 'empresa_membros', m.id), sanitizeForFirestore(m));
          }
          await batch.commit();
        }

        // Inicializar admins da plataforma se vazio
        const snapPlat = await getDocs(collection(db, 'plataforma_admins'));
        if (snapPlat.empty) {
          const batch = writeBatch(db);
          for (const p of SEED_PLATAFORMA_ADMINS) {
            batch.set(doc(db, 'plataforma_admins', p.id), sanitizeForFirestore(p));
          }
          await batch.commit();
        }
      } catch (err) {
        console.warn('Nota de inicialização Firestore Multiempresa:', err);
      }

      // Listeners
      try {
        const u1 = onSnapshot(
          collection(db, 'empresas'),
          (snapshot) => {
            if (!snapshot.empty) {
              const list: Empresa[] = [];
              snapshot.forEach((d) => list.push(d.data() as Empresa));
              setEmpresas(list);
            }
          },
          (err) => {
            console.warn('Firestore empresas snapshot listener notice:', err);
          }
        );
        unsubs.push(u1);

        const u2 = onSnapshot(
          collection(db, 'empresa_membros'),
          (snapshot) => {
            if (!snapshot.empty) {
              const list: EmpresaMembro[] = [];
              snapshot.forEach((d) => list.push(d.data() as EmpresaMembro));
              setEmpresaMembros(list);
            }
          },
          (err) => {
            console.warn('Firestore empresa_membros snapshot listener notice:', err);
          }
        );
        unsubs.push(u2);

        const u3 = onSnapshot(
          collection(db, 'plataforma_admins'),
          (snapshot) => {
            if (!snapshot.empty) {
              const list: PlataformaAdmin[] = [];
              snapshot.forEach((d) => list.push(d.data() as PlataformaAdmin));
              setPlataformaAdmins(list);
            }
          },
          (err) => {
            console.warn('Firestore plataforma_admins snapshot listener notice:', err);
          }
        );
        unsubs.push(u3);
      } catch (e) {
        console.warn('Erro ao escutar Firestore multiempresa:', e);
      }
    };

    inicializarFirestoreMultiempresa();

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, []);

  // Verificar se o usuário autenticado é Gestor Geral da Plataforma
  const isPlataformaAdmin = useMemo<boolean>(() => {
    const emailLimpo = (detectedEmail || userAuthEmail || '').trim().toLowerCase();
    const idLimpo = (detectedId || userAuthId || '').trim();

    // Master gestor explícito do projeto
    if (emailLimpo === 'caducanes@gmail.com') return true;

    // Verificar na lista de admins da plataforma
    const estaNaLista = plataformaAdmins.some(
      (p) =>
        (p.email && p.email.trim().toLowerCase() === emailLimpo && emailLimpo !== '') ||
        (p.userId && p.userId === idLimpo && idLimpo !== '')
    );
    if (estaNaLista) return true;

    // Fallback para gestor principal no seed
    if (emailLimpo === 'gestao@agdarodrigues.med.br') return true;

    return false;
  }, [detectedEmail, detectedId, userAuthEmail, userAuthId, plataformaAdmins]);

  // Membro atual do usuário
  const membroAtual = useMemo<EmpresaMembro | null>(() => {
    const emailLimpo = (detectedEmail || userAuthEmail || '').trim().toLowerCase();
    const idLimpo = (detectedId || userAuthId || '').trim();

    const membro = empresaMembros.find(
      (m) =>
        m.ativo &&
        ((m.usuarioEmail && m.usuarioEmail.trim().toLowerCase() === emailLimpo && emailLimpo !== '') ||
          m.userId === idLimpo)
    );

    return membro || null;
  }, [detectedEmail, detectedId, userAuthEmail, userAuthId, empresaMembros]);

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
    if (isPlataformaAdmin) return false; // Gestor da plataforma nunca é bloqueado por suspensão
    return empresaAtiva?.status === 'suspensa';
  }, [isPlataformaAdmin, empresaAtiva]);

  const statusAcesso = useMemo<StatusAcessoUsuario>(() => {
    if (isPlataformaAdmin) return 'ativo';
    const email = (detectedEmail || userAuthEmail || '').trim();
    const id = (detectedId || userAuthId || '').trim();
    if (!email && !id) return 'pendente';
    if (!membroAtual) return 'pendente';
    if (isEmpresaSuspensa) return 'empresa_suspensa';
    return 'ativo';
  }, [isPlataformaAdmin, detectedEmail, detectedId, userAuthEmail, userAuthId, membroAtual, isEmpresaSuspensa]);

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

  // ----------------------------------------------------
  // OPERAÇÕES DE GESTÃO DA PLATAFORMA (SUPER ADMIN)
  // ----------------------------------------------------

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
        logoAltura: 'padrao',
        logoAjusteLateral: 'total',
        logoFundoHeader: 'integrado',
        estetica: ESTETICAS_PRESET[0],
        esteticasSalvas: ESTETICAS_PRESET,
        adminPrincipalNome: payload.adminNome?.trim() || '',
        adminPrincipalEmail: payload.adminEmail?.trim().toLowerCase() || '',
        totalUsuarios: payload.adminEmail ? 1 : 0,
        totalPacientes: 0,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        version: 1,
      };

      // 1. Atualizar state
      setEmpresas((prev) => [novaEmpresa, ...prev]);

      // 2. Salvar no Firestore
      try {
        await setDoc(doc(db, 'empresas', id), sanitizeForFirestore(novaEmpresa));
      } catch (e) {
        console.error('Erro ao salvar nova empresa no Firestore:', e);
      }

      // Se passou dados do administrador inicial da empresa, cria o membro e usuário
      if (payload.adminEmail && payload.adminNome) {
        const userId = generateId('user');
        const membroId = generateId('membro');

        const novoMembro: EmpresaMembro = {
          id: membroId,
          userId,
          empresaId: id,
          papel: 'admin',
          ativo: true,
          usuarioNome: payload.adminNome.trim(),
          usuarioEmail: payload.adminEmail.trim().toLowerCase(),
          usuarioCargo: payload.adminCargo?.trim() || 'Administrador da Empresa',
          ultimoAcesso: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
          version: 1,
        };

        setEmpresaMembros((prev) => [novoMembro, ...prev]);

        try {
          await setDoc(doc(db, 'empresa_membros', membroId), sanitizeForFirestore(novoMembro));
        } catch (e) {}
      }

      return novaEmpresa;
    },
    []
  );

  const atualizarEmpresa = useCallback(
    async (empresaId: string, payload: AtualizarEmpresaPayload): Promise<Empresa | null> => {
      const timestamp = new Date().toISOString();
      let atualizada: Empresa | null = null;

      // Filtra apenas valores que NÃO são undefined
      const payloadLimpo: Record<string, any> = {};
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined) {
          payloadLimpo[key] = value;
        }
      }

      setEmpresas((prev) =>
        prev.map((emp) => {
          if (emp.id !== empresaId) return emp;
          atualizada = {
            ...emp,
            ...payloadLimpo,
            updated_at: timestamp,
            version: (emp.version || 1) + 1,
          };
          return atualizada;
        })
      );

      if (atualizada) {
        try {
          await setDoc(doc(db, 'empresas', empresaId), sanitizeForFirestore(atualizada), { merge: true });
        } catch (e) {
          console.error('Erro ao atualizar empresa no Firestore:', e);
        }
      }

      return atualizada;
    },
    []
  );

  const suspenderEmpresa = useCallback(
    async (empresaId: string): Promise<boolean> => {
      const res = await atualizarEmpresa(empresaId, { status: 'suspensa' });
      return Boolean(res);
    },
    [atualizarEmpresa]
  );

  const reativarEmpresa = useCallback(
    async (empresaId: string): Promise<boolean> => {
      const res = await atualizarEmpresa(empresaId, { status: 'ativa' });
      return Boolean(res);
    },
    [atualizarEmpresa]
  );

  const excluirEmpresa = useCallback(
    async (empresaId: string): Promise<boolean> => {
      if (empresaId === ID_EMPRESA_PADRAO) {
        throw new Error('A empresa padrão inicial não pode ser excluída.');
      }

      setEmpresas((prev) => prev.filter((e) => e.id !== empresaId));
      setEmpresaMembros((prev) => prev.filter((m) => m.empresaId !== empresaId));

      try {
        await deleteDoc(doc(db, 'empresas', empresaId));
      } catch (e) {
        console.error('Erro ao excluir empresa no Firestore:', e);
      }

      if (empresaAtivaId === empresaId) {
        setEmpresaAtivaId(ID_EMPRESA_PADRAO);
      }

      return true;
    },
    [empresaAtivaId]
  );

  // ----------------------------------------------------
  // GESTÃO DE MEMBROS E VÍNCULOS
  // ----------------------------------------------------

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
        usuarioNome: dadosUsuario?.nome || 'Novo Colaborador',
        usuarioEmail: dadosUsuario?.email || '',
        usuarioCargo: dadosUsuario?.cargo || (papel === 'admin' ? 'Administrador' : 'Operador'),
        ultimoAcesso: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        version: 1,
      };

      setEmpresaMembros((prev) => [novoMembro, ...prev]);

      try {
        await setDoc(doc(db, 'empresa_membros', id), sanitizeForFirestore(novoMembro));
      } catch (e) {
        console.error('Erro ao vincular membro no Firestore:', e);
      }

      return novoMembro;
    },
    []
  );

  const transferirUsuarioEmpresa = useCallback(
    async (
      userId: string,
      novaEmpresaId: string,
      novoPapel?: PapelEmpresa
    ): Promise<boolean> => {
      const timestamp = new Date().toISOString();

      setEmpresaMembros((prev) =>
        prev.map((m) => {
          if (m.userId !== userId && m.id !== userId) return m;
          return {
            ...m,
            empresaId: novaEmpresaId,
            papel: novoPapel || m.papel,
            updated_at: timestamp,
            version: m.version + 1,
          };
        })
      );

      // Sincroniza membros no Firestore
      try {
        const snap = await getDocs(collection(db, 'empresa_membros'));
        snap.forEach(async (docSnap) => {
          const data = docSnap.data() as EmpresaMembro;
          if (data.userId === userId || data.id === userId) {
            await updateDoc(docSnap.ref, {
              empresaId: novaEmpresaId,
              papel: novoPapel || data.papel,
              updated_at: timestamp,
            });
          }
        });
      } catch (e) {}

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

      try {
        await updateDoc(doc(db, 'empresa_membros', membroId), {
          papel: novoPapel,
          updated_at: timestamp,
        });
      } catch (e) {
        console.error('Erro ao alterar papel do membro:', e);
      }

      return true;
    },
    []
  );

  const removerAcessoUsuario = useCallback(
    async (membroId: string): Promise<boolean> => {
      setEmpresaMembros((prev) => prev.filter((m) => m.id !== membroId));

      try {
        await deleteDoc(doc(db, 'empresa_membros', membroId));
      } catch (e) {
        console.error('Erro ao remover membro do Firestore:', e);
      }

      return true;
    },
    []
  );

  const promoverParaAdminPlataforma = useCallback(
    async (userId: string, email: string, nome?: string): Promise<boolean> => {
      const timestamp = new Date().toISOString();
      const id = generateId('plat-admin');

      const novoAdmin: PlataformaAdmin = {
        id,
        userId,
        email: email.trim().toLowerCase(),
        nome: nome?.trim() || 'Gestor da Plataforma',
        criadoPor: 'Gestor Geral',
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        version: 1,
      };

      setPlataformaAdmins((prev) => [novoAdmin, ...prev]);

      try {
        await setDoc(doc(db, 'plataforma_admins', id), sanitizeForFirestore(novoAdmin));
      } catch (e) {
        console.error('Erro ao salvar admin da plataforma:', e);
      }

      return true;
    },
    []
  );

  const removerAdminPlataforma = useCallback(
    async (userId: string): Promise<boolean> => {
      setPlataformaAdmins((prev) => prev.filter((p) => p.userId !== userId && p.id !== userId));

      try {
        const snap = await getDocs(collection(db, 'plataforma_admins'));
        snap.forEach(async (d) => {
          const data = d.data() as PlataformaAdmin;
          if (data.userId === userId || data.id === userId) {
            await deleteDoc(d.ref);
          }
        });
      } catch (e) {}

      return true;
    },
    []
  );

  // ----------------------------------------------------
  // CONFIGURAÇÕES VISUAIS DA EMPRESA ATIVA
  // ----------------------------------------------------

  const atualizarConfig = useCallback(
    async (novosDados: Partial<ConfiguracoesEmpresa>): Promise<boolean> => {
      if (!empresaAtivaId) return false;
      setIsCarregandoConfig(true);

      try {
        const payloadAtualizacao: AtualizarEmpresaPayload = {};
        if (novosDados.nomeEmpresa !== undefined) payloadAtualizacao.nome = novosDados.nomeEmpresa;
        if (novosDados.subtitulo !== undefined) payloadAtualizacao.subtitulo = novosDados.subtitulo;
        if (novosDados.tipoLogo !== undefined) payloadAtualizacao.tipoLogo = novosDados.tipoLogo;
        if (novosDados.logoUrl !== undefined) payloadAtualizacao.logoUrl = novosDados.logoUrl;
        if (novosDados.monogramaIniciais !== undefined) payloadAtualizacao.monogramaIniciais = novosDados.monogramaIniciais;
        if (novosDados.logoAltura !== undefined) payloadAtualizacao.logoAltura = novosDados.logoAltura;
        if (novosDados.logoAjusteLateral !== undefined) payloadAtualizacao.logoAjusteLateral = novosDados.logoAjusteLateral;
        if (novosDados.logoFundoHeader !== undefined) payloadAtualizacao.logoFundoHeader = novosDados.logoFundoHeader;
        if (novosDados.cnpj !== undefined) payloadAtualizacao.cnpj = novosDados.cnpj;
        if (novosDados.registroProfissional !== undefined) payloadAtualizacao.registroProfissional = novosDados.registroProfissional;
        if (novosDados.telefone !== undefined) payloadAtualizacao.telefone = novosDados.telefone;
        if (novosDados.email !== undefined) payloadAtualizacao.email = novosDados.email;
        if (novosDados.endereco !== undefined) payloadAtualizacao.endereco = novosDados.endereco;
        if (novosDados.horarioFuncionamento !== undefined) payloadAtualizacao.horarioFuncionamento = novosDados.horarioFuncionamento;
        if (novosDados.unidadePadrao !== undefined) payloadAtualizacao.unidadePadrao = novosDados.unidadePadrao;
        if (novosDados.estetica !== undefined) payloadAtualizacao.estetica = novosDados.estetica;
        if (novosDados.esteticasSalvas !== undefined) payloadAtualizacao.esteticasSalvas = novosDados.esteticasSalvas;

        if (novosDados.estetica) {
          aplicarVariaveisCss(novosDados.estetica);
        }

        await atualizarEmpresa(empresaAtivaId, payloadAtualizacao);
        return true;
      } catch (error) {
        console.error('Erro ao atualizar configurações da empresa:', error);
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
      return atualizarConfig({ estetica });
    },
    [atualizarConfig]
  );

  const salvarNovaEstetica = useCallback(
    async (novaEstetica: EsteticaPlataforma): Promise<boolean> => {
      try {
        const esteticasAtuais = config.esteticasSalvas || ESTETICAS_PRESET;
        const indexExistente = esteticasAtuais.findIndex(
          (e) => e.idPreset === novaEstetica.idPreset
        );
        let novaLista: EsteticaPlataforma[];

        if (indexExistente >= 0) {
          novaLista = [...esteticasAtuais];
          novaLista[indexExistente] = novaEstetica;
        } else {
          novaLista = [...esteticasAtuais, novaEstetica];
        }

        if (empresaAtivaId) {
          await atualizarEmpresa(empresaAtivaId, {
            estetica: novaEstetica,
          });
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
