-- ============================================================================
-- BASELINE DO BANCO VIVO (rascunho versionado, NAO APLICAR)
-- Projeto Supabase: msiuqiyndnvpwkpkaglm | foto de 22/11/2026, somente leitura
-- Origem: pg_catalog (pg_attribute, pg_constraint, pg_indexes, pg_trigger,
--         pg_proc, pg_policies, pg_get_viewdef, ACLs). Nenhum dado de linha.
-- Serve para: (1) provar a deriva contra supabase/schema.sql, (2) recriar o
-- esquema vazio em branch de teste. NAO rodar sobre o banco de producao.
-- Historico vivo (supabase_migrations): 01_hardening_funcoes_triggers_views,
--   02_vincular_usuarios_ao_auth, 03_integridade_dados,
--   04_politicas_por_empresa_aditivas, 05_fechar_acesso_publico,
--   add_instagram_to_fichas_lead, oxy_diagnosticos.
-- ============================================================================
SET check_function_bodies = off;

-- 1. EXTENSOES (as de plataforma, pg_stat_statements e supabase_vault, ja vem prontas)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. TIPOS (existem no banco, nenhuma coluna os usa; ver relatorio 04)
CREATE TYPE public.prioridade_tarefa AS ENUM ('baixa','normal','alta','urgente');
CREATE TYPE public.status_tarefa     AS ENUM ('pendente','concluida','cancelada');

-- 3. TABELAS (ordem das colunas = ordem viva)
CREATE TABLE public.empresas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome character varying(255) NOT NULL,
  subtitulo character varying(255),
  cnpj character varying(50),
  registro_profissional character varying(100),
  telefone character varying(50),
  email character varying(255),
  endereco text,
  horario_funcionamento character varying(255),
  unidade_padrao character varying(100) DEFAULT 'Consultório Principal'::character varying,
  status character varying(50) DEFAULT 'ativa'::character varying NOT NULL,
  tipo_logo character varying(50) DEFAULT 'monograma'::character varying,
  logo_url text,
  monograma_iniciais character varying(10) DEFAULT 'AR'::character varying,
  logo_altura character varying(50) DEFAULT 'padrao'::character varying,
  logo_ajuste_lateral character varying(50) DEFAULT 'total'::character varying,
  logo_fundo_header character varying(50) DEFAULT 'integrado'::character varying,
  estetica_config jsonb DEFAULT '{}'::jsonb NOT NULL,
  esteticas_salvas jsonb DEFAULT '[]'::jsonb NOT NULL,
  admin_principal_id uuid,
  admin_principal_email character varying(255),
  admin_principal_nome character varying(255),
  total_usuarios integer DEFAULT 0 NOT NULL,
  total_pacientes integer DEFAULT 0 NOT NULL,
  ativa boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT empresas_pkey PRIMARY KEY (id)
);

CREATE TABLE public.empresa_membros (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  papel character varying(50) DEFAULT 'operador'::character varying NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  usuario_nome character varying(255),
  usuario_email character varying(255),
  usuario_cargo character varying(100),
  ultimo_acesso timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT empresa_membros_pkey PRIMARY KEY (id),
  CONSTRAINT empresa_membros_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE
);

CREATE TABLE public.plataforma_admins (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  email character varying(255) NOT NULL,
  nome character varying(255),
  criado_por character varying(255),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT plataforma_admins_pkey PRIMARY KEY (id)
);

CREATE TABLE public.usuarios (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  auth_user_id uuid,
  empresa_id uuid NOT NULL,
  nome character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  senha_hash character varying(255),
  cargo character varying(100) NOT NULL,
  role character varying(50) DEFAULT 'RECEPCAO_COMERCIAL'::character varying NOT NULL,
  permissoes jsonb DEFAULT '{}'::jsonb NOT NULL,
  iniciais character varying(10),
  cor_badge character varying(50) DEFAULT '#5C3A22'::character varying,
  telefone character varying(50),
  ativo boolean DEFAULT true NOT NULL,
  ultimo_acesso timestamp with time zone,
  criado_por character varying(255),
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE
);

