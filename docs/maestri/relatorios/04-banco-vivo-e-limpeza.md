# 04. Banco vivo, deriva e limpeza segura (Arquiteto)

Data: 22/11/2026. Projeto Supabase `msiuqiyndnvpwkpkaglm`. Branch `maestri/limpeza-backend`.
Nada foi aplicado no banco. Só li (list_tables, list_migrations, get_advisors, get_edge_function e SELECTs em `pg_catalog`, mais `count(*)` nas tabelas). Nenhum dado de paciente foi copiado para o repositório.

Entregáveis:
- `supabase/migrations/00000000000000_baseline_vivo.sql` (foto do DDL vivo; rascunho, não aplicar)
- `supabase/migrations/_rascunhos/00_harness_comportamento.sql` a `07_remover_zz_import_firestore.sql` (cada migração traz TESTE e REVERSÃO no próprio arquivo)

Convenção: **[fato]** = observado no banco ou no repositório; **[suspeita]** = inferência a confirmar.

## 1. A foto do banco vivo (resumo)

| Item | Fato |
|---|---|
| Tabelas em `public` | 15, todas com RLS ligado (nenhuma FORCE): empresas, empresa_membros, plataforma_admins, usuarios, procedimentos, leads, fichas_lead, compras, historico_atendimentos, tarefas, workflows_automacoes, logs_auditoria, kpis_secretaria_mensal, diagnosticos, zz_import_firestore |
| Views | vw_agendamentos, vw_indicadores_tarefas, ambas `security_invoker=on` |
| Funções | 13 (4 SECURITY DEFINER de gatilho, 3 SECURITY DEFINER auxiliares de RLS, 1 RPC do app, 5 funções de gatilho invoker) |
| Triggers | 13 em `public` + `on_auth_user_created` em `auth.users` |
| Políticas | 26, todas PERMISSIVE |
| Índices | 26 (inclui PKs/UNIQUE); todos os não únicos são parciais `WHERE deleted_at IS NULL` |
| Realtime | 12 tabelas na publicação `supabase_realtime`, todas REPLICA IDENTITY FULL |
| Edge Function | `gerenciar-colaborador` v1 (verify_jwt), usa service_role; código não está no repositório |
| Histórico de migrações vivo | 7 (`01_hardening...` a `oxy_diagnosticos`, set a nov/2026); o repositório não tem `supabase/migrations/` |
| Contagens (SELECT) | leads 367 (334 ativos, os "334" da DECISOES.md), fichas 367, empresas 3, usuarios 9 (7 com `auth_user_id`), tarefas 15, procedimentos 41, plataforma_admins 1, empresa_membros 1, diagnosticos 1, zz_import_firestore 57 |

Observações da foto:
- [fato] O `rows` do `list_tables` é a estatística do Postgres e está defasado (mostrou 7 leads; o `count(*)` real é 367). Não usar como contagem.
- [fato] O BRIEFING fala em duas clínicas (Agda, Lapelle); o banco tem **3** empresas. A terceira não foi identificada aqui. Confirmar com Carlos antes da migração multi-nicho.
- [fato] Grants: `authenticated` e `service_role` têm ALL em todas as tabelas e views; `anon` não tem nenhum privilégio de tabela, **exceto** INSERT em 13 colunas de `diagnosticos` (sem `pontuacao`, `classificacao`, `oferta`, `status_contato`, `observacoes`, que o trigger preenche). `authenticated` não tem nenhum grant em `diagnosticos`.
- [fato] Funções: `anon` e PUBLIC não executam nenhuma função de `public`. `authenticated` executa 9; as 4 SECURITY DEFINER de gatilho (`handle_new_user`, `recalcular_contadores_empresa`, `trg_recalcular_contadores`, `vincular_usuario_auth`) só têm service_role.
- [fato] Existem os enums `status_tarefa` e `prioridade_tarefa`, mas nenhuma coluna os usa (tarefas usa varchar). Os valores do enum (`pendente`, `normal`) também diferem do padrão da coluna (`PENDENTE`, `MEDIA`).

## 2. Deriva: banco vivo contra `supabase/schema.sql`

O `schema.sql` (549 linhas) descreve um banco que não existe mais. Principais diferenças:

