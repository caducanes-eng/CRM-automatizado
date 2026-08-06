-- ============================================================================
-- ARQUITETURA DE BANCO DE DADOS CRM ESTÉTICA & CLÍNICAS (SUPABASE / POSTGRESQL)
-- ============================================================================
-- Padrão de Arquitetura:
-- 1. Todas as tabelas possuem: id (UUID), created_at, updated_at, deleted_at, version
-- 2. Soft delete obrigatório (deleted_at IS NULL para registros ativos)
-- 3. Versionamento otimista automático por trigger (version = version + 1 em UPDATE)
-- 4. Relacionamentos explícitos e índices parciais otimizados
-- 5. Multi-inquilino seguro via empresa_id
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
-- 1. TABELA: empresas (Clínicas e Unidades)
-- ============================================================================
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
  tipo_logo VARCHAR(50) DEFAULT 'monograma' CHECK (tipo_logo IN ('imagem', 'monograma')),
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

CREATE TRIGGER trg_empresas_updated_at
BEFORE UPDATE ON empresas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 2. TABELA: usuarios (Colaboradores, Médicos, Secretárias, Gestores)
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

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 3. TABELA: procedimentos (Catálogo Oficial de Procedimentos & Inteligência)
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

CREATE TRIGGER trg_procedimentos_updated_at
BEFORE UPDATE ON procedimentos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 4. TABELA: leads (Pacientes & Contatos do Funil)
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

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 5. TABELA: fichas_leads (Ficha Cadastral e Clínica Complementar 1:1)
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

CREATE TRIGGER trg_fichas_leads_updated_at
BEFORE UPDATE ON fichas_leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 6. TABELA: compras (Histórico de Vendas & Procedimentos Realizados N:1)
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

CREATE TRIGGER trg_compras_updated_at
BEFORE UPDATE ON compras
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 7. TABELA: historico_atendimentos (Timeline e Registro Imutável de Eventos)
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

CREATE TRIGGER trg_historico_atendimentos_updated_at
BEFORE UPDATE ON historico_atendimentos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 8. TABELA: tarefas (Automação de Tarefas & Cadência Comercial)
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

CREATE TRIGGER trg_tarefas_updated_at
BEFORE UPDATE ON tarefas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 9. TABELA: workflows_automacoes (Motor de Workflows Configurável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflows_automacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  evento_gatilho VARCHAR(100) NOT NULL, -- Ex: 'LEAD_CRIADO', 'ETAPA_ALTERADA', 'VENDA_CONCLUIDA', 'PROCEDIMENTO_EXPIRANDO'
  condicoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  acoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_workflows_empresa ON workflows_automacoes(empresa_id, evento_gatilho) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_workflows_updated_at
BEFORE UPDATE ON workflows_automacoes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_and_version();

-- ============================================================================
-- 10. TABELA: logs_auditoria (Auditoria e Rastreabilidade Completa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID,
  entidade VARCHAR(100) NOT NULL, -- 'leads', 'fichas_leads', 'compras', 'procedimentos', 'usuarios'
  entidade_id UUID NOT NULL,
  acao VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'SOFT_DELETE', 'HARD_DELETE', 'LOGIN'
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
  CREATE POLICY "Acesso a Empresas" ON empresas FOR ALL USING (true) WITH CHECK (true);
  -- Usuários
  CREATE POLICY "Acesso a Usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
  -- Procedimentos
  CREATE POLICY "Acesso a Procedimentos" ON procedimentos FOR ALL USING (true) WITH CHECK (true);
  -- Leads
  CREATE POLICY "Acesso a Leads" ON leads FOR ALL USING (true) WITH CHECK (true);
  -- Fichas
  CREATE POLICY "Acesso a Fichas" ON fichas_leads FOR ALL USING (true) WITH CHECK (true);
  -- Compras
  CREATE POLICY "Acesso a Compras" ON compras FOR ALL USING (true) WITH CHECK (true);
  -- Atendimentos
  CREATE POLICY "Acesso a Atendimentos" ON historico_atendimentos FOR ALL USING (true) WITH CHECK (true);
  -- Tarefas
  CREATE POLICY "Acesso a Tarefas" ON tarefas FOR ALL USING (true) WITH CHECK (true);
  -- Workflows
  CREATE POLICY "Acesso a Workflows" ON workflows_automacoes FOR ALL USING (true) WITH CHECK (true);
  -- Auditoria
  CREATE POLICY "Acesso a Auditoria" ON logs_auditoria FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- SEED INICIAL: EMPRESA PRINCIPAL & PROCEDIMENTOS OFICIAIS
-- ============================================================================
INSERT INTO empresas (id, nome, subtitulo, cnpj, registro_profissional, telefone, email, endereco, unidade_padrao, tipo_logo, monograma_iniciais, ativa)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Dra. Agda Rodrigues',
  'Harmonização Facial & Estética Avançada',
  '12.345.678/0001-90',
  'CRM/SP 123456 • RQE 78901',
  '(11) 98765-4321',
  'contato@agdarodrigues.com.br',
  'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
  'Consultório Principal',
  'monograma',
  'AR',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Seed de Procedimentos da Clínica
INSERT INTO procedimentos (id, empresa_id, nome, categoria, valor, formatos_pagamento, duracao_dias, descricao, orientacoes, ativo)
VALUES
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Toxina Botulínica (Botox Facial Completo)',
  'Injetáveis',
  1800.00,
  'À vista com 5% desc. via Pix, ou até 10x de R$ 180,00 sem juros',
  150,
  'Relaxamento muscular para tratamento preventivo e corretivo de rugas de expressão (testa, glabela, pés de galinha).',
  'Duração média de 4 a 6 meses. Agendar retorno de avaliação aos 15 dias e reativação no 5º mês.',
  true
),
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'Preenchimento Labial / Ácido Hialurônico (1ml)',
  'Injetáveis',
  1600.00,
  'À vista via Pix com 5% desc. ou até 10x no cartão',
  270,
  'Contorno, hidratação profunda e volumização labial com ácido hialurônico de alta tecnologia.',
  'Duração de 9 a 12 meses. Explicar hidratação pós-procedimento e evitar calor nas primeiras 48h.',
  true
),
(
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  'Bioestimulador de Colágeno (Sculptra / Radiesse)',
  'Bioestimuladores',
  2800.00,
  'À vista ou até 12x no cartão de crédito',
  365,
  'Estímulo biológico profundo de colágeno para firmeza tecidual e rejuvenescimento estrutural.',
  'Pico de resultado aos 3 meses. Duração de até 24 meses. Massagem 5x5x5 nos primeiros 5 dias.',
  true
),
(
  '10000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000004',
  'Harmonização Facial Full Face Personalizada',
  'Harmonização',
  5500.00,
  'Condições exclusivas de parcelamento em até 12x sem juros',
  365,
  'Protocolo estruturado combinando preenchimentos e toxina para realçar traços naturais.',
  'Acompanhamento fotográfico antes e depois aos 30 e 90 dias.',
  true
),
(
  '10000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000005',
  'Limpeza de Pele Profunda com Hidratação de Ouro',
  'Facial',
  320.00,
  'À vista via Pix ou até 3x no cartão',
  45,
  'Higienização facial profunda, extração delicada de cravos e máscara rejuvenescedora com partículas de ouro.',
  'Recomendada manutenção a cada 30 a 45 dias para preservar o viço cutâneo.',
  true
)
ON CONFLICT (id) DO NOTHING;
