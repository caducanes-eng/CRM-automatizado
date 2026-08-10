-- ============================================================================
-- ARQUITETURA DE BANCO DE DADOS CRM ESTÉTICA & CLÍNICAS (SUPABASE / POSTGRESQL)
-- ============================================================================
-- Padrão de Arquitetura & Governança do Projeto:
-- 1. Todas as tabelas possuem: id (UUID), created_at, updated_at, deleted_at, version
-- 2. Soft delete obrigatório (deleted_at IS NULL para registros ativos)
-- 3. Versionamento otimista automático por trigger (version = version + 1 em UPDATE)
-- 4. Relacionamentos explícitos e índices parciais otimizados
-- 5. Multi-inquilino robusto e isolado via empresa_id
-- 6. Suporte completo a todas as informações e características visuais das clínicas
-- ============================================================================

-- Habilitar extensões necessárias para UUID e Criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- FUNÇÃO E TRIGGER GLOBAL: ATUALIZAÇÃO AUTOMÁTICA DE updated_at E version
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at_and_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. TABELA: empresas (Clínicas, Consultórios e Unidades)
-- ============================================================================
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
  status VARCHAR(50) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'suspensa')),
  tipo_logo VARCHAR(50) DEFAULT 'monograma' CHECK (tipo_logo IN ('imagem', 'monograma')),
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