CREATE TABLE public.procedimentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  nome character varying(255) NOT NULL,
  categoria character varying(100) DEFAULT 'Injetáveis'::character varying NOT NULL,
  valor numeric(12,2) DEFAULT 0.00 NOT NULL,
  formatos_pagamento text DEFAULT 'À vista com 5% desc. via Pix, ou até 10x sem juros no cartão'::text,
  duracao_dias integer DEFAULT 180 NOT NULL,
  descricao text,
  orientacoes text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT procedimentos_pkey PRIMARY KEY (id),
  CONSTRAINT procedimentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE
);

CREATE TABLE public.leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  nome character varying(255) NOT NULL,
  situacao character varying(50) DEFAULT 'Em captação'::character varying NOT NULL,
  etapa_por_situacao jsonb DEFAULT '{}'::jsonb NOT NULL,
  interesse character varying(255) DEFAULT ''::character varying,
  possivel_valor numeric(12,2) DEFAULT 0.00 NOT NULL,
  status_venda character varying(50) DEFAULT 'Em processo'::character varying NOT NULL,
  data_entrada date DEFAULT CURRENT_DATE NOT NULL,
  responsavel character varying(255) DEFAULT 'Secretária 1'::character varying NOT NULL,
  data_entrada_nutricao date,
  status_grupo_nutricao character varying(50) DEFAULT 'Ativo'::character varying,
  motivo_perda text,
  data_perda date,
  situacao_perda character varying(50),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  data_agendamento date,
  horario_agendamento character varying,
  profissional_agendamento character varying,
  tipo_consulta character varying,
  unidade_agendamento character varying,
  observacoes_agendamento text,
  status_confirmacao_agendamento character varying,
  lembrete_24h_enviado boolean DEFAULT false,
  telefone text,
  canal_origem text,
  data_entrada_reativacao date,
  data_entrada_situacao jsonb DEFAULT '{}'::jsonb NOT NULL,
  data_ultimo_contato timestamp with time zone,
  data_ultimo_contato_por_situacao jsonb DEFAULT '{}'::jsonb NOT NULL,
  data_ultima_acao timestamp with time zone,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_status_venda_chk CHECK (((status_venda)::text = ANY ((ARRAY['Em processo'::character varying, 'Venda feita'::character varying, 'Perdido'::character varying])::text[]))),
  CONSTRAINT leads_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE
);

-- Observacao: a tabela viva chama-se fichas_lead (singular); as constraints
-- mantem o nome antigo fichas_leads_*.
CREATE TABLE public.fichas_lead (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  telefone character varying(50) DEFAULT ''::character varying,
  origem_lead character varying(50) DEFAULT 'WhatsApp'::character varying NOT NULL,
  data_nascimento date,
  endereco text DEFAULT ''::text,
  observacoes text DEFAULT ''::text,
  motivo_perda text,
  data_perda date,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  instagram text,
  CONSTRAINT fichas_leads_pkey PRIMARY KEY (id),
  CONSTRAINT fichas_leads_lead_id_key UNIQUE (lead_id),
  CONSTRAINT fichas_leads_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE,
  CONSTRAINT fichas_leads_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE
);

CREATE TABLE public.compras (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  procedimento_id uuid,
  data date DEFAULT CURRENT_DATE NOT NULL,
  procedimento character varying(255) NOT NULL,
  valor numeric(12,2) DEFAULT 0.00 NOT NULL,
  forma_pagamento character varying(100) DEFAULT 'Pix / Cartão'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT compras_pkey PRIMARY KEY (id),
  CONSTRAINT compras_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE,
  CONSTRAINT compras_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT compras_procedimento_id_fkey FOREIGN KEY (procedimento_id) REFERENCES public.procedimentos(id) ON DELETE SET NULL
);

CREATE TABLE public.historico_atendimentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  usuario_id uuid,
  tipo character varying(50) DEFAULT 'MENSAGEM'::character varying NOT NULL,
  canal character varying(50) DEFAULT 'WhatsApp'::character varying,
  descricao text NOT NULL,
  data_hora timestamp with time zone DEFAULT now() NOT NULL,
  status character varying(50) DEFAULT 'CONCLUIDO'::character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT historico_atendimentos_pkey PRIMARY KEY (id),
  CONSTRAINT historico_atendimentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE,
  CONSTRAINT historico_atendimentos_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT historico_atendimentos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL
);