### 2.1 Segurança (a mais grave)
| Tema | schema.sql | Banco vivo |
|---|---|---|
| Políticas RLS | linhas 448-500: 12 políticas `FOR ALL USING (true) WITH CHECK (true)`, para todos os papéis, dentro de `EXCEPTION WHEN OTHERS THEN NULL` | 26 políticas por clínica via `get_user_empresa_id()` e admin da plataforma |
| Consequência | [fato] se alguém rodar o schema.sql de novo (a tela `SupabaseConfigView` o oferece para copiar, e o README manda colar no SQL Editor), ele **recria** políticas abertas ao lado das corretas. Políticas PERMISSIVE somam por OR, então qualquer usuário logado passaria a ler todas as clínicas. O bloco engole erros em silêncio. | |

### 2.2 Estrutura
| Tema | schema.sql | Banco vivo |
|---|---|---|
| Nome da tabela de fichas | `fichas_leads` (linha 271) | `fichas_lead` (constraints ainda `fichas_leads_*`). O front tenta os dois nomes (`supabase.ts:310`, fallback PGRST205 em `supabaseService.ts`). [fato] `CrmContext.tsx:432` assina Realtime em `fichas_leads`, nome que não existe no banco vivo; [suspeita] a ficha nunca atualiza em tempo real. |
| Tabelas só no vivo | | `kpis_secretaria_mensal`, `diagnosticos`, `zz_import_firestore`, as 2 views, os 2 enums |
| Tabela consultada pelo código e inexistente | | [fato] `supabaseService.ts:2125` lê `historico_compras`; no banco vivo só existe `compras`. [suspeita] o KPI de faturamento mensal fica vazio. |
| Colunas só no vivo | | `leads.telefone`, `leads.canal_origem`; `fichas_lead.instagram`; em `tarefas`: `usuario_responsavel_id`, `situacao_origem`, `etapa_cadencia`, `data_agendada`, `hora_agendada`, `data_conclusao`, `usuario_conclusao_id`, `observacao_conclusao` |
| Colunas só no schema.sql | `leads.data_envio_lembrete_24h`, `leads.mensagem_lembrete_24h_enviada_por` | não existem (a view lê esses dados do JSON `etapa_por_situacao->'_agendamento'`) |
| Larguras de varchar em `leads` | `horario_agendamento(10)`, `profissional_agendamento(255)`, `tipo_consulta(100)`, `unidade_agendamento(100)`, `status_confirmacao_agendamento(50)` | todas `varchar` sem limite |
| `tarefas.lead_id` | anulável | `NOT NULL` |
| CHECKs do schema.sql ausentes no vivo | `empresas.status`, `empresas.tipo_logo`, `empresa_membros.papel`, `usuarios.role`, `leads.situacao` (7 valores), `leads.status_grupo_nutricao`, `fichas.origem_lead`, `historico.tipo`, `tarefas.prioridade`, `tarefas.status` | só existe `leads_status_venda_chk` (3 valores) e os CHECKs de `diagnosticos` |
| Índices | 20 índices que o repositório declara (por exemplo `idx_leads_status_venda`, `idx_tarefas_empresa_status`, `idx_auditoria_empresa`) | não existem. Os 11 FKs sem índice (seção 4, migração 01) vêm daí. Existem só 10 índices não únicos, todos parciais. |
| Triggers de `updated_at`/`version` | 11 tabelas (inclui tarefas, historico_atendimentos, workflows_automacoes, plataforma_admins) | só 7 tabelas (compras, empresa_membros, empresas, fichas_lead, leads, procedimentos, usuarios). [fato] `tarefas`, `historico_atendimentos`, `workflows_automacoes`, `plataforma_admins`, `logs_auditoria`, `kpis` **não** incrementam `version` nem `updated_at` sozinhas. Não corrigi: mudaria comportamento (ver seção 6). |
| Triggers só no vivo | | `trg_*_contadores` (leads, usuarios, empresas), `trg_fichas_sync_lead`, `trg_usuarios_vincular_auth`, `diagnosticos_pontuar_trg`, `on_auth_user_created` |
| Funções | só `set_updated_at_and_version()` e sem `search_path` fixo | 13 funções, todas com `search_path` fixo (migração 01 do histórico vivo) |
| Grants, views, Edge Function | nenhum | ver baseline |
| Extensões | uuid-ossp, pgcrypto | idem, mais pg_stat_statements e supabase_vault (plataforma), instaladas no schema `extensions` |
| Realtime e REPLICA IDENTITY | 12 tabelas | mesmas 12 (com `fichas_lead`), igual |

