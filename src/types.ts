export type SectionId =
  | 'cadastro_rapido'
  | 'em_captacao'
  | 'pos_consulta'
  | 'pos_procedimento'
  | 'reativacao'
  | 'nutricao'
  | 'leads_perdidos'
  | 'historico_compras'
  | 'funil_conversao'
  | 'controle_acessos'
  | 'configuracoes';

export interface NavigationItem {
  id: SectionId;
  label: string;
  description: string;
  badge?: string;
  isPrimary?: boolean;
  restritoGestor?: boolean;
}

// ----------------------------------------------------
// CONTROLE DE ACESSO & PERMISSÕES
// ----------------------------------------------------

export type NivelAcesso =
  | 'GESTOR'
  | 'MEDICO'
  | 'RECEPCAO_COMERCIAL'
  | 'POS_VENDA'
  | 'PERSONALIZADO';

export interface PermissoesUsuario {
  podeCadastrarLeads: boolean;
  podeAcessarEmCaptacao: boolean;
  podeAcessarPosConsulta: boolean;
  podeAcessarPosProcedimento: boolean;
  podeAcessarReativacao: boolean;
  podeAcessarNutricao: boolean;
  podeAcessarLeadsPerdidos: boolean;
  podeAcessarHistoricoCompras: boolean;
  podeAcessarFunilConversao: boolean;
  podeAcessarControleAcessos: boolean;
  podeAcessarConfiguracoes: boolean;
  podeExcluirRegistros: boolean;
  podeExportarRelatorios: boolean;
  podeVisualizarValores: boolean;
  podeEditarFichaClinica: boolean;
}

export const PERMISSOES_PRESET_GESTOR: PermissoesUsuario = {
  podeCadastrarLeads: true,
  podeAcessarEmCaptacao: true,
  podeAcessarPosConsulta: true,
  podeAcessarPosProcedimento: true,
  podeAcessarReativacao: true,
  podeAcessarNutricao: true,
  podeAcessarLeadsPerdidos: true,
  podeAcessarHistoricoCompras: true,
  podeAcessarFunilConversao: true,
  podeAcessarControleAcessos: true,
  podeAcessarConfiguracoes: true,
  podeExcluirRegistros: true,
  podeExportarRelatorios: true,
  podeVisualizarValores: true,
  podeEditarFichaClinica: true,
};

export const PERMISSOES_PRESET_MEDICO: PermissoesUsuario = {
  podeCadastrarLeads: true,
  podeAcessarEmCaptacao: false,
  podeAcessarPosConsulta: true,
  podeAcessarPosProcedimento: true,
  podeAcessarReativacao: false,
  podeAcessarNutricao: false,
  podeAcessarLeadsPerdidos: false,
  podeAcessarHistoricoCompras: true,
  podeAcessarFunilConversao: false,
  podeAcessarControleAcessos: false,
  podeAcessarConfiguracoes: false,
  podeExcluirRegistros: false,
  podeExportarRelatorios: false,
  podeVisualizarValores: true,
  podeEditarFichaClinica: true,
};

export const PERMISSOES_PRESET_RECEPCAO: PermissoesUsuario = {
  podeCadastrarLeads: true,
  podeAcessarEmCaptacao: true,
  podeAcessarPosConsulta: true,
  podeAcessarPosProcedimento: false,
  podeAcessarReativacao: false,
  podeAcessarNutricao: false,
  podeAcessarLeadsPerdidos: true,
  podeAcessarHistoricoCompras: false,
  podeAcessarFunilConversao: false,
  podeAcessarControleAcessos: false,
  podeAcessarConfiguracoes: false,
  podeExcluirRegistros: false,
  podeExportarRelatorios: false,
  podeVisualizarValores: true,
  podeEditarFichaClinica: false,
};

export const PERMISSOES_PRESET_POS_VENDA: PermissoesUsuario = {
  podeCadastrarLeads: false,
  podeAcessarEmCaptacao: false,
  podeAcessarPosConsulta: true,
  podeAcessarPosProcedimento: true,
  podeAcessarReativacao: true,
  podeAcessarNutricao: true,
  podeAcessarLeadsPerdidos: true,
  podeAcessarHistoricoCompras: true,
  podeAcessarFunilConversao: false,
  podeAcessarControleAcessos: false,
  podeAcessarConfiguracoes: false,
  podeExcluirRegistros: false,
  podeExportarRelatorios: false,
  podeVisualizarValores: true,
  podeEditarFichaClinica: false,
};

