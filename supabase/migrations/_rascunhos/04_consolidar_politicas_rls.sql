-- ============================================================================
-- 04 | Consolidar politicas duplicadas (34 avisos multiple_permissive_policies) e unificar o admin da plataforma
-- RASCUNHO, NAO APLICADO. Risco: ALTO por tocar o isolamento entre clinicas. Exige 03 aplicada antes.
-- Regra de equivalencia: politicas PERMISSIVE para o mesmo papel/acao combinam por OR (USING e WITH CHECK).
-- Portanto  A OR B  numa politica unica e identica a duas politicas A e B. Nada de predicado novo.
-- Mudancas alem da fusao: (a) is_platform_admin -> is_plataforma_admin (mesmo corpo, ver 05);
-- (b) get_user_empresa_id()/is_plataforma_admin() embrulhados em (select ...) para o planejador avaliar uma vez
--     por consulta e nao por linha (mesmo resultado: funcoes STABLE e auth.uid() constante na consulta).
-- Cada tabela e criada com nome novo e a antiga removida na mesma transacao (sem janela sem politica).
-- NAO e corrigido aqui, de proposito (comportamento preservado): usuarios permite a qualquer membro gravar
-- role/permissoes; empresas permite UPDATE de qualquer coluna pela propria clinica; tenants veem usuarios
-- soft-deletados. Isso e escopo do relatorio de seguranca.
-- ============================================================================
BEGIN;