CREATE TABLE public.tarefas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  usuario_id uuid,
  titulo character varying(255) NOT NULL,
  descricao text,
  data_vencimento timestamp with time zone NOT NULL,
  prioridade character varying(20) DEFAULT 'MEDIA'::character varying,
  status character varying(30) DEFAULT 'PENDENTE'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  usuario_responsavel_id uuid,
  situacao_origem character varying(50),
  etapa_cadencia character varying(100),
  data_agendada date,
  hora_agendada time without time zone,
  data_conclusao timestamp with time zone,
  usuario_conclusao_id uuid,
  observacao_conclusao text,
  CONSTRAINT tarefas_pkey PRIMARY KEY (id),
  CONSTRAINT tarefas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE,
  CONSTRAINT tarefas_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT tarefas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL
);

CREATE TABLE public.workflows_automacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  nome character varying(255) NOT NULL,
  evento_gatilho character varying(100) NOT NULL,
  condicoes jsonb DEFAULT '[]'::jsonb NOT NULL,
  acoes jsonb DEFAULT '[]'::jsonb NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT workflows_automacoes_pkey PRIMARY KEY (id),
  CONSTRAINT workflows_automacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE
);

CREATE TABLE public.logs_auditoria (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  usuario_id uuid,
  entidade character varying(100) NOT NULL,
  entidade_id uuid NOT NULL,
  acao character varying(50) NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip character varying(50),
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  CONSTRAINT logs_auditoria_pkey PRIMARY KEY (id),
  CONSTRAINT logs_auditoria_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE
);

CREATE TABLE public.kpis_secretaria_mensal (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  empresa_id uuid NOT NULL,
  usuario_id uuid,
  mes_referencia date NOT NULL,
  consultas_realizadas integer DEFAULT 0,
  bonus_captacao numeric(10,2) DEFAULT 0.00,
  total_agendamentos integer DEFAULT 0,
  comparecimentos_efetivos integer DEFAULT 0,
  taxa_comparecimento numeric(5,2) DEFAULT 0.00,
  bonus_comparecimento numeric(10,2) DEFAULT 0.00,
  trava_comparecimento_ok boolean DEFAULT false,
  orcamentos_pos_consulta integer DEFAULT 0,
  vendas_fechadas integer DEFAULT 0,
  taxa_fechamento numeric(5,2) DEFAULT 0.00,
  bonus_fechamento numeric(10,2) DEFAULT 0.00,
  faturamento_total numeric(10,2) DEFAULT 0.00,
  meta_faturamento numeric(10,2) DEFAULT 80000.00,
  percentual_meta numeric(5,2) DEFAULT 0.00,
  bonus_faturamento numeric(10,2) DEFAULT 0.00,
  comissao_total numeric(10,2) DEFAULT 0.00,
  status_fechamento character varying(50) DEFAULT 'em_aberto'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kpis_secretaria_mensal_pkey PRIMARY KEY (id),
  CONSTRAINT uq_empresa_mes UNIQUE (empresa_id, mes_referencia),
  CONSTRAINT kpis_secretaria_mensal_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE,
  CONSTRAINT kpis_secretaria_mensal_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- Site de consultoria (formulario publico). anon so tem INSERT por coluna (ver grants).
CREATE TABLE public.diagnosticos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  nome text NOT NULL,
  whatsapp text NOT NULL,
  cidade text NOT NULL,
  perfil text NOT NULL,
  especialidade text NOT NULL,
  faturamento text NOT NULL,
  custo_hora text NOT NULL,
  origem text NOT NULL,
  fecha text NOT NULL,
  trava text NOT NULL,
  tentou text NOT NULL,
  prazo text NOT NULL,
  consentimento boolean NOT NULL,
  pontuacao integer,
  classificacao text,
  oferta text,
  status_contato text DEFAULT 'Novo'::text NOT NULL,
  observacoes text,
  CONSTRAINT diagnosticos_pkey PRIMARY KEY (id),
  CONSTRAINT diagnosticos_cidade_check CHECK (((char_length(cidade) >= 2) AND (char_length(cidade) <= 120))),
  CONSTRAINT diagnosticos_consentimento_check CHECK ((consentimento = true)),
  CONSTRAINT diagnosticos_custo_hora_check CHECK ((custo_hora = ANY (ARRAY['Sim'::text, 'Mais ou menos'::text, 'Não'::text]))),
  CONSTRAINT diagnosticos_especialidade_check CHECK (((char_length(especialidade) >= 2) AND (char_length(especialidade) <= 120))),
  CONSTRAINT diagnosticos_faturamento_check CHECK ((faturamento = ANY (ARRAY['Até R$ 10 mil'::text, 'De R$ 10 a 30 mil'::text, 'De R$ 30 a 100 mil'::text, 'Acima de R$ 100 mil'::text]))),
  CONSTRAINT diagnosticos_fecha_check CHECK ((fecha = ANY (ARRAY['Eu'::text, 'Secretária'::text, 'Ninguém'::text]))),
  CONSTRAINT diagnosticos_nome_check CHECK (((char_length(nome) >= 2) AND (char_length(nome) <= 120))),
  CONSTRAINT diagnosticos_origem_check CHECK ((origem = ANY (ARRAY['Indicação'::text, 'Instagram'::text, 'Tráfego pago'::text, 'Convênio'::text, 'Outro'::text]))),
  CONSTRAINT diagnosticos_perfil_check CHECK ((perfil = ANY (ARRAY['Trabalho sozinho(a)'::text, 'Consultório com secretária'::text, 'Clínica com equipe'::text, 'Hospital'::text]))),
  CONSTRAINT diagnosticos_prazo_check CHECK ((prazo = ANY (ARRAY['Agora'::text, 'Em 30 dias'::text, 'Em 3 meses'::text, 'Só pesquisando'::text]))),
  CONSTRAINT diagnosticos_tentou_check CHECK ((tentou = ANY (ARRAY['Nada'::text, 'E-book'::text, 'Curso'::text, 'Consultoria'::text, 'Agência'::text]))),
  CONSTRAINT diagnosticos_trava_check CHECK ((trava = ANY (ARRAY['Agenda vazia'::text, 'Preço'::text, 'Fechamento'::text, 'Equipe'::text, 'Finanças'::text, 'Não sei'::text]))),
  CONSTRAINT diagnosticos_whatsapp_check CHECK ((whatsapp ~ '^[0-9]{10,13}$'::text))
);

