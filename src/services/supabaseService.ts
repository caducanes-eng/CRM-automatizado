import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  Lead,
  FichaLead,
  Compra,
  ProcedimentoClinica,
  UsuarioColaborador,
  ConfiguracoesEmpresa,
  SituacaoLead,
  StatusVenda,
  StatusGrupoNutricao,
  OrigemLead,
} from '../types';

export const ID_EMPRESA_PADRAO = '00000000-0000-0000-0000-000000000001';

/**
 * Garante que o identificador seja um UUID válido para o PostgreSQL.
 * Se for um ID de legado (ex: 'lead-1', 'compra-abc'), gera um UUID consistente.
 */
export function normalizarUuid(id: string): string {
  if (!id) return crypto.randomUUID();
  // Regex para UUID v4 / v1
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }
  // Se for uuid com zeros padrao
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }

  // Gera um UUID determinístico ou cria novo se não bater o padrão
  try {
    return crypto.randomUUID();
  } catch {
    return '00000000-0000-4000-8000-' + id.replace(/[^a-f0-9]/gi, '').padEnd(12, '0').slice(0, 12);
  }
}

// ============================================================================
// MAPEADORES: DOMÍNIO TYPESCRIPT <-> POSTGRESQL / SUPABASE
// ============================================================================

export const supabaseMapper = {
  // LEAD
  leadToDb: (lead: Lead, empresaId: string = ID_EMPRESA_PADRAO) => ({
    id: normalizarUuid(lead.id),
    empresa_id: empresaId,
    nome: lead.nome,
    situacao: lead.situacao,
    etapa_por_situacao: lead.etapaPorSituacao || {},
    interesse: lead.interesse || '',
    possivel_valor: Number(lead.possivelValor || 0),
    status_venda: lead.statusVenda || 'Em processo',
    data_entrada: lead.dataEntrada || new Date().toISOString().split('T')[0],
    responsavel: lead.responsavel || 'Secretária 1',
    data_entrada_nutricao: lead.dataEntradaNutricao || null,
    status_grupo_nutricao: lead.statusGrupoNutricao || 'Ativo',
    motivo_perda: lead.motivoPerda || null,
    data_perda: lead.dataPerda || null,
    situacao_perda: lead.situacaoPerda || null,
    created_at: lead.created_at || new Date().toISOString(),
    updated_at: lead.updated_at || new Date().toISOString(),
    deleted_at: lead.deleted_at || null,
    version: Number(lead.version || 1),
  }),

  dbToLead: (row: any): Lead => ({
    id: row.id,
    nome: row.nome,
    situacao: row.situacao as SituacaoLead,
    etapaPorSituacao: row.etapa_por_situacao || {},
    interesse: row.interesse || '',
    possivelValor: Number(row.possivel_valor || 0),
    statusVenda: row.status_venda as StatusVenda,
    dataEntrada: row.data_entrada,
    responsavel: row.responsavel,
    dataEntradaNutricao: row.data_entrada_nutricao || undefined,
    statusGrupoNutricao: (row.status_grupo_nutricao as StatusGrupoNutricao) || 'Ativo',
    motivoPerda: row.motivo_perda || undefined,
    dataPerda: row.data_perda || undefined,
    situacaoPerda: (row.situacao_perda as SituacaoLead) || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    version: row.version || 1,
  }),

  // FICHA DO LEAD
  fichaToDb: (ficha: FichaLead, empresaId: string = ID_EMPRESA_PADRAO) => ({
    id: normalizarUuid(ficha.id),
    empresa_id: empresaId,
    lead_id: normalizarUuid(ficha.leadId),
    telefone: ficha.telefone || '',
    origem_lead: ficha.origemLead || 'WhatsApp',
    data_nascimento: ficha.dataNascimento || null,
    endereco: ficha.endereco || '',
    observacoes: ficha.observacoes || '',
    motivo_perda: ficha.motivoPerda || null,
    data_perda: ficha.dataPerda || null,
    created_at: ficha.created_at || new Date().toISOString(),
    updated_at: ficha.updated_at || new Date().toISOString(),
    deleted_at: ficha.deleted_at || null,
    version: Number(ficha.version || 1),
  }),

  dbToFicha: (row: any): FichaLead => ({
    id: row.id,
    leadId: row.lead_id,
    telefone: row.telefone || '',
    origemLead: (row.origem_lead as OrigemLead) || 'WhatsApp',
    dataNascimento: row.data_nascimento || '',
    endereco: row.endereco || '',
    observacoes: row.observacoes || '',
    motivoPerda: row.motivo_perda || undefined,
    dataPerda: row.data_perda || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    version: row.version || 1,
  }),

  // COMPRA
  compraToDb: (compra: Compra, empresaId: string = ID_EMPRESA_PADRAO) => ({
    id: normalizarUuid(compra.id),
    empresa_id: empresaId,
    lead_id: normalizarUuid(compra.leadId),
    data: compra.data || new Date().toISOString().split('T')[0],
    procedimento: compra.procedimento || '',
    valor: Number(compra.valor || 0),
    forma_pagamento: 'Pix / Cartão',
    created_at: compra.created_at || new Date().toISOString(),
    updated_at: compra.updated_at || new Date().toISOString(),
    deleted_at: compra.deleted_at || null,
    version: Number(compra.version || 1),
  }),

  dbToCompra: (row: any): Compra => ({
    id: row.id,
    leadId: row.lead_id,
    data: row.data,
    procedimento: row.procedimento,
    valor: Number(row.valor || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    version: row.version || 1,
  }),

  // PROCEDIMENTO
  procedimentoToDb: (proc: ProcedimentoClinica, empresaId: string = ID_EMPRESA_PADRAO) => ({
    id: normalizarUuid(proc.id),
    empresa_id: empresaId,
    nome: proc.nome,
    categoria: proc.categoria || 'Injetáveis',
    valor: Number(proc.valor || 0),
    formatos_pagamento: proc.formatosPagamento || '',
    duracao_dias: Number(proc.duracaoDias || 180),
    descricao: proc.descricao || '',
    orientacoes: proc.orientacoes || '',
    ativo: proc.ativo !== false,
    created_at: proc.created_at || new Date().toISOString(),
    updated_at: proc.updated_at || new Date().toISOString(),
    deleted_at: proc.deleted_at || null,
    version: Number(proc.version || 1),
  }),

  dbToProcedimento: (row: any): ProcedimentoClinica => ({
    id: row.id,
    nome: row.nome,
    categoria: row.categoria,
    valor: Number(row.valor || 0),
    formatosPagamento: row.formatos_pagamento,
    duracaoDias: row.duracao_dias,
    descricao: row.descricao || '',
    orientacoes: row.orientacoes || '',
    ativo: row.ativo,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    version: row.version || 1,
  }),

  // USUARIO
  usuarioToDb: (usuario: UsuarioColaborador, empresaId: string = ID_EMPRESA_PADRAO) => ({
    id: normalizarUuid(usuario.id),
    empresa_id: empresaId,
    nome: usuario.nome,
    email: usuario.email,
    cargo: usuario.cargo || 'Colaborador',
    role: usuario.role || 'RECEPCAO_COMERCIAL',
    permissoes: usuario.permissoes || {},
    iniciais: usuario.iniciais || '',
    cor_badge: usuario.corBadge || '#5C3A22',
    telefone: usuario.telefone || '',
    ativo: usuario.ativo !== false,
    ultimo_acesso: usuario.ultimoAcesso || null,
    criado_por: usuario.criadoPor || 'Sistema',
    observacoes: usuario.observacoes || '',
    created_at: usuario.created_at || new Date().toISOString(),
    updated_at: usuario.updated_at || new Date().toISOString(),
    deleted_at: usuario.deleted_at || null,
    version: Number(usuario.version || 1),
  }),

  dbToUsuario: (row: any): UsuarioColaborador => ({
    id: row.id,
    nome: row.nome,
    email: row.email,
    senhaPadrao: '******',
    cargo: row.cargo,
    role: row.role,
    permissoes: row.permissoes || {},
    iniciais: row.iniciais || '',
    corBadge: row.cor_badge || '#5C3A22',
    telefone: row.telefone || '',
    ativo: row.ativo,
    ultimoAcesso: row.ultimo_acesso || undefined,
    criadoPor: row.criado_por || undefined,
    observacoes: row.observacoes || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    version: row.version || 1,
  }),

  // EMPRESA
  empresaToDb: (config: ConfiguracoesEmpresa, id: string = ID_EMPRESA_PADRAO) => ({
    id: id,
    nome: config.nomeEmpresa || 'Dra. Agda Rodrigues',
    subtitulo: config.subtitulo || '',
    cnpj: config.cnpj || '',
    registro_profissional: config.registroProfissional || '',
    telefone: config.telefone || '',
    email: config.email || '',
    endereco: config.endereco || '',
    horario_funcionamento: config.horarioFuncionamento || '',
    unidade_padrao: config.unidadePadrao || 'Consultório Principal',
    tipo_logo: config.tipoLogo || 'monograma',
    logo_url: config.logoUrl || null,
    monograma_iniciais: config.monogramaIniciais || 'AR',
    logo_altura: config.logoAltura || 'padrao',
    logo_ajuste_lateral: config.logoAjusteLateral || 'total',
    logo_fundo_header: config.logoFundoHeader || 'integrado',
    estetica_config: config.estetica || {},
    ativa: true,
    created_at: new Date().toISOString(),
    updated_at: config.updated_at || new Date().toISOString(),
    deleted_at: null,
    version: 1,
  }),
};

// ============================================================================
// SERVIÇOS CRUD & SINCRONIZAÇÃO EM MASSA COM SUPABASE
// ============================================================================

export interface RelatorioSincronizacao {
  sucesso: boolean;
  totalLeads: number;
  totalFichas: number;
  totalCompras: number;
  totalProcedimentos: number;
  totalUsuarios: number;
  mensagem: string;
  erros: string[];
}

export const supabaseService = {
  /**
   * Salva ou atualiza a empresa/clínica no Supabase
   */
  async salvarEmpresa(config: ConfiguracoesEmpresa): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.empresaToDb(config);
    const { error } = await client.from('empresas').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar empresa no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva ou atualiza um Lead no Supabase com soft-delete e versionamento
   */
  async salvarLead(lead: Lead, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.leadToDb(lead, empresaId);
    const { error } = await client.from('leads').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar Lead no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Executa Soft Delete em um Lead no Supabase
   */
  async softDeleteLead(leadId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const { error } = await client
      .from('leads')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', normalizarUuid(leadId));

    if (error) {
      console.error('Erro ao efetuar soft delete no Lead:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva ou atualiza uma Ficha no Supabase
   */
  async salvarFicha(ficha: FichaLead, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.fichaToDb(ficha, empresaId);
    const { error } = await client.from('fichas_leads').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar Ficha no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva ou atualiza uma Compra no Supabase
   */
  async salvarCompra(compra: Compra, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.compraToDb(compra, empresaId);
    const { error } = await client.from('compras').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar Compra no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva ou atualiza um Procedimento no Supabase
   */
  async salvarProcedimento(proc: ProcedimentoClinica, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.procedimentoToDb(proc, empresaId);
    const { error } = await client.from('procedimentos').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar Procedimento no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva ou atualiza um Usuário Colaborador no Supabase
   */
  async salvarUsuario(usuario: UsuarioColaborador, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.usuarioToDb(usuario, empresaId);
    const { error } = await client.from('usuarios').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar Usuário no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Carrega todos os dados ativos do Supabase (WHERE deleted_at IS NULL)
   */
  async carregarDadosCompletos(): Promise<{
    leads: Lead[];
    fichas: FichaLead[];
    compras: Compra[];
    procedimentos: ProcedimentoClinica[];
    usuarios: UsuarioColaborador[];
  } | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      // 1. Leads ativos
      const { data: rowsLeads, error: errLeads } = await client
        .from('leads')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (errLeads) throw errLeads;

      // 2. Fichas ativas
      const { data: rowsFichas, error: errFichas } = await client
        .from('fichas_leads')
        .select('*')
        .is('deleted_at', null);

      if (errFichas) throw errFichas;

      // 3. Compras ativas
      const { data: rowsCompras, error: errCompras } = await client
        .from('compras')
        .select('*')
        .is('deleted_at', null)
        .order('data', { ascending: false });

      if (errCompras) throw errCompras;

      // 4. Procedimentos ativos
      const { data: rowsProcedimentos, error: errProc } = await client
        .from('procedimentos')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (errProc) throw errProc;

      // 5. Usuários ativos
      const { data: rowsUsuarios, error: errUsers } = await client
        .from('usuarios')
        .select('*')
        .is('deleted_at', null);

      if (errUsers) throw errUsers;

      return {
        leads: (rowsLeads || []).map(supabaseMapper.dbToLead),
        fichas: (rowsFichas || []).map(supabaseMapper.dbToFicha),
        compras: (rowsCompras || []).map(supabaseMapper.dbToCompra),
        procedimentos: (rowsProcedimentos || []).map(supabaseMapper.dbToProcedimento),
        usuarios: (rowsUsuarios || []).map(supabaseMapper.dbToUsuario),
      };
    } catch (error) {
      console.error('Erro ao carregar dados do Supabase:', error);
      throw error;
    }
  },

  /**
   * Sincroniza e migra todo o conjunto de dados atual da aplicação para o Supabase
   */
  async sincronizarTodosOsDados(params: {
    leads: Lead[];
    fichas: FichaLead[];
    compras: Compra[];
    procedimentos: ProcedimentoClinica[];
    usuarios: UsuarioColaborador[];
    configEmpresa: ConfiguracoesEmpresa;
    onProgresso?: (etapa: string, percentual: number) => void;
  }): Promise<RelatorioSincronizacao> {
    const client = getSupabaseClient();
    const erros: string[] = [];

    if (!client) {
      return {
        sucesso: false,
        totalLeads: 0,
        totalFichas: 0,
        totalCompras: 0,
        totalProcedimentos: 0,
        totalUsuarios: 0,
        mensagem: 'Supabase não conectado. Configure a URL e a Chave Anon.',
        erros: ['Cliente Supabase não inicializado'],
      };
    }

    try {
      params.onProgresso?.('Salvando empresa e clínica...', 10);
      try {
        await this.salvarEmpresa(params.configEmpresa);
      } catch (e: any) {
        erros.push(`Falha ao salvar empresa: ${e?.message}`);
      }

      params.onProgresso?.('Sincronizando catálogo de procedimentos...', 30);
      let totalProcSalvos = 0;
      if (params.procedimentos.length > 0) {
        const rowsProc = params.procedimentos.map((p) => supabaseMapper.procedimentoToDb(p));
        const { error: errP } = await client.from('procedimentos').upsert(rowsProc, { onConflict: 'id' });
        if (errP) {
          erros.push(`Erro em procedimentos: ${errP.message}`);
        } else {
          totalProcSalvos = rowsProc.length;
        }
      }

      params.onProgresso?.('Sincronizando equipe e colaboradores...', 50);
      let totalUsersSalvos = 0;
      if (params.usuarios.length > 0) {
        const rowsUsers = params.usuarios.map((u) => supabaseMapper.usuarioToDb(u));
        const { error: errU } = await client.from('usuarios').upsert(rowsUsers, { onConflict: 'id' });
        if (errU) {
          erros.push(`Erro em usuários: ${errU.message}`);
        } else {
          totalUsersSalvos = rowsUsers.length;
        }
      }

      params.onProgresso?.('Sincronizando base de leads e pacientes...', 70);
      let totalLeadsSalvos = 0;
      if (params.leads.length > 0) {
        const rowsLeads = params.leads.map((l) => supabaseMapper.leadToDb(l));
        const { error: errL } = await client.from('leads').upsert(rowsLeads, { onConflict: 'id' });
        if (errL) {
          erros.push(`Erro em leads: ${errL.message}`);
        } else {
          totalLeadsSalvos = rowsLeads.length;
        }
      }

      params.onProgresso?.('Sincronizando fichas complementares e histórico de compras...', 90);
      let totalFichasSalvas = 0;
      if (params.fichas.length > 0) {
        const rowsFichas = params.fichas.map((f) => supabaseMapper.fichaToDb(f));
        const { error: errF } = await client.from('fichas_leads').upsert(rowsFichas, { onConflict: 'id' });
        if (errF) {
          erros.push(`Erro em fichas: ${errF.message}`);
        } else {
          totalFichasSalvas = rowsFichas.length;
        }
      }

      let totalComprasSalvas = 0;
      if (params.compras.length > 0) {
        const rowsCompras = params.compras.map((c) => supabaseMapper.compraToDb(c));
        const { error: errC } = await client.from('compras').upsert(rowsCompras, { onConflict: 'id' });
        if (errC) {
          erros.push(`Erro em compras: ${errC.message}`);
        } else {
          totalComprasSalvas = rowsCompras.length;
        }
      }

      params.onProgresso?.('Concluído!', 100);

      const sucessoGeral = erros.length === 0;

      return {
        sucesso: sucessoGeral,
        totalLeads: totalLeadsSalvos,
        totalFichas: totalFichasSalvas,
        totalCompras: totalComprasSalvas,
        totalProcedimentos: totalProcSalvos,
        totalUsuarios: totalUsersSalvos,
        mensagem: sucessoGeral
          ? 'Todos os dados foram alocados e sincronizados com sucesso no Supabase!'
          : `Sincronização parcial realizada com ${erros.length} aviso(s).`,
        erros,
      };
    } catch (error: any) {
      return {
        sucesso: false,
        totalLeads: 0,
        totalFichas: 0,
        totalCompras: 0,
        totalProcedimentos: 0,
        totalUsuarios: 0,
        mensagem: `Erro na sincronização: ${error?.message || 'Falha desconhecida'}`,
        erros: [error?.message || 'Erro desconhecido'],
      };
    }
  },

  /**
   * Apaga permanentemente todos os registros de pacientes (leads, fichas e compras) no Supabase.
   * Exclusivo para operações autorizadas pelo Gestor Master.
   */
  async apagarDadosPacientesSupabase(empresaId: string = ID_EMPRESA_PADRAO): Promise<{
    sucesso: boolean;
    mensagem: string;
    erros: string[];
  }> {
    const client = getSupabaseClient();
    const erros: string[] = [];

    if (!client) {
      return {
        sucesso: true,
        mensagem: 'Supabase não conectado. Limpeza realizada localmente e no Firestore.',
        erros: [],
      };
    }

    try {
      // 1. Apaga compras
      const { error: errC } = await client
        .from('compras')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (errC) erros.push(`Erro ao limpar compras: ${errC.message}`);

      // 2. Apaga fichas cadastrais
      const { error: errF } = await client
        .from('fichas_leads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (errF) erros.push(`Erro ao limpar fichas: ${errF.message}`);

      // 3. Apaga leads
      const { error: errL } = await client
        .from('leads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (errL) erros.push(`Erro ao limpar leads: ${errL.message}`);

      const sucessoGeral = erros.length === 0;
      return {
        sucesso: sucessoGeral,
        mensagem: sucessoGeral
          ? 'Todos os registros de pacientes foram apagados do Supabase com sucesso!'
          : 'Limpeza parcial no Supabase.',
        erros,
      };
    } catch (error: any) {
      console.error('Erro ao apagar dados de pacientes no Supabase:', error);
      return {
        sucesso: false,
        mensagem: error?.message || 'Falha ao executar exclusão no Supabase.',
        erros: [error?.message || 'Erro desconhecido'],
      };
    }
  },
};