-- compras, fichas_lead, historico_atendimentos, leads, tarefas: tenant OR admin, mesma forma
CREATE POLICY compras_acesso ON public.compras TO authenticated
  USING (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()))
  WITH CHECK (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
DROP POLICY admin_plataforma_compras ON public.compras;
DROP POLICY tenant_compras ON public.compras;

CREATE POLICY fichas_lead_acesso ON public.fichas_lead TO authenticated
  USING (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()))
  WITH CHECK (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
DROP POLICY admin_plataforma_fichas_lead ON public.fichas_lead;
DROP POLICY "Acesso total por empresa (fichas_lead)" ON public.fichas_lead;

CREATE POLICY historico_atendimentos_acesso ON public.historico_atendimentos TO authenticated
  USING (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()))
  WITH CHECK (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
DROP POLICY admin_plataforma_historico ON public.historico_atendimentos;
DROP POLICY tenant_historico_atendimentos ON public.historico_atendimentos;

CREATE POLICY leads_acesso ON public.leads TO authenticated
  USING (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()))
  WITH CHECK (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
DROP POLICY admin_plataforma_leads ON public.leads;
DROP POLICY "Acesso total por empresa (leads)" ON public.leads;

CREATE POLICY tarefas_acesso ON public.tarefas TO authenticated
  USING (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()))
  WITH CHECK (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
DROP POLICY admin_plataforma_tarefas ON public.tarefas;
DROP POLICY tenant_tarefas ON public.tarefas;

-- procedimentos e empresa_membros: o tenant so ENXERGA linhas nao apagadas (USING), mas o admin ve tudo; WITH CHECK sem deleted_at
CREATE POLICY procedimentos_acesso ON public.procedimentos TO authenticated
  USING ((empresa_id = (select private.get_user_empresa_id()) AND deleted_at IS NULL) OR (select private.is_plataforma_admin()))
  WITH CHECK (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
DROP POLICY admin_plataforma_procedimentos ON public.procedimentos;
DROP POLICY tenant_procedimentos ON public.procedimentos;

CREATE POLICY empresa_membros_acesso ON public.empresa_membros TO authenticated
  USING ((empresa_id = (select private.get_user_empresa_id()) AND deleted_at IS NULL) OR (select private.is_plataforma_admin()))
  WITH CHECK (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
DROP POLICY membros_mesma_empresa ON public.empresa_membros;
DROP POLICY membros_platform_admin ON public.empresa_membros;

-- usuarios: 3 politicas; "mesma_empresa (deleted_at IS NULL)" e subconjunto de "Leitura e edicao..." (sem filtro),
-- logo o OR das tres = (empresa_id = tenant) OR admin. Preserva que usuarios soft-deletados continuam visiveis ao tenant.
CREATE POLICY usuarios_acesso ON public.usuarios TO authenticated
  USING (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()))
  WITH CHECK (empresa_id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
DROP POLICY "Leitura e edição de usuários da mesma empresa" ON public.usuarios;
DROP POLICY usuarios_mesma_empresa ON public.usuarios;
DROP POLICY usuarios_platform_admin ON public.usuarios;

-- empresas: por acao (SELECT: propria OR admin; INSERT/DELETE: so admin; UPDATE: propria OR admin)
CREATE POLICY empresas_select ON public.empresas FOR SELECT TO authenticated
  USING (id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
CREATE POLICY empresas_insert ON public.empresas FOR INSERT TO authenticated
  WITH CHECK ((select private.is_plataforma_admin()));
CREATE POLICY empresas_update ON public.empresas FOR UPDATE TO authenticated
  USING (id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()))
  WITH CHECK (id = (select private.get_user_empresa_id()) OR (select private.is_plataforma_admin()));
CREATE POLICY empresas_delete ON public.empresas FOR DELETE TO authenticated
  USING ((select private.is_plataforma_admin()));
DROP POLICY empresas_platform_admin ON public.empresas;
DROP POLICY "Acesso à própria empresa" ON public.empresas;
DROP POLICY empresas_update_propria ON public.empresas;

-- plataforma_admins: politica unica, so troca a funcao (unificacao de nome)
CREATE POLICY plataforma_admins_acesso ON public.plataforma_admins TO authenticated
  USING ((select private.is_plataforma_admin())) WITH CHECK ((select private.is_plataforma_admin()));
DROP POLICY plataforma_admins_platform_admin ON public.plataforma_admins;

-- Nao mexem: workflows_automacoes (tenant_workflows_automacoes), kpis_secretaria_mensal, logs_auditoria (2 acoes
-- distintas), diagnosticos (anon INSERT). Ja sao uma politica por acao e nao geram aviso.
COMMIT;

-- ===== TESTE =====
-- 1) 00_harness_comportamento.sql antes e depois: diff vazio. E o teste que importa: mesmas linhas visiveis por usuario,
--    mesmo bloqueio de gravar em outra empresa, admin da plataforma continua vendo e gravando tudo, anon continua so inserindo diagnostico.
-- 2) get_advisors(performance): multiple_permissive_policies = 0 (eram 34).
-- 3) Garantir que nenhuma politica referencia mais is_platform_admin (pre-condicao da 05):
--      select polrelid::regclass, polname from pg_policy where pg_get_expr(polqual,polrelid) like '%is_platform_admin%'
--         or pg_get_expr(polwithcheck,polrelid) like '%is_platform_admin%';   -- esperado 0 linhas
-- 4) Contagem de politicas: antes 26, depois 18 em public (compras 1, fichas_lead 1, historico 1, leads 1, tarefas 1,
--    procedimentos 1, empresa_membros 1, usuarios 1, empresas 4, plataforma_admins 1, workflows 1, kpis 1, logs 2, diagnosticos 1) = 18.
--    (Conferir: select count(*) from pg_policies where schemaname='public'; esperado 18.)
-- ===== REVERSAO (recriar as 26 originais; texto exato em 00000000000000_baseline_vivo.sql, secao 9) =====
-- BEGIN;
--   DROP POLICY compras_acesso ON public.compras; DROP POLICY fichas_lead_acesso ON public.fichas_lead;
--   DROP POLICY historico_atendimentos_acesso ON public.historico_atendimentos; DROP POLICY leads_acesso ON public.leads;
--   DROP POLICY tarefas_acesso ON public.tarefas; DROP POLICY procedimentos_acesso ON public.procedimentos;
--   DROP POLICY empresa_membros_acesso ON public.empresa_membros; DROP POLICY usuarios_acesso ON public.usuarios;
--   DROP POLICY empresas_select ON public.empresas; DROP POLICY empresas_insert ON public.empresas;
--   DROP POLICY empresas_update ON public.empresas; DROP POLICY empresas_delete ON public.empresas;
--   DROP POLICY plataforma_admins_acesso ON public.plataforma_admins;
--   -- depois executar a secao "9. POLITICAS" do baseline, trocando get_user_empresa_id()/is_*admin() por private.<nome>()
--   -- se a migracao 03 continuar aplicada.
-- COMMIT;
