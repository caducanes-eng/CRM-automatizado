import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Download,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight,
  Sparkles,
  Key,
  Globe,
  UploadCloud,
  DownloadCloud,
  Check,
  FileCode,
  Table,
  Info,
  Clock,
  RotateCcw,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  isSupabaseConfigured,
  testSupabaseConnection,
} from '../lib/supabase';
import { supabaseService, RelatorioSincronizacao } from '../services/supabaseService';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { useAuth } from '../context/AuthContext';

export const SupabaseConfigView: React.FC = () => {
  const { leads, fichas, compras, procedimentos } = useCrm();
  const { config } = useEmpresa();
  const { usuarios } = useAuth();

  // Estados de formulário
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [origemConfig, setOrigemConfig] = useState<'env' | 'custom' | 'nenhuma'>('nenhuma');

  // Estados de teste e status
  const [isTestando, setIsTestando] = useState(false);
  const [statusConexao, setStatusConexao] = useState<{
    conectado: boolean;
    mensagem: string;
    tabelas?: string[];
  } | null>(null);

  // Estados de sincronização
  const [isSincronizando, setIsSincronizando] = useState(false);
  const [progressoSincronizacao, setProgressoSincronizacao] = useState<{
    etapa: string;
    percentual: number;
  }>({ etapa: '', percentual: 0 });
  const [resultadoSinc, setResultadoSinc] = useState<RelatorioSincronizacao | null>(null);

  // Estados de cópia e visualização
  const [copiadoSql, setCopiadoSql] = useState(false);
  const [abaInterna, setAbaInterna] = useState<'conexao' | 'migracao' | 'schema_sql' | 'arquitetura'>('conexao');
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>('leads');

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';

  // Carrega configurações ao montar
  useEffect(() => {
    const cfg = getSupabaseConfig();
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    setOrigemConfig(cfg.origem);

    if (cfg.url && cfg.anonKey) {
      executarTesteConexao(cfg.url, cfg.anonKey);
    }
  }, []);

  const executarTesteConexao = async (urlTeste?: string, keyTeste?: string) => {
    setIsTestando(true);
    setStatusConexao(null);
    try {
      const res = await testSupabaseConnection(urlTeste || url, keyTeste || anonKey);
      setStatusConexao({
        conectado: res.sucesso,
        mensagem: res.mensagem,
        tabelas: res.tabelasEncontradas,
      });
    } catch (e: any) {
      setStatusConexao({
        conectado: false,
        mensagem: e?.message || 'Falha ao conectar com o Supabase',
      });
    } finally {
      setIsTestando(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      alert('Por favor, preencha a URL do projeto e a Chave Anon.');
      return;
    }
    saveSupabaseConfig(url.trim(), anonKey.trim());
    setOrigemConfig('custom');
    await executarTesteConexao(url.trim(), anonKey.trim());
  };

  const handleLimpar = () => {
    if (window.confirm('Deseja remover as credenciais do Supabase salvas no navegador?')) {
      clearSupabaseConfig();
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setOrigemConfig(cfg.origem);
      setStatusConexao(null);
    }
  };

  const handleSincronizarParaSupabase = async () => {
    if (!isSupabaseConfigured() && (!url || !anonKey)) {
      alert('Configure e teste as credenciais do Supabase antes de sincronizar.');
      return;
    }

    setIsSincronizando(true);
    setResultadoSinc(null);
    setProgressoSincronizacao({ etapa: 'Iniciando alocação de dados...', percentual: 5 });

    try {
      const res = await supabaseService.sincronizarTodosOsDados({
        leads,
        fichas,
        compras,
        procedimentos,
        usuarios,
        configEmpresa: config,
        onProgresso: (etapa, percentual) => {
          setProgressoSincronizacao({ etapa, percentual });
        },
      });

      setResultadoSinc(res);
      // Re-testa conexão para atualizar tabelas detectadas
      await executarTesteConexao();
    } catch (error: any) {
      setResultadoSinc({
        sucesso: false,
        totalLeads: 0,
        totalFichas: 0,
        totalCompras: 0,
        totalProcedimentos: 0,
        totalUsuarios: 0,
        mensagem: `Erro na sincronização: ${error?.message || 'Falha desconhecida'}`,
        erros: [error?.message || 'Erro desconhecido'],
      });
    } finally {
      setIsSincronizando(false);
    }
  };

  const sqlSchemaCode = `-- ============================================================================
-- ARQUITETURA DE BANCO DE DADOS CRM ESTÉTICA & CLÍNICAS (SUPABASE / POSTGRESQL)
-- ============================================================================
-- Governança e Regras do Projeto:
-- 1. Todas as tabelas possuem: id (UUID), created_at, updated_at, deleted_at, version
-- 2. Soft delete obrigatório (deleted_at IS NULL para registros ativos)
-- 3. Versionamento otimista automático por trigger
-- 4. Multi-inquilino seguro via empresa_id
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- FUNÇÃO TRIGGER: updated_at e version
CREATE OR REPLACE FUNCTION set_updated_at_and_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. TABELA: empresas
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  subtitulo VARCHAR(255),
  cnpj VARCHAR(20),
  registro_profissional VARCHAR(100),
  telefone VARCHAR(50),
  email VARCHAR(255),
  endereco TEXT,
  horario_funcionamento VARCHAR(255),
  unidade_padrao VARCHAR(100) DEFAULT 'Consultório Principal',
  tipo_logo VARCHAR(50) DEFAULT 'monograma',
  logo_url TEXT,
  monograma_iniciais VARCHAR(10) DEFAULT 'AR',
  logo_altura VARCHAR(50) DEFAULT 'padrao',
  logo_ajuste_lateral VARCHAR(50) DEFAULT 'total',
  logo_fundo_header VARCHAR(50) DEFAULT 'integrado',
  estetica_config JSONB DEFAULT '{}'::jsonb,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_empresas_active ON empresas(id) WHERE deleted_at IS NULL;

-- 2. TABELA: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255),
  cargo VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'RECEPCAO_COMERCIAL',
  permissoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  iniciais VARCHAR(10),
  cor_badge VARCHAR(50) DEFAULT '#5C3A22',
  telefone VARCHAR(50),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_acesso TIMESTAMPTZ,
  criado_por VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id) WHERE deleted_at IS NULL;

-- 3. TABELA: procedimentos
CREATE TABLE IF NOT EXISTS procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL DEFAULT 'Injetáveis',
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  formatos_pagamento TEXT DEFAULT 'À vista com 5% desc. via Pix, ou até 10x sem juros no cartão',
  duracao_dias INTEGER NOT NULL DEFAULT 180,
  descricao TEXT,
  orientacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_procedimentos_empresa ON procedimentos(empresa_id) WHERE deleted_at IS NULL;

-- 4. TABELA: leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  situacao VARCHAR(50) NOT NULL DEFAULT 'Em captação',
  etapa_por_situacao JSONB NOT NULL DEFAULT '{}'::jsonb,
  interesse VARCHAR(255) DEFAULT '',
  possivel_valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status_venda VARCHAR(50) NOT NULL DEFAULT 'Em processo',
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel VARCHAR(255) NOT NULL DEFAULT 'Secretária 1',
  data_entrada_nutricao DATE,
  status_grupo_nutricao VARCHAR(50) DEFAULT 'Ativo',
  motivo_perda TEXT,
  data_perda DATE,
  situacao_perda VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_leads_empresa ON leads(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_situacao ON leads(empresa_id, situacao) WHERE deleted_at IS NULL;

-- 5. TABELA: fichas_leads
CREATE TABLE IF NOT EXISTS fichas_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  telefone VARCHAR(50) DEFAULT '',
  origem_lead VARCHAR(50) NOT NULL DEFAULT 'WhatsApp',
  data_nascimento DATE,
  endereco TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  motivo_perda TEXT,
  data_perda DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_fichas_lead_id ON fichas_leads(lead_id) WHERE deleted_at IS NULL;

-- 6. TABELA: compras
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  procedimento_id UUID REFERENCES procedimentos(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  procedimento VARCHAR(255) NOT NULL,
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  forma_pagamento VARCHAR(100) DEFAULT 'Pix / Cartão',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_compras_lead ON compras(lead_id) WHERE deleted_at IS NULL;

-- 7. TABELA: historico_atendimentos
CREATE TABLE IF NOT EXISTS historico_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'MENSAGEM',
  canal VARCHAR(50) DEFAULT 'WhatsApp',
  descricao TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'CONCLUIDO',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_atendimentos_lead ON historico_atendimentos(lead_id, data_hora DESC) WHERE deleted_at IS NULL;

-- 8. TABELA: tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_vencimento TIMESTAMPTZ NOT NULL,
  prioridade VARCHAR(20) DEFAULT 'MEDIA',
  status VARCHAR(30) DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- 9. TABELA: workflows_automacoes
CREATE TABLE IF NOT EXISTS workflows_automacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  evento_gatilho VARCHAR(100) NOT NULL,
  condicoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  acoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- 10. TABELA: logs_auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID,
  entidade VARCHAR(100) NOT NULL,
  entidade_id UUID NOT NULL,
  acao VARCHAR(50) NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- TRIGGERS DE ATUALIZAÇÃO AUTOMÁTICA
CREATE TRIGGER trg_empresas_up BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER trg_usuarios_up BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER trg_procedimentos_up BEFORE UPDATE ON procedimentos FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER trg_leads_up BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER trg_fichas_up BEFORE UPDATE ON fichas_leads FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER trg_compras_up BEFORE UPDATE ON compras FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

-- HABILITAÇÃO DE RLS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
`;

  const copiarSql = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 3000);
  };

  const baixarSql = () => {
    const element = document.createElement('a');
    const file = new Blob([sqlSchemaCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const tabelasInfo = [
    {
      nome: 'leads',
      titulo: 'Leads & Pacientes',
      descricao: 'Entidade central do funil de vendas e gestão clínica.',
      colunas: ['id (UUID)', 'empresa_id (FK)', 'nome', 'situacao', 'etapa_por_situacao (JSONB)', 'interesse', 'possivel_valor', 'status_venda', 'data_entrada', 'responsavel', 'data_entrada_nutricao', 'status_grupo_nutricao', 'motivo_perda', 'data_perda', 'situacao_perda', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'fichas_leads',
      titulo: 'Fichas Cadastrais & Clínicas (1:1)',
      descricao: 'Dados cadastrais complementares, telefone, endereço, observações.',
      colunas: ['id (UUID)', 'empresa_id (FK)', 'lead_id (FK UNIQUE)', 'telefone', 'origem_lead', 'data_nascimento', 'endereco', 'observacoes', 'motivo_perda', 'data_perda', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'compras',
      titulo: 'Histórico de Compras & Procedimentos (N:1)',
      descricao: 'Procedimentos adquiridos, valores, formas de pagamento.',
      colunas: ['id (UUID)', 'empresa_id (FK)', 'lead_id (FK)', 'procedimento_id (FK)', 'data', 'procedimento', 'valor', 'forma_pagamento', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'procedimentos',
      titulo: 'Catálogo de Procedimentos da Clínica',
      descricao: 'Duração média (gatilho de reativação), preços de tabela, orientações.',
      colunas: ['id (UUID)', 'empresa_id (FK)', 'nome', 'categoria', 'valor', 'formatos_pagamento', 'duracao_dias', 'descricao', 'orientacoes', 'ativo', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'usuarios',
      titulo: 'Equipe, Médicos & Colaboradores',
      descricao: 'Perfis de acesso (GESTOR, MEDICO, RECEPCAO), permissões granulares.',
      colunas: ['id (UUID)', 'auth_user_id (UUID)', 'empresa_id (FK)', 'nome', 'email', 'cargo', 'role', 'permissoes (JSONB)', 'iniciais', 'cor_badge', 'telefone', 'ativo', 'ultimo_acesso', 'criado_por', 'observacoes', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'empresas',
      titulo: 'Clínica & Unidades Multi-Inquilino',
      descricao: 'Dados cadastrais da clínica, logotipo, cores da identidade e unidades.',
      colunas: ['id (UUID)', 'nome', 'subtitulo', 'cnpj', 'registro_profissional', 'telefone', 'email', 'endereco', 'horario_funcionamento', 'unidade_padrao', 'tipo_logo', 'logo_url', 'monograma_iniciais', 'estetica_config (JSONB)', 'ativa', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'historico_atendimentos',
      titulo: 'Histórico Imutável de Eventos & Timeline',
      descricao: 'Registro cronológico e imutável de interações, mensagens e alterações de status.',
      colunas: ['id (UUID)', 'empresa_id (FK)', 'lead_id (FK)', 'usuario_id (FK)', 'tipo', 'canal', 'descricao', 'data_hora', 'status', 'metadata (JSONB)', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'tarefas',
      titulo: 'Tarefas & Cadência Comercial',
      descricao: 'Ações pendentes com prazos de vencimento geradas pelo motor de workflows.',
      colunas: ['id (UUID)', 'empresa_id (FK)', 'lead_id (FK)', 'usuario_id (FK)', 'titulo', 'descricao', 'data_vencimento', 'prioridade', 'status', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'workflows_automacoes',
      titulo: 'Motor de Automações & Workflows',
      descricao: 'Regras configuráveis e orientadas a eventos (sem regras fixas no código).',
      colunas: ['id (UUID)', 'empresa_id (FK)', 'nome', 'evento_gatilho', 'condicoes (JSONB)', 'acoes (JSONB)', 'ativo', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
    {
      nome: 'logs_auditoria',
      titulo: 'Auditoria & Rastreabilidade Geral',
      descricao: 'Logs de alteração com dados anteriores e posteriores para segurança.',
      colunas: ['id (UUID)', 'empresa_id (FK)', 'usuario_id', 'entidade', 'entidade_id', 'acao', 'dados_anteriores (JSONB)', 'dados_novos (JSONB)', 'ip', 'user_agent', 'created_at', 'updated_at', 'deleted_at', 'version'],
    },
  ];

  return (
    <div id="supabase-config-view" className="space-y-6">
      {/* CABEÇALHO DO BANCO DE DADOS */}
      <div className="bg-[#FAF9F5] p-5 sm:p-6 rounded-sm border border-[#D9D6D0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            style={{ backgroundColor: `${corPrimaria}15`, color: corPrimaria }}
            className="w-12 h-12 rounded-sm flex items-center justify-center shrink-0 border border-[#D9D6D0]"
          >
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] uppercase tracking-wide">
                Integração & Arquitetura Supabase
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider border ${
                  statusConexao?.conectado
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    statusConexao?.conectado ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse'
                  }`}
                />
                {statusConexao?.conectado ? 'Supabase Conectado' : 'Aguardando Conexão'}
              </span>
            </div>
            <p className="text-xs text-[#6E6E6E] mt-1 max-w-2xl">
              Arquitetura relacional PostgreSQL de alto desempenho com UUIDs, versionamento otimista, soft delete obrigatório, triggers e alocação estruturada de todos os dados do CRM.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-testar-conexao-supabase-header"
            type="button"
            onClick={() => executarTesteConexao()}
            disabled={isTestando}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider bg-white hover:bg-[#F2EFEA] text-[#1A1A1A] border border-[#D9D6D0] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestando ? 'animate-spin' : ''}`} />
            <span>{isTestando ? 'Testando...' : 'Testar Conexão'}</span>
          </button>

          <button
            id="btn-migrar-dados-supabase-header"
            type="button"
            onClick={handleSincronizarParaSupabase}
            disabled={isSincronizando}
            style={{ backgroundColor: corPrimaria }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider text-white hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${isSincronizando ? 'animate-bounce' : ''}`} />
            <span>{isSincronizando ? 'Alocando Dados...' : 'Migrar Dados para Supabase'}</span>
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div className="flex items-center gap-1 border-b border-[#D9D6D0] overflow-x-auto pb-px">
        <button
          id="tab-sub-supabase-conexao"
          type="button"
          onClick={() => setAbaInterna('conexao')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaInterna === 'conexao'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#FAF9F5]'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Conexão & Credenciais</span>
        </button>

        <button
          id="tab-sub-supabase-migracao"
          type="button"
          onClick={() => setAbaInterna('migracao')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaInterna === 'migracao'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#FAF9F5]'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Sincronização & Alocação ({leads.length} Leads)</span>
        </button>

        <button
          id="tab-sub-supabase-schema-sql"
          type="button"
          onClick={() => setAbaInterna('schema_sql')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaInterna === 'schema_sql'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#FAF9F5]'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Script SQL de Criação (schema.sql)</span>
        </button>

        <button
          id="tab-sub-supabase-arquitetura"
          type="button"
          onClick={() => setAbaInterna('arquitetura')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaInterna === 'arquitetura'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#FAF9F5]'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Dicionário das 10 Tabelas</span>
        </button>
      </div>

      {/* CONTEÚDO DAS SUB-ABAS */}

      {/* 1. ABA CONEXÃO & CREDENCIAIS */}
      {abaInterna === 'conexao' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Formulário */}
          <div className="lg:col-span-2 bg-[#FAF9F5] p-5 sm:p-6 rounded-sm border border-[#D9D6D0] space-y-5">
            <div>
              <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
                <Key className="w-4 h-4" style={{ color: corPrimaria }} />
                Credenciais do Projeto Supabase
              </h4>
              <p className="text-xs text-[#6E6E6E] mt-0.5">
                Insira a URL e a Chave Anon pública do seu projeto Supabase (disponíveis em Project Settings → API).
              </p>
            </div>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  URL do Projeto Supabase (Project URL)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8F887E]">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    id="input-supabase-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://abcdefghijklm.supabase.co"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-[#D9D6D0] rounded-sm text-[#1A1A1A] font-mono focus:outline-hidden focus:border-[#1A1A1A]"
                    required
                  />
                </div>
                <span className="text-[11px] text-[#6E6E6E] mt-1 block">
                  Exemplo: https://xyzcompany.supabase.co
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  Chave Pública Anon (Anon Public Key)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8F887E]">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    id="input-supabase-anon-key"
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-[#D9D6D0] rounded-sm text-[#1A1A1A] font-mono focus:outline-hidden focus:border-[#1A1A1A]"
                    required
                  />
                </div>
                <span className="text-[11px] text-[#6E6E6E] mt-1 block">
                  Chave segura para uso no frontend com Row Level Security (RLS) ativo.
                </span>
              </div>

              {origemConfig === 'env' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm flex items-start gap-2.5 text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Configuração carregada do arquivo .env</strong>
                    <p className="text-[11px] mt-0.5 text-blue-800">
                      As variáveis <code className="bg-blue-100 px-1 rounded-xs">VITE_SUPABASE_URL</code> e <code className="bg-blue-100 px-1 rounded-xs">VITE_SUPABASE_ANON_KEY</code> foram detectadas no ambiente.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  id="btn-salvar-supabase-config"
                  type="submit"
                  disabled={isTestando}
                  style={{ backgroundColor: corPrimaria }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white rounded-sm hover:opacity-95 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Salvar e Conectar
                </button>

                <button
                  id="btn-testar-supabase-config"
                  type="button"
                  onClick={() => executarTesteConexao(url, anonKey)}
                  disabled={isTestando || !url}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white border border-[#D9D6D0] text-[#1A1A1A] rounded-sm hover:bg-[#F2EFEA] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTestando ? 'Testando Conexão...' : 'Testar Conexão'}
                </button>

                {origemConfig === 'custom' && (
                  <button
                    id="btn-limpar-supabase-config"
                    type="button"
                    onClick={handleLimpar}
                    className="px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-sm border border-transparent hover:border-red-200 transition-colors ml-auto cursor-pointer"
                  >
                    Remover Salvo
                  </button>
                )}
              </div>
            </form>

            {/* Resultado do Teste */}
            {statusConexao && (
              <div
                className={`p-4 rounded-sm border ${
                  statusConexao.conectado
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {statusConexao.conectado ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider">
                      {statusConexao.conectado ? 'Conexão Supabase Validada' : 'Falha na Validação'}
                    </h5>
                    <p className="text-xs mt-1 leading-relaxed">{statusConexao.mensagem}</p>

                    {statusConexao.tabelas && statusConexao.tabelas.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-emerald-900">Tabelas Prontas:</span>
                        {statusConexao.tabelas.map((tab) => (
                          <span
                            key={tab}
                            className="px-2 py-0.5 bg-emerald-200/70 border border-emerald-400 text-[10px] font-mono font-semibold rounded-xs text-emerald-900"
                          >
                            {tab}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna 3: Guia Rápido e Instruções */}
          <div className="bg-[#FAF9F5] p-5 rounded-sm border border-[#D9D6D0] space-y-4">
            <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" style={{ color: corPrimaria }} />
              Como Obter as Credenciais
            </h4>

            <ol className="text-xs text-[#6E6E6E] space-y-3 pl-4 list-decimal">
              <li>
                Acesse o painel oficial em{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#1A1A1A] underline inline-flex items-center gap-0.5"
                >
                  supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Crie ou selecione o seu projeto para a clínica.</li>
              <li>
                No menu lateral esquerdo, clique no ícone de engrenagem <strong>Project Settings</strong>.
              </li>
              <li>
                Vá na seção <strong>API</strong>.
              </li>
              <li>
                Copie a <strong>Project URL</strong> e a <strong>anon / public key</strong> e cole nos campos ao lado.
              </li>
              <li>
                Na aba <strong>Script SQL de Criação</strong>, copie o script e rode no <strong>SQL Editor</strong> do Supabase.
              </li>
            </ol>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-[11px] text-amber-900 leading-relaxed">
              <strong>Regra de Governança:</strong> Todo acesso no banco respeita a coluna <code>empresa_id</code> para isolamento multi-clínica e <code>deleted_at IS NULL</code> para soft delete.
            </div>
          </div>
        </div>
      )}

      {/* 2. ABA MIGRAÇÃO & ALOCAÇÃO DE DADOS */}
      {abaInterna === 'migracao' && (
        <div className="space-y-6">
          <div className="bg-[#FAF9F5] p-5 sm:p-6 rounded-sm border border-[#D9D6D0] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" style={{ color: corPrimaria }} />
                  Alocação e Sincronização em Massa para o Supabase
                </h4>
                <p className="text-xs text-[#6E6E6E] mt-0.5">
                  Transfere todos os leads, fichas cadastrais, compras, catálogo de procedimentos e usuários atuais para as tabelas relacionais do Supabase.
                </p>
              </div>

              <button
                id="btn-iniciar-sincronizacao-dados"
                type="button"
                onClick={handleSincronizarParaSupabase}
                disabled={isSincronizando}
                style={{ backgroundColor: corPrimaria }}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white rounded-sm hover:opacity-95 transition-opacity cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                <UploadCloud className={`w-4 h-4 ${isSincronizando ? 'animate-bounce' : ''}`} />
                <span>{isSincronizando ? 'Processando Lote...' : 'Sincronizar Tudo Agora'}</span>
              </button>
            </div>

            {/* Resumo dos registros a serem alocados */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3 bg-white border border-[#D9D6D0] rounded-sm text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E6E] block">Leads</span>
                <span className="text-xl font-bold text-[#1A1A1A]">{leads.length}</span>
              </div>
              <div className="p-3 bg-white border border-[#D9D6D0] rounded-sm text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E6E] block">Fichas 1:1</span>
                <span className="text-xl font-bold text-[#1A1A1A]">{fichas.length}</span>
              </div>
              <div className="p-3 bg-white border border-[#D9D6D0] rounded-sm text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E6E] block">Compras</span>
                <span className="text-xl font-bold text-[#1A1A1A]">{compras.length}</span>
              </div>
              <div className="p-3 bg-white border border-[#D9D6D0] rounded-sm text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E6E] block">Procedimentos</span>
                <span className="text-xl font-bold text-[#1A1A1A]">{procedimentos.length}</span>
              </div>
              <div className="p-3 bg-white border border-[#D9D6D0] rounded-sm text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E6E] block">Usuários</span>
                <span className="text-xl font-bold text-[#1A1A1A]">{usuarios.length}</span>
              </div>
            </div>

            {/* Barra de Progresso */}
            {isSincronizando && (
              <div className="p-4 bg-white border border-[#D9D6D0] rounded-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: corPrimaria }} />
                    {progressoSincronizacao.etapa}
                  </span>
                  <span className="font-mono font-bold text-[#1A1A1A]">{progressoSincronizacao.percentual}%</span>
                </div>
                <div className="w-full bg-[#E5E5E5] h-2 rounded-xs overflow-hidden">
                  <div
                    style={{
                      width: `${progressoSincronizacao.percentual}%`,
                      backgroundColor: corPrimaria,
                    }}
                    className="h-full transition-all duration-300"
                  />
                </div>
              </div>
            )}

            {/* Resultado da Sincronização */}
            {resultadoSinc && (
              <div
                className={`p-4 rounded-sm border ${
                  resultadoSinc.sucesso
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {resultadoSinc.sucesso ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-2 flex-1">
                    <h5 className="text-xs font-bold uppercase tracking-wider">
                      {resultadoSinc.mensagem}
                    </h5>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div className="bg-white/80 p-2 rounded-xs border border-black/10">
                        <span className="text-[10px] text-[#6E6E6E] block font-bold">Leads Alocados</span>
                        <span className="font-bold">{resultadoSinc.totalLeads}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xs border border-black/10">
                        <span className="text-[10px] text-[#6E6E6E] block font-bold">Fichas</span>
                        <span className="font-bold">{resultadoSinc.totalFichas}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xs border border-black/10">
                        <span className="text-[10px] text-[#6E6E6E] block font-bold">Compras</span>
                        <span className="font-bold">{resultadoSinc.totalCompras}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xs border border-black/10">
                        <span className="text-[10px] text-[#6E6E6E] block font-bold">Procedimentos</span>
                        <span className="font-bold">{resultadoSinc.totalProcedimentos}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xs border border-black/10">
                        <span className="text-[10px] text-[#6E6E6E] block font-bold">Usuários</span>
                        <span className="font-bold">{resultadoSinc.totalUsuarios}</span>
                      </div>
                    </div>

                    {resultadoSinc.erros.length > 0 && (
                      <div className="mt-2 text-[11px] text-red-700 space-y-1">
                        <span className="font-bold">Avisos registrados:</span>
                        {resultadoSinc.erros.map((err, i) => (
                          <p key={i} className="font-mono bg-red-100/60 p-1 rounded-xs">
                            {err}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ABA SCRIPT SQL SCHEMA.SQL */}
      {abaInterna === 'schema_sql' && (
        <div className="bg-[#FAF9F5] p-5 sm:p-6 rounded-sm border border-[#D9D6D0] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
                <FileCode className="w-4 h-4" style={{ color: corPrimaria }} />
                Script SQL Oficial (DDL & Migrations)
              </h4>
              <p className="text-xs text-[#6E6E6E] mt-0.5">
                Copie e execute este script no <strong>SQL Editor</strong> do Supabase para criar as 10 tabelas, relacionamentos, triggers e índices.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-copiar-sql-supabase"
                type="button"
                onClick={copiarSql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider bg-white hover:bg-[#F2EFEA] text-[#1A1A1A] border border-[#D9D6D0] transition-colors cursor-pointer"
              >
                {copiadoSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiadoSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>

              <button
                id="btn-baixar-schema-sql"
                type="button"
                onClick={baixarSql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider bg-[#1A1A1A] hover:bg-black text-white transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar schema.sql</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-sm overflow-hidden border border-[#1A1A1A]/20 bg-[#1A1A1A] text-[#F2EFEA]">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/10 text-[11px] font-mono text-[#A8A29E]">
              <span>supabase/schema.sql (PostgreSQL 15+)</span>
              <span>10 Tabelas • Triggers • RLS • Soft Delete</span>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed text-[#E5E5E5]">
              <code>{sqlSchemaCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* 4. ABA DICIONÁRIO DAS 10 TABELAS */}
      {abaInterna === 'arquitetura' && (
        <div className="space-y-6">
          <div className="bg-[#FAF9F5] p-5 rounded-sm border border-[#D9D6D0]">
            <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-1">
              Governança & Estrutura das 10 Tabelas
            </h4>
            <p className="text-xs text-[#6E6E6E]">
              Todas as entidades seguem rigorosamente o padrão de UUID, soft delete (<code className="font-mono text-emerald-700">deleted_at</code>), versionamento otimista (<code className="font-mono text-blue-700">version</code>) e isolamento multi-clínica (<code className="font-mono text-amber-700">empresa_id</code>).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lista lateral de tabelas */}
            <div className="space-y-1.5">
              {tabelasInfo.map((tab) => (
                <button
                  key={tab.nome}
                  type="button"
                  onClick={() => setTabelaSelecionada(tab.nome)}
                  className={`w-full text-left p-3 rounded-sm border transition-all cursor-pointer ${
                    tabelaSelecionada === tab.nome
                      ? 'bg-white border-[#5C3A22] shadow-xs'
                      : 'bg-[#FAF9F5] border-[#D9D6D0] hover:bg-white text-[#6E6E6E]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1A1A1A]">{tab.nome}</span>
                    <span className="text-[10px] uppercase font-bold text-[#8F887E]">
                      {tab.colunas.length} colunas
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6E6E6E] mt-0.5 line-clamp-1">{tab.titulo}</p>
                </button>
              ))}
            </div>

            {/* Detalhes da tabela selecionada */}
            <div className="md:col-span-2 bg-[#FAF9F5] p-5 rounded-sm border border-[#D9D6D0] space-y-4">
              {(() => {
                const tab = tabelasInfo.find((t) => t.nome === tabelaSelecionada) || tabelasInfo[0];
                return (
                  <div>
                    <div className="border-b border-[#D9D6D0] pb-3 mb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-[#1A1A1A] font-mono">
                          TABLE {tab.nome}
                        </h4>
                        <span className="px-2 py-0.5 bg-[#5C3A22]/10 text-[#5C3A22] text-[10px] font-bold uppercase rounded-xs">
                          {tab.titulo}
                        </span>
                      </div>
                      <p className="text-xs text-[#6E6E6E] mt-1">{tab.descricao}</p>
                    </div>

                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
                      Colunas & Tipagem da Tabela:
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tab.colunas.map((col, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white rounded-xs border border-[#D9D6D0] font-mono text-xs flex items-center justify-between"
                        >
                          <span className="text-[#1A1A1A] font-semibold">{col}</span>
                          {col.includes('UUID') && (
                            <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded-xs uppercase font-bold">
                              PK/FK
                            </span>
                          )}
                          {col.includes('deleted_at') && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded-xs uppercase font-bold">
                              Soft Delete
                            </span>
                          )}
                          {col.includes('version') && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded-xs uppercase font-bold">
                              Locking
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