### 2.3 O que está igual
Colunas de governança (id, created_at, updated_at, deleted_at, version), tipos e defaults das colunas comuns, FKs com `ON DELETE CASCADE`/`SET NULL` e a lista Realtime batem.

### 2.4 Documentação
`supabase/README.md` fala em "10 tabelas"; o schema.sql tem 12 e o vivo 15. [fato]

## 3. Decisão: o que fazer com o `schema.sql`
Proposta (precisa do aval do Carlos, fora do escopo desta tarefa): depois da fase 1, trocar o `schema.sql` por um aviso apontando para `supabase/migrations/` e tirar da tela `SupabaseConfigView` o botão que copia o SQL, por causa do risco 2.1.

## 4. Migrações de limpeza propostas (ordem de aplicação)

Ordem: 01, 02, 03, 04, 05, 06 e, bem depois, 07. Cada aplicação em produção só com aprovação do Carlos, uma por vez, primeiro em branch Supabase e depois em produção em horário de pouco uso.

| # | Arquivo | O que faz | Risco | Reversível |
|---|---|---|---|---|
| 01 | `01_indices_fks_sem_cobertura.sql` | 11 índices nas FKs sem cobertura (compras 2, fichas_lead 1, historico 2, kpis 1, logs 1, tarefas 3, workflows 1) | baixo | sim, `DROP INDEX` |
| 02 | `02_arquivar_zz_import_firestore.sql` | move a tabela para o schema `arquivo` (fora da API) e revoga `authenticated` | baixo | sim, `SET SCHEMA public` |
| 03 | `03_helpers_rls_para_schema_private.sql` | move `get_user_empresa_id`, `is_plataforma_admin`, `is_platform_admin` para o schema `private` | médio | sim, `SET SCHEMA public` |
| 04 | `04_consolidar_politicas_rls.sql` | 26 políticas viram 18, uma por tabela/ação; unifica o nome do admin | **alto** (isolamento entre clínicas) | sim, texto exato no baseline |
| 05 | `05_remover_funcoes_duplicadas.sql` | remove `is_platform_admin` e `update_updated_at_column` | baixo, depois da 04 | sim, SQL na reversão |
| 06 | `06_revogar_execute_funcoes_de_gatilho.sql` | tira EXECUTE de `authenticated` em 4 funções de gatilho; padrão futuro sem EXECUTE | baixo | sim, `GRANT` |
| 07 | `07_remover_zz_import_firestore.sql` | `DROP TABLE` definitivo | baixo, mas irreversível sem dump | só com dump |

### 4.1 Detalhes por migração

**01. Índices.** Cheios, não parciais, de propósito: a FK com `ON DELETE CASCADE` precisa achar também as linhas apagadas por soft delete, e índice `WHERE deleted_at IS NULL` não as cobre. Tabelas pequenas (maior: ~370 linhas), então o bloqueio é de milissegundos.
- Prova de que não mudou o comportamento: índice não altera resultado; harness antes/depois igual; consulta de cobertura passa de 11 para 0 linhas.
- Reversão: `DROP INDEX IF EXISTS` nos 11 nomes `idx_fk_*`.
- Ressalva [fato]: o advisor marca 4 índices como não usados (`idx_empresas_active`, `idx_empresa_membros_empresa`, `idx_atendimentos_lead`, `idx_fichas_lead_id`). Não propus removê-los: `idx_empresas_active` é redundante com a PK e `idx_fichas_lead_id` com o UNIQUE de `lead_id`, mas `idx_empresa_membros_empresa` é a única cobertura daquela FK e as estatísticas são curtas. Decidir depois de mais tempo de uso.

