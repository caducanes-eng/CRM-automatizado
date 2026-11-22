-- ============================================================================
-- 03 | Tirar get_user_empresa_id / is_plataforma_admin / is_platform_admin da API publica (schema private)
-- RASCUNHO, NAO APLICADO. Risco: medio (toca todas as politicas), por isso vem antes da consolidacao e com harness.
--
-- ANALISE (a pergunta do Carlos):
--  * As 3 funcoes sao SECURITY DEFINER e o aviso authenticated_security_definer_function_executable (3 WARN)
--    aponta que qualquer usuario logado as chama por /rest/v1/rpc/...
--  * NAO da para simplesmente REVOKE EXECUTE de authenticated: as politicas RLS avaliam essas funcoes com o papel
--    de quem consulta; sem EXECUTE, toda consulta de authenticated falha com "permission denied for function".
--  * NAO da para trocar para SECURITY INVOKER: get_user_empresa_id le public.usuarios, cuja politica chama a propria
--    funcao (recursao infinita); o mesmo vale para is_*_admin lendo plataforma_admins.
--  * Solucao padrao: mover para um schema que a API nao expoe (private). authenticated mantem EXECUTE (as politicas
--    seguem funcionando), mas o PostgREST deixa de publicar /rpc/ dessas funcoes. As politicas guardam a funcao
--    por OID, entao ALTER FUNCTION ... SET SCHEMA nao as quebra.
--  * Fato: o front-end (src/) nao chama essas funcoes via rpc, e a Edge Function gerenciar-colaborador usa
--    service_role lendo as tabelas direto. Unico rpc do app: atualizar_agendamento_lead (permanece em public).
--  * Pre-requisito: confirmar em Settings > API > Exposed schemas que "private" nao esta na lista.
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.get_user_empresa_id() SET SCHEMA private;
ALTER FUNCTION public.is_plataforma_admin() SET SCHEMA private;
ALTER FUNCTION public.is_platform_admin()   SET SCHEMA private;

-- Garantir ACL (SET SCHEMA preserva; reafirmado de forma explicita):
REVOKE ALL ON FUNCTION private.get_user_empresa_id(), private.is_plataforma_admin(), private.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_user_empresa_id(), private.is_plataforma_admin(), private.is_platform_admin() TO authenticated, service_role;

-- ===== TESTE =====
-- 1) harness antes/depois: diff vazio (inclui a linha get_user_empresa_id/igual_a_regra = true para cada usuario).
-- 2) select p.proname, p.pronamespace::regnamespace from pg_proc p where proname in ('get_user_empresa_id','is_plataforma_admin','is_platform_admin');
--    esperado: as 3 em private.
-- 3) select polname, pg_get_expr(polqual, polrelid) from pg_policy where polrelid='public.leads'::regclass;
--    esperado: aparece private.get_user_empresa_id() e as politicas continuam la.
-- 4) get_advisors(security): authenticated_security_definer_function_executable some para as 3.
-- 5) Via API com um JWT de teste: POST /rest/v1/rpc/get_user_empresa_id -> 404; GET /rest/v1/leads -> mesmas linhas de antes.
-- 6) Login e abertura do CRM de uma clinica em branch (fumaca manual de 5 minutos).
-- ===== REVERSAO =====
-- ALTER FUNCTION private.get_user_empresa_id() SET SCHEMA public;
-- ALTER FUNCTION private.is_plataforma_admin() SET SCHEMA public;
-- ALTER FUNCTION private.is_platform_admin()   SET SCHEMA public;
-- (as politicas acompanham por OID; nada mais a refazer)
