-- ============================================================================
-- 07 | REMOCAO definitiva de arquivo.zz_import_firestore (fase 2). SO apos: 02 aplicada ha >= 30 dias, Carlos ter
--      aprovado por escrito e existir dump guardado FORA do repositorio (contem nomes de pacientes).
-- RASCUNHO, NAO APLICADO. Risco: baixo; reversao so com o dump (por isso o gate).
-- ============================================================================
-- Gate (rodar antes; esperado: tabela existe, 57 linhas):
--   select count(*) from arquivo.zz_import_firestore;
-- Dump (fora do repo, no terminal da maquina de Carlos):
--   supabase db dump --data-only -t arquivo.zz_import_firestore -f ~/backup/zz_import_firestore_20261122.sql
DROP TABLE arquivo.zz_import_firestore;
-- DROP SCHEMA arquivo;  -- opcional, se nao for reutilizado

-- ===== TESTE =====
-- select to_regclass('arquivo.zz_import_firestore');  -- NULL
-- harness antes/depois: diff vazio.
-- ===== REVERSAO =====
-- Recriar a tabela (secao 3 do baseline, sem PK) em arquivo e restaurar o dump: psql -f ~/backup/zz_import_firestore_20261122.sql
