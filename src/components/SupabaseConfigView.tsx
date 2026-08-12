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
  Trash2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  Radio,
  Activity,
  Zap,
  Search,
  Terminal,
  ArrowUpDown,
  Play,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  isSupabaseConfigured,
  testSupabaseConnection,
  getRealtimeStatus,
  subscribeRealtimeStatus,
  subscribeRealtimeLogs,
  iniciarEscutaSupabaseConfigFirestore,
  RealtimeLogEntry,
  RealtimeStatusType,
} from '../lib/supabase';
import { supabaseService, RelatorioSincronizacao } from '../services/supabaseService';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { useAuth } from '../context/AuthContext';

export const SupabaseConfigView: React.FC = () => {
  const { leads, fichas, compras, procedimentos, limparTodosLeads } = useCrm();
  const { config } = useEmpresa();
  const { usuarios, isGestor, responsavelAtivo, usuarioLogado, responsavelNome, validarSenhaGestor } = useAuth();

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

  // Estados de Realtime e Monitoramento
  const [realtimeStatus, setRealtimeStatusState] = useState<RealtimeStatusType>(getRealtimeStatus());
  const [realtimeLogs, setRealtimeLogs] = useState<RealtimeLogEntry[]>([]);
  const [isTestandoRealtime, setIsTestandoRealtime] = useState(false);
  const [resultadoTesteRealtime, setResultadoTesteRealtime] = useState<{
    sucesso: boolean;
    mensagem: string;
    latenciaMs?: number;
    registroCriado?: any;
  } | null>(null);

  // Estados de Inspeção de Tabelas ao Vivo
  const [tabelaInspecionada, setTabelaInspecionada] = useState<string>('leads');
  const [linhasInspecionadas, setLinhasInspecionadas] = useState<any[]>([]);
  const [isInspecionando, setIsInspecionando] = useState(false);
  const [erroInspecao, setErroInspecao] = useState<string | null>(null);

  // Estados de sincronização
  const [isSincronizando, setIsSincronizando] = useState(false);
  const [progressoSincronizacao, setProgressoSincronizacao] = useState<{
    etapa: string;
    percentual: number;
  }>({ etapa: '', percentual: 0 });
  const [resultadoSinc, setResultadoSinc] = useState<RelatorioSincronizacao | null>(null);

  // Estados de cópia e visualização
  const [copiadoSql, setCopiadoSql] = useState(false);
  const [abaInterna, setAbaInterna] = useState<'conexao' | 'realtime' | 'migracao' | 'schema_sql' | 'arquitetura'>('conexao');
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>('leads');

  // Estados para modal de apagar dados de pacientes (Exclusivo Gestor Master com Senha)
  const [modalApagarPacientesAberto, setModalApagarPacientesAberto] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [isApagando, setIsApagando] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{
    tipo: 'sucesso' | 'erro' | 'info';
    texto: string;
  } | null>(null);

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';

  // Carrega configurações e escuta Realtime ao montar
  useEffect(() => {
    const cfg = getSupabaseConfig();
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    setOrigemConfig(cfg.origem);

    if (cfg.url && cfg.anonKey) {
      executarTesteConexao(cfg.url, cfg.anonKey);
    }

    const unsubStatus = subscribeRealtimeStatus((status) => {
      setRealtimeStatusState(status);
    });

    const unsubLogs = subscribeRealtimeLogs((logs) => {
      setRealtimeLogs(logs);
    });

    const unsubFirestore = iniciarEscutaSupabaseConfigFirestore();

    const handleConfigChanged = () => {
      const newCfg = getSupabaseConfig();
      setUrl(newCfg.url);
      setAnonKey(newCfg.anonKey);
      setOrigemConfig(newCfg.origem);
      if (newCfg.url && newCfg.anonKey) {
        executarTesteConexao(newCfg.url, newCfg.anonKey);
      }
    };

    window.addEventListener('supabase-config-changed', handleConfigChanged);

    return () => {
      unsubStatus();
      unsubLogs();
      unsubFirestore();
      window.removeEventListener('supabase-config-changed', handleConfigChanged);
    };
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

  const executarTesteGravacaoRealtime = async () => {
    setIsTestandoRealtime(true);
    setResultadoTesteRealtime(null);
    try {
      const res = await supabaseService.testarEnvioEmTempoReal();
      setResultadoTesteRealtime(res);
      if (res.sucesso) {
        // Se a tabela inspecionada for leads, atualiza a lista
        if (tabelaInspecionada === 'leads') {
          carregarLinhasTabela('leads');
        }
      }
    } catch (e: any) {
      setResultadoTesteRealtime({
        sucesso: false,
        mensagem: `Falha no teste: ${e?.message || 'Erro de rede ou permissão'}`,
      });
    } finally {
      setIsTestandoRealtime(false);
    }
  };

  const carregarLinhasTabela = async (tabela: string) => {
    setIsInspecionando(true);
    setErroInspecao(null);
    try {
      const res = await supabaseService.buscarLinhasTabelaAoVivo(tabela, 15);
      if (res.erro) {
        setErroInspecao(res.erro);
        setLinhasInspecionadas([]);
      } else {
        setLinhasInspecionadas(res.dados || []);
      }
    } catch (e: any) {
      setErroInspecao(e?.message || 'Erro ao consultar tabela no Supabase');
      setLinhasInspecionadas([]);
    } finally {
      setIsInspecionando(false);
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

  const handleAbrirModalApagarPacientes = () => {
    setSenhaConfirmacao('');
    setSenhaVisivel(false);
    setErroSenha(null);
    setModalApagarPacientesAberto(true);
  };

  const handleFecharModalApagarPacientes = () => {
    if (isApagando) return;
    setModalApagarPacientesAberto(false);
    setSenhaConfirmacao('');
    setErroSenha(null);
  };

  const handleConfirmarApagarPacientes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!senhaConfirmacao || !senhaConfirmacao.trim()) {
      setErroSenha('Por favor, informe sua senha de login para confirmar a exclusão.');
      return;
    }

    setErroSenha(null);
    const senhaValida = validarSenhaGestor(senhaConfirmacao);

    if (!senhaValida) {
      setErroSenha('Senha de login incorreta. Acesso negado para exclusão de dados.');
      return;
    }

    setIsApagando(true);
    try {
      const resLocal = await limparTodosLeads();

      if (isSupabaseConfigured() || url) {
        await supabaseService.apagarDadosPacientesSupabase();
      }

      setModalApagarPacientesAberto(false);
      setSenhaConfirmacao('');
      setFeedbackStatus({
        tipo: 'sucesso',
        texto: `Dados de pacientes apagados com sucesso do banco de dados! ${resLocal.totalRemovidos} registro(s) de pacientes, fichas e histórico de compras foram removidos.`,
      });

      if (url && anonKey) {
        await executarTesteConexao();
      }

      setTimeout(() => {
        setFeedbackStatus(null);
      }, 7000);
    } catch (err: any) {
      console.error('Erro ao apagar dados de pacientes:', err);
      setErroSenha(`Erro ao executar exclusão: ${err?.message || 'Falha desconhecida'}`);
    } finally {
      setIsApagando(false);
    }
  };

  const sqlSchemaCode = `-- ============================================================================
-- ARQUITETURA DE BANCO DE DADOS CRM ESTÉTICA & CLÍNICAS (SUPABASE / POSTGRESQL)
-- ============================================================================
-- Padrão de Arquitetura & Governança do Projeto:
-- 1. Todas as tabelas possuem: id (UUID), created_at, updated_at, deleted_at, version
-- 2. Soft delete obrigatório (deleted_at IS NULL para registros ativos)
-- 3. Versionamento otimista automático por trigger (version = version + 1 em UPDATE)
-- 4. Multi-inquilino robusto e isolado via empresa_id
-- 5. SUPABASE REALTIME habilitado: o Supabase recebe todos os dados em tempo real
--    diretamente da aplicação, sem necessidade de inserts manuais ou seeds fake.
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
  cnpj VARCHAR(50),
  registro_profissional VARCHAR(100),
  telefone VARCHAR(50),
  email VARCHAR(255),
  endereco TEXT,
  horario_funcionamento VARCHAR(255),
  unidade_padrao VARCHAR(100) DEFAULT 'Consultório Principal',
  status VARCHAR(50) NOT NULL DEFAULT 'ativa',
  tipo_logo VARCHAR(50) DEFAULT 'monograma',
  logo_url TEXT,
  monograma_iniciais VARCHAR(10) DEFAULT 'AR',
  logo_altura VARCHAR(50) DEFAULT 'padrao',
  logo_ajuste_lateral VARCHAR(50) DEFAULT 'total',
  logo_fundo_header VARCHAR(50) DEFAULT 'integrado',
  estetica_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  esteticas_salvas JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_principal_id UUID NULL,
  admin_principal_email VARCHAR(255),
  admin_principal_nome VARCHAR(255),
  total_usuarios INTEGER NOT NULL DEFAULT 0,
  total_pacientes INTEGER NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_empresas_active ON empresas(id) WHERE deleted_at IS NULL;

-- 2. TABELA: empresa_membros
CREATE TABLE IF NOT EXISTS empresa_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  papel VARCHAR(50) NOT NULL DEFAULT 'operador',
  ativo BOOLEAN NOT NULL DEFAULT true,
  usuario_nome VARCHAR(255),
  usuario_email VARCHAR(255),
  usuario_cargo VARCHAR(100),
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_empresa_membros_empresa ON empresa_membros(empresa_id) WHERE deleted_at IS NULL;

-- 3. TABELA: plataforma_admins
CREATE TABLE IF NOT EXISTS plataforma_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  criado_por VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- 4. TABELA: usuarios
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

-- 5. TABELA: procedimentos
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

-- 6. TABELA: leads
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

-- 7. TABELA: fichas_leads
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

-- 8. TABELA: compras
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

-- 9. TABELA: historico_atendimentos
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

-- 10. TABELA: tarefas
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

-- 11. TABELA: workflows_automacoes
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

-- 12. TABELA: logs_auditoria
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
DROP TRIGGER IF EXISTS trg_empresas_up ON empresas;
CREATE TRIGGER trg_empresas_up BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_membros_up ON empresa_membros;
CREATE TRIGGER trg_membros_up BEFORE UPDATE ON empresa_membros FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_usuarios_up ON usuarios;
CREATE TRIGGER trg_usuarios_up BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_procedimentos_up ON procedimentos;
CREATE TRIGGER trg_procedimentos_up BEFORE UPDATE ON procedimentos FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_leads_up ON leads;
CREATE TRIGGER trg_leads_up BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_fichas_up ON fichas_leads;
CREATE TRIGGER trg_fichas_up BEFORE UPDATE ON fichas_leads FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_compras_up ON compras;
CREATE TRIGGER trg_compras_up BEFORE UPDATE ON compras FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

-- HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataforma_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO
DO $$
BEGIN
  CREATE POLICY "Acesso a Empresas" ON empresas FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Membros" ON empresa_membros FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Admins" ON plataforma_admins FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Procedimentos" ON procedimentos FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Leads" ON leads FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Fichas" ON fichas_leads FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Compras" ON compras FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Atendimentos" ON historico_atendimentos FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Tarefas" ON tarefas FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Workflows" ON workflows_automacoes FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Acesso a Auditoria" ON logs_auditoria FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- HABILITAÇÃO DO SUPABASE REALTIME (WEBSOCKETS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  ALTER PUBLICATION supabase_realtime ADD TABLE empresas;
  ALTER PUBLICATION supabase_realtime ADD TABLE empresa_membros;
  ALTER PUBLICATION supabase_realtime ADD TABLE plataforma_admins;
  ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;
  ALTER PUBLICATION supabase_realtime ADD TABLE procedimentos;
  ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  ALTER PUBLICATION supabase_realtime ADD TABLE fichas_leads;
  ALTER PUBLICATION supabase_realtime ADD TABLE compras;
  ALTER PUBLICATION supabase_realtime ADD TABLE historico_atendimentos;
  ALTER PUBLICATION supabase_realtime ADD TABLE tarefas;
  ALTER PUBLICATION supabase_realtime ADD TABLE workflows_automacoes;
  ALTER PUBLICATION supabase_realtime ADD TABLE logs_auditoria;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- REPLICA IDENTITY FULL PARA TRANSMISSÃO BIDIRECIONAL COMPLETA
ALTER TABLE empresas REPLICA IDENTITY FULL;
ALTER TABLE empresa_membros REPLICA IDENTITY FULL;
ALTER TABLE plataforma_admins REPLICA IDENTITY FULL;
ALTER TABLE usuarios REPLICA IDENTITY FULL;
ALTER TABLE procedimentos REPLICA IDENTITY FULL;
ALTER TABLE leads REPLICA IDENTITY FULL;
ALTER TABLE fichas_leads REPLICA IDENTITY FULL;
ALTER TABLE compras REPLICA IDENTITY FULL;
ALTER TABLE historico_atendimentos REPLICA IDENTITY FULL;
ALTER TABLE tarefas REPLICA IDENTITY FULL;
ALTER TABLE workflows_automacoes REPLICA IDENTITY FULL;
ALTER TABLE logs_auditoria REPLICA IDENTITY FULL;
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
      nome: 'empresa_membros',
      titulo: 'Vínculos de Usuários por Empresa',
      descricao: 'Tabela de associação multi-clínica para papéis e permissões.',
      colunas: ['id (UUID)', 'user_id (UUID)', 'empresa_id (FK)', 'papel', 'ativo', 'usuario_nome', 'usuario_email', 'usuario_cargo', 'ultimo_acesso', 'created_at', 'updated_at', 'deleted_at', 'version'],
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider border ${
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

              {/* Status do WebSocket Realtime */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider border ${
                  realtimeStatus === 'CONECTADO'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : realtimeStatus === 'CONECTANDO'
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                <Radio className={`w-3 h-3 ${realtimeStatus === 'CONECTADO' ? 'text-emerald-600 animate-pulse' : ''}`} />
                Realtime: {realtimeStatus}
              </span>
            </div>
            <p className="text-xs text-[#6E6E6E] mt-1 max-w-2xl">
              Arquitetura relacional PostgreSQL de alto desempenho com sincronização bidirecional em tempo real (WebSockets). Suas ações no sistema gravam imediatamente no banco, e alterações no Supabase refletem instantaneamente no CRM.
            </p>
            <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-amber-50/80 border border-amber-200/80 text-[11px] font-semibold text-amber-900">
              <Zap className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Sincronização Ativa: Qualquer alteração de banco de dados ou acessos feita pelo Gestor Master é propagada em tempo real para todas as secretárias e colaboradores.</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Botão de Apagar Dados das Pacientes (Exclusivo Gestor Master com Senha) */}
          <button
            id="btn-apagar-dados-pacientes-header"
            type="button"
            onClick={handleAbrirModalApagarPacientes}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-colors cursor-pointer shadow-xs"
            title="Apagar dados de pacientes com confirmação de senha do Gestor Master"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Apagar Dados de Pacientes</span>
          </button>

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

      {/* FEEDBACK STATUS BANNER */}
      {feedbackStatus && (
        <div
          id="banner-feedback-status-pacientes"
          className={`p-4 rounded-sm text-xs font-semibold flex items-center justify-between gap-3 border shadow-xs animate-in fade-in slide-in-from-top-2 ${
            feedbackStatus.tipo === 'sucesso'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="leading-relaxed">{feedbackStatus.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackStatus(null)}
            className="text-xs font-bold px-2 py-1 hover:bg-black/5 rounded-xs cursor-pointer shrink-0"
          >
            ✕ Fechar
          </button>
        </div>
      )}

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
          id="tab-sub-supabase-realtime"
          type="button"
          onClick={() => {
            setAbaInterna('realtime');
            if (linhasInspecionadas.length === 0) {
              carregarLinhasTabela(tabelaInspecionada);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaInterna === 'realtime'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#FAF9F5]'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Monitor Tempo Real & Dados ao Vivo</span>
          {realtimeStatus === 'CONECTADO' && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
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
          <span>Dicionário das Tabelas</span>
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
                  Chave segura para uso com Row Level Security (RLS) e WebSockets em tempo real.
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
                Na aba <strong>Script SQL de Criação</strong>, copie o script e rode no <strong>SQL Editor</strong> do Supabase para criar as tabelas.
              </li>
            </ol>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-[11px] text-amber-900 leading-relaxed">
              <strong>Sincronização em Tempo Real:</strong> Todos os leads, procedimentos, fichas e compras criados ou alterados no CRM são transmitidos imediatamente para o seu Supabase.
            </div>
          </div>
        </div>
      )}

      {/* 2. ABA MONITOR TEMPO REAL & DADOS AO VIVO */}
      {abaInterna === 'realtime' && (
        <div className="space-y-6">
          {/* Cartão de Teste de Gravação Imediata */}
          <div className="bg-[#FAF9F5] p-5 sm:p-6 rounded-sm border border-[#D9D6D0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Teste de Gravação Direta no Supabase em Tempo Real
                </h4>
                <p className="text-xs text-[#6E6E6E] mt-0.5">
                  Dispara uma inserção autêntica de verificação na tabela <code>leads</code> do seu Supabase, mede a latência da rede e atualiza a lista ao vivo.
                </p>
              </div>

              <button
                id="btn-testar-gravacao-realtime"
                type="button"
                onClick={executarTesteGravacaoRealtime}
                disabled={isTestandoRealtime || !isSupabaseConfigured()}
                style={{ backgroundColor: corPrimaria }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider text-white hover:opacity-95 transition-opacity cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
              >
                <Play className={`w-3.5 h-3.5 ${isTestandoRealtime ? 'animate-spin' : ''}`} />
                <span>{isTestandoRealtime ? 'Testando Gravação...' : 'Testar Gravação em Tempo Real'}</span>
              </button>
            </div>

            {/* Resultado do Teste de Gravação Realtime */}
            {resultadoTesteRealtime && (
              <div
                className={`p-4 rounded-sm border ${
                  resultadoTesteRealtime.sucesso
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {resultadoTesteRealtime.sucesso ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider">
                        {resultadoTesteRealtime.sucesso ? 'Gravação em Tempo Real Concluída!' : 'Falha na Gravação'}
                      </span>
                      {resultadoTesteRealtime.latenciaMs && (
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-emerald-200/60 rounded-xs">
                          {resultadoTesteRealtime.latenciaMs} ms
                        </span>
                      )}
                    </div>
                    <p>{resultadoTesteRealtime.mensagem}</p>
                    {resultadoTesteRealtime.registroCriado && (
                      <div className="mt-2 p-2.5 bg-white/90 border border-emerald-300 rounded-xs font-mono text-[11px]">
                        <span className="font-bold text-emerald-900 block mb-1">Registro Gravado no Supabase:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-stone-700">
                          <div><strong>ID:</strong> {resultadoTesteRealtime.registroCriado.id}</div>
                          <div><strong>Nome:</strong> {resultadoTesteRealtime.registroCriado.nome}</div>
                          <div><strong>Situação:</strong> {resultadoTesteRealtime.registroCriado.situacao}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visualizador de Dados ao Vivo das Tabelas */}
          <div className="bg-[#FAF9F5] p-5 sm:p-6 rounded-sm border border-[#D9D6D0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
                  <Database className="w-4 h-4" style={{ color: corPrimaria }} />
                  Inspetor de Registros Armazenados no Supabase (Ao Vivo)
                </h4>
                <p className="text-xs text-[#6E6E6E] mt-0.5">
                  Consulte os registros que estão atualmente salvos nas tabelas do seu banco de dados PostgreSQL no Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="select-tabela-inspecionada"
                  value={tabelaInspecionada}
                  onChange={(e) => {
                    setTabelaInspecionada(e.target.value);
                    carregarLinhasTabela(e.target.value);
                  }}
                  className="px-3 py-2 text-xs bg-white border border-[#D9D6D0] rounded-sm font-mono font-semibold text-[#1A1A1A] focus:outline-hidden"
                >
                  <option value="leads">leads (Pacientes & Leads)</option>
                  <option value="fichas_leads">fichas_leads (Fichas 1:1)</option>
                  <option value="compras">compras (Histórico de Vendas)</option>
                  <option value="procedimentos">procedimentos (Catálogo Clínico)</option>
                  <option value="usuarios">usuarios (Equipe & Médicos)</option>
                  <option value="empresas">empresas (Clínica / Multi-inquilino)</option>
                  <option value="empresa_membros">empresa_membros (Vínculos)</option>
                </select>

                <button
                  type="button"
                  onClick={() => carregarLinhasTabela(tabelaInspecionada)}
                  disabled={isInspecionando}
                  className="px-3 py-2 bg-white hover:bg-[#F2EFEA] border border-[#D9D6D0] rounded-sm text-xs font-bold uppercase tracking-wider text-[#1A1A1A] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isInspecionando ? 'animate-spin' : ''}`} />
                  <span>{isInspecionando ? 'Lendo...' : 'Atualizar'}</span>
                </button>
              </div>
            </div>

            {erroInspecao && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-900">
                <strong>Aviso:</strong> {erroInspecao}
              </div>
            )}

            {/* Tabela de Resultados */}
            <div className="border border-[#D9D6D0] rounded-sm overflow-hidden bg-white">
              {linhasInspecionadas.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6E6E6E]">
                  {isInspecionando ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#5C3A22]" />
                      <span>Consultando dados no Supabase...</span>
                    </div>
                  ) : (
                    <span>Nenhum registro encontrado na tabela <code>{tabelaInspecionada}</code> ou banco aguardando primeira sincronização.</span>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAF9F5] border-b border-[#D9D6D0] text-[#1A1A1A] font-bold uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Identificador / Nome</th>
                        <th className="p-2.5">Detalhes / Dados</th>
                        <th className="p-2.5">Criado Em</th>
                        <th className="p-2.5">Atualizado Em</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5] font-mono text-[11px]">
                      {linhasInspecionadas.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-[#FAF9F5]/70 transition-colors">
                          <td className="p-2.5 text-[#6E6E6E] font-semibold max-w-[140px] truncate" title={row.id}>
                            {row.id}
                          </td>
                          <td className="p-2.5 font-bold text-[#1A1A1A] font-sans">
                            {row.nome || row.procedimento || row.usuario_nome || row.titulo || row.email || '-'}
                          </td>
                          <td className="p-2.5 text-[#4A4A4A] font-sans text-xs">
                            {row.situacao && <span className="mr-2 px-1.5 py-0.5 bg-stone-100 rounded-xs border text-[10px] font-semibold">{row.situacao}</span>}
                            {row.valor !== undefined && <span className="mr-2 font-bold text-emerald-800">R$ {Number(row.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                            {row.cargo && <span className="text-[11px] text-[#6E6E6E]">{row.cargo}</span>}
                            {row.telefone && <span className="text-[11px] text-[#6E6E6E]">{row.telefone}</span>}
                          </td>
                          <td className="p-2.5 text-[#6E6E6E]">
                            {row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="p-2.5 text-[#6E6E6E]">
                            {row.updated_at ? new Date(row.updated_at).toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="p-2.5 text-center">
                            {row.deleted_at ? (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] rounded-xs font-bold">
                                Deletado
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-xs font-bold">
                                Ativo (v{row.version || 1})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Console de Eventos em Tempo Real (WebSockets Stream) */}
          <div className="bg-[#1A1A1A] text-[#F2EFEA] p-4 sm:p-5 rounded-sm border border-[#1A1A1A] space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  Console de Eventos Supabase Realtime (Ao Vivo)
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-400">
                {realtimeLogs.length} evento(s) capturado(s)
              </span>
            </div>

            <div className="font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 leading-relaxed">
              {realtimeLogs.length === 0 ? (
                <p className="text-stone-500 text-[11px] py-3">
                  Nenhum evento registrado ainda. As modificações feitas nos leads, fichas ou procedimentos aparecerão aqui em tempo real.
                </p>
              ) : (
                realtimeLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-[11px]">
                    <span className="text-stone-500 shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`px-1 rounded-xs uppercase font-bold text-[9px] shrink-0 ${
                        log.tipo === 'INSERT'
                          ? 'bg-emerald-900/80 text-emerald-200'
                          : log.tipo === 'UPDATE'
                          ? 'bg-blue-900/80 text-blue-200'
                          : log.tipo === 'DELETE'
                          ? 'bg-rose-900/80 text-rose-200'
                          : 'bg-amber-900/80 text-amber-200'
                      }`}
                    >
                      {log.tipo}
                    </span>
                    <span className="text-emerald-400 shrink-0 font-semibold">{log.tabela}:</span>
                    <span className="text-stone-300">{log.detalhe}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. ABA MIGRAÇÃO & ALOCAÇÃO DE DADOS */}
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

            {/* ZONA DE GESTÃO MASTER: APAGAR DADOS DE PACIENTES */}
            <div className="p-4 sm:p-5 rounded-sm border border-rose-300 bg-rose-50/40 space-y-3 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-950 uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-rose-700" />
                    <span>Zona do Gestor Master: Apagar Dados de Pacientes do Banco</span>
                  </div>
                  <p className="text-xs text-rose-900/80 leading-relaxed max-w-3xl">
                    Remove permanentemente todos os <strong>{leads.length}</strong> pacientes/leads, <strong>{fichas.length}</strong> fichas cadastrais e <strong>{compras.length}</strong> compras registradas no banco de dados (Firestore, Supabase e local). Requer confirmação da sua senha de login.
                  </p>
                </div>

                <button
                  id="btn-apagar-dados-pacientes-migracao"
                  type="button"
                  onClick={handleAbrirModalApagarPacientes}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider text-white bg-rose-700 hover:bg-rose-800 transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Apagar Pacientes ({leads.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ABA SCRIPT SQL SCHEMA.SQL */}
      {abaInterna === 'schema_sql' && (
        <div className="bg-[#FAF9F5] p-5 sm:p-6 rounded-sm border border-[#D9D6D0] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
                <FileCode className="w-4 h-4" style={{ color: corPrimaria }} />
                Script SQL Oficial (DDL, Triggers & Realtime)
              </h4>
              <p className="text-xs text-[#6E6E6E] mt-0.5">
                Execute este script no <strong>SQL Editor</strong> do Supabase para criar a estrutura completa das tabelas e habilitar WebSockets em tempo real.
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

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm text-xs text-blue-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <strong>Estrutura DDL 100% Pura:</strong> Este script cria exclusivamente tabelas, índices, triggers e permissões. Nenhum dado pré-fabricado (fake seed) é inserido — o Supabase receberá os dados reais diretamente da aplicação em tempo real.
            </div>
          </div>

          <div className="relative rounded-sm overflow-hidden border border-[#1A1A1A]/20 bg-[#1A1A1A] text-[#F2EFEA]">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/10 text-[11px] font-mono text-[#A8A29E]">
              <span>supabase/schema.sql (PostgreSQL 15+)</span>
              <span>12 Tabelas • Triggers • RLS • Realtime Ativo</span>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed text-[#E5E5E5]">
              <code>{sqlSchemaCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* 5. ABA DICIONÁRIO DAS TABELAS */}
      {abaInterna === 'arquitetura' && (
        <div className="space-y-6">
          <div className="bg-[#FAF9F5] p-5 rounded-sm border border-[#D9D6D0]">
            <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-1">
              Governança & Estrutura das Tabelas
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

      {/* MODAL DE SEGURANÇA: APAGAR DADOS DE PACIENTES (EXCLUSIVO GESTOR MASTER COM SENHA) */}
      {modalApagarPacientesAberto && (
        <div
          id="modal-apagar-dados-pacientes-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-apagar-dados-pacientes-container"
            className="bg-white rounded-sm border border-rose-300 p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95"
          >
            {/* Header do Modal */}
            <div className="flex items-start gap-3 border-b border-rose-200 pb-4 text-rose-950">
              <div className="w-11 h-11 rounded-sm bg-rose-100 flex items-center justify-center text-rose-800 shrink-0 border border-rose-300">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-rose-950">
                    Apagar Dados de Pacientes
                  </h3>
                  <button
                    type="button"
                    disabled={isApagando}
                    onClick={handleFecharModalApagarPacientes}
                    className="text-[#6E6E6E] hover:text-[#1A1A1A] text-xs font-bold p-1 rounded-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-rose-800 font-medium mt-0.5">
                  Autenticação de Segurança Exclusiva do Gestor Master
                </p>
              </div>
            </div>

            {/* Alerta de Impacto */}
            <div className="space-y-2.5 text-xs text-[#1A1A1A] leading-relaxed bg-[#FAF9F5] p-4 rounded-sm border border-[#D9D6D0]">
              <div className="flex items-center gap-1.5 text-rose-900 font-bold uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>Atenção: Ação Destrutiva Irreversível</span>
              </div>
              <p className="text-[#6E6E6E]">
                Esta operação apagará definitivamente todos os <strong>{leads.length} pacientes/leads</strong>, <strong>{fichas.length} fichas complementares</strong> e <strong>{compras.length} registros de compras</strong> do banco de dados (Firestore, Supabase e armazenamento local).
              </p>
              <p className="text-[11px] text-rose-900 font-semibold bg-rose-50 p-2 rounded-xs border border-rose-200">
                O catálogo de procedimentos, cadastros de colaboradores e configurações da clínica serão preservados intactos.
              </p>
            </div>

            {/* Identificação do Gestor */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F2EFEA]/40 rounded-sm border border-[#D9D6D0] text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6E6E6E] block">Gestor Responsável</span>
                <span className="font-bold text-[#1A1A1A]">{responsavelNome}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#6E6E6E] block">Nível de Acesso</span>
                <span className="text-[11px] font-bold text-[#5C3A22] bg-[#5C3A22]/10 px-2 py-0.5 rounded-xs">
                  {responsavelAtivo?.cargo || (isGestor ? 'Gestor Master' : 'Colaborador')}
                </span>
              </div>
            </div>

            {/* Formulário com Campo de Senha */}
            <form onSubmit={handleConfirmarApagarPacientes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-700" />
                    <span>Digite sua Senha de Login para Confirmar:</span>
                  </span>
                  <span className="text-[10px] text-rose-700 font-semibold">Obrigatório</span>
                </label>
                <div className="relative">
                  <input
                    id="input-senha-confirmacao-apagar-pacientes"
                    type={senhaVisivel ? 'text' : 'password'}
                    value={senhaConfirmacao}
                    onChange={(e) => {
                      setSenhaConfirmacao(e.target.value);
                      if (erroSenha) setErroSenha(null);
                    }}
                    placeholder="Digite a senha do seu usuário de login..."
                    autoFocus
                    disabled={isApagando}
                    className="w-full pl-3 pr-10 py-2.5 text-xs bg-white border border-[#D9D6D0] focus:border-rose-600 focus:ring-1 focus:ring-rose-600 rounded-sm text-[#1A1A1A] font-mono outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setSenhaVisivel(!senhaVisivel)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8F887E] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    {senhaVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10.5px] text-[#6E6E6E] mt-1 block">
                  Informe a senha cadastrada para o seu usuário gestor ({responsavelAtivo?.email || usuarioLogado?.email || 'gestor'}).
                </span>
              </div>

              {/* Mensagem de Erro de Senha */}
              {erroSenha && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-sm flex items-start gap-2 text-xs text-rose-900 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span className="font-semibold">{erroSenha}</span>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9D6D0]">
                <button
                  type="button"
                  disabled={isApagando}
                  onClick={handleFecharModalApagarPacientes}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:bg-[#F2EFEA] rounded-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  id="btn-confirmar-apagar-pacientes-submit"
                  type="submit"
                  disabled={isApagando || !senhaConfirmacao.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-rose-700 hover:bg-rose-800 rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className={`w-4 h-4 ${isApagando ? 'animate-bounce' : ''}`} />
                  <span>{isApagando ? 'Apagando do Banco...' : 'Confirmar e Apagar Dados'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