// ----------------------------------------------------
// ESTÉTICA & CONFIGURAÇÕES DA EMPRESA
// ----------------------------------------------------

export interface EsteticaPlataforma {
  idPreset: string;
  nomePreset: string;
  descricao?: string;
  corPrimaria: string; // Ex: #5C3A22
  corSecundaria: string; // Ex: #8A6142
  corSidebar: string; // Ex: #1A1A1A
  corSidebarTexto: string; // Ex: #F2EFEA
  corFundoDestaque: string; // Ex: #F2EFEA
  corBorda: string; // Ex: #D9D6D0
  corTexto: string; // Ex: #1A1A1A
  isPersonalizado?: boolean;
}

export const ESTETICAS_PRESET: EsteticaPlataforma[] = [
  {
    idPreset: 'dra_agda_oficial',
    nomePreset: 'Dra. Agda Rodrigues (Oficial)',
    descricao: 'Identidade nobre com tom Nogueira Quente, Tinta Concreto e Preto Estrutural.',
    corPrimaria: '#5C3A22',
    corSecundaria: '#8A6142',
    corSidebar: '#1A1A1A',
    corSidebarTexto: '#F2EFEA',
    corFundoDestaque: '#F2EFEA',
    corBorda: '#D9D6D0',
    corTexto: '#1A1A1A',
  },
  {
    idPreset: 'black_tie_ouro',
    nomePreset: 'Black Tie & Champanhe',
    descricao: 'Elegância minimalista em tons de ouro champanhe, grafite profundo e slate.',
    corPrimaria: '#A88220',
    corSecundaria: '#C49E3A',
    corSidebar: '#0F172A',
    corSidebarTexto: '#F8FAFC',
    corFundoDestaque: '#F8FAFC',
    corBorda: '#E2E8F0',
    corTexto: '#0F172A',
  },
  {
    idPreset: 'boutique_rose',
    nomePreset: 'Boutique Rosé & Terracota',
    descricao: 'Atmosfera acolhedora e sofisticada em tons de terracota nobre e pó de arroz.',
    corPrimaria: '#7A3E39',
    corSecundaria: '#A86861',
    corSidebar: '#241817',
    corSidebarTexto: '#FAF5F4',
    corFundoDestaque: '#FAF5F4',
    corBorda: '#E6D8D6',
    corTexto: '#241817',
  },
  {
    idPreset: 'sage_botanico',
    nomePreset: 'Sage Botânico & Eucalipto',
    descricao: 'Clínica integrada, medicina regenerativa e estética natural bioestimuladora.',
    corPrimaria: '#2E4A3E',
    corSecundaria: '#5A7A6C',
    corSidebar: '#15221C',
    corSidebarTexto: '#F3F6F4',
    corFundoDestaque: '#F3F6F4',
    corBorda: '#D5DED8',
    corTexto: '#15221C',
  },
  {
    idPreset: 'titanio_medico',
    nomePreset: 'Titânio & Azul Cirúrgico',
    descricao: 'Visual médico contemporâneo de alta precisão, tecnologia e assepsia.',
    corPrimaria: '#1E40AF',
    corSecundaria: '#4B5563',
    corSidebar: '#111827',
    corSidebarTexto: '#F9FAFB',
    corFundoDestaque: '#F3F4F6',
    corBorda: '#E5E7EB',
    corTexto: '#111827',
  },
];

export interface ConfiguracoesEmpresa {
  nomeEmpresa: string;
  subtitulo: string;
  logoUrl?: string;
  tipoLogo: 'imagem' | 'monograma';
  monogramaIniciais: string;
  logoAltura?: 'compacta' | 'padrao' | 'ampla' | 'destaque' | 'maxima';
  logoAjusteLateral?: 'total' | 'padrao' | 'respirado' | 'sangrado';
  logoFundoHeader?: 'integrado' | 'escuro_suave' | 'fundo_claro';
  cnpj?: string;
  registroProfissional?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  horarioFuncionamento?: string;
  unidadePadrao?: string;
  estetica: EsteticaPlataforma;
  esteticasSalvas?: EsteticaPlataforma[];
  updated_at: string;
}

export interface UsuarioColaborador extends BaseEntity {
  nome: string;
  email: string;
  senhaPadrao: string;
  cargo: string;
  role: NivelAcesso;
  permissoes: PermissoesUsuario;
  iniciais: string;
  corBadge: string;
  telefone?: string;
  ativo: boolean;
  ultimoAcesso?: string;
  criadoPor?: string;
  observacoes?: string;
}

