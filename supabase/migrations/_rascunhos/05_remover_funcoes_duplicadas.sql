-- ============================================================================
-- 05 | Remover is_platform_admin (duplicada de is_plataforma_admin) e update_updated_at_column (duplicada de
--      set_updated_at_and_version, sem nenhum trigger que a use)
-- RASCUNHO, NAO APLICADO. Risco: baixo SE a 04 ja trocou as 4 politicas. O DROP sem CASCADE falha se ainda houver
-- dependencia (politica, trigger, view): a falha e o proprio teste de seguranca.
-- Nome mantido: is_plataforma_admin (casa com a tabela plataforma_admins e com a maioria das politicas antigas, 8 de 12).
-- Corpos identicos (SELECT em pg_proc): exists(select 1 from plataforma_admins where user_id = auth.uid() and deleted_at is null).
-- Fato: nenhum trigger vivo usa update_updated_at_column (todos usam set_updated_at_and_version); src/ nao as cita.
-- ============================================================================
DROP FUNCTION private.is_platform_admin();
DROP FUNCTION public.update_updated_at_column();

-- ===== TESTE =====
-- 1) harness antes/depois: diff vazio.
-- 2) select proname, pronamespace::regnamespace from pg_proc where proname in ('is_platform_admin','is_plataforma_admin','update_updated_at_column');
--    esperado: so private.is_plataforma_admin.
-- 3) Em branch: UPDATE em uma linha de leads como authenticated e conferir version+1 e updated_at novo (trigger segue funcionando).
-- ===== REVERSAO =====
-- CREATE FUNCTION private.is_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
--   AS $$ select exists (select 1 from public.plataforma_admins p where p.user_id = auth.uid() and p.deleted_at is null); $$;
-- REVOKE ALL ON FUNCTION private.is_platform_admin() FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated, service_role;
-- CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
--   AS $$ BEGIN NEW.updated_at = NOW(); NEW.version = COALESCE(OLD.version, 0) + 1; RETURN NEW; END; $$;
-- REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role;