-- Sobra de importacao do Firestore: sem PK, sem politica, sem uso no codigo.
CREATE TABLE public.zz_import_firestore (
  k text,
  nome text,
  emp text,
  sit text,
  etapa jsonb,
  venda text
);

-- 4. FUNCOES (corpo identico ao vivo)
CREATE FUNCTION public.set_updated_at_and_version() RETURNS trigger
  LANGUAGE plpgsql SET search_path TO '' AS $function$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$function$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
  LANGUAGE plpgsql SET search_path TO '' AS $function$
BEGIN
   NEW.updated_at = NOW();
   NEW.version = COALESCE(OLD.version, 0) + 1;
   RETURN NEW;
END;
$function$;

CREATE FUNCTION public.atualizar_agendamento_lead(p_lead_id uuid, p_agendamento_json jsonb) RETURNS void
  LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    UPDATE public.leads
    SET etapa_por_situacao = jsonb_set(
        COALESCE(etapa_por_situacao, '{}'::jsonb),
        '{_agendamento}',
        p_agendamento_json,
        true
    )
    WHERE id = p_lead_id;
END;
$function$;

CREATE FUNCTION public.diagnosticos_pontuar() RETURNS trigger
  LANGUAGE plpgsql SET search_path TO 'public' AS $function$
begin
  new.pontuacao :=
    case new.perfil when 'Trabalho sozinho(a)' then 10 when 'Consultório com secretária' then 15 when 'Clínica com equipe' then 25 else 30 end
  + case new.faturamento when 'Até R$ 10 mil' then 5 when 'De R$ 10 a 30 mil' then 10 when 'De R$ 30 a 100 mil' then 20 else 25 end
  + case new.custo_hora when 'Sim' then 0 when 'Mais ou menos' then 5 else 10 end
  + case new.fecha when 'Ninguém' then 10 else 5 end
  + case new.tentou when 'Consultoria' then 3 when 'Agência' then 3 else 5 end
  + case new.prazo when 'Agora' then 20 when 'Em 30 dias' then 15 when 'Em 3 meses' then 8 else 0 end;
  new.classificacao := case when new.pontuacao >= 70 then 'Quente' when new.pontuacao >= 40 then 'Morno' else 'Frio' end;
  new.oferta := case new.perfil when 'Trabalho sozinho(a)' then 'Assistente de IA' when 'Consultório com secretária' then 'Treinamento' when 'Clínica com equipe' then 'Consultoria' else 'Consultoria (projeto especial)' end;
  new.status_contato := 'Novo';
  new.observacoes := null;
  return new;
