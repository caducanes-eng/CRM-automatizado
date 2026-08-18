import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { Lead, FichaLead, Compra, ProcedimentoClinica, UsuarioColaborador, Empresa } from '../types';

// Circuito de segurança para cota do Firestore (evita spam e loop de backoff se a cota gratuita for atingida)
let isFirestoreQuotaExceeded = false;
let quotaExceededTimestamp = 0;
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos de cooldown se a cota estourar

function checkQuotaStatus(): boolean {
  if (!isFirestoreQuotaExceeded) return true;
  if (Date.now() - quotaExceededTimestamp > QUOTA_COOLDOWN_MS) {
    // Tenta rearmar após o cooldown
    isFirestoreQuotaExceeded = false;
    return true;
  }
  return false;
}

function handleQuotaError(e: any) {
  const msg = String(e?.message || e || '');
  const code = String(e?.code || '');
  if (
    code.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('resource-exhausted')
  ) {
    isFirestoreQuotaExceeded = true;
    quotaExceededTimestamp = Date.now();
    console.warn(
      '⚠️ Limite de cota diária do Firestore atingido. Operações de espelhamento pausadas temporariamente. O Supabase e o armazenamento local continuarão funcionando normalmente.'
    );
  }
}

export const firestoreService = {
  /**
   * Informa se a cota do Firestore está temporariamente estourada
   */
  isQuotaExhausted(): boolean {
    return !checkQuotaStatus();
  },

  /**
   * Salva ou atualiza um lead no Firestore
   */
  async salvarLead(lead: Lead): Promise<boolean> {
    if (!db || !lead?.id || !checkQuotaStatus()) return false;
    try {
      await setDoc(doc(db, 'leads', lead.id), sanitizeForFirestore(lead), { merge: true });
      return true;
    } catch (e) {
      handleQuotaError(e);
      return false;
    }
  },

  /**
   * Salva ou atualiza uma ficha de lead no Firestore
   */
  async salvarFicha(ficha: FichaLead): Promise<boolean> {
    if (!db || !ficha?.id || !checkQuotaStatus()) return false;
    try {
      await setDoc(doc(db, 'fichas', ficha.id), sanitizeForFirestore(ficha), { merge: true });
      return true;
    } catch (e) {
      handleQuotaError(e);
      return false;
    }
  },

  /**
   * Salva ou atualiza uma compra no Firestore
   */
  async salvarCompra(compra: Compra): Promise<boolean> {
    if (!db || !compra?.id || !checkQuotaStatus()) return false;
    try {
      await setDoc(doc(db, 'compras', compra.id), sanitizeForFirestore(compra), { merge: true });
      return true;
    } catch (e) {
      handleQuotaError(e);
      return false;
    }
  },

  /**
   * Salva ou atualiza um procedimento no Firestore
   */
  async salvarProcedimento(proc: ProcedimentoClinica): Promise<boolean> {
    if (!db || !proc?.id || !checkQuotaStatus()) return false;
    try {
      await setDoc(doc(db, 'procedimentos', proc.id), sanitizeForFirestore(proc), { merge: true });
      return true;
    } catch (e) {
      handleQuotaError(e);
      return false;
    }
  },

  /**
   * Salva ou atualiza um colaborador no Firestore
   */
  async salvarUsuario(user: UsuarioColaborador): Promise<boolean> {
    if (!db || !user?.id || !checkQuotaStatus()) return false;
    try {
      await setDoc(doc(db, 'usuarios', user.id), sanitizeForFirestore(user), { merge: true });
      return true;
    } catch (e) {
      handleQuotaError(e);
      return false;
    }
  },

  /**
   * Salva ou atualiza os dados de uma empresa/clínica no Firestore
   */
  async salvarEmpresa(empresa: Empresa): Promise<boolean> {
    if (!db || !empresa?.id || !checkQuotaStatus()) return false;
    try {
      await setDoc(doc(db, 'empresas', empresa.id), sanitizeForFirestore(empresa), { merge: true });
      return true;
    } catch (e) {
      handleQuotaError(e);
      return false;
    }
  },

  /**
   * Carrega todas as coleções do Firestore caso o Supabase não esteja configurado ou falhe
   */
  async carregarDadosCompletos(): Promise<{
    leads: Lead[];
    fichas: FichaLead[];
    compras: Compra[];
    procedimentos: ProcedimentoClinica[];
    usuarios: UsuarioColaborador[];
    empresas: Empresa[];
  }> {
    const vazio = { leads: [], fichas: [], compras: [], procedimentos: [], usuarios: [], empresas: [] };
    if (!db || !checkQuotaStatus()) return vazio;

    try {
      const [snapLeads, snapFichas, snapCompras, snapProc, snapUsers, snapEmp] = await Promise.all([
        getDocs(collection(db, 'leads')).catch((e) => {
          handleQuotaError(e);
          return null;
        }),
        getDocs(collection(db, 'fichas')).catch((e) => {
          handleQuotaError(e);
          return null;
        }),
        getDocs(collection(db, 'compras')).catch((e) => {
          handleQuotaError(e);
          return null;
        }),
        getDocs(collection(db, 'procedimentos')).catch((e) => {
          handleQuotaError(e);
          return null;
        }),
        getDocs(collection(db, 'usuarios')).catch((e) => {
          handleQuotaError(e);
          return null;
        }),
        getDocs(collection(db, 'empresas')).catch((e) => {
          handleQuotaError(e);
          return null;
        }),
      ]);

      const extrair = <T>(snap: any): T[] => {
        if (!snap || snap.empty) return [];
        const res: T[] = [];
        snap.forEach((d: any) => {
          const data = d.data();
          if (data && !data.deleted_at) {
            res.push(data as T);
          }
        });
        return res;
      };

      return {
        leads: extrair<Lead>(snapLeads),
        fichas: extrair<FichaLead>(snapFichas),
        compras: extrair<Compra>(snapCompras),
        procedimentos: extrair<ProcedimentoClinica>(snapProc),
        usuarios: extrair<UsuarioColaborador>(snapUsers),
        empresas: extrair<Empresa>(snapEmp),
      };
    } catch (e) {
      handleQuotaError(e);
      return vazio;
    }
  },

  /**
   * Espelha um lote de registros no Firestore para backup de nuvem apenas quando solicitado
   */
  async espelharLote(dados: {
    leads?: Lead[];
    fichas?: FichaLead[];
    compras?: Compra[];
    procedimentos?: ProcedimentoClinica[];
    usuarios?: UsuarioColaborador[];
    empresas?: Empresa[];
  }): Promise<void> {
    if (!db || !checkQuotaStatus()) return;
    try {
      const promisses: Promise<any>[] = [];

      if (dados.leads && dados.leads.length > 0) {
        dados.leads.slice(0, 50).forEach((item) => {
          if (item?.id) promisses.push(setDoc(doc(db, 'leads', item.id), sanitizeForFirestore(item), { merge: true }));
        });
      }
      if (dados.fichas && dados.fichas.length > 0) {
        dados.fichas.slice(0, 50).forEach((item) => {
          if (item?.id) promisses.push(setDoc(doc(db, 'fichas', item.id), sanitizeForFirestore(item), { merge: true }));
        });
      }
      if (dados.compras && dados.compras.length > 0) {
        dados.compras.slice(0, 50).forEach((item) => {
          if (item?.id) promisses.push(setDoc(doc(db, 'compras', item.id), sanitizeForFirestore(item), { merge: true }));
        });
      }
      if (dados.procedimentos && dados.procedimentos.length > 0) {
        dados.procedimentos.forEach((item) => {
          if (item?.id) promisses.push(setDoc(doc(db, 'procedimentos', item.id), sanitizeForFirestore(item), { merge: true }));
        });
      }
      if (dados.usuarios && dados.usuarios.length > 0) {
        dados.usuarios.forEach((item) => {
          if (item?.id) promisses.push(setDoc(doc(db, 'usuarios', item.id), sanitizeForFirestore(item), { merge: true }));
        });
      }
      if (dados.empresas && dados.empresas.length > 0) {
        dados.empresas.forEach((item) => {
          if (item?.id) promisses.push(setDoc(doc(db, 'empresas', item.id), sanitizeForFirestore(item), { merge: true }));
        });
      }

      await Promise.all(promisses);
    } catch (e) {
      handleQuotaError(e);
    }
  },
};