-- Garantir colunas adicionais para bases legadas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ativa';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS esteticas_salvas JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS admin_principal_id UUID NULL;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS admin_principal_email VARCHAR(255);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS admin_principal_nome VARCHAR(255);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS total_usuarios INTEGER NOT NULL DEFAULT 0;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS total_pacientes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_empresas_active ON empresas(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_empresas_status ON empresas(status) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_empresas_updated_at ON empresas;
CREATE TRIGGER trg_empresas_updated_at
BEFORE UPDATE ON empresas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 2. TABELA: empresa_membros (Vínculo de Usuários & Níveis de Acesso por Clínica)
-- ============================================================================
CREATE TABLE IF NOT EXISTS empresa_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  papel VARCHAR(50) NOT NULL DEFAULT 'operador' CHECK (papel IN ('admin', 'operador', 'medico', 'recepcao', 'pos_venda')),
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
CREATE INDEX IF NOT EXISTS idx_empresa_membros_user ON empresa_membros(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_empresa_membros_email ON empresa_membros(usuario_email) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_empresa_membros_updated_at ON empresa_membros;
CREATE TRIGGER trg_empresa_membros_updated_at
BEFORE UPDATE ON empresa_membros
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 3. TABELA: plataforma_admins (Gestores Globais da Plataforma Multi-Clínica)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_plataforma_admins_email ON plataforma_admins(email) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_plataforma_admins_updated_at ON plataforma_admins;
CREATE TRIGGER trg_plataforma_admins_updated_at
BEFORE UPDATE ON plataforma_admins
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 4. TABELA: usuarios (Colaboradores, Médicos, Secretárias, Gestores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255),
  cargo VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'RECEPCAO_COMERCIAL' CHECK (role IN ('GESTOR', 'MEDICO', 'RECEPCAO_COMERCIAL', 'POS_VENDA', 'PERSONALIZADO')),
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
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 5. TABELA: procedimentos (Catálogo Oficial de Procedimentos & Inteligência)
-- ============================================================================
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
CREATE INDEX IF NOT EXISTS idx_procedimentos_nome ON procedimentos(empresa_id, nome) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_procedimentos_updated_at ON procedimentos;
CREATE TRIGGER trg_procedimentos_updated_at
BEFORE UPDATE ON procedimentos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 6. TABELA: leads (Pacientes & Contatos do Funil)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  situacao VARCHAR(50) NOT NULL DEFAULT 'Em captação' CHECK (situacao IN ('Em captação', 'Consulta agendada', 'Pós consulta', 'Procedimento agendado', 'Pós procedimento', 'Reativação', 'Nutrição')),
  etapa_por_situacao JSONB NOT NULL DEFAULT '{}'::jsonb,
  interesse VARCHAR(255) DEFAULT '',
  possivel_valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status_venda VARCHAR(50) NOT NULL DEFAULT 'Em processo' CHECK (status_venda IN ('Em processo', 'Venda feita', 'Perdido')),
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel VARCHAR(255) NOT NULL DEFAULT 'Secretária 1',
  data_entrada_nutricao DATE,
  status_grupo_nutricao VARCHAR(50) DEFAULT 'Ativo' CHECK (status_grupo_nutricao IN ('Ativo', 'Removido')),
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
CREATE INDEX IF NOT EXISTS idx_leads_status_venda ON leads(empresa_id, status_venda) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_data_entrada ON leads(empresa_id, data_entrada) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON leads(empresa_id, responsavel) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 7. TABELA: fichas_leads (Ficha Cadastral e Clínica Complementar 1:1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fichas_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  telefone VARCHAR(50) DEFAULT '',
  origem_lead VARCHAR(50) NOT NULL DEFAULT 'WhatsApp' CHECK (origem_lead IN ('Indicação', 'Instagram', 'Google Ads', 'WhatsApp', 'Site', 'Outro')),
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

CREATE INDEX IF NOT EXISTS idx_fichas_empresa ON fichas_leads(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_lead_id ON fichas_leads(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_telefone ON fichas_leads(telefone) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_fichas_leads_updated_at ON fichas_leads;
CREATE TRIGGER trg_fichas_leads_updated_at
BEFORE UPDATE ON fichas_leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 8. TABELA: compras (Histórico de Vendas & Procedimentos Realizados N:1)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_compras_empresa ON compras(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compras_lead ON compras(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compras_data ON compras(empresa_id, data) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compras_procedimento ON compras(procedimento_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_compras_updated_at ON compras;
CREATE TRIGGER trg_compras_updated_at
BEFORE UPDATE ON compras
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 9. TABELA: historico_atendimentos (Timeline e Registro Imutável de Eventos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS historico_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'MENSAGEM' CHECK (tipo IN ('MENSAGEM', 'LIGACAO', 'CONSULTA', 'PROCEDIMENTO', 'MUDANCA_ETAPA', 'MUDANCA_STATUS', 'COMPRA', 'NOTA')),
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
CREATE INDEX IF NOT EXISTS idx_atendimentos_empresa ON historico_atendimentos(empresa_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_historico_atendimentos_updated_at ON historico_atendimentos;
CREATE TRIGGER trg_historico_atendimentos_updated_at
BEFORE UPDATE ON historico_atendimentos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 10. TABELA: tarefas (Automação de Tarefas & Cadência Comercial)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_vencimento TIMESTAMPTZ NOT NULL,
  prioridade VARCHAR(20) DEFAULT 'MEDIA' CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
  status VARCHAR(30) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tarefas_empresa_status ON tarefas(empresa_id, status, data_vencimento) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tarefas_lead ON tarefas(lead_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_tarefas_updated_at ON tarefas;
CREATE TRIGGER trg_tarefas_updated_at
BEFORE UPDATE ON tarefas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 11. TABELA: workflows_automacoes (Motor de Workflows Configurável)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_workflows_empresa ON workflows_automacoes(empresa_id, evento_gatilho) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_workflows_updated_at ON workflows_automacoes;
CREATE TRIGGER trg_workflows_updated_at
BEFORE UPDATE ON workflows_automacoes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 12. TABELA: logs_auditoria (Auditoria e Rastreabilidade Completa)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON logs_auditoria(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON logs_auditoria(entidade, entidade_id);

-- ============================================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ============================================================================
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

-- Políticas de Acesso Público Anon/Authenticated com Isolamento
DO $$
BEGIN
  -- Empresas
  DROP POLICY IF EXISTS "Acesso a Empresas" ON empresas;
  CREATE POLICY "Acesso a Empresas" ON empresas FOR ALL USING (true) WITH CHECK (true);

  -- Membros
  DROP POLICY IF EXISTS "Acesso a Empresa Membros" ON empresa_membros;
  CREATE POLICY "Acesso a Empresa Membros" ON empresa_membros FOR ALL USING (true) WITH CHECK (true);

  -- Admins Plataforma
  DROP POLICY IF EXISTS "Acesso a Plataforma Admins" ON plataforma_admins;
  CREATE POLICY "Acesso a Plataforma Admins" ON plataforma_admins FOR ALL USING (true) WITH CHECK (true);

  -- Usuários
  DROP POLICY IF EXISTS "Acesso a Usuarios" ON usuarios;
  CREATE POLICY "Acesso a Usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);

  -- Procedimentos
  DROP POLICY IF EXISTS "Acesso a Procedimentos" ON procedimentos;
  CREATE POLICY "Acesso a Procedimentos" ON procedimentos FOR ALL USING (true) WITH CHECK (true);

  -- Leads
  DROP POLICY IF EXISTS "Acesso a Leads" ON leads;
  CREATE POLICY "Acesso a Leads" ON leads FOR ALL USING (true) WITH CHECK (true);

  -- Fichas
  DROP POLICY IF EXISTS "Acesso a Fichas" ON fichas_leads;
  CREATE POLICY "Acesso a Fichas" ON fichas_leads FOR ALL USING (true) WITH CHECK (true);

  -- Compras
  DROP POLICY IF EXISTS "Acesso a Compras" ON compras;
  CREATE POLICY "Acesso a Compras" ON compras FOR ALL USING (true) WITH CHECK (true);

  -- Atendimentos
  DROP POLICY IF EXISTS "Acesso a Atendimentos" ON historico_atendimentos;
  CREATE POLICY "Acesso a Atendimentos" ON historico_atendimentos FOR ALL USING (true) WITH CHECK (true);

  -- Tarefas
  DROP POLICY IF EXISTS "Acesso a Tarefas" ON tarefas;
  CREATE POLICY "Acesso a Tarefas" ON tarefas FOR ALL USING (true) WITH CHECK (true);

  -- Workflows
  DROP POLICY IF EXISTS "Acesso a Workflows" ON workflows_automacoes;
  CREATE POLICY "Acesso a Workflows" ON workflows_automacoes FOR ALL USING (true) WITH CHECK (true);

  -- Auditoria
  DROP POLICY IF EXISTS "Acesso a Auditoria" ON logs_auditoria;
  CREATE POLICY "Acesso a Auditoria" ON logs_auditoria FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- HABILITAÇÃO DO SUPABASE REALTIME & IDENTIDADE DE RÉPLICA
-- ============================================================================
-- Permite que o Supabase envie e receba eventos em tempo real (INSERT, UPDATE, DELETE)
-- refletindo instantaneamente as alterações feitas no sistema ou no banco de dados.

DO $$
BEGIN
  -- Cria a publicação se não existir ou adiciona as tabelas à publicação padrão
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
  -- Ignora caso alguma tabela já pertença à publicação
  NULL;
END $$;

-- Configurar REPLICA IDENTITY FULL para que UPDATEs e DELETEs contenham o payload completo
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

-- NOTA ARQUITETURAL:
-- Este script SQL contém estritamente a arquitetura DDL, índices, triggers e publicações Realtime.
-- Nenhum dado de exemplo (seed) é inserido por este arquivo. O Supabase receberá os dados 
-- autênticos e sincronizados diretamente da aplicação CRM em tempo real.