end $function$;

CREATE FUNCTION public.empresas_forcar_contadores() RETURNS trigger
  LANGUAGE plpgsql SET search_path TO '' AS $function$
begin
  NEW.total_pacientes := (select count(*) from public.leads l where l.empresa_id = NEW.id and l.deleted_at is null);
  NEW.total_usuarios  := (select count(*) from public.usuarios u where u.empresa_id = NEW.id and u.ativo and u.deleted_at is null);
  return NEW;
end;
$function$;

CREATE FUNCTION public.sync_lead_contato_da_ficha() RETURNS trigger
  LANGUAGE plpgsql SET search_path TO '' AS $function$
begin
  update public.leads
     set telefone = nullif(NEW.telefone, ''),
         canal_origem = nullif(NEW.origem_lead, '')
   where id = NEW.lead_id
     and (telefone is distinct from nullif(NEW.telefone, '') or canal_origem is distinct from nullif(NEW.origem_lead, ''));
  return NEW;
end;
$function$;

CREATE FUNCTION public.get_user_empresa_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select coalesce(
    (select u.empresa_id from public.usuarios u
      where u.auth_user_id = auth.uid() and u.ativo and u.deleted_at is null
      order by u.created_at limit 1),
    (select m.empresa_id from public.empresa_membros m
      where m.user_id = auth.uid() and m.ativo and m.deleted_at is null
      order by m.created_at limit 1)
  );
$function$;

CREATE FUNCTION public.is_plataforma_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (
    select 1 from public.plataforma_admins p
    where p.user_id = auth.uid() and p.deleted_at is null
  );
$function$;

CREATE FUNCTION public.is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (select 1 from public.plataforma_admins p where p.user_id = auth.uid() and p.deleted_at is null);
$function$;

