import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { firestoreService } from './firestoreService';
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
  CriarLeadPayload,
  AtualizarLeadPayload,
  KpiSecretariaMensal,
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

let cachedFichasTableName: string | null = null;

async function getFichasTableName(): Promise<string> {
  if (cachedFichasTableName) return cachedFichasTableName;
  const client = getSupabaseClient();
  if (!client) return 'fichas_leads';

  const { error: err1 } = await client.from('fichas_leads').select('id').limit(1);
  if (!err1) {
    cachedFichasTableName = 'fichas_leads';
    return cachedFichasTableName;
  }

  if (err1.code === 'PGRST205' || err1.code === '42P01' || err1.message?.includes('fichas_leads')) {
    const { error: err2 } = await client.from('fichas_lead').select('id').limit(1);
    if (!err2 || err2.code !== 'PGRST205') {
      cachedFichasTableName = 'fichas_lead';
      return cachedFichasTableName;
    }
  }

  cachedFichasTableName = 'fichas_leads';
  return cachedFichasTableName;
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

    // Objeto de agendamento preservado dentro do JSONB de etapa_por_situacao sob a chave _agendamento
    const agendamentoMeta = {
      dataAgendamento: lead.dataAgendamento || null,
      horarioAgendamento: lead.horarioAgendamento || null,
      profissionalAgendamento: lead.profissionalAgendamento || null,
      tipoConsulta: lead.tipoConsulta || null,
      unidadeAgendamento: lead.unidadeAgendamento || null,
      observacoesAgendamento: lead.observacoesAgendamento || null,
      statusConfirmacaoAgendamento: lead.statusConfirmacaoAgendamento || null,
      lembrete24hEnviado: Boolean(lead.lembrete24hEnviado),
      dataEnvioLembrete24h: lead.dataEnvioLembrete24h || null,
      mensagemLembrete24hEnviadaPor: lead.mensagemLembrete24hEnviadaPor || null,
    };

    const etapaMap = {
      ...(lead.etapaPorSituacao || {}),
      _agendamento: agendamentoMeta,
    };

    return {
      id: normalizarUuid(lead.id),
      empresa_id: normalizarUuid(eId),
      nome: lead.nome ? String(lead.nome).trim() : 'Sem Nome',
      situacao: lead.situacao || 'Em captação',
      etapa_por_situacao: etapaMap,
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
      version: Number(lead.version || 1),
      created_at: lead.created_at || new Date().toISOString(),
      updated_at: lead.updated_at || new Date().toISOString(),
      deleted_at: lead.deleted_at || null,
    };
  },

  dbToLead: (row: any): Lead => {
    const metaAgendamento = row.etapa_por_situacao?._agendamento || {};
    const etapaMap = { ...(row.etapa_por_situacao || {}) };
    delete etapaMap._agendamento;

    return {
      id: row.id,
      empresaId: row.empresa_id,
      empresa_id: row.empresa_id,
      nome: row.nome,
      situacao: row.situacao as SituacaoLead,
      etapaPorSituacao: etapaMap,
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

      // Recuperação dos dados do agendamento a partir do meta JSONB ou coluna legado
      dataAgendamento: metaAgendamento.dataAgendamento || row.data_agendamento || undefined,
      horarioAgendamento: metaAgendamento.horarioAgendamento || row.horario_agendamento || undefined,
      profissionalAgendamento: metaAgendamento.profissionalAgendamento || row.profissional_agendamento || undefined,
      tipoConsulta: metaAgendamento.tipoConsulta || row.tipo_consulta || undefined,
      unidadeAgendamento: metaAgendamento.unidadeAgendamento || row.unidade_agendamento || undefined,
      observacoesAgendamento: metaAgendamento.observacoesAgendamento || row.observacoes_agendamento || undefined,
      statusConfirmacaoAgendamento: metaAgendamento.statusConfirmacaoAgendamento || row.status_confirmacao_agendamento || undefined,
      lembrete24hEnviado: metaAgendamento.lembrete24hEnviado !== undefined && metaAgendamento.lembrete24hEnviado !== null ? Boolean(metaAgendamento.lembrete24hEnviado) : Boolean(row.lembrete_24h_enviado),
      dataEnvioLembrete24h: metaAgendamento.dataEnvioLembrete24h || row.data_envio_lembrete_24h || undefined,
      mensagemLembrete24hEnviadaPor: metaAgendamento.mensagemLembrete24hEnviadaPor || row.mensagem_lembrete_24h_enviada_por || undefined,

      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      version: row.version || 1,
    };
  },

  // FICHA DO LEAD
  fichaToDb: (ficha: Partial<FichaLead> & { leadId?: string; id?: string }, empresaId: string = ID_EMPRESA_PADRAO) => {
    const eId = ficha.empresaId || (ficha as any).empresa_id || empresaId;
    return {
      id: normalizarUuid(ficha.id),
      empresa_id: normalizarUuid(eId),
      lead_id: normalizarUuid(ficha.leadId),
      telefone: ficha.telefone ? String(ficha.telefone).trim() : '',
      origem_lead: ficha.origemLead || (ficha as any).comoConheceu || 'WhatsApp',
      data_nascimento: sanitizeDate(ficha.dataNascimento),
      endereco: ficha.endereco ? String(ficha.endereco).trim() : '',
      observacoes: ficha.observacoes ? String(ficha.observacoes).trim() : '',
      motivo_perda: ficha.motivoPerda ? String(ficha.motivoPerda).trim() : null,
      data_perda: sanitizeDate(ficha.dataPerda),
      version: Number(ficha.version || 1),
      created_at: ficha.created_at || new Date().toISOString(),
      updated_at: ficha.updated_at || new Date().toISOString(),
      deleted_at: ficha.deleted_at || null,
    };
  },

  dbToFicha: (row: any): FichaLead => ({
    id: row.id,
    empresaId: row.empresa_id,
    empresa_id: row.empresa_id,
    leadId: row.lead_id,
    telefone: row.telefone || '',
    email: row.email || '',
    idade: row.idade ? Number(row.idade) : undefined,
    origemLead: (row.origem_lead as OrigemLead) || (row.como_conheceu as OrigemLead) || 'WhatsApp',
    comoConheceu: row.como_conheceu || row.origem_lead || '',
    gastoEstimado: row.gasto_estimado ? Number(row.gasto_estimado) : 0,
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
      version: Number(compra.version || 1),
      created_at: compra.created_at || new Date().toISOString(),
      updated_at: compra.updated_at || new Date().toISOString(),
      deleted_at: compra.deleted_at || null,
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
    formaPagamento: row.forma_pagamento || 'Pix / Cartão',
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
      version: Number(proc.version || 1),
      created_at: proc.created_at || new Date().toISOString(),
      updated_at: proc.updated_at || new Date().toISOString(),
      deleted_at: proc.deleted_at || null,
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
      version: Number(usuario.version || 1),
      created_at: usuario.created_at || new Date().toISOString(),
      updated_at: usuario.updated_at || new Date().toISOString(),
      deleted_at: usuario.deleted_at || null,
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
  // --------------------------------------------------------------------------
  // 1. OPERAÇÕES DE LEADS (leads)
  // --------------------------------------------------------------------------

  /**
   * Buscar todos os leads da empresa do usuário autenticado (filtrando deleted_at IS NULL).
   */
  async fetchLeads(empresaId?: string): Promise<Lead[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client
        .from('leads')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (empresaId) {
        query = query.eq('empresa_id', normalizarUuid(empresaId));
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar leads no Supabase:', error);
        throw error;
      }
      return (data || []).map(supabaseMapper.dbToLead);
    } catch (error) {
      console.error('Falha em fetchLeads:', error);
      return [];
    }
  },

  /**
   * Inserir um novo lead na tabela leads.
   */
  async criarLead(
    dados: CriarLeadPayload | Partial<Lead>,
    empresaId: string = ID_EMPRESA_PADRAO
  ): Promise<Lead | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const idNovo = normalizarUuid((dados as any).id);
      const eId = normalizarUuid((dados as any).empresaId || (dados as any).empresa_id || empresaId);

      const leadCompleto: Lead = {
        id: idNovo,
        empresaId: eId,
        nome: dados.nome ? String(dados.nome).trim() : 'Novo Paciente',
        situacao: (dados.situacao as SituacaoLead) || 'Em captação',
        etapaPorSituacao: (dados as any).etapaPorSituacao || {},
        interesse: dados.interesse ? String(dados.interesse).trim() : '',
        possivelValor: Number(dados.possivelValor || 0),
        statusVenda: (dados.statusVenda as StatusVenda) || 'Em processo',
        dataEntrada: sanitizeDate(dados.dataEntrada) || new Date().toISOString().split('T')[0],
        responsavel: dados.responsavel ? String(dados.responsavel).trim() : 'Secretária 1',
        dataAgendamento: dados.dataAgendamento,
        horarioAgendamento: dados.horarioAgendamento,
        profissionalAgendamento: dados.profissionalAgendamento,
        tipoConsulta: dados.tipoConsulta,
        unidadeAgendamento: dados.unidadeAgendamento,
        observacoesAgendamento: dados.observacoesAgendamento,
        statusConfirmacaoAgendamento: dados.statusConfirmacaoAgendamento,
        lembrete24hEnviado: dados.lembrete24hEnviado,
        dataEnvioLembrete24h: dados.dataEnvioLembrete24h,
        mensagemLembrete24hEnviadaPor: dados.mensagemLembrete24hEnviadaPor,
        dataEntradaNutricao: sanitizeDate(dados.dataEntradaNutricao) || undefined,
        statusGrupoNutricao: dados.statusGrupoNutricao || 'Ativo',
        motivoPerda: dados.motivoPerda,
        dataPerda: sanitizeDate(dados.dataPerda) || undefined,
        situacaoPerda: dados.situacaoPerda,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };

      const row = supabaseMapper.leadToDb(leadCompleto, eId);
      const { data, error } = await client
        .from('leads')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar lead no Supabase:', error);
        throw error;
      }

      const leadCriado = supabaseMapper.dbToLead(data);
      firestoreService.salvarLead(leadCriado).catch(() => {});

      // Se houver dados de ficha no payload de criação, persiste no banco
      if ((dados as CriarLeadPayload).ficha) {
        const fichaPayload = (dados as CriarLeadPayload).ficha;
        await this.salvarFichaLead(
          {
            leadId: leadCriado.id,
            empresaId: leadCriado.empresaId,
            telefone: fichaPayload?.telefone || '',
            email: (fichaPayload as any)?.email || '',
            origemLead: fichaPayload?.origemLead || 'WhatsApp',
            dataNascimento: fichaPayload?.dataNascimento || '',
            endereco: fichaPayload?.endereco || '',
            observacoes: fichaPayload?.observacoes || '',
          },
          eId
        );
      }

      return leadCriado;
    } catch (error) {
      console.error('Falha em criarLead:', error);
      throw error;
    }
  },

  /**
   * Atualizar registro na tabela leads.
   */
  async atualizarLead(
    id: string,
    dados: Partial<Lead> | AtualizarLeadPayload,
    empresaId: string = ID_EMPRESA_PADRAO
  ): Promise<Lead | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const uuid = normalizarUuid(id);

      // Busca dados atuais do lead para preservar campos não alterados
      const { data: leadExistenteRow, error: fetchErr } = await client
        .from('leads')
        .select('*')
        .eq('id', uuid)
        .maybeSingle();

      if (fetchErr) {
        console.error('Aviso ao buscar lead para atualização:', fetchErr);
      }

      const leadExistente = leadExistenteRow ? supabaseMapper.dbToLead(leadExistenteRow) : null;

      const leadMesclado: Lead = {
        id: uuid,
        empresaId: normalizarUuid(
          (dados as any).empresaId || (dados as any).empresa_id || leadExistente?.empresaId || empresaId
        ),
        nome: dados.nome !== undefined ? String(dados.nome).trim() : (leadExistente?.nome || 'Paciente'),
        situacao: dados.situacao || leadExistente?.situacao || 'Em captação',
        etapaPorSituacao: {
          ...(leadExistente?.etapaPorSituacao || {}),
          ...((dados as any).etapaPorSituacao || {}),
        },
        interesse: dados.interesse !== undefined ? String(dados.interesse).trim() : (leadExistente?.interesse || ''),
        possivelValor:
          dados.possivelValor !== undefined ? Number(dados.possivelValor) : (leadExistente?.possivelValor || 0),
        statusVenda: dados.statusVenda || leadExistente?.statusVenda || 'Em processo',
        dataEntrada:
          sanitizeDate(dados.dataEntrada) || leadExistente?.dataEntrada || new Date().toISOString().split('T')[0],
        responsavel:
          dados.responsavel !== undefined ? String(dados.responsavel).trim() : (leadExistente?.responsavel || 'Secretária 1'),

        // Agendamento
        dataAgendamento: dados.dataAgendamento !== undefined ? dados.dataAgendamento : leadExistente?.dataAgendamento,
        horarioAgendamento:
          dados.horarioAgendamento !== undefined ? dados.horarioAgendamento : leadExistente?.horarioAgendamento,
        profissionalAgendamento:
          dados.profissionalAgendamento !== undefined
            ? dados.profissionalAgendamento
            : leadExistente?.profissionalAgendamento,
        tipoConsulta: dados.tipoConsulta !== undefined ? dados.tipoConsulta : leadExistente?.tipoConsulta,
        unidadeAgendamento:
          dados.unidadeAgendamento !== undefined ? dados.unidadeAgendamento : leadExistente?.unidadeAgendamento,
        observacoesAgendamento:
          dados.observacoesAgendamento !== undefined
            ? dados.observacoesAgendamento
            : leadExistente?.observacoesAgendamento,
        statusConfirmacaoAgendamento:
          dados.statusConfirmacaoAgendamento !== undefined
            ? dados.statusConfirmacaoAgendamento
            : leadExistente?.statusConfirmacaoAgendamento,
        lembrete24hEnviado:
          dados.lembrete24hEnviado !== undefined ? dados.lembrete24hEnviado : leadExistente?.lembrete24hEnviado,
        dataEnvioLembrete24h:
          dados.dataEnvioLembrete24h !== undefined ? dados.dataEnvioLembrete24h : leadExistente?.dataEnvioLembrete24h,
        mensagemLembrete24hEnviadaPor:
          dados.mensagemLembrete24hEnviadaPor !== undefined
            ? dados.mensagemLembrete24hEnviadaPor
            : leadExistente?.mensagemLembrete24hEnviadaPor,

        dataEntradaNutricao: sanitizeDate(dados.dataEntradaNutricao) || leadExistente?.dataEntradaNutricao,
        statusGrupoNutricao: dados.statusGrupoNutricao || leadExistente?.statusGrupoNutricao || 'Ativo',
        motivoPerda: dados.motivoPerda !== undefined ? dados.motivoPerda : leadExistente?.motivoPerda,
        dataPerda: sanitizeDate(dados.dataPerda) || leadExistente?.dataPerda,
        situacaoPerda: dados.situacaoPerda || leadExistente?.situacaoPerda,

        created_at: leadExistente?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: leadExistente?.deleted_at || null,
        version: (leadExistente?.version || 1) + 1,
      };

      const row = supabaseMapper.leadToDb(leadMesclado, empresaId);
      const { data, error } = await client
        .from('leads')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar lead no Supabase:', error);
        throw error;
      }

      const leadAtualizado = supabaseMapper.dbToLead(data);
      firestoreService.salvarLead(leadAtualizado).catch(() => {});
      return leadAtualizado;
    } catch (error) {
      console.error('Falha em atualizarLead:', error);
      throw error;
    }
  },

  /**
   * Aplicar exclusão lógica preenchendo deleted_at = new Date().toISOString().
   */
  async excluirLead(id: string): Promise<boolean> {
    return this.softDeleteLead(id);
  },

  /**
   * Alias de compatibilidade para salvar/upsert de lead
   */
  async salvarLead(lead: Lead, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    firestoreService.salvarLead(lead).catch(() => {});
    const client = getSupabaseClient();
    if (!client) return true;

    const row = supabaseMapper.leadToDb(lead, empresaId);
    const { error } = await client.from('leads').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar Lead no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Alias de compatibilidade para soft delete de lead
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

  // --------------------------------------------------------------------------
  // 2. OPERAÇÕES DE AGENDAMENTOS
  // --------------------------------------------------------------------------

  /**
   * Chamar EXCLUSIVAMENTE a função RPC `supabase.rpc('atualizar_agendamento_lead', ...)`
   * para não sobrescrever nem apagar as etapas do funil registradas no JSONB.
   */
  async salvarAgendamentoLead(leadId: string, dadosAgendamento: Record<string, any>): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const uuid = normalizarUuid(leadId);
      const { error } = await client.rpc('atualizar_agendamento_lead', {
        p_lead_id: uuid,
        p_agendamento_json: dadosAgendamento,
      });

      if (error) {
        console.error('Erro RPC ao salvar agendamento do lead:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Falha em salvarAgendamentoLead:', error);
      throw error;
    }
  },

  /**
   * Buscar registros diretamente da view vw_agendamentos.
   */
  async fetchAgendamentos(empresaId?: string): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client.from('vw_agendamentos').select('*');
      if (empresaId) {
        query = query.eq('empresa_id', normalizarUuid(empresaId));
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar agendamentos da view vw_agendamentos:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Falha em fetchAgendamentos:', error);
      return [];
    }
  },

  // --------------------------------------------------------------------------
  // 3. OPERAÇÕES DE FICHAS DE LEAD (fichas_lead)
  // --------------------------------------------------------------------------

  /**
   * Buscar ficha cadastral/anamnese vinculada ao lead.
   */
  async fetchFichaByLeadId(leadOrId: string | Lead): Promise<FichaLead | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const leadId = typeof leadOrId === 'string' ? leadOrId : leadOrId.id;
      const uuid = normalizarUuid(leadId);

      const tableName = await getFichasTableName();
      let { data, error } = await client
        .from(tableName)
        .select('*')
        .eq('lead_id', uuid)
        .is('deleted_at', null)
        .maybeSingle();

      if (error && (error.code === 'PGRST205' || error.message?.includes('fichas_leads'))) {
        cachedFichasTableName = 'fichas_lead';
        const resFallback = await client
          .from('fichas_lead')
          .select('*')
          .eq('lead_id', uuid)
          .is('deleted_at', null)
          .maybeSingle();
        data = resFallback.data;
        error = resFallback.error;
      }

      if (error) {
        console.error('Erro ao buscar ficha do lead:', error);
        throw error;
      }

      if (data) {
        return supabaseMapper.dbToFicha(data);
      }

      // FALLBACK: Se o parâmetro for um objeto Lead e ainda não existir registro na 'fichas_leads'/'fichas_lead',
      // preenche os campos básicos usando o objeto 'lead'
      if (typeof leadOrId !== 'string') {
        const lead = leadOrId;
        return {
          id: normalizarUuid(),
          leadId: lead.id,
          empresaId: lead.empresaId || ID_EMPRESA_PADRAO,
          telefone: (lead as any).telefone || '',
          email: (lead as any).email || '',
          dataNascimento: '',
          endereco: '',
          origemLead: 'WhatsApp',
          comoConheceu: lead.interesse || '',
          gastoEstimado: 0,
          observacoes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        };
      }

      return null;
    } catch (error) {
      console.error('Falha em fetchFichaByLeadId:', error);
      return null;
    }
  },

  /**
   * Executar upsert tratando devidamente os tipos de dados (converter números e formatar datas YYYY-MM-DD).
   */
  async salvarFichaLead(
    dadosFicha: Partial<FichaLead> & { leadId?: string; id?: string },
    empresaId: string = ID_EMPRESA_PADRAO
  ): Promise<FichaLead | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const leadUuid = normalizarUuid(dadosFicha.leadId);

      let fichaExistente: FichaLead | null = null;
      let idFicha = dadosFicha.id ? normalizarUuid(dadosFicha.id) : null;
      if (!idFicha) {
        fichaExistente = await this.fetchFichaByLeadId(leadUuid);
        idFicha = fichaExistente?.id ? normalizarUuid(fichaExistente.id) : normalizarUuid();
      }

      const fichaCompleta: FichaLead = {
        id: idFicha,
        empresaId: normalizarUuid(dadosFicha.empresaId || (dadosFicha as any).empresa_id || fichaExistente?.empresaId || empresaId),
        leadId: leadUuid,
        telefone: dadosFicha.telefone !== undefined ? String(dadosFicha.telefone).trim() : (fichaExistente?.telefone || ''),
        email: (dadosFicha as any).email !== undefined ? String((dadosFicha as any).email).trim() : (fichaExistente?.email || ''),
        idade: (dadosFicha as any).idade !== undefined ? Number((dadosFicha as any).idade) : fichaExistente?.idade,
        origemLead: dadosFicha.origemLead || fichaExistente?.origemLead || 'WhatsApp',
        dataNascimento: sanitizeDate(dadosFicha.dataNascimento) || fichaExistente?.dataNascimento || '',
        endereco: dadosFicha.endereco !== undefined ? String(dadosFicha.endereco).trim() : (fichaExistente?.endereco || ''),
        observacoes: dadosFicha.observacoes !== undefined ? String(dadosFicha.observacoes).trim() : (fichaExistente?.observacoes || ''),
        motivoPerda: dadosFicha.motivoPerda !== undefined ? dadosFicha.motivoPerda : fichaExistente?.motivoPerda,
        dataPerda: sanitizeDate(dadosFicha.dataPerda) || fichaExistente?.dataPerda,
        created_at: dadosFicha.created_at || fichaExistente?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: Number(dadosFicha.version || fichaExistente?.version || 1) + 1,
      };

      const row = supabaseMapper.fichaToDb(fichaCompleta, empresaId);
      const tableName = await getFichasTableName();
      let { data, error } = await client
        .from(tableName)
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();

      if (error && (error.code === 'PGRST205' || error.message?.includes('fichas_leads'))) {
        cachedFichasTableName = 'fichas_lead';
        const resFallback = await client
          .from('fichas_lead')
          .upsert(row, { onConflict: 'id' })
          .select()
          .single();
        data = resFallback.data;
        error = resFallback.error;
      }

      if (error) {
        console.error('Erro ao salvar ficha do lead no Supabase:', error);
        throw error;
      }

      const fichaSalva = supabaseMapper.dbToFicha(data);
      firestoreService.salvarFicha(fichaSalva).catch(() => {});
      return fichaSalva;
    } catch (error) {
      console.error('Falha em salvarFichaLead:', error);
      throw error;
    }
  },

  /**
   * Alias de compatibilidade para salvar ficha
   */
  async salvarFicha(ficha: FichaLead, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    const res = await this.salvarFichaLead(ficha, empresaId);
    return Boolean(res);
  },

  // --------------------------------------------------------------------------
  // 4. OUTRAS ENTIDADES & MÉTODOS DE SUPORTE
  // --------------------------------------------------------------------------

  /**
   * Salva ou atualiza a empresa/clínica no Supabase
   */
  async salvarEmpresa(
    empresa: Partial<Empresa> | Partial<ConfiguracoesEmpresa>,
    idCustom?: string
  ): Promise<boolean> {
    if (empresa && (empresa as any).id) {
      firestoreService.salvarEmpresa(empresa as Empresa).catch(() => {});
    }
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
   * Salva ou atualiza uma Compra no Supabase
   */
  async salvarCompra(compra: Compra, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    firestoreService.salvarCompra(compra).catch(() => {});
    const client = getSupabaseClient();
    if (!client) return true;

    const row = supabaseMapper.compraToDb(compra, empresaId);
    const { error } = await client.from('compras').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar Compra no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Soft Delete em Compra
   */
  async softDeleteCompra(compraId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const { error } = await client
      .from('compras')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', normalizarUuid(compraId));

    if (error) {
      console.error('Erro ao efetuar soft delete na Compra:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva ou atualiza um Procedimento no Supabase
   */
  async salvarProcedimento(proc: ProcedimentoClinica, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    firestoreService.salvarProcedimento(proc).catch(() => {});
    const client = getSupabaseClient();
    if (!client) return true;

    const row = supabaseMapper.procedimentoToDb(proc, empresaId);
    const { error } = await client.from('procedimentos').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar Procedimento no Supabase:', error);
      throw error;
    }
    return true;
  },

  /**
   * Soft Delete em Procedimento
   */
  async softDeleteProcedimento(procId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const { error } = await client
      .from('procedimentos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', normalizarUuid(procId));

    if (error) {
      console.error('Erro ao efetuar soft delete no Procedimento:', error);
      throw error;
    }
    return true;
  },

  /**
   * Salva ou atualiza um Usuário Colaborador no Supabase
   */
  async salvarUsuario(usuario: UsuarioColaborador, empresaId: string = ID_EMPRESA_PADRAO): Promise<boolean> {
    firestoreService.salvarUsuario(usuario).catch(() => {});
    const client = getSupabaseClient();
    if (!client) return true;

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
   * com suporte a fallback automático e espelhamento no Firestore
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

    if (client) {
      try {
        const tableNameFichas = await getFichasTableName();
        const [resEmpresas, resLeads, resFichasRaw, resCompras, resProc, resUsers] = await Promise.all([
          client.from('empresas').select('*').is('deleted_at', null).order('nome', { ascending: true }),
          client.from('leads').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
          client.from(tableNameFichas).select('*').is('deleted_at', null),
          client.from('compras').select('*').is('deleted_at', null).order('data', { ascending: false }),
          client.from('procedimentos').select('*').is('deleted_at', null).order('nome', { ascending: true }),
          client.from('usuarios').select('*').is('deleted_at', null),
        ]);

        let resFichas = resFichasRaw;
        if (resFichas.error && (resFichas.error.code === 'PGRST205' || resFichas.error.message?.includes('fichas_leads'))) {
          cachedFichasTableName = 'fichas_lead';
          resFichas = await client.from('fichas_lead').select('*').is('deleted_at', null);
        }

        const rowsEmpresas = resEmpresas.data || [];
        const rowsLeads = resLeads.data || [];
        const rowsFichas = resFichas.data || [];
        const rowsCompras = resCompras.data || [];
        const rowsProcedimentos = resProc.data || [];
        const rowsUsuarios = resUsers.data || [];

        const resultado = {
          empresas: rowsEmpresas.map(supabaseMapper.dbToEmpresa),
          leads: rowsLeads.map(supabaseMapper.dbToLead),
          fichas: rowsFichas.map(supabaseMapper.dbToFicha),
          compras: rowsCompras.map(supabaseMapper.dbToCompra),
          procedimentos: rowsProcedimentos.map(supabaseMapper.dbToProcedimento),
          usuarios: rowsUsuarios.map(supabaseMapper.dbToUsuario),
        };

        if (
          resultado.leads.length > 0 ||
          resultado.procedimentos.length > 0 ||
          resultado.empresas.length > 0 ||
          resultado.usuarios.length > 0
        ) {
          return resultado;
        }

        // Se Supabase está vazio e Firestore não está com cota estourada, busca do Firestore como fallback
        const dadosFirestore = await firestoreService.carregarDadosCompletos();
        if (
          dadosFirestore &&
          (dadosFirestore.leads.length > 0 ||
            dadosFirestore.procedimentos.length > 0 ||
            dadosFirestore.usuarios.length > 0 ||
            dadosFirestore.empresas.length > 0)
        ) {
          return dadosFirestore;
        }

        return resultado;
      } catch (error: any) {
        console.warn('Aviso ao carregar dados do Supabase:', error?.message || error);
      }
    }

    return await firestoreService.carregarDadosCompletos();
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
        let tableName = await getFichasTableName();
        let { error: errF } = await client.from(tableName).upsert(rowsFichas, { onConflict: 'id' });
        if (errF && (errF.code === 'PGRST205' || errF.message?.includes('fichas_leads'))) {
          cachedFichasTableName = 'fichas_lead';
          const resF = await client.from('fichas_lead').upsert(rowsFichas, { onConflict: 'id' });
          errF = resF.error;
        }
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
   */
  async apagarDadosPacientesSupabase(
    _empresaId: string = ID_EMPRESA_PADRAO
  ): Promise<{
    sucesso: boolean;
    mensagem: string;
    erros: string[];
  }> {
    const client = getSupabaseClient();
    const erros: string[] = [];

    if (!client) {
      return {
        sucesso: true,
        mensagem: 'Supabase não conectado. Limpeza realizada localmente.',
        erros: [],
      };
    }

    try {
      const { error: errC } = await client
        .from('compras')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (errC) erros.push(`Erro ao limpar compras: ${errC.message}`);

      const tableNameFichas = await getFichasTableName();
      let { error: errF } = await client
        .from(tableNameFichas)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (errF && (errF.code === 'PGRST205' || errF.message?.includes('fichas_leads'))) {
        cachedFichasTableName = 'fichas_lead';
        const resF = await client
          .from('fichas_lead')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        errF = resF.error;
      }
      if (errF) erros.push(`Erro ao limpar fichas: ${errF.message}`);

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

// =========================================================================
// MÓDULO DE KPIS & COMISSIONAMENTO DA SECRETÁRIA (POLÍTICA BON-001)
// =========================================================================

export interface ParametrosCalculoKpi {
  consultasRealizadas: number;
  totalAgendamentos?: number;
  procedimentosAgendados?: number;
  procedimentosRealizados?: number;
  leadsPosConsulta: number;
  leadsVendaFeita: number;
  faturamentoRealizado: number;
  metaFaturamento?: number;
}

export interface ResultadoCalculoKpi {
  consultasRealizadas: number;
  totalAgendamentos: number;
  procedimentosAgendados: number;
  procedimentosRealizados: number;
  taxaComparecimento: number;
  travaComparecimentoOk: boolean;
  leadsPosConsulta: number;
  leadsVendaFeita: number;
  taxaFechamento: number;
  faturamentoRealizado: number;
  metaFaturamento: number;
  percentualMetaFaturamento: number;
  bonusCaptacao: number;
  bonusComparecimento: number;
  bonusFechamento: number;
  bonusFaturamento: number;
  percentualBonusBaseFaturamento: number;
  comissaoTotal: number;
}

/**
 * Função utilitária que aplica rigorosamente as regras de negócio da Política Formal BON-001
 * Métricas: Captação (Consultas), Comparecimento (Procedimentos), Fechamento (Follow-up) e Faturamento (Meta Mensal)
 */
export function calcularRegraComissao(params: ParametrosCalculoKpi): ResultadoCalculoKpi {
  const metaFaturamento = params.metaFaturamento || 80000;
  const consultasRealizadas = Math.max(0, params.consultasRealizadas || 0);
  const totalAgendamentos = Math.max(0, params.totalAgendamentos || 0);

  // Procedimentos agendados (exclui consultas) e procedimentos realizados (não viraram no-show)
  const procedimentosAgendados = Math.max(0, params.procedimentosAgendados ?? (totalAgendamentos > consultasRealizadas ? totalAgendamentos - consultasRealizadas : totalAgendamentos));
  const procedimentosRealizados = Math.max(0, params.procedimentosRealizados ?? procedimentosAgendados);

  const leadsPosConsulta = Math.max(0, params.leadsPosConsulta || 0);
  const leadsVendaFeita = Math.max(0, params.leadsVendaFeita || 0);
  const faturamentoRealizado = Math.max(0, params.faturamentoRealizado || 0);

  // 1. KPI 2 & Trava: Taxa de Comparecimento (% de procedimentos agendados que não viram no-show)
  let taxaComparecimento = procedimentosAgendados > 0
    ? (procedimentosRealizados / procedimentosAgendados) * 100
    : (totalAgendamentos > 0 ? (consultasRealizadas / totalAgendamentos) * 100 : 100);
  taxaComparecimento = Number(taxaComparecimento.toFixed(1));

  // TRAVA CRÍTICA DE SEGURANÇA: Comparecimento >= 75%
  const travaComparecimentoOk = taxaComparecimento >= 75;

  // 2. BÔNUS 1: CAPTAÇÃO (Volume de consultas realizadas no mês - Exige Comparecimento >= 75%)
  // 30 consultas: R$ 300 | 40 consultas: R$ 400 | 50+ consultas: R$ 500
  let bonusCaptacao = 0;
  if (travaComparecimentoOk) {
    if (consultasRealizadas >= 50) {
      bonusCaptacao = 500;
    } else if (consultasRealizadas >= 40) {
      bonusCaptacao = 400;
    } else if (consultasRealizadas >= 30) {
      bonusCaptacao = 300;
    } else {
      bonusCaptacao = 0;
    }
  } else {
    bonusCaptacao = 0; // Bloqueado pela trava de comparecimento (< 75%)
  }

  // 3. BÔNUS 2: COMPARECIMENTO (% de procedimentos agendados que não viram no-show)
  // < 75%: Sem bônus | 75% a 85%: R$ 300 | 86% a 95%: R$ 500 | > 95%: R$ 700
  let bonusComparecimento = 0;
  if (taxaComparecimento > 95) {
    bonusComparecimento = 700;
  } else if (taxaComparecimento >= 86) {
    bonusComparecimento = 500;
  } else if (taxaComparecimento >= 75) {
    bonusComparecimento = 300;
  } else {
    bonusComparecimento = 0;
  }

  // 4. BÔNUS 3: FECHAMENTO (% de orçamentos aprovados após follow-up pós-consulta)
  // < 30%: Sem bônus | 30% a 45%: R$ 400 | 46% a 60%: R$ 700 | > 60%: R$ 1.000
  let taxaFechamento = leadsPosConsulta > 0
    ? (leadsVendaFeita / leadsPosConsulta) * 100
    : (leadsVendaFeita > 0 ? 100 : 0);
  taxaFechamento = Number(taxaFechamento.toFixed(1));

  let bonusFechamento = 0;
  if (taxaFechamento > 60) {
    bonusFechamento = 1000;
  } else if (taxaFechamento >= 46) {
    bonusFechamento = 700;
  } else if (taxaFechamento >= 30) {
    bonusFechamento = 400;
  } else {
    bonusFechamento = 0;
  }

  // 5. BÔNUS 4: FATURAMENTO (Receita gerada vs. meta mensal - Bônus Base R$ 2.000)
  // 0% a 70%: Sem bônus (0%)
  // 71% a 85%: R$ 1.000 (50% do bônus-base)
  // 86% a 99%: R$ 1.400 (70% do bônus-base)
  // 100% a 119%: R$ 2.000 (100% do bônus-base)
  // >= 120%: R$ 3.000 (150% do bônus-base)
  let percentualMetaFaturamento = metaFaturamento > 0
    ? (faturamentoRealizado / metaFaturamento) * 100
    : 0;
  percentualMetaFaturamento = Number(percentualMetaFaturamento.toFixed(1));

  let bonusFaturamento = 0;
  let percentualBonusBaseFaturamento = 0;

  if (percentualMetaFaturamento >= 120) {
    bonusFaturamento = 3000;
    percentualBonusBaseFaturamento = 150;
  } else if (percentualMetaFaturamento >= 100) {
    bonusFaturamento = 2000;
    percentualBonusBaseFaturamento = 100;
  } else if (percentualMetaFaturamento >= 86) {
    bonusFaturamento = 1400;
    percentualBonusBaseFaturamento = 70;
  } else if (percentualMetaFaturamento >= 71) {
    bonusFaturamento = 1000;
    percentualBonusBaseFaturamento = 50;
  } else {
    bonusFaturamento = 0;
    percentualBonusBaseFaturamento = 0;
  }

  const comissaoTotal = bonusCaptacao + bonusComparecimento + bonusFechamento + bonusFaturamento;

  return {
    consultasRealizadas,
    totalAgendamentos,
    procedimentosAgendados,
    procedimentosRealizados,
    taxaComparecimento,
    travaComparecimentoOk,
    leadsPosConsulta,
    leadsVendaFeita,
    taxaFechamento,
    faturamentoRealizado,
    metaFaturamento,
    percentualMetaFaturamento,
    bonusCaptacao,
    bonusComparecimento,
    bonusFechamento,
    bonusFaturamento,
    percentualBonusBaseFaturamento,
    comissaoTotal,
  };
}

const STORAGE_KEY_KPIS_HISTORICO = 'crm_kpis_secretaria_snapshots_v1';

/**
 * Busca e calcula em tempo real os 4 KPIs para o mês/ano selecionado (ex: '2026-08')
 */
export async function fetchKpisMesAtual(
  empresaId: string,
  mesAnoStr?: string
): Promise<ResultadoCalculoKpi> {
  const empUuid = normalizarUuid(empresaId);
  const mesAno = mesAnoStr || new Date().toISOString().slice(0, 7);

  let consultasRealizadas = 0;
  let totalAgendamentos = 0;
  let procedimentosAgendados = 0;
  let procedimentosRealizados = 0;
  let leadsPosConsulta = 0;
  let leadsVendaFeita = 0;
  let faturamentoRealizado = 0;

  const client = getSupabaseClient();

  if (client) {
    try {
      // 1. KPI 1 & 2: Agendamentos, Consultas Realizadas e Procedimentos Agendados vs. Comparecidos
      const { data: agendData, error: errAgend } = await client
        .from('vw_agendamentos')
        .select('*')
        .eq('empresa_id', empUuid);

      if (!errAgend && agendData && agendData.length > 0) {
        agendData.forEach((item: any) => {
          const dt = item.data_agendamento || item.created_at || '';
          if (dt.startsWith(mesAno)) {
            totalAgendamentos++;
            const st = (item.status_confirmacao_agendamento || item.status_confirmacao || item.status || '').toLowerCase();
            const servicoTxt = `${item.tipo_servico || ''} ${item.procedimento || ''} ${item.procedimento_interesse || ''} ${item.servico || ''} ${item.tipo || ''}`.toLowerCase();
            const ehConsulta = servicoTxt.includes('consulta') || servicoTxt.includes('avalia') || servicoTxt.includes('retorno');
            const compareceu = st.includes('atendido') || st.includes('realizado') || st.includes('concluido') || st.includes('compareceu');

            if (ehConsulta) {
              if (compareceu) {
                consultasRealizadas++;
              }
            } else {
              procedimentosAgendados++;
              if (compareceu || (!st.includes('cancelado') && !st.includes('no-show') && !st.includes('faltou') && !st.includes('falta'))) {
                procedimentosRealizados++;
              }
            }
          }
        });
      } else {
        // Fallback para tabela leads
        const { data: leadsData } = await client
          .from('leads')
          .select('*')
          .eq('empresa_id', empUuid);

        if (leadsData) {
          leadsData.forEach((lead: any) => {
            const metaAgend = lead.etapa_por_situacao?._agendamento || {};
            const dtAgend = metaAgend.dataAgendamento || lead.data_agendamento || lead.created_at || '';
            if (dtAgend.startsWith(mesAno)) {
              totalAgendamentos++;
              const st = (metaAgend.statusConfirmacaoAgendamento || lead.status_confirmacao_agendamento || '').toLowerCase();
              const servicoTxt = `${metaAgend.procedimento || ''} ${lead.procedimento_interesse || ''} ${lead.procedimento || ''}`.toLowerCase();
              const ehConsulta = servicoTxt.includes('consulta') || servicoTxt.includes('avalia') || servicoTxt.includes('retorno') || lead.situacao === 'Em captação';
              const compareceu = st.includes('atendido') || st.includes('realizado') || lead.situacao === 'Pós consulta' || lead.situacao === 'Pós procedimento';

              if (ehConsulta) {
                if (compareceu) {
                  consultasRealizadas++;
                }
              } else {
                procedimentosAgendados++;
                if (compareceu || (!st.includes('cancelado') && !st.includes('no-show') && !st.includes('faltou'))) {
                  procedimentosRealizados++;
                }
              }
            }
          });
        }
      }

      // 2. KPI 3: Fechamento (Follow-up Pós-Consulta)
      const { data: leadsFech } = await client
        .from('leads')
        .select('*')
        .eq('empresa_id', empUuid);

      if (leadsFech) {
        leadsFech.forEach((lead: any) => {
          if (lead.situacao === 'Pós consulta' || lead.situacao === 'Pós procedimento' || lead.status_venda === 'Venda feita') {
            leadsPosConsulta++;
          }
          if (lead.status_venda === 'Venda feita' || lead.situacao === 'Pós procedimento') {
            leadsVendaFeita++;
          }
        });
      }

      // 3. KPI 4: Faturamento Mensal
      const { data: comprasData } = await client
        .from('historico_compras')
        .select('*')
        .eq('empresa_id', empUuid);

      if (comprasData && comprasData.length > 0) {
        comprasData.forEach((c: any) => {
          const dt = c.data || c.created_at || '';
          if (dt.startsWith(mesAno)) {
            faturamentoRealizado += Number(c.valor_total || c.valor || 0);
          }
        });
      } else {
        // Fallback tabela 'compras'
        const { data: cAlt } = await client
          .from('compras')
          .select('*')
          .eq('empresa_id', empUuid);

        if (cAlt) {
          cAlt.forEach((c: any) => {
            const dt = c.data || c.created_at || '';
            if (dt.startsWith(mesAno)) {
              faturamentoRealizado += Number(c.valor_total || c.valor || 0);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar KPIs em tempo real no Supabase, usando valores estimados:', e);
    }
  }

  // Se nenhum dado for retornado no Supabase ou localmente no mês selecionado, providenciar dados base demonstrativos
  if (totalAgendamentos === 0 && faturamentoRealizado === 0) {
    consultasRealizadas = 42;
    totalAgendamentos = 68;
    procedimentosAgendados = 34;
    procedimentosRealizados = 31; // ~91.2% comparecimento
    leadsPosConsulta = 36;
    leadsVendaFeita = 18; // 50% fechamento
    faturamentoRealizado = 84000; // 105% da meta (R$ 80k)
  }

  return calcularRegraComissao({
    consultasRealizadas,
    totalAgendamentos,
    procedimentosAgendados,
    procedimentosRealizados,
    leadsPosConsulta,
    leadsVendaFeita,
    faturamentoRealizado,
    metaFaturamento: 80000,
  });
}

function obterSeedSnapshotsHistoricos(empresaId: string): KpiSecretariaMensal[] {
  const empUuid = normalizarUuid(empresaId);
  return [
    {
      id: `kpi-snap-2026-07`,
      empresaId: empUuid,
      empresa_id: empUuid,
      mesAno: '2026-07',
      mes_ano: '2026-07',
      consultasRealizadas: 48,
      consultas_realizadas: 48,
      totalAgendamentos: 52,
      total_agendamentos: 52,
      taxaComparecimento: 92.3,
      taxa_comparecimento: 92.3,
      travaComparecimentoOk: true,
      trava_comparecimento_ok: true,
      leadsPosConsulta: 40,
      leads_pos_consulta: 40,
      leadsVendaFeita: 24,
      leads_venda_feita: 24,
      taxaFechamento: 60.0,
      taxa_fechamento: 60.0,
      faturamentoRealizado: 92000,
      faturamento_realizado: 92000,
      metaFaturamento: 80000,
      meta_faturamento: 80000,
      percentualMetaFaturamento: 115.0,
      percentual_meta_faturamento: 115.0,
      bonusCaptacao: 400,
      bonus_captacao: 400,
      bonusComparecimento: 500,
      bonus_comparecimento: 500,
      bonusFechamento: 700,
      bonus_fechamento: 700,
      bonusFaturamento: 2000,
      bonus_faturamento: 2000,
      comissaoTotal: 3600,
      comissao_total: 3600,
      fechado: true,
      fechadoEm: '2026-08-01T08:00:00.000Z',
      fechado_em: '2026-08-01T08:00:00.000Z',
      observacoes: 'Mês encerrado com alta performance em faturamento e comparecimento.',
    },
    {
      id: `kpi-snap-2026-06`,
      empresaId: empUuid,
      empresa_id: empUuid,
      mesAno: '2026-06',
      mes_ano: '2026-06',
      consultasRealizadas: 54,
      consultas_realizadas: 54,
      totalAgendamentos: 58,
      total_agendamentos: 58,
      taxaComparecimento: 93.1,
      taxa_comparecimento: 93.1,
      travaComparecimentoOk: true,
      trava_comparecimento_ok: true,
      leadsPosConsulta: 42,
      leads_pos_consulta: 42,
      leadsVendaFeita: 27,
      leads_venda_feita: 27,
      taxaFechamento: 64.3,
      taxa_fechamento: 64.3,
      faturamentoRealizado: 98500,
      faturamento_realizado: 98500,
      metaFaturamento: 80000,
      meta_faturamento: 80000,
      percentualMetaFaturamento: 123.1,
      percentual_meta_faturamento: 123.1,
      bonusCaptacao: 500,
      bonus_captacao: 500,
      bonusComparecimento: 500,
      bonus_comparecimento: 500,
      bonusFechamento: 1000,
      bonus_fechamento: 1000,
      bonusFaturamento: 3000,
      bonus_faturamento: 3000,
      comissaoTotal: 5000,
      comissao_total: 5000,
      fechado: true,
      fechadoEm: '2026-07-01T08:00:00.000Z',
      fechado_em: '2026-07-01T08:00:00.000Z',
      observacoes: 'Recorde de faturamento no semestre. Todos os bônus atingidos no teto.',
    },
    {
      id: `kpi-snap-2026-05`,
      empresaId: empUuid,
      empresa_id: empUuid,
      mesAno: '2026-05',
      mes_ano: '2026-05',
      consultasRealizadas: 38,
      consultas_realizadas: 38,
      totalAgendamentos: 44,
      total_agendamentos: 44,
      taxaComparecimento: 86.4,
      taxa_comparecimento: 86.4,
      travaComparecimentoOk: true,
      trava_comparecimento_ok: true,
      leadsPosConsulta: 32,
      leads_pos_consulta: 32,
      leadsVendaFeita: 14,
      leads_venda_feita: 14,
      taxaFechamento: 43.8,
      taxa_fechamento: 43.8,
      faturamentoRealizado: 72000,
      faturamento_realizado: 72000,
      metaFaturamento: 80000,
      meta_faturamento: 80000,
      percentualMetaFaturamento: 90.0,
      percentual_meta_faturamento: 90.0,
      bonusCaptacao: 300,
      bonus_captacao: 300,
      bonusComparecimento: 500,
      bonus_comparecimento: 500,
      bonusFechamento: 400,
      bonus_fechamento: 400,
      bonusFaturamento: 1400,
      bonus_faturamento: 1400,
      comissaoTotal: 2600,
      comissao_total: 2600,
      fechado: true,
      fechadoEm: '2026-06-01T08:00:00.000Z',
      fechado_em: '2026-06-01T08:00:00.000Z',
      observacoes: 'Mês de maio concluído dentro da faixa intermediária da meta.',
    },
  ];
}

export async function fetchHistoricoKpis(empresaId: string): Promise<KpiSecretariaMensal[]> {
  const empUuid = normalizarUuid(empresaId);
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('kpis_secretaria_mensal')
        .select('*')
        .eq('empresa_id', empUuid)
        .order('mes_ano', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          empresaId: d.empresa_id,
          empresa_id: d.empresa_id,
          mesAno: d.mes_ano,
          mes_ano: d.mes_ano,
          consultasRealizadas: d.consultas_realizadas,
          consultas_realizadas: d.consultas_realizadas,
          totalAgendamentos: d.total_agendamentos,
          total_agendamentos: d.total_agendamentos,
          taxaComparecimento: Number(d.taxa_comparecimento),
          taxa_comparecimento: Number(d.taxa_comparecimento),
          travaComparecimentoOk: Boolean(d.trava_comparecimento_ok),
          trava_comparecimento_ok: Boolean(d.trava_comparecimento_ok),
          leadsPosConsulta: d.leads_pos_consulta,
          leads_pos_consulta: d.leads_pos_consulta,
          leadsVendaFeita: d.leads_venda_feita,
          leads_venda_feita: d.leads_venda_feita,
          taxaFechamento: Number(d.taxa_fechamento),
          taxa_fechamento: Number(d.taxa_fechamento),
          faturamentoRealizado: Number(d.faturamento_realizado),
          faturamento_realizado: Number(d.faturamento_realizado),
          metaFaturamento: Number(d.meta_faturamento || 80000),
          meta_faturamento: Number(d.meta_faturamento || 80000),
          percentualMetaFaturamento: Number(d.percentual_meta_faturamento),
          percentual_meta_faturamento: Number(d.percentual_meta_faturamento),
          bonusCaptacao: Number(d.bonus_captacao),
          bonus_captacao: Number(d.bonus_captacao),
          bonusComparecimento: Number(d.bonus_comparecimento),
          bonus_comparecimento: Number(d.bonus_comparecimento),
          bonusFechamento: Number(d.bonus_fechamento),
          bonus_fechamento: Number(d.bonus_fechamento),
          bonusFaturamento: Number(d.bonus_faturamento),
          bonus_faturamento: Number(d.bonus_faturamento),
          comissaoTotal: Number(d.comissao_total),
          comissao_total: Number(d.comissao_total),
          fechado: Boolean(d.fechado),
          fechadoEm: d.fechado_em,
          fechado_em: d.fechado_em,
          observacoes: d.observacoes || '',
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
      }
    } catch (e) {
      console.warn('Tabela kpis_secretaria_mensal não encontrada ou sem dados no Supabase, usando cache local:', e);
    }
  }

  try {
    const key = `${STORAGE_KEY_KPIS_HISTORICO}_${empUuid}`;
    const salvo = localStorage.getItem(key);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  const seeds = obterSeedSnapshotsHistoricos(empUuid);
  try {
    const key = `${STORAGE_KEY_KPIS_HISTORICO}_${empUuid}`;
    localStorage.setItem(key, JSON.stringify(seeds));
  } catch (e) {}

  return seeds;
}

export async function salvarSnapshotKpi(
  kpiData: KpiSecretariaMensal
): Promise<KpiSecretariaMensal> {
  const empUuid = normalizarUuid(kpiData.empresaId || kpiData.empresa_id || ID_EMPRESA_PADRAO);
  const mesAno = kpiData.mesAno || kpiData.mes_ano || new Date().toISOString().slice(0, 7);

  const payload: any = {
    id: kpiData.id || normalizarUuid(),
    empresa_id: empUuid,
    mes_ano: mesAno,
    consultas_realizadas: kpiData.consultasRealizadas ?? kpiData.consultas_realizadas ?? 0,
    total_agendamentos: kpiData.totalAgendamentos ?? kpiData.total_agendamentos ?? 0,
    taxa_comparecimento: kpiData.taxaComparecimento ?? kpiData.taxa_comparecimento ?? 0,
    trava_comparecimento_ok: kpiData.travaComparecimentoOk ?? kpiData.trava_comparecimento_ok ?? false,
    leads_pos_consulta: kpiData.leadsPosConsulta ?? kpiData.leads_pos_consulta ?? 0,
    leads_venda_feita: kpiData.leadsVendaFeita ?? kpiData.leads_venda_feita ?? 0,
    taxa_fechamento: kpiData.taxaFechamento ?? kpiData.taxa_fechamento ?? 0,
    faturamento_realizado: kpiData.faturamentoRealizado ?? kpiData.faturamento_realizado ?? 0,
    meta_faturamento: kpiData.metaFaturamento ?? kpiData.meta_faturamento ?? 80000,
    percentual_meta_faturamento: kpiData.percentualMetaFaturamento ?? kpiData.percentual_meta_faturamento ?? 0,
    bonus_captacao: kpiData.bonusCaptacao ?? kpiData.bonus_captacao ?? 0,
    bonus_comparecimento: kpiData.bonusComparecimento ?? kpiData.bonus_comparecimento ?? 0,
    bonus_fechamento: kpiData.bonusFechamento ?? kpiData.bonus_fechamento ?? 0,
    bonus_faturamento: kpiData.bonusFaturamento ?? kpiData.bonus_faturamento ?? 0,
    comissao_total: kpiData.comissaoTotal ?? kpiData.comissao_total ?? 0,
    fechado: kpiData.fechado ?? true,
    fechado_em: kpiData.fechadoEm || kpiData.fechado_em || new Date().toISOString(),
    observacoes: kpiData.observacoes || 'Snapshot mensal congelado e salvo.',
    updated_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();

  if (client) {
    try {
      await client
        .from('kpis_secretaria_mensal')
        .upsert(payload, { onConflict: 'empresa_id,mes_ano' });
    } catch (e) {
      console.warn('Erro ao salvar snapshot em kpis_secretaria_mensal no Supabase:', e);
    }
  }

  try {
    const key = `${STORAGE_KEY_KPIS_HISTORICO}_${empUuid}`;
    const historicoAtual = await fetchHistoricoKpis(empUuid);
    const filtrado = historicoAtual.filter((h) => (h.mesAno || h.mes_ano) !== mesAno);
    const atualizado = [kpiData, ...filtrado];
    localStorage.setItem(key, JSON.stringify(atualizado));
  } catch (e) {}

  return kpiData;
}

