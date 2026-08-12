import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  Lead,
  FichaLead,
  Compra,
  ProcedimentoClinica,
  UsuarioColaborador,
  ConfiguracoesEmpresa,
  Empresa,
  EmpresaMembro,
  PlataformaAdmin,
  SituacaoLead,
  StatusVenda,
  StatusGrupoNutricao,
  OrigemLead,
  StatusEmpresa,
  PapelEmpresa,
  EsteticaPlataforma,
} from '../types';

export const ID_EMPRESA_PADRAO = '00000000-0000-0000-0000-000000000001';

/**
 * Sanitiza datas para o PostgreSQL (aceita apenas YYYY-MM-DD ou retorna null).
 * Evita erros de sintaxe ao gravar strings vazias "" em colunas do tipo DATE.
 */
export function sanitizeDate(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null;
  const limpo = val.trim();
  if (!limpo || limpo === 'null' || limpo === 'undefined') return null;
  const part = limpo.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
    return part;
  }
  return null;
}

/**
 * Garante que o identificador seja um UUID v4 válido e consistente para o PostgreSQL.
 * Se for um ID textual legado (ex: 'empresa-dra-agda-01', 'lead-1'), gera um UUID determinístico.
 */
export function normalizarUuid(id?: string | null): string {
  if (!id) {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
  }

  const str = String(id).trim();

  // Se já for UUID padrão
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str.toLowerCase();
  }

  // IDs conhecidos da empresa padrão
  if (str === '00000000-0000-0000-0000-000000000001' || str === 'empresa-agda-rodrigues-01' || str === 'empresa-padrao') {
    return ID_EMPRESA_PADRAO;
  }

  // Gera UUID determinístico a partir do hash da string (para manter integridade referencial)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = ('00000000' + (h1 >>> 0).toString(16)).slice(-8);
  const hex2 = ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
  const cleanStr = str.replace(/[^a-f0-9]/gi, '').padEnd(16, '0').slice(0, 16);

  return `${hex1}-${cleanStr.slice(0, 4)}-4${cleanStr.slice(4, 7)}-8${cleanStr.slice(7, 10)}-${hex2}${cleanStr.slice(10, 14)}`.toLowerCase();
}

// ============================================================================
// MAPEADORES: DOMÍNIO TYPESCRIPT <-> POSTGRESQL / SUPABASE
// ============================================================================