export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  senhaPadrao: string;
  cargo: string;
  role: NivelAcesso;
  permissoes: PermissoesUsuario;
  telefone?: string;
  corBadge?: string;
  observacoes?: string;
}

export interface AtualizarUsuarioPayload {
  nome?: string;
  email?: string;
  senhaPadrao?: string;
  cargo?: string;
  role?: NivelAcesso;
  permissoes?: Partial<PermissoesUsuario>;
  telefone?: string;
  corBadge?: string;
  ativo?: boolean;
  observacoes?: string;
}

// ----------------------------------------------------
// DOMÍNIO: ENUMS E TIPOS PRINCIPAIS
// ----------------------------------------------------

export type SituacaoLead =
  | 'Em captação'
  | 'Consulta agendada'
  | 'Pós consulta'
  | 'Procedimento agendado'
  | 'Pós procedimento'
  | 'Reativação'
  | 'Nutrição';

export const TODAS_SITUACOES: SituacaoLead[] = [
  'Em captação',
  'Consulta agendada',
  'Pós consulta',
  'Procedimento agendado',
  'Pós procedimento',
  'Reativação',
  'Nutrição',
];

export type StatusVenda = 'Em processo' | 'Venda feita' | 'Perdido';

export const TODOS_STATUS_VENDA: StatusVenda[] = ['Em processo', 'Venda feita', 'Perdido'];

export type OrigemLead =
  | 'Indicação'
  | 'Instagram'
  | 'Google Ads'
  | 'WhatsApp'
  | 'Site'
  | 'Outro';

export const TODAS_ORIGENS: OrigemLead[] = [
  'Indicação',
  'Instagram',
  'Google Ads',
  'WhatsApp',
  'Site',
  'Outro',
];

export const MOTIVOS_PERDA_PADRAO: string[] = [
  'Preço / Acima do orçamento',
  'Fechou com concorrente',
  'Sem retorno / Contato sem resposta',
  'Horário incompatível com a agenda',
  'Desistência pessoal / Momento inadequado',
  'Distância / Localização da clínica',
  'Outro motivo',
];

export type StatusGrupoNutricao = 'Ativo' | 'Removido';
export const TODOS_STATUS_GRUPO_NUTRICAO: StatusGrupoNutricao[] = ['Ativo', 'Removido'];

export type ResponsavelPadrao =
  | 'Secretária 1'
  | 'Secretária 2'
  | 'Gestor(a)'
  | 'Dra. Responsável'
  | string;

export type EtapaPorSituacaoMap = Partial<Record<SituacaoLead, string>>;

// ----------------------------------------------------
// ENTIDADES
// ----------------------------------------------------

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
}

/**
 * ENTIDADE "Lead" (um registro por lead/paciente)
 */
export interface Lead extends BaseEntity {
  nome: string; // Obrigatório
  situacao: SituacaoLead; // Enum da situação atual
  etapaPorSituacao: EtapaPorSituacaoMap; // Guarda a última etapa selecionada para CADA situação
  interesse: string; // Procedimento de interesse (texto livre)
  possivelValor: number; // Valor estimado/potencial em R$
  statusVenda: StatusVenda; // Status da negociação
  dataEntrada: string; // Data de entrada (default: hoje - formato YYYY-MM-DD)
  responsavel: string; // Responsável pelo lead (configurável)
  dataEntradaNutricao?: string; // Data em que o lead entrou na situação Nutrição (YYYY-MM-DD)
  statusGrupoNutricao?: StatusGrupoNutricao; // "Ativo" | "Removido" no grupo de transmissão/conteúdo
  motivoPerda?: string; // Motivo da perda quando statusVenda === "Perdido"
  dataPerda?: string; // Data da perda (YYYY-MM-DD)
  situacaoPerda?: SituacaoLead; // Situação em que o lead estava quando foi marcado como perdido
}

/**
 * ENTIDADE "FichaLead" (dados complementares, 1 para 1 com o Lead em tela separada)
 */
export interface FichaLead extends BaseEntity {
  leadId: string; // Referência FK ao Lead
  telefone: string;
  origemLead: OrigemLead;
  dataNascimento: string; // YYYY-MM-DD
  endereco: string;
  observacoes: string;
  motivoPerda?: string; // Relevante se statusVenda === "Perdido"
  dataPerda?: string; // Relevante se statusVenda === "Perdido" (YYYY-MM-DD)
}

/**
 * ENTIDADE "Compra" (histórico de compras, N para 1 com o Lead)
 */
