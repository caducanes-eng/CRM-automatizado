-- ============================================================================
-- 06 | Reduzir EXECUTE em public: funcoes que so servem de gatilho nao precisam ser chamaveis por authenticated
-- RASCUNHO, NAO APLICADO. Risco: baixo. Exige 03 e 05 aplicadas.
-- Estado vivo (has_function_privilege): anon e PUBLIC ja NAO executam nenhuma funcao de public; o que sobra e
-- authenticated em 7 funcoes de public. Avaliacao funcao a funcao:
--  * set_updated_at_and_version, empresas_forcar_contadores, sync_lead_contato_da_ficha, diagnosticos_pontuar:
--    SECURITY INVOKER, retornam trigger. O Postgres checa EXECUTE na CRIACAO do trigger, nao quando ele dispara
--    (prova viva: trg_recalcular_contadores e vincular_usuario_auth nao tem EXECUTE para authenticated e
--    disparam em todo insert de lead/usuario). Como RPC elas so dariam erro. Revogar e seguro.
--  * atualizar_agendamento_lead: e chamada pelo app (supabaseService.ts:865). MANTER para authenticated.
--    E SECURITY INVOKER e o UPDATE passa pelo RLS de leads; nao e risco de escalada.
--  * handle_new_user, recalcular_contadores_empresa, trg_recalcular_contadores, vincular_usuario_auth
--    (SECURITY DEFINER): ja sem EXECUTE para authenticated/anon. Nada a fazer.
--  * get_user_empresa_id e is_plataforma_admin: ver 03 (precisam ficar executaveis, agora fora da API).
-- Alem disso: privilegios padrao futuros. Hoje toda funcao nova do dono postgres em public nasce executavel por
-- authenticated (ACL padrao). Revoga-se esse padrao; RPCs novas passam a exigir GRANT explicito.
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.set_updated_at_and_version(), public.empresas_forcar_contadores(),
  public.sync_lead_contato_da_ficha(), public.diagnosticos_pontuar() FROM authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

-- ===== TESTE =====
-- 1) harness antes/depois: diff vazio.
-- 2) Em branch, como authenticated de uma clinica: UPDATE leads (set_updated_at_and_version), UPDATE empresas
--    (empresas_forcar_contadores), UPDATE fichas_lead set telefone=... (sync_lead_contato_da_ficha) funcionam e
--    version incrementa; como anon: INSERT em diagnosticos (13 colunas) funciona e preenche pontuacao/classificacao.
-- 3) Chamar atualizar_agendamento_lead pela tela de agendamento em branch.
-- 4) get_advisors(security): sem novos avisos.
-- ===== REVERSAO =====
-- GRANT EXECUTE ON FUNCTION public.set_updated_at_and_version(), public.empresas_forcar_contadores(),
--   public.sync_lead_contato_da_ficha(), public.diagnosticos_pontuar() TO authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