**02. Arquivar `zz_import_firestore`.** [fato] 57 linhas, 2 empresas distintas, 21 com `k` igual ao id de um lead existente e **36 sem correspondente**. A tabela guarda nomes. Nenhum arquivo em `src/` a cita. Por isso a remoção é em duas fases: 02 arquiva (reversível), 07 apaga depois de 30 dias, de aprovação por escrito do Carlos e de um dump guardado fora do repositório. Pergunta aberta para o Carlos: as 36 linhas sem correspondente são leads ainda não importados?
- Teste: harness igual; `has_table_privilege('authenticated','arquivo.zz_import_firestore','SELECT')` falso; advisors `rls_enabled_no_policy` e `no_primary_key` somem.

**03 e a pergunta sobre revogar EXECUTE.** Avaliação das funções SECURITY DEFINER:
- `get_user_empresa_id`, `is_plataforma_admin`, `is_platform_admin` **precisam continuar executáveis por `authenticated`**. A política RLS é avaliada com o papel de quem consulta; sem EXECUTE toda consulta falha com "permission denied for function". Também **não dá para virar SECURITY INVOKER**: `get_user_empresa_id` lê `usuarios`, cuja política chama a própria função (recursão), e o mesmo vale para as funções de admin lendo `plataforma_admins`.
- O que o aviso do advisor realmente aponta é que elas aparecem em `/rest/v1/rpc/...`. A solução é movê-las para um schema que a API não expõe (`private`); as políticas guardam a função por OID e continuam funcionando.
- [fato] O front-end não chama essas funções por `rpc`; o único rpc do app é `atualizar_agendamento_lead` (`supabaseService.ts:865`). A Edge Function usa service_role direto nas tabelas.
- Pré-requisito: conferir em Settings > API > Exposed schemas que `private` não está listado.
- As outras 4 SECURITY DEFINER (`handle_new_user`, `recalcular_contadores_empresa`, `trg_recalcular_contadores`, `vincular_usuario_auth`) já estão sem EXECUTE para `authenticated` e `anon`. Nada a fazer.
- Reversão: `ALTER FUNCTION ... SET SCHEMA public`.

**04. Consolidar políticas.** Regra de equivalência: políticas PERMISSIVE do mesmo papel e ação combinam por OR, tanto em `USING` quanto em `WITH CHECK`. Fundir `A` e `B` em uma política `A OR B` não muda nada. Detalhes:
- `compras`, `fichas_lead`, `historico_atendimentos`, `leads`, `tarefas`: `empresa_id = tenant OR admin`.
- `procedimentos` e `empresa_membros`: o tenant só **enxerga** linhas não apagadas (USING), o `WITH CHECK` não filtra `deleted_at`; o admin vê tudo. Preservado.
- `usuarios`: 3 políticas viram 1; a de `deleted_at IS NULL` é subconjunto da outra, logo o OR das três é `tenant OR admin` (tenant continua vendo usuários apagados).
- `empresas`: 4 políticas, uma por ação (SELECT e UPDATE próprias ou admin; INSERT e DELETE só admin), como hoje.
- `plataforma_admins`: só troca o nome da função.
- Intocadas, pois não geram aviso: `workflows_automacoes`, `kpis_secretaria_mensal`, `logs_auditoria` (2 ações distintas), `diagnosticos`.
- Extra sem efeito no resultado: `(select private.fn())` para o planejador avaliar a função uma vez por consulta e não por linha.
- **Não corrige de propósito** (preservar comportamento): qualquer membro pode gravar `role`/`permissoes` em `usuarios`; a clínica pode atualizar qualquer coluna de `empresas`; `usuarios.role` não é lido por nenhuma política. Isso é do relatório de segurança.
- Reversão: recriar as 26 políticas originais (seção 9 do baseline, com `private.` na frente das funções se a 03 continuar aplicada).

**05. Unificar `is_platform_admin`/`is_plataforma_admin`.** [fato] Corpos idênticos. Fica `is_plataforma_admin` (casa com a tabela `plataforma_admins`; 8 das 12 políticas antigas já a usavam). O `DROP FUNCTION` sem CASCADE só passa se a 04 já trocou as 4 políticas que usavam a outra: se faltar algo, ele falha, e isso é a trava. Junto sai `update_updated_at_column`, duplicata de `set_updated_at_and_version` que nenhum trigger usa.