export interface Compra extends BaseEntity {
  leadId: string; // Referência FK ao Lead
  data: string; // Data da compra (YYYY-MM-DD)
  procedimento: string; // Descrição do procedimento realizado
  valor: number; // Valor pago em R$
}

// ----------------------------------------------------
// PAYLOADS DE ENTRADA / CRIAÇÃO & EDIÇÃO
// ----------------------------------------------------

export interface CriarLeadPayload {
  nome: string;
  situacao?: SituacaoLead;
  etapaInicial?: string;
  interesse?: string;
  possivelValor?: number;
  statusVenda?: StatusVenda;
  dataEntrada?: string;
  responsavel?: string;
  dataEntradaNutricao?: string;
  statusGrupoNutricao?: StatusGrupoNutricao;
  motivoPerda?: string;
  dataPerda?: string;
  situacaoPerda?: SituacaoLead;
  // Ficha complementar inicial opcional
  ficha?: Partial<Omit<FichaLead, 'id' | 'leadId' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>>;
}

export interface AtualizarLeadPayload {
  nome?: string;
  situacao?: SituacaoLead;
  interesse?: string;
  possivelValor?: number;
  statusVenda?: StatusVenda;
  dataEntrada?: string;
  responsavel?: string;
  dataEntradaNutricao?: string;
  statusGrupoNutricao?: StatusGrupoNutricao;
  motivoPerda?: string;
  dataPerda?: string;
  situacaoPerda?: SituacaoLead;
}

export interface AtualizarFichaPayload {
  telefone?: string;
  origemLead?: OrigemLead;
  dataNascimento?: string;
  endereco?: string;
  observacoes?: string;
  motivoPerda?: string;
  dataPerda?: string;
}

export interface CriarCompraPayload {
  leadId: string;
  data?: string;
  procedimento: string;
  valor: number;
}

export interface ImportarLeadItem {
  nome: string;
  telefone?: string;
  situacao?: SituacaoLead;
  etapaInicial?: string;
  interesse?: string;
  possivelValor?: number;
  statusVenda?: StatusVenda;
  dataEntrada?: string;
  responsavel?: string;
  origemLead?: OrigemLead | string;
  observacoes?: string;
  dataNascimento?: string;
  endereco?: string;
}

export interface ResultadoImportacao {
  totalCriados: number;
  totalAtualizados: number;
  totalIgnorados: number;
  totalErros: number;
  errosDetalhes?: string[];
}


/**
 * ENTIDADE "ProcedimentoClinica" (Catálogo e controle de procedimentos da clínica)
 */
export interface ProcedimentoClinica extends BaseEntity {
  nome: string; // Nome do procedimento (ex: Toxina Botulínica, Preenchimento Labial, etc.)
  categoria: string; // Categoria (ex: Injetáveis, Facial, Corporal, Harmonização, Bioestimuladores)
  valor: number; // Valor de tabela em R$
  formatosPagamento: string; // Ex: "À vista com 5% desc. via Pix, ou até 10x sem juros no cartão"
  duracaoDias: number; // Duração média do efeito do procedimento em dias (gatilho para Reativação)
  descricao?: string; // Descrição clínica e detalhes
  orientacoes?: string; // Informações e argumentos para a equipe comunicar com a paciente
  ativo: boolean; // Se está ativo para seleção e comercialização
}

export interface CriarProcedimentoPayload {
  nome: string;
  categoria?: string;
  valor: number;
  formatosPagamento: string;
  duracaoDias: number;
  descricao?: string;
  orientacoes?: string;
  ativo?: boolean;
}

export interface AtualizarProcedimentoPayload {
  nome?: string;
  categoria?: string;
  valor?: number;
  formatosPagamento?: string;
  duracaoDias?: number;
  descricao?: string;
  orientacoes?: string;
  ativo?: boolean;
}

export interface EstatisticasProcedimento {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  formatosPagamento: string;
  duracaoDias: number;
  totalProcura: number; // Quantidade de leads com interesse
  totalConvertidos: number; // Quantidade de compras/vendas concluídas
  taxaConversao: number; // % de conversão (0 a 100)
  faturamentoTotal: number; // R$ total de vendas
  ticketMedio: number; // R$ ticket médio por venda
  pacientesPosProcedimento: number; // Quantidade ativa em pós-procedimento
  pacientesPrestesAVencer: number; // Faltando <= 15 dias para expirar
  pacientesReativadosPrazo: number; // Atingiram prazo de validade e foram movidos para Reativação
  ativo: boolean;
}

