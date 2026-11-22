-- ============================================================================
-- 01 | Indices nas 11 FKs sem indice (aviso unindexed_foreign_keys do get_advisors)
-- RASCUNHO, NAO APLICADO. Risco: baixo. Efeito em resultados de consulta: nenhum.
-- Por que indices cheios (sem WHERE deleted_at IS NULL): a FK ON DELETE CASCADE / SET NULL precisa achar
-- tambem as linhas apagadas por soft delete; indice parcial nao cobre essas linhas.
-- Tabelas pequenas (maior: leads/fichas ~370 linhas), bloqueio de escrita de milissegundos.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_fk_compras_empresa_id            ON public.compras (empresa_id);
CREATE INDEX IF NOT EXISTS idx_fk_compras_procedimento_id       ON public.compras (procedimento_id);
CREATE INDEX IF NOT EXISTS idx_fk_fichas_lead_empresa_id        ON public.fichas_lead (empresa_id);
CREATE INDEX IF NOT EXISTS idx_fk_historico_empresa_id          ON public.historico_atendimentos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_fk_historico_usuario_id          ON public.historico_atendimentos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_fk_kpis_usuario_id               ON public.kpis_secretaria_mensal (usuario_id);
CREATE INDEX IF NOT EXISTS idx_fk_logs_auditoria_empresa_id     ON public.logs_auditoria (empresa_id);
CREATE INDEX IF NOT EXISTS idx_fk_tarefas_empresa_id            ON public.tarefas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_fk_tarefas_lead_id               ON public.tarefas (lead_id);
CREATE INDEX IF NOT EXISTS idx_fk_tarefas_usuario_id            ON public.tarefas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_fk_workflows_empresa_id          ON public.workflows_automacoes (empresa_id);

-- ===== TESTE (rodar a parte, em branch) =====
-- 1) 00_harness_comportamento.sql antes e depois: diff vazio.
-- 2) Cobertura (esperado 0 linhas depois; 11 antes):
--   select c.conrelid::regclass, c.conname from pg_constraint c
--    where c.contype='f' and c.connamespace='public'::regnamespace
--      and not exists (select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid
--                      and (i.indkey::int2[])[0:cardinality(c.conkey)-1] = c.conkey);
-- 3) get_advisors(performance): unindexed_foreign_keys deve sumir. (Os avisos unused_index passam a aparecer para
--    os indices novos ate haver uso; ignorar.)
-- ===== REVERSAO (sem perda de dado) =====
-- DROP INDEX IF EXISTS public.idx_fk_compras_empresa_id, public.idx_fk_compras_procedimento_id,
--   public.idx_fk_fichas_lead_empresa_id, public.idx_fk_historico_empresa_id, public.idx_fk_historico_usuario_id,
--   public.idx_fk_kpis_usuario_id, public.idx_fk_logs_auditoria_empresa_id, public.idx_fk_tarefas_empresa_id,
--   public.idx_fk_tarefas_lead_id, public.idx_fk_tarefas_usuario_id, public.idx_fk_workflows_empresa_id;