**06. EXECUTE em funções de gatilho.** O Postgres checa EXECUTE ao criar o trigger, não ao disparar (prova no banco: `trg_recalcular_contadores` e `vincular_usuario_auth` não têm EXECUTE para `authenticated` e disparam em todo insert). Então tiro `authenticated` de `set_updated_at_and_version`, `empresas_forcar_contadores`, `sync_lead_contato_da_ficha` e `diagnosticos_pontuar`. Mantém `atualizar_agendamento_lead` (usada pelo app; invoker, passa pelo RLS). Também revoga o padrão: funções novas em `public` deixam de nascer executáveis por `authenticated`, e RPCs futuras exigem `GRANT` explícito. Isso é uma mudança de regra para quem for criar RPCs depois.

**07.** Só depois dos gates descritos em 02.

### 4.2 Teste de que o comportamento não mudou (harness)
`00_harness_comportamento.sql` roda em transação revertida e, para cada usuário vinculado ao Auth (rótulos u1, u2..., sem nome nem e-mail), para o admin da plataforma, para um usuário sem vínculo e para `anon`, mede: linhas visíveis em 16 tabelas e views, INSERT na própria e em outra empresa (leads, procedimentos, usuarios), UPDATE/DELETE em linhas de outra empresa, e se `get_user_empresa_id` continua executável e igual à regra. Procedimento: rodar antes e depois de cada migração e comparar as saídas; **diff vazio = comportamento igual**. Em produção só rodar em branch (grava e desfaz).

Validação feita nesta sessão, num PostgreSQL 16 descartável local (não no Supabase), com dados fictícios e stubs de `auth`/papéis:
- O baseline sobe sem erro e reproduz as contagens vivas: 26 políticas, 13 funções, 14 triggers, 26 índices.
- As migrações 01 a 06 aplicadas em sequência: harness idêntico após cada uma (129 linhas de comparação).
- Controle negativo: remover o `OR admin` de uma política faz o harness acusar a diferença.
- Reversões de 06, 05, 04, 03 e 02 testadas: o harness volta idêntico ao estado original. A 07 não foi simulada.
- INSERT de `anon` em `diagnosticos` continua funcionando depois da 06 e o trigger preenche pontuação.
- Limite: não prova nada sobre dados reais; os usuários reais só aparecem no harness quando rodado no branch com cópia do banco.

## 5. Efeito esperado nos avisos
Segurança: somem `authenticated_security_definer_function_executable` (3) e `rls_enabled_no_policy`. Performance: somem `unindexed_foreign_keys` (11), `multiple_permissive_policies` (34) e `no_primary_key`. Permanece fora de SQL: `auth_leaked_password_protection` (ligar no painel do Auth).

## 6. Fora do escopo desta fase (não incluído de propósito)
- Modelo multi-nicho (funil, etapas e campos por nicho): não entra aqui, conforme combinado.
- Triggers de `version`/`updated_at` faltando em 6 tabelas: corrigir mudaria comportamento (versão passaria a subir). Decisão do Carlos e do Crítico.
- CHECKs que o schema.sql declara e o vivo não tem, `senha_hash` convivendo com o Auth, `handle_new_user` pondo todo novo usuário na primeira empresa, `get_user_empresa_id` devolvendo só a primeira clínica: pertencem ao relatório de segurança e à fase do modelo multi-nicho.
- Versionar o código da Edge Function `gerenciar-colaborador` em `supabase/functions/`.
- Remover do código a tabela inexistente `historico_compras` e a assinatura Realtime de `fichas_leads` (Crítico/front-end).

## 7. Riscos principais
1. **Rodar o `schema.sql` antigo (ou colar na tela de configuração) reabre o acesso entre clínicas**, porque recria políticas `USING (true)` que somam por OR com as corretas. Hoje é o maior risco real e independe das migrações.
2. **A migração 04 mexe no isolamento entre clínicas.** Equivalência provada no papel e no ambiente local, mas só o harness em branch com cópia dos dados reais, e um login de cada clínica, confirma. Aplicar por último entre as seguras, fora do horário de atendimento, com a reversão pronta.
3. **Perda de dado por `zz_import_firestore`**: 36 de 57 linhas não têm lead correspondente e contêm nomes. Só arquivar agora; apagar apenas com dump fora do repositório e aprovação por escrito.

Risco menor: a 03 assume que `private` não está exposto na API e que nenhum cliente externo chama `rpc/get_user_empresa_id`. O repositório e a Edge Function não chamam; um script externo não visto aqui poderia.