CREATE FUNCTION public.recalcular_contadores_empresa(p_empresa uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $function$
  update public.empresas e set
    total_pacientes = (select count(*) from public.leads l where l.empresa_id = e.id and l.deleted_at is null),
    total_usuarios  = (select count(*) from public.usuarios u where u.empresa_id = e.id and u.ativo and u.deleted_at is null)
  where e.id = p_empresa;
$function$;

CREATE FUNCTION public.trg_recalcular_contadores() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  perform public.recalcular_contadores_empresa(coalesce(NEW.empresa_id, OLD.empresa_id));
  return null;
end;
$function$;

CREATE FUNCTION public.vincular_usuario_auth() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  if NEW.auth_user_id is null and NEW.ativo and NEW.deleted_at is null then
    select a.id into NEW.auth_user_id
    from auth.users a
    where lower(a.email) = lower(NEW.email) and a.email_confirmed_at is not null
    limit 1;
  end if;
  return NEW;
end;
$function$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  insert into public.usuarios (id, empresa_id, nome, email, cargo, ativo, auth_user_id)
  select NEW.id, e.id,
         coalesce(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
         NEW.email, 'atendente', false, NEW.id
  from public.empresas e
  where e.deleted_at is null
  order by e.created_at
  limit 1
  on conflict (id) do nothing;
  return NEW;
end;
$function$;

-- 5. INDICES (alem dos das PKs/UNIQUE acima)
CREATE INDEX idx_compras_lead ON public.compras USING btree (lead_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_empresa_membros_empresa ON public.empresa_membros USING btree (empresa_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_empresas_active ON public.empresas USING btree (id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_fichas_lead_id ON public.fichas_lead USING btree (lead_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_atendimentos_lead ON public.historico_atendimentos USING btree (lead_id, data_hora DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_leads_data_reativacao ON public.leads USING btree (empresa_id, data_entrada_reativacao) WHERE (deleted_at IS NULL);
CREATE INDEX idx_leads_empresa ON public.leads USING btree (empresa_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_leads_situacao ON public.leads USING btree (empresa_id, situacao) WHERE (deleted_at IS NULL);
CREATE INDEX idx_procedimentos_empresa ON public.procedimentos USING btree (empresa_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_usuarios_empresa ON public.usuarios USING btree (empresa_id) WHERE (deleted_at IS NULL);

-- 6. TRIGGERS
CREATE TRIGGER trg_compras_up BEFORE UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();
CREATE TRIGGER diagnosticos_pontuar_trg BEFORE INSERT ON public.diagnosticos FOR EACH ROW EXECUTE FUNCTION public.diagnosticos_pontuar();
CREATE TRIGGER trg_membros_up BEFORE UPDATE ON public.empresa_membros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();
CREATE TRIGGER trg_empresas_contadores BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.empresas_forcar_contadores();
CREATE TRIGGER trg_empresas_up BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();
CREATE TRIGGER trg_fichas_sync_lead AFTER INSERT OR UPDATE OF telefone, origem_lead ON public.fichas_lead FOR EACH ROW EXECUTE FUNCTION public.sync_lead_contato_da_ficha();
CREATE TRIGGER trg_fichas_up BEFORE UPDATE ON public.fichas_lead FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();
CREATE TRIGGER trg_leads_contadores AFTER INSERT OR DELETE OR UPDATE OF deleted_at, empresa_id ON public.leads FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_contadores();
CREATE TRIGGER trg_leads_up BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();
CREATE TRIGGER trg_procedimentos_up BEFORE UPDATE ON public.procedimentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();
CREATE TRIGGER trg_usuarios_contadores AFTER INSERT OR DELETE OR UPDATE OF deleted_at, ativo, empresa_id ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_contadores();
CREATE TRIGGER trg_usuarios_up BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();
CREATE TRIGGER trg_usuarios_vincular_auth BEFORE INSERT OR UPDATE OF email, ativo ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.vincular_usuario_auth();
-- Gatilho no schema auth (dono supabase_auth_admin; criado pelo painel/migracao 02)
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- NAO ha trigger updated_at/version em: plataforma_admins, historico_atendimentos,
-- tarefas, workflows_automacoes, logs_auditoria, kpis_secretaria_mensal, diagnosticos.

-- 7. VIEWS (security_invoker = on: respeitam o RLS de quem consulta)
CREATE VIEW public.vw_agendamentos WITH (security_invoker = on) AS
 SELECT id AS lead_id,
    empresa_id,
    nome AS nome_paciente,
    responsavel AS especialista_lead,
    ((etapa_por_situacao -> '_agendamento'::text) ->> 'dataAgendamento'::text)::date AS data_agendamento,
    (etapa_por_situacao -> '_agendamento'::text) ->> 'horarioAgendamento'::text AS horario_agendamento,
    (etapa_por_situacao -> '_agendamento'::text) ->> 'profissionalAgendamento'::text AS profissional,
    (etapa_por_situacao -> '_agendamento'::text) ->> 'tipoConsulta'::text AS tipo_consulta,
    (etapa_por_situacao -> '_agendamento'::text) ->> 'unidadeAgendamento'::text AS unidade,
    (etapa_por_situacao -> '_agendamento'::text) ->> 'statusConfirmacaoAgendamento'::text AS status_confirmacao,
    (etapa_por_situacao -> '_agendamento'::text) ->> 'observacoesAgendamento'::text AS observacoes,
    ((etapa_por_situacao -> '_agendamento'::text) ->> 'lembrete24hEnviado'::text)::boolean AS lembrete_24h_enviado,
    (etapa_por_situacao -> '_agendamento'::text) ->> 'dataEnvioLembrete24h'::text AS data_envio_lembrete,
    (etapa_por_situacao -> '_agendamento'::text) ->> 'mensagemLembrete24hEnviadaPor'::text AS lembrete_enviado_por,
    updated_at
   FROM public.leads l
  WHERE deleted_at IS NULL AND etapa_por_situacao ? '_agendamento'::text;

CREATE VIEW public.vw_indicadores_tarefas WITH (security_invoker = on) AS
 SELECT empresa_id,
    count(*) FILTER (WHERE status::text = 'pendente'::text AND data_agendada = CURRENT_DATE) AS tarefas_hoje,
    count(*) FILTER (WHERE status::text = 'pendente'::text AND data_agendada < CURRENT_DATE) AS tarefas_atrasadas,
    count(*) FILTER (WHERE status::text = 'pendente'::text AND data_agendada > CURRENT_DATE) AS tarefas_futuras,
    count(*) FILTER (WHERE status::text = 'concluida'::text) AS tarefas_concluidas,
    count(*) FILTER (WHERE status::text = 'pendente'::text) AS total_pendentes
   FROM public.tarefas
  WHERE deleted_at IS NULL
  GROUP BY empresa_id;

-- 8. RLS (todas as 15 tabelas com RLS ligado, nenhuma FORCE)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plataforma_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis_secretaria_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zz_import_firestore ENABLE ROW LEVEL SECURITY;

-- 9. POLITICAS (26, todas PERMISSIVE; "ALL" salvo indicado)
CREATE POLICY admin_plataforma_compras ON public.compras TO authenticated USING (is_plataforma_admin()) WITH CHECK (is_plataforma_admin());
CREATE POLICY tenant_compras ON public.compras TO authenticated USING ((empresa_id = get_user_empresa_id())) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY "site pode enviar diagnostico" ON public.diagnosticos FOR INSERT TO anon WITH CHECK ((consentimento = true));
CREATE POLICY membros_mesma_empresa ON public.empresa_membros TO authenticated USING (((empresa_id = get_user_empresa_id()) AND (deleted_at IS NULL))) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY membros_platform_admin ON public.empresa_membros TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());
CREATE POLICY empresas_platform_admin ON public.empresas TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());
CREATE POLICY "Acesso à própria empresa" ON public.empresas FOR SELECT TO authenticated USING ((id = get_user_empresa_id()));
CREATE POLICY empresas_update_propria ON public.empresas FOR UPDATE TO authenticated USING ((id = get_user_empresa_id())) WITH CHECK ((id = get_user_empresa_id()));
CREATE POLICY "Acesso total por empresa (fichas_lead)" ON public.fichas_lead TO authenticated USING ((empresa_id = get_user_empresa_id())) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY admin_plataforma_fichas_lead ON public.fichas_lead TO authenticated USING (is_plataforma_admin()) WITH CHECK (is_plataforma_admin());
CREATE POLICY admin_plataforma_historico ON public.historico_atendimentos TO authenticated USING (is_plataforma_admin()) WITH CHECK (is_plataforma_admin());
CREATE POLICY tenant_historico_atendimentos ON public.historico_atendimentos TO authenticated USING ((empresa_id = get_user_empresa_id())) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY "Acesso total por empresa (kpis_secretaria_mensal)" ON public.kpis_secretaria_mensal TO authenticated USING ((empresa_id = get_user_empresa_id())) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY "Acesso total por empresa (leads)" ON public.leads TO authenticated USING ((empresa_id = get_user_empresa_id())) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY admin_plataforma_leads ON public.leads TO authenticated USING (is_plataforma_admin()) WITH CHECK (is_plataforma_admin());
CREATE POLICY tenant_logs_auditoria_insert ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY tenant_logs_auditoria_select ON public.logs_auditoria FOR SELECT TO authenticated USING ((empresa_id = get_user_empresa_id()));
CREATE POLICY plataforma_admins_platform_admin ON public.plataforma_admins TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());
CREATE POLICY admin_plataforma_procedimentos ON public.procedimentos TO authenticated USING (is_plataforma_admin()) WITH CHECK (is_plataforma_admin());
CREATE POLICY tenant_procedimentos ON public.procedimentos TO authenticated USING (((empresa_id = get_user_empresa_id()) AND (deleted_at IS NULL))) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY admin_plataforma_tarefas ON public.tarefas TO authenticated USING (is_plataforma_admin()) WITH CHECK (is_plataforma_admin());
CREATE POLICY tenant_tarefas ON public.tarefas TO authenticated USING ((empresa_id = get_user_empresa_id())) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY "Leitura e edição de usuários da mesma empresa" ON public.usuarios TO authenticated USING ((empresa_id = get_user_empresa_id())) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY usuarios_mesma_empresa ON public.usuarios TO authenticated USING (((empresa_id = get_user_empresa_id()) AND (deleted_at IS NULL))) WITH CHECK ((empresa_id = get_user_empresa_id()));
CREATE POLICY usuarios_platform_admin ON public.usuarios TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());
CREATE POLICY tenant_workflows_automacoes ON public.workflows_automacoes TO authenticated USING (((empresa_id = get_user_empresa_id()) AND (deleted_at IS NULL))) WITH CHECK ((empresa_id = get_user_empresa_id()));
-- zz_import_firestore: RLS ligado e NENHUMA politica (acesso negado a todos, exceto service_role/postgres).

-- 10. GRANTS (ACLs vivas)
-- Tabelas e views: authenticated e service_role com ALL; anon sem nada.
GRANT ALL ON TABLE public.empresas, public.empresa_membros, public.plataforma_admins, public.usuarios,
  public.procedimentos, public.leads, public.fichas_lead, public.compras, public.historico_atendimentos,
  public.tarefas, public.workflows_automacoes, public.logs_auditoria, public.kpis_secretaria_mensal,
  public.zz_import_firestore, public.vw_agendamentos, public.vw_indicadores_tarefas
  TO authenticated, service_role;
-- diagnosticos: service_role ALL; anon so INSERT nas 13 colunas do formulario; authenticated NADA.
GRANT ALL ON TABLE public.diagnosticos TO service_role;
GRANT INSERT (nome, whatsapp, cidade, perfil, especialidade, faturamento, custo_hora, origem, fecha, trava, tentou, prazo, consentimento)
  ON public.diagnosticos TO anon;
-- Funcoes: sem EXECUTE para PUBLIC e anon.
REVOKE ALL ON FUNCTION public.set_updated_at_and_version(), public.update_updated_at_column(),
  public.atualizar_agendamento_lead(uuid, jsonb), public.diagnosticos_pontuar(), public.empresas_forcar_contadores(),
  public.sync_lead_contato_da_ficha(), public.get_user_empresa_id(), public.is_plataforma_admin(), public.is_platform_admin(),
  public.recalcular_contadores_empresa(uuid), public.trg_recalcular_contadores(), public.vincular_usuario_auth(),
  public.handle_new_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_updated_at_and_version(), public.update_updated_at_column(),
  public.atualizar_agendamento_lead(uuid, jsonb), public.diagnosticos_pontuar(), public.empresas_forcar_contadores(),
  public.sync_lead_contato_da_ficha(), public.get_user_empresa_id(), public.is_plataforma_admin(), public.is_platform_admin()
  TO authenticated, service_role;
-- Somente service_role (e dono): as 4 funcoes SECURITY DEFINER de gatilho/manutencao.
GRANT EXECUTE ON FUNCTION public.recalcular_contadores_empresa(uuid), public.trg_recalcular_contadores(),
  public.vincular_usuario_auth(), public.handle_new_user() TO service_role;
REVOKE EXECUTE ON FUNCTION public.recalcular_contadores_empresa(uuid), public.trg_recalcular_contadores(),
  public.vincular_usuario_auth(), public.handle_new_user() FROM authenticated;
-- Privilegios padrao do dono postgres no schema public (futuras tabelas/funcoes/sequencias).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 11. REALTIME E REPLICA IDENTITY (12 tabelas, mesmas do repositorio, com fichas_lead no singular)
ALTER PUBLICATION supabase_realtime ADD TABLE public.empresas, public.empresa_membros, public.plataforma_admins,
  public.usuarios, public.procedimentos, public.leads, public.fichas_lead, public.compras,
  public.historico_atendimentos, public.tarefas, public.workflows_automacoes, public.logs_auditoria;
ALTER TABLE public.empresas REPLICA IDENTITY FULL;
ALTER TABLE public.empresa_membros REPLICA IDENTITY FULL;
ALTER TABLE public.plataforma_admins REPLICA IDENTITY FULL;
ALTER TABLE public.usuarios REPLICA IDENTITY FULL;
ALTER TABLE public.procedimentos REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.fichas_lead REPLICA IDENTITY FULL;
ALTER TABLE public.compras REPLICA IDENTITY FULL;
ALTER TABLE public.historico_atendimentos REPLICA IDENTITY FULL;
ALTER TABLE public.tarefas REPLICA IDENTITY FULL;
ALTER TABLE public.workflows_automacoes REPLICA IDENTITY FULL;
ALTER TABLE public.logs_auditoria REPLICA IDENTITY FULL;

-- FORA DESTE ARQUIVO (vive fora do schema public):
--  * Edge Function gerenciar-colaborador (v1, verify_jwt=true), codigo ainda nao versionado no repositorio.
--  * Configuracao do Auth (protecao de senha vazada esta desligada).
