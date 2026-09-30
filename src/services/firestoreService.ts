import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth, sanitizeForFirestore } from '../lib/firebase';
import {
  Lead,
  FichaLead,
  Compra,
  ProcedimentoClinica,
  UsuarioColaborador,
  Empresa,
  EmpresaMembro,
  PlataformaAdmin,
  Tarefa,
  StatusTarefa,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Serviço de integração com o Cloud Firestore do Firebase.
 * Fornece persistência direta, idempotente e resiliente para tarefas,
 * leads, fichas cadastrais, compras e procedimentos.
 */
export const firestoreService = {
  isQuotaExhausted(): boolean {
    return false;
  },

  // =========================================================================
  // MÓDULO DE TAREFAS & AGENDAMENTOS
  // =========================================================================

  /**
   * Salva uma tarefa no banco de dados Firestore
   */
  async salvarTarefa(tarefa: Tarefa): Promise<boolean> {
    if (!db || !tarefa?.id) return false;
    const path = 'tarefas';
    try {
      const sanitized = sanitizeForFirestore({
        ...tarefa,
        updated_at: tarefa.updated_at || new Date().toISOString(),
        version: (tarefa.version || 1),
      });
      await setDoc(doc(db, path, tarefa.id), sanitized, { merge: true });
      return true;
    } catch (error) {
      console.warn('Erro ao salvar tarefa no Firestore:', error);
      return false;
    }
  },

  /**
   * Busca todas as tarefas ativas do Firestore
   */
  async fetchTarefas(empresaId?: string): Promise<Tarefa[]> {
    if (!db) return [];
    const path = 'tarefas';
    try {
      const snap = await getDocs(collection(db, path));
      const tarefas: Tarefa[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        if (!raw.deleted_at) {
          const item: Tarefa = {
            id: d.id,
            created_at: raw.created_at || new Date().toISOString(),
            updated_at: raw.updated_at || new Date().toISOString(),
            deleted_at: raw.deleted_at || null,
            version: raw.version || 1,
            empresaId: raw.empresaId || raw.empresa_id || '',
            empresa_id: raw.empresa_id || raw.empresaId || '',
            leadId: raw.leadId || raw.lead_id || null,
            lead_id: raw.lead_id || raw.leadId || null,
            usuarioResponsavelId: raw.usuarioResponsavelId || raw.usuario_responsavel_id || null,
            usuario_responsavel_id: raw.usuario_responsavel_id || raw.usuarioResponsavelId || null,
            titulo: raw.titulo || 'Tarefa sem título',
            descricao: raw.descricao || '',
            situacaoOrigem: raw.situacaoOrigem || raw.situacao_origem || undefined,
            situacao_origem: raw.situacao_origem || raw.situacaoOrigem || undefined,
            etapaCadencia: raw.etapaCadencia || raw.etapa_cadencia || undefined,
            etapa_cadencia: raw.etapa_cadencia || raw.etapaCadencia || undefined,
            dataAgendada: raw.dataAgendada || raw.data_agendada || new Date().toISOString().slice(0, 10),
            data_agendada: raw.data_agendada || raw.dataAgendada || new Date().toISOString().slice(0, 10),
            horaAgendada: raw.horaAgendada || raw.hora_agendada || '14:00',
            hora_agendada: raw.hora_agendada || raw.horaAgendada || '14:00',
            status: raw.status || 'pendente',
            prioridade: raw.prioridade || 'normal',
            dataConclusao: raw.dataConclusao || raw.data_conclusao || null,
            data_conclusao: raw.data_conclusao || raw.dataConclusao || null,
            usuarioConclusaoId: raw.usuarioConclusaoId || raw.usuario_conclusao_id || null,
            usuario_conclusao_id: raw.usuario_conclusao_id || raw.usuarioConclusaoId || null,
            observacaoConclusao: raw.observacaoConclusao || raw.observacao_conclusao || undefined,
            observacao_conclusao: raw.observacao_conclusao || raw.observacaoConclusao || undefined,
          };

          if (!empresaId || item.empresaId === empresaId || (item as any).empresa_id === empresaId) {
            tarefas.push(item);
          }
        }
      });
      return tarefas.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    } catch (error) {
      console.warn('Erro ao carregar tarefas do Firestore:', error);
      return [];
    }
  },

  /**
   * Atualiza status da tarefa no Firestore
   */
  async atualizarStatusTarefa(
    tarefaId: string,
    status: StatusTarefa,
    observacaoConclusao?: string,
    usuarioId?: string
  ): Promise<boolean> {
    if (!db || !tarefaId) return false;
    const path = 'tarefas';
    const nowIso = new Date().toISOString();
    try {
      const updates: Record<string, any> = {
        status,
        updated_at: nowIso,
        dataConclusao: status === 'concluida' ? nowIso : null,
        data_conclusao: status === 'concluida' ? nowIso : null,
        usuarioConclusaoId: status === 'concluida' ? usuarioId || null : null,
        usuario_conclusao_id: status === 'concluida' ? usuarioId || null : null,
      };
      if (observacaoConclusao !== undefined) {
        updates.observacaoConclusao = observacaoConclusao;
        updates.observacao_conclusao = observacaoConclusao;
      }
      await updateDoc(doc(db, path, tarefaId), sanitizeForFirestore(updates));
      return true;
    } catch (error) {
      console.warn('Erro ao atualizar status da tarefa no Firestore:', error);
      return false;
    }
  },

  /**
   * Exclui tarefa com soft-delete no Firestore
   */
  async excluirTarefa(tarefaId: string): Promise<boolean> {
    if (!db || !tarefaId) return false;
    const path = 'tarefas';
    try {
      await updateDoc(doc(db, path, tarefaId), {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.warn('Erro ao excluir tarefa no Firestore:', error);
      return false;
    }
  },

  // =========================================================================
  // MÓDULO DE LEADS, FICHAS, COMPRAS E DADOS
  // =========================================================================

  async salvarLead(lead: Lead): Promise<boolean> {
    if (!db || !lead?.id) return false;
    try {
      await setDoc(doc(db, 'leads', lead.id), sanitizeForFirestore(lead), { merge: true });
      return true;
    } catch (e) {
      console.warn('Erro ao salvar lead no Firestore:', e);
      return false;
    }
  },

  async salvarFicha(ficha: FichaLead): Promise<boolean> {
    if (!db || !ficha?.id) return false;
    try {
      await setDoc(doc(db, 'fichas', ficha.id), sanitizeForFirestore(ficha), { merge: true });
      return true;
    } catch (e) {
      console.warn('Erro ao salvar ficha no Firestore:', e);
      return false;
    }
  },

  async salvarCompra(compra: Compra): Promise<boolean> {
    if (!db || !compra?.id) return false;
    try {
      await setDoc(doc(db, 'compras', compra.id), sanitizeForFirestore(compra), { merge: true });
      return true;
    } catch (e) {
      console.warn('Erro ao salvar compra no Firestore:', e);
      return false;
    }
  },

  async salvarProcedimento(proc: ProcedimentoClinica): Promise<boolean> {
    if (!db || !proc?.id) return false;
    try {
      await setDoc(doc(db, 'procedimentos', proc.id), sanitizeForFirestore(proc), { merge: true });
      return true;
    } catch (e) {
      console.warn('Erro ao salvar procedimento no Firestore:', e);
      return false;
    }
  },

  async salvarUsuario(user: UsuarioColaborador): Promise<boolean> {
    if (!db || !user?.id) return false;
    try {
      await setDoc(doc(db, 'usuarios', user.id), sanitizeForFirestore(user), { merge: true });
      return true;
    } catch (e) {
      console.warn('Erro ao salvar usuário no Firestore:', e);
      return false;
    }
  },

  async salvarEmpresa(empresa: Empresa): Promise<boolean> {
    if (!db || !empresa?.id) return false;
    try {
      await setDoc(doc(db, 'empresas', empresa.id), sanitizeForFirestore(empresa), { merge: true });
      return true;
    } catch (e) {
      console.warn('Erro ao salvar empresa no Firestore:', e);
      return false;
    }
  },

  async salvarEmpresaMembro(membro: EmpresaMembro): Promise<boolean> {
    if (!db || !membro?.id) return false;
    try {
      await setDoc(doc(db, 'empresa_membros', membro.id), sanitizeForFirestore(membro), { merge: true });
      return true;
    } catch (e) {
      console.warn('Erro ao salvar membro da empresa no Firestore:', e);
      return false;
    }
  },

  async salvarPlataformaAdmin(admin: PlataformaAdmin): Promise<boolean> {
    if (!db || !admin?.id) return false;
    try {
      await setDoc(doc(db, 'plataforma_admins', admin.id), sanitizeForFirestore(admin), { merge: true });
      return true;
    } catch (e) {
      console.warn('Erro ao salvar admin no Firestore:', e);
      return false;
    }
  },

  /**
   * Carrega os dados persistidos do Firestore
   */
  async carregarDadosCompletos(): Promise<{
    leads: Lead[];
    fichas: FichaLead[];
    compras: Compra[];
    procedimentos: ProcedimentoClinica[];
    usuarios: UsuarioColaborador[];
    empresas: Empresa[];
    empresaMembros: EmpresaMembro[];
    plataformaAdmins: PlataformaAdmin[];
    tarefas?: Tarefa[];
  }> {
    if (!db) {
      return {
        leads: [],
        fichas: [],
        compras: [],
        procedimentos: [],
        usuarios: [],
        empresas: [],
        empresaMembros: [],
        plataformaAdmins: [],
        tarefas: [],
      };
    }

    try {
      const [
        snapLeads,
        snapFichas,
        snapCompras,
        snapProcs,
        snapUsers,
        snapEmps,
        snapTarefas,
      ] = await Promise.all([
        getDocs(collection(db, 'leads')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'fichas')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'compras')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'procedimentos')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'usuarios')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'empresas')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'tarefas')).catch(() => ({ docs: [] } as any)),
      ]);

      const leads = snapLeads.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as Lead))
        .filter((l: Lead) => !l.deleted_at);

      const fichas = snapFichas.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as FichaLead))
        .filter((f: FichaLead) => !f.deleted_at);

      const compras = snapCompras.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as Compra))
        .filter((c: Compra) => !c.deleted_at);

      const procedimentos = snapProcs.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as ProcedimentoClinica))
        .filter((p: ProcedimentoClinica) => !p.deleted_at);

      const usuarios = snapUsers.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as UsuarioColaborador))
        .filter((u: UsuarioColaborador) => !u.deleted_at);

      const empresas = snapEmps.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as Empresa))
        .filter((e: Empresa) => !e.deleted_at);

      const tarefas = snapTarefas.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as Tarefa))
        .filter((t: Tarefa) => !t.deleted_at);

      return {
        leads,
        fichas,
        compras,
        procedimentos,
        usuarios,
        empresas,
        empresaMembros: [],
        plataformaAdmins: [],
        tarefas,
      };
    } catch (e) {
      console.warn('Erro ao carregar dados do Firestore:', e);
      return {
        leads: [],
        fichas: [],
        compras: [],
        procedimentos: [],
        usuarios: [],
        empresas: [],
        empresaMembros: [],
        plataformaAdmins: [],
        tarefas: [],
      };
    }
  },

  async espelharLote(_dados: any): Promise<void> {
    return;
  },

  async salvarSnapshotKpi(_snapshot: any): Promise<void> {
    return;
  },
};
