import {
  Lead,
  FichaLead,
  Compra,
  ProcedimentoClinica,
  UsuarioColaborador,
  Empresa,
  EmpresaMembro,
  PlataformaAdmin,
} from '../types';

/**
 * Serviço de compatibilidade mantido como no-op seguro.
 * O sistema opera exclusivamente com Supabase (conforme arquitetura do projeto),
 * eliminando conexões em segundo plano com o Cloud Firestore.
 */
export const firestoreService = {
  isQuotaExhausted(): boolean {
    return true;
  },

  async salvarLead(_lead: Lead): Promise<boolean> {
    return true;
  },

  async salvarFicha(_ficha: FichaLead): Promise<boolean> {
    return true;
  },

  async salvarCompra(_compra: Compra): Promise<boolean> {
    return true;
  },

  async salvarProcedimento(_proc: ProcedimentoClinica): Promise<boolean> {
    return true;
  },

  async salvarUsuario(_user: UsuarioColaborador): Promise<boolean> {
    return true;
  },

  async salvarEmpresa(_empresa: Empresa): Promise<boolean> {
    return true;
  },

  async salvarEmpresaMembro(_membro: EmpresaMembro): Promise<boolean> {
    return true;
  },

  async salvarPlataformaAdmin(_admin: PlataformaAdmin): Promise<boolean> {
    return true;
  },

  async carregarDadosCompletos(): Promise<{
    leads: Lead[];
    fichas: FichaLead[];
    compras: Compra[];
    procedimentos: ProcedimentoClinica[];
    usuarios: UsuarioColaborador[];
    empresas: Empresa[];
    empresaMembros: EmpresaMembro[];
    plataformaAdmins: PlataformaAdmin[];
  }> {
    return {
      leads: [],
      fichas: [],
      compras: [],
      procedimentos: [],
      usuarios: [],
      empresas: [],
      empresaMembros: [],
      plataformaAdmins: [],
    };
  },

  async espelharLote(_dados: {
    leads?: Lead[];
    fichas?: FichaLead[];
    compras?: Compra[];
    procedimentos?: ProcedimentoClinica[];
    usuarios?: UsuarioColaborador[];
    empresas?: Empresa[];
    empresaMembros?: EmpresaMembro[];
    plataformaAdmins?: PlataformaAdmin[];
  }): Promise<void> {
    return;
  },

  async salvarSnapshotKpi(_snapshot: any): Promise<void> {
    return;
  },
};
