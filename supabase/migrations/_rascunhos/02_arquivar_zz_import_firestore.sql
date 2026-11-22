-- ============================================================================
-- 02 | Tirar zz_import_firestore do schema public (fase 1 de 2: ARQUIVAR; a remocao e a migracao 07)
-- RASCUNHO, NAO APLICADO. Risco: baixo. Reversivel: sim (move de volta).
-- Fatos (SELECT): 57 linhas, 2 empresas distintas, 21 linhas com k = id de lead existente, 36 sem correspondente.
-- A tabela tem nomes (dado pessoal): nunca copiar para o repositorio. Nenhum codigo em src/ a referencia
-- (grep). Sem PK, sem politica de RLS, mas com GRANT ALL para authenticated (negado so pelo RLS sem politica).
-- Pre-requisito humano: Carlos confirma que as 36 linhas sem correspondente nao sao leads pendentes de importar.
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS arquivo;
REVOKE ALL ON SCHEMA arquivo FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA arquivo TO service_role;

ALTER TABLE public.zz_import_firestore SET SCHEMA arquivo;
REVOKE ALL ON TABLE arquivo.zz_import_firestore FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE arquivo.zz_import_firestore IS 'Sobra da importacao do Firestore, arquivada em 22/11/2026. Remover pela migracao 07 apos retencao e confirmacao.';

-- ===== TESTE =====
-- 1) harness antes/depois: diff vazio (a tabela nao esta na lista de leitura de nenhum fluxo do app).
-- 2) select count(*) from arquivo.zz_import_firestore;            -- esperado 57 (como postgres)
-- 3) select has_table_privilege('authenticated','arquivo.zz_import_firestore','SELECT');  -- esperado false
-- 4) select to_regclass('public.zz_import_firestore');             -- esperado NULL
-- 5) get_advisors(security): rls_enabled_no_policy some; get_advisors(performance): no_primary_key some.
-- 6) grep -rn zz_import_firestore src/ supabase/functions  -> vazio (ja verificado hoje).
-- ===== REVERSAO =====
-- ALTER TABLE arquivo.zz_import_firestore SET SCHEMA public;
-- GRANT ALL ON TABLE public.zz_import_firestore TO authenticated, service_role;
-- (opcional) DROP SCHEMA arquivo;