export const supabaseMapper = {
  // EMPRESA / CLÍNICA
  empresaToDb: (empresa: Partial<Empresa> | Partial<ConfiguracoesEmpresa>, idCustom?: string) => {
    const idEfetivo = normalizarUuid(idCustom || (empresa as any).id || ID_EMPRESA_PADRAO);
    const nome = (empresa as any).nome || (empresa as any).nomeEmpresa || 'Dra. Agda Rodrigues';
    const statusVal: StatusEmpresa = (empresa as any).status === 'suspensa' ? 'suspensa' : 'ativa';

    return {
      id: idEfetivo,
      nome: String(nome).trim(),
      subtitulo: empresa.subtitulo || '',
      cnpj: empresa.cnpj || '',
      registro_profissional: empresa.registroProfissional || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      endereco: empresa.endereco || '',
      horario_funcionamento: empresa.horarioFuncionamento || '',
      unidade_padrao: empresa.unidadePadrao || 'Consultório Principal',
      status: statusVal,
      tipo_logo: (empresa.tipoLogo === 'imagem' ? 'imagem' : 'monograma') as 'imagem' | 'monograma',
      logo_url: empresa.logoUrl || null,
      monograma_iniciais: empresa.monogramaIniciais || 'AR',
      logo_altura: empresa.logoAltura || 'padrao',
      logo_ajuste_lateral: empresa.logoAjusteLateral || 'total',
      logo_fundo_header: empresa.logoFundoHeader || 'integrado',
      estetica_config: empresa.estetica || {},
      esteticas_salvas: empresa.esteticasSalvas || [],
      admin_principal_id: (empresa as any).adminPrincipalId ? normalizarUuid((empresa as any).adminPrincipalId) : null,
      admin_principal_email: (empresa as any).adminPrincipalEmail || null,
      admin_principal_nome: (empresa as any).adminPrincipalNome || null,
      total_usuarios: Number((empresa as any).totalUsuarios || 0),
      total_pacientes: Number((empresa as any).totalPacientes || 0),
      ativa: statusVal !== 'suspensa',
      created_at: (empresa as any).created_at || new Date().toISOString(),
      updated_at: (empresa as any).updated_at || new Date().toISOString(),
      deleted_at: (empresa as any).deleted_at || null,
      version: Number((empresa as any).version || 1),
    };
  },

  dbToEmpresa: (row: any): Empresa => ({
    id: row.id,
    nome: row.nome,
    subtitulo: row.subtitulo || undefined,
    cnpj: row.cnpj || undefined,
    registroProfissional: row.registro_profissional || undefined,
    telefone: row.telefone || undefined,
    email: row.email || undefined,
    endereco: row.endereco || undefined,
    horarioFuncionamento: row.horario_funcionamento || undefined,
    unidadePadrao: row.unidade_padrao || 'Consultório Principal',
    status: (row.status as StatusEmpresa) || (row.ativa ? 'ativa' : 'suspensa'),
    tipoLogo: row.tipo_logo || 'monograma',
    logoUrl: row.logo_url || undefined,
    monogramaIniciais: row.monograma_iniciais || 'AR',
    logoAltura: row.logo_altura || 'padrao',
    logoAjusteLateral: row.logo_ajuste_lateral || 'total',
    logoFundoHeader: row.logo_fundo_header || 'integrado',
    estetica: row.estetica_config as EsteticaPlataforma,
    esteticasSalvas: (row.esteticas_salvas as EsteticaPlataforma[]) || [],
    adminPrincipalId: row.admin_principal_id || undefined,
    adminPrincipalEmail: row.admin_principal_email || undefined,
    adminPrincipalNome: row.admin_principal_nome || undefined,
    totalUsuarios: Number(row.total_usuarios || 0),
    totalPacientes: Number(row.total_pacientes || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    version: row.version || 1,
  }),

  // EMPRESA MEMBRO
  empresaMembroToDb: (membro: EmpresaMembro) => ({
    id: normalizarUuid(membro.id),
    user_id: normalizarUuid(membro.userId),
    empresa_id: normalizarUuid(membro.empresaId),
    papel: membro.papel || 'operador',
    ativo: membro.ativo !== false,
    usuario_nome: membro.usuarioNome || '',
    usuario_email: membro.usuarioEmail || '',
    usuario_cargo: membro.usuarioCargo || '',
    ultimo_acesso: membro.ultimoAcesso || null,
    created_at: membro.created_at || new Date().toISOString(),
    updated_at: membro.updated_at || new Date().toISOString(),
    deleted_at: membro.deleted_at || null,
    version: Number(membro.version || 1),
  }),

  dbToEmpresaMembro: (row: any): EmpresaMembro => ({
    id: row.id,
    userId: row.user_id,
    empresaId: row.empresa_id,
    papel: row.papel as PapelEmpresa,
    ativo: Boolean(row.ativo),
    usuarioNome: row.usuario_nome || undefined,
    usuarioEmail: row.usuario_email || undefined,
    usuarioCargo: row.usuario_cargo || undefined,
    ultimoAcesso: row.ultimo_acesso || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    version: row.version || 1,
  }),

  // PLATAFORMA ADMIN
  plataformaAdminToDb: (admin: PlataformaAdmin) => ({
    id: normalizarUuid(admin.id),
    user_id: normalizarUuid(admin.userId),
    email: admin.email,
    nome: admin.nome || '',
    criado_por: admin.criadoPor || 'Sistema',
    created_at: admin.created_at || new Date().toISOString(),
    updated_at: admin.updated_at || new Date().toISOString(),
    deleted_at: admin.deleted_at || null,
    version: Number(admin.version || 1),
  }),

  dbToPlataformaAdmin: (row: any): PlataformaAdmin => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    nome: row.nome || undefined,
    criadoPor: row.criado_por || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    version: row.version || 1,
  }),

  // LEAD
  leadToDb: (lead: Lead, empresaId: string = ID_EMPRESA_PADRAO) => {
    const eId = lead.empresaId || (lead as any).empresa_id || empresaId;
    return {
      id: normalizarUuid(lead.id),
      empresa_id: normalizarUuid(eId),
      nome: lead.nome ? String(lead.nome).trim() : 'Sem Nome',
      situacao: lead.situacao || 'Em captação',
      etapa_por_situacao: lead.etapaPorSituacao || {},
      interesse: lead.interesse ? String(lead.interesse).trim() : '',
      possivel_valor: Number(lead.possivelValor || 0),
      status_venda: lead.statusVenda || 'Em processo',
      data_entrada: sanitizeDate(lead.dataEntrada) || new Date().toISOString().split('T')[0],
      responsavel: lead.responsavel ? String(lead.responsavel).trim() : 'Secretária 1',
      data_entrada_nutricao: sanitizeDate(lead.dataEntradaNutricao),
      status_grupo_nutricao: lead.statusGrupoNutricao || 'Ativo',
      motivo_perda: lead.motivoPerda ? String(lead.motivoPerda).trim() : null,
      data_perda: sanitizeDate(lead.dataPerda),
      situacao_perda: lead.situacaoPerda || null,
      created_at: lead.created_at || new Date().toISOString(),
      updated_at: lead.updated_at || new Date().toISOString(),
      deleted_at: lead.deleted_at || null,
      version: Number(lead.version || 1),
    };
  },

  dbToLead: (row: any): Lead => ({
    id: row.id,
    empresaId: row.empresa_id,
    empresa_id: row.empresa_id,
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
  fichaToDb: (ficha: FichaLead, empresaId: string = ID_EMPRESA_PADRAO) => {
    const eId = ficha.empresaId || (ficha as any).empresa_id || empresaId;
    return {
      id: normalizarUuid(ficha.id),
      empresa_id: normalizarUuid(eId),
      lead_id: normalizarUuid(ficha.leadId),
      telefone: ficha.telefone ? String(ficha.telefone).trim() : '',
      origem_lead: ficha.origemLead || 'WhatsApp',
      data_nascimento: sanitizeDate(ficha.dataNascimento),
      endereco: ficha.endereco ? String(ficha.endereco).trim() : '',
      observacoes: ficha.observacoes ? String(ficha.observacoes).trim() : '',
      motivo_perda: ficha.motivoPerda ? String(ficha.motivoPerda).trim() : null,
      data_perda: sanitizeDate(ficha.dataPerda),
      created_at: ficha.created_at || new Date().toISOString(),
      updated_at: ficha.updated_at || new Date().toISOString(),
      deleted_at: ficha.deleted_at || null,
      version: Number(ficha.version || 1),
    };
  },

  dbToFicha: (row: any): FichaLead => ({
    id: row.id,
    empresaId: row.empresa_id,
    empresa_id: row.empresa_id,
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
  compraToDb: (compra: Compra, empresaId: string = ID_EMPRESA_PADRAO) => {
    const eId = compra.empresaId || (compra as any).empresa_id || empresaId;
    return {
      id: normalizarUuid(compra.id),
      empresa_id: normalizarUuid(eId),
      lead_id: normalizarUuid(compra.leadId),
      data: sanitizeDate(compra.data) || new Date().toISOString().split('T')[0],
      procedimento: compra.procedimento || '',
      valor: Number(compra.valor || 0),
      forma_pagamento: (compra as any).forma_pagamento || (compra as any).formaPagamento || 'Pix / Cartão',
      created_at: compra.created_at || new Date().toISOString(),
      updated_at: compra.updated_at || new Date().toISOString(),
      deleted_at: compra.deleted_at || null,
      version: Number(compra.version || 1),
    };
  },

  dbToCompra: (row: any): Compra => ({
    id: row.id,
    empresaId: row.empresa_id,
    empresa_id: row.empresa_id,
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
  procedimentoToDb: (proc: ProcedimentoClinica, empresaId: string = ID_EMPRESA_PADRAO) => {
    const eId = proc.empresaId || (proc as any).empresa_id || empresaId;
    return {
      id: normalizarUuid(proc.id),
      empresa_id: normalizarUuid(eId),
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
    };
  },

  dbToProcedimento: (row: any): ProcedimentoClinica => ({
    id: row.id,
    empresaId: row.empresa_id,
    empresa_id: row.empresa_id,
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
  usuarioToDb: (usuario: UsuarioColaborador, empresaId: string = ID_EMPRESA_PADRAO) => {
    const eId = usuario.empresaId || (usuario as any).empresa_id || empresaId;
    return {
      id: normalizarUuid(usuario.id),
      empresa_id: normalizarUuid(eId),
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
    };
  },

  dbToUsuario: (row: any): UsuarioColaborador => ({
    id: row.id,
    empresaId: row.empresa_id,
    empresa_id: row.empresa_id,
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
};

// ============================================================================
// SERVIÇOS CRUD & SINCRONIZAÇÃO EM MASSA COM SUPABASE
// ============================================================================

export interface RelatorioSincronizacao {
  sucesso: boolean;
  totalEmpresas?: number;
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
   * Salva ou atualiza a empresa/clínica no Supabase (incluindo características visuais completas)
   */
  async salvarEmpresa(empresa: Partial<Empresa> | Partial<ConfiguracoesEmpresa>, idCustom?: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.empresaToDb(empresa, idCustom);
    const { error } = await client.from('empresas').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar empresa no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva todas as empresas em lote no Supabase
   */
  async salvarTodasEmpresas(empresas: Empresa[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || empresas.length === 0) return false;

    const rows = empresas.map((e) => supabaseMapper.empresaToDb(e));
    const { error } = await client.from('empresas').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar lote de empresas no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Carrega todas as empresas cadastradas no Supabase
   */
  async carregarEmpresas(): Promise<Empresa[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('empresas')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (error) throw error;
      return (data || []).map(supabaseMapper.dbToEmpresa);
    } catch (e) {
      console.error('Erro ao carregar empresas do Supabase:', e);
      return [];
    }
  },

  /**
   * Salva membro de empresa no Supabase
   */
  async salvarMembroEmpresa(membro: EmpresaMembro): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.empresaMembroToDb(membro);
    const { error } = await client.from('empresa_membros').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar membro de empresa no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva admin global da plataforma no Supabase
   */
  async salvarAdminPlataforma(admin: PlataformaAdmin): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const row = supabaseMapper.plataformaAdminToDb(admin);
    const { error } = await client.from('plataforma_admins').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar admin de plataforma no Supabase:', error);
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
    empresas: Empresa[];
    leads: Lead[];
    fichas: FichaLead[];
    compras: Compra[];
    procedimentos: ProcedimentoClinica[];
    usuarios: UsuarioColaborador[];
  } | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      // 1. Empresas ativas
      const { data: rowsEmpresas } = await client
        .from('empresas')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      // 2. Leads ativos
      const { data: rowsLeads, error: errLeads } = await client
        .from('leads')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (errLeads) throw errLeads;

      // 3. Fichas ativas
      const { data: rowsFichas, error: errFichas } = await client
        .from('fichas_leads')
        .select('*')
        .is('deleted_at', null);

      if (errFichas) throw errFichas;

      // 4. Compras ativas
      const { data: rowsCompras, error: errCompras } = await client
        .from('compras')
        .select('*')
        .is('deleted_at', null)
        .order('data', { ascending: false });

      if (errCompras) throw errCompras;

      // 5. Procedimentos ativos
      const { data: rowsProcedimentos, error: errProc } = await client
        .from('procedimentos')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (errProc) throw errProc;

      // 6. Usuários ativos
      const { data: rowsUsuarios, error: errUsers } = await client
        .from('usuarios')
        .select('*')
        .is('deleted_at', null);

      if (errUsers) throw errUsers;

      return {
        empresas: (rowsEmpresas || []).map(supabaseMapper.dbToEmpresa),
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
    empresas?: Empresa[];
    empresaMembros?: EmpresaMembro[];
    plataformaAdmins?: PlataformaAdmin[];
    onProgresso?: (etapa: string, percentual: number) => void;
  }): Promise<RelatorioSincronizacao> {
    const client = getSupabaseClient();
    const erros: string[] = [];

    if (!client) {
      return {
        sucesso: false,
        totalEmpresas: 0,
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
      params.onProgresso?.('Salvando clínicas e características visuais...', 10);
      let totalEmpresasSalvas = 0;
      try {
        if (params.empresas && params.empresas.length > 0) {
          const rowsEmp = params.empresas.map((e) => supabaseMapper.empresaToDb(e));
          const { error: errE } = await client.from('empresas').upsert(rowsEmp, { onConflict: 'id' });
          if (errE) {
            erros.push(`Erro ao salvar empresas: ${errE.message}`);
          } else {
            totalEmpresasSalvas = rowsEmp.length;
          }
        } else {
          await this.salvarEmpresa(params.configEmpresa);
          totalEmpresasSalvas = 1;
        }
      } catch (e: any) {
        erros.push(`Falha ao salvar empresa: ${e?.message}`);
      }

      // Sincroniza membros de empresa se fornecidos
      if (params.empresaMembros && params.empresaMembros.length > 0) {
        try {
          const rowsMembros = params.empresaMembros.map((m) => supabaseMapper.empresaMembroToDb(m));
          await client.from('empresa_membros').upsert(rowsMembros, { onConflict: 'id' });
        } catch (e: any) {
          console.warn('Aviso em membros:', e?.message);
        }
      }

      // Sincroniza admins da plataforma se fornecidos
      if (params.plataformaAdmins && params.plataformaAdmins.length > 0) {
        try {
          const rowsAdmins = params.plataformaAdmins.map((a) => supabaseMapper.plataformaAdminToDb(a));
          await client.from('plataforma_admins').upsert(rowsAdmins, { onConflict: 'id' });
        } catch (e: any) {
          console.warn('Aviso em admins:', e?.message);
        }
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
        totalEmpresas: totalEmpresasSalvas,
        totalLeads: totalLeadsSalvos,
        totalFichas: totalFichasSalvas,
        totalCompras: totalComprasSalvas,
        totalProcedimentos: totalProcSalvos,
        totalUsuarios: totalUsersSalvos,
        mensagem: sucessoGeral
          ? 'Todos os dados, clínicas e características visuais foram salvos com sucesso no Supabase!'
          : `Sincronização parcial realizada com ${erros.length} aviso(s).`,
        erros,
      };
    } catch (error: any) {
      return {
        sucesso: false,
        totalEmpresas: 0,
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

  /**
   * Consulta registros ao vivo de qualquer tabela do Supabase para visualização no painel
   */
  async buscarLinhasTabelaAoVivo(tabela: string, limite: number = 20): Promise<{ dados: any[]; erro?: string }> {
    const client = getSupabaseClient();
    if (!client) return { dados: [], erro: 'Supabase não conectado' };

    try {
      const { data, error } = await client
        .from(tabela)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);

      if (error) {
        return { dados: [], erro: error.message };
      }

      return { dados: data || [] };
    } catch (e: any) {
      return { dados: [], erro: e?.message || 'Erro ao consultar tabela' };
    }
  },

  /**
   * Executa um teste real e palpável de gravação e exclusão em tempo real no Supabase
   */
  async testarEnvioEmTempoReal(): Promise<{
    sucesso: boolean;
    latenciaMs: number;
    mensagem: string;
    registroCriado?: any;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        sucesso: false,
        latenciaMs: 0,
        mensagem: 'Supabase não está configurado. Insira a URL e a Chave Anon.',
      };
    }

    const tInicio = performance.now();
    const idTeste = normalizarUuid();
    const nomeTeste = `[TESTE-TEMPO-REAL] ${new Date().toLocaleTimeString('pt-BR')}`;

    try {
      // 1. Grava lead de teste no Supabase
      const payload = {
        id: idTeste,
        empresa_id: ID_EMPRESA_PADRAO,
        nome: nomeTeste,
        situacao: 'Em captação',
        status_venda: 'Em processo',
        possivel_valor: 1500,
        interesse: 'Validação de Conexão Supabase Realtime',
        responsavel: 'Sistema de Testes',
        data_entrada: new Date().toISOString().split('T')[0],
      };

      const { data: insertData, error: insertError } = await client
        .from('leads')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Falha ao inserir registro de teste: ${insertError.message}`);
      }

      // 2. Imediatamente efetua soft-delete ou limpeza para não poluir
      await client.from('leads').delete().eq('id', idTeste);

      const latencia = Math.round(performance.now() - tInicio);

      return {
        sucesso: true,
        latenciaMs: latencia,
        mensagem: `Gravação em tempo real confirmada no Supabase em ${latencia}ms! O banco aceitou o registro e processou a transação com sucesso.`,
        registroCriado: insertData,
      };
    } catch (error: any) {
      const latencia = Math.round(performance.now() - tInicio);
      return {
        sucesso: false,
        latenciaMs: latencia,
        mensagem: error?.message || 'Falha ao executar teste de gravação no Supabase.',
      };
    }
  },
};

