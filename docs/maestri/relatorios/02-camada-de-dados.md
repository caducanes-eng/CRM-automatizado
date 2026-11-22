# Relatório 02 – Camada de dados (leitor Maestri)

Data da leitura: 22/11/2026. Branch: `maestri/limpeza-backend`. Autor: leitor do módulo (não altera código nem banco).
Escopo lido por inteiro: `src/services/supabaseService.ts` (2994 linhas), `src/services/firestoreService.ts` (418), `src/lib/supabase.ts` (352), `src/context/CrmContext.tsx` (1477), `src/utils/*` (4 arquivos, 1091 linhas) e `src/data/seedData.ts` (600).
Banco vivo conferido em modo leitura (projeto `msiuqiyndnvpwkpkaglm`): `information_schema.columns`, `pg_constraint`, `pg_policies`, `pg_proc`, `pg_views`, `pg_publication_tables`, e contagens agregadas (nenhum dado pessoal lido; valores de senha não foram lidos, só contagem e prefixo).

Convenção: **FATO** = visto no código ou no banco com a consulta citada. **SUSPEITA** = inferência que precisa de teste no navegador.
Não repito o que o relatório de segurança já cobre (RLS, `get_user_empresa_id`, `handle_new_user`, `usuarios.role`): só aponto onde a camada de dados depende deles.

---

## 1. Resumo para o Carlos

1. A camada grava a senha dos colaboradores em texto puro no banco e a manda de volta ao navegador a cada carga (D01).
2. O módulo de KPI/comissão da secretária não grava nada no banco (nomes de coluna errados) e mostra 3 meses de histórico inventado como se fosse real (D02).
3. Existe botão que apaga todos os pacientes, sem filtro de clínica, e outro que cria e apaga lead de teste na clínica da Agda em produção (D03, D04).
4. Os erros de gravação são engolidos: a tela mostra sucesso, a próxima recarga traz o dado antigo de volta (D07). Não há controle de versão: quem salva por último vence (D06).
5. Firestore continua como segundo banco em paralelo, sem isolamento por clínica, e mistura tarefas apagadas de volta na tela (D10).

---

## 2. Tabela de achados

Esforço: P = até 2 h, M = meio dia a 1 dia, G = mais de 1 dia. Gravidade: C crítica, A alta, M média, B baixa.

| id | grav. | arquivo:linha | problema | impacto | correção | esforço |
|---|---|---|---|---|---|---|
| D01 | C | supabaseService.ts:454-456, 480-490, 1485; seedData.ts:255-409; AuthContext.tsx:955 | FATO: `usuarioToDb` grava `senha_hash = senhaPadrao` (cai numa senha padrão literal se vazia); `carregarDadosCompletos` faz `select('*')` em `usuarios` e `dbToUsuario` devolve `senha_hash` como `senhaPadrao`. Banco: 5 de 9 usuários têm `senha_hash` e 0 começam com `$2` (não é bcrypt, ou seja, texto puro). `seedData.ts` repete a mesma senha padrão em 8 usuários. `AuthContext` compara senha em texto puro (linha 955). | Qualquer usuário logado lê as senhas dos colegas da clínica no navegador; senha única compartilhada vai para o git e para o Firestore (`salvarUsuario`). | Parar de gravar e de ler `senha_hash`; login só pelo Supabase Auth; tirar a coluna do `select` (listar colunas); migração para remover a coluna (com aprovação). Trocar as senhas existentes. | M |
| D02 | C | supabaseService.ts:2479-2510, 2391-2471, 2262-2389 | FATO: `salvarSnapshotKpi` grava `mes_ano`, `leads_pos_consulta`, `leads_venda_feita`, `faturamento_realizado`, `fechado`, `fechado_em`, `observacoes`, com `onConflict:'empresa_id,mes_ano'`. A tabela real tem `mes_referencia`, `orcamentos_pos_consulta`, `vendas_fechadas`, `faturamento_total`, `status_fechamento` e a unique é `(empresa_id, mes_referencia)`. O `await` (linha 2508) não lê `error`, então a falha é invisível. `fetchHistoricoKpis` cai no `localStorage` e, se vazio, grava 3 meses fictícios (`obterSeedSnapshotsHistoricos`: 48 consultas, R$ 92.000, comissão 3.600 etc.). Banco: `kpis_secretaria_mensal` tem 0 linhas. | O fechamento mensal de comissão fica só no navegador de quem clicou; o histórico exibido é inventado; dois computadores mostram números diferentes. Base de pagamento de bônus. | Alinhar o mapeamento às colunas reais (migração versionada se faltar coluna), verificar `error`, apagar o seed fictício e mostrar "sem histórico". | M |
| D03 | C | supabaseService.ts:1692-1754 (chamada em SupabaseConfigView) | FATO: `apagarDadosPacientesSupabase` faz `DELETE` físico em `compras`, `fichas_lead` e `leads` com `.neq('id', zeros)`; o parâmetro `_empresaId` é ignorado. Pelas FKs `ON DELETE CASCADE` leva junto tarefas e histórico. Para admin de plataforma (política `admin_plataforma_*`) alcança todas as clínicas. | Um clique apaga pacientes sem recuperação (soft delete ignorado). | Remover o botão, ou exigir `empresa_id`, confirmação digitada, soft delete e papel de gestor checado no servidor. | P |
| D04 | A | supabaseService.ts:1783-1843 | FATO: `testarEnvioEmTempoReal` insere um lead em `leads` com `empresa_id = ID_EMPRESA_PADRAO` (Agda) e depois faz `delete` físico sem checar erro. | Se o delete falhar (RLS, rede) sobra lead "[TESTE-TEMPO-REAL]" na clínica da Agda; em outra clínica o teste escreve na empresa errada. | Remover da produção ou usar `empresaAtivaId` e checar o retorno do delete. | P |
| D05 | A | CrmContext.tsx:430-437, 385-517; supabase.ts:310 | FATO: o canal realtime assina a tabela `fichas_leads`, que não existe (a real é `fichas_lead`). SUSPEITA: o servidor recusa a assinatura inteira (CHANNEL_ERROR) e o realtime nunca conecta; testar no navegador. Também FATO: cada evento chama `carregarDadosCompletos()` (recarrega tudo); o canal é recriado a cada `focus` (linhas 501-506). Tabelas `historico_atendimentos`, `empresa_membros`, `kpis` não são ouvidas. | Tela pode não atualizar entre duas secretárias; carga pesada a cada evento. | Remover o bloco `fichas_leads`; aplicar o evento ao estado em vez de recarregar tudo; criar o canal uma vez. | M |
| D06 | A | supabaseService.ts:762-774, 647-750; CrmContext.tsx:760, 778, 1128; trigger `set_updated_at_and_version` | FATO: toda gravação é `upsert` da linha inteira a partir do estado local (última carga). O cliente soma `version+1` e o trigger do banco também faz `OLD.version+1` (ignora o valor enviado): a versão nunca é comparada em lugar nenhum. `etapa_por_situacao`, datas de cadência e agendamento (JSON único) são sobrescritos por inteiro. | Duas pessoas no mesmo lead: quem salva por último apaga a alteração do outro (etapa, contato, agendamento). Coluna `version` não protege nada. | Update com `.eq('version', v)` e tratar 0 linhas afetadas como conflito; remover o `+1` do cliente; gravar só os campos alterados (ou RPC para o JSON). | M |
| D07 | A | CrmContext.tsx:633-638, 785-795, 1025-1029, 1086-1090; supabaseService.ts:819-835, 840-844, 2550, 2912, 2953 | FATO: todas as operações capturam o erro, só fazem `console.error` e devolvem o objeto/`true`. `softDeleteLead` devolve `true` após 4 s mesmo sem confirmação e os `try/catch` das cascatas não pegam nada (supabase-js devolve `{error}`, não lança). `atualizarStatusTarefa`, `excluirTarefa` retornam sempre `true`. `registrarEventoHistorico` ignora `error`. | Tela mostra sucesso; na próxima recarga (foco/realtime) o dado volta ao antigo. Banco: 17 fichas ativas pertencem a leads já apagados, ou seja, a cascata já falhou na prática. | Padronizar retorno `{ok, erro}`, reverter o estado otimista na falha e avisar o usuário; mover a cascata do soft delete para uma função no banco (transação). | M |
| D08 | A | CrmContext.tsx:664-764 e 785-795 | SUSPEITA (padrão arriscado, FATO no código): `leadAtualizado` e `fichaAtualizada` são atribuídos dentro do updater do `setState` e lidos logo depois. No React 18 o updater pode rodar só no render, então `if (leadAtualizado)` pode ser falso e o salvamento no banco é pulado. Mesmo padrão em `atualizarProcedimento` (1114-1141). | Atualização que aparece na tela e não vai ao banco, de forma intermitente. | Calcular o novo objeto fora do `setState` (a partir de uma ref com o estado atual) e só então setar e salvar. | M |
| D09 | A | supabaseService.ts:1479-1486; CrmContext.tsx:195, 210-217 | FATO: `carregarDadosCompletos` lê empresas, leads, fichas, compras, procedimentos e usuários sem `empresa_id` (só RLS). O isolamento por clínica na tela é filtro no cliente, e registro sem `empresa_id` cai na clínica padrão (linha 213). Admin de plataforma carrega tudo. Banco: leads de 2 empresas. | Dados de todas as clínicas na memória do navegador; sem paginação (367 leads hoje, cresce). Viola a regra "isolamento no servidor". | Filtrar por `empresa_id` na consulta, paginar, e nunca assumir clínica padrão. | M |
| D10 | A | supabaseService.ts:617, 744, 763, 1044, 1344, 1399, 1435, 2637-2649, 2744; firestoreService.ts:107-148 | FATO: lead, ficha, compra, procedimento, usuário (com senha) e tarefa são duplicados no Firestore. `firestoreService.fetchTarefas` lê a coleção inteira e filtra no cliente. `fetchTarefasPorEmpresa` junta tarefas do Firestore ao resultado do Supabase: tarefa apagada só no Supabase volta; tarefa criada só no Firestore nunca chega ao Supabase. O comentário da linha 1516 diz "Supabase é a única fonte", o que é falso para tarefas. | Duas fontes de verdade; PII e senha em banco sem política por clínica; tarefas fantasma. | Tirar o Firestore do caminho de tarefas primeiro; depois remover o espelhamento e o módulo (ver seção 5). | M |
| D11 | M | supabaseService.ts:2694-2799, 2863 | SUSPEITA: `tarefas.usuario_id` tem FK para `usuarios`; `normalizarUuid('user-agda')` gera UUID falso que não existe, a inserção falha por FK, e o fallback (linha 2777) só trata erro de coluna. O erro só vai para `console.error` e a tarefa continua na tela (veio do Firestore/cache). | Tarefa que parece salva e não existe no banco. | Validar o responsável contra a lista real antes de gravar e mostrar o erro. | P |
| D12 | M | CrmContext.tsx:325-355, 484 | FATO: `carregarDadosCompletos` está em `useCallback(..., [])` mas usa `empresaIdEfetiva`; o valor fica congelado na primeira renderização (clínica padrão). Tarefas carregadas e recarregadas pelo realtime usam a clínica inicial; trocar de clínica não recarrega tarefas. | Tarefas da clínica errada ou vazias após trocar de clínica. | Incluir `empresaIdEfetiva` nas dependências (ou ler de ref). | P |
| D13 | M | CrmContext.tsx:366-382, 501-506 | FATO: `focus` e `visibilitychange` disparam os dois; cada um recarrega tudo e recria o canal realtime. | 2 cargas completas e 1 reconexão a cada volta à aba. | Um só gatilho, com intervalo mínimo. | P |
| D14 | M | supabaseService.ts:671-729 com 261-286 | FATO: `supabaseService.atualizarLead` monta `leadMesclado` sem `dataEntradaSituacao`, `dataEntradaReativacao`, `dataUltimoContato(PorSituacao)` e `dataUltimaAcao`; `leadToDb` então grava `{}`/null nesses campos. Hoje ninguém chama essa função (código morto), por isso é risco latente. | Se alguém reativar essa função, apaga a cadência de contatos do lead. | Apagar a função (seção 4). | P |
| D15 | M | supabaseService.ts:365-369, 1006-1007, 627; FichaLeadModal fallback (supabaseService.ts:954-972) | FATO: `dbToFicha` lê `email`, `idade`, `como_conheceu`, `gasto_estimado`, colunas que não existem em `fichas_lead`; `fichaToDb` não grava `email` nem `idade`, apesar de `salvarFichaLead`/`criarLead` aceitá-los. `fetchFichaByLeadId` devolve uma ficha "fabricada" com id novo quando não há registro. | E-mail e idade digitados são descartados sem aviso. | Decidir se e-mail/idade entram no modelo (migração) ou sair da tela. | M |
| D16 | M | supabaseService.ts:2124-2160, 2166-2240, 1906, 2056 | FATO: o KPI consulta a tabela `historico_compras` e a coluna `valor_total`, que não existem (o erro é ignorado e cai em `compras`). Quando a tela passa `leadsLocais`/`comprasLocais`, o resultado do banco é descartado e substituído (duas fontes). Meta R$ 80.000 e faixas de bônus em reais (BON-001) estão fixas no código. | Número de comissão depende de qual tela chamou; regra de uma clínica fixa no código geral. | Uma só fonte (banco); faixas e meta vindas de configuração por empresa. | M |
| D17 | M | supabaseService.ts:104, 121, 117, 264-271, 459-464; seedData.ts:16 e 40-125 | FATO: padrões da clínica da Agda no código geral: nome "Dra. Agda Rodrigues", iniciais "AR", responsável "Secretária 1", `ID_EMPRESA_PADRAO` como fallback em cerca de 30 pontos (duplicado em `seedData.ts` e `supabaseService.ts`). `seedData.ts` carrega e-mails, telefones, CNPJ e registro profissional de aparência real. | Nova empresa sem `empresa_id` grava na clínica da Agda; dados reais no repositório (regra fixa do Maestri). | `empresa_id` obrigatório (erro se faltar); seed só com dados fictícios. | M |
| D18 | M | supabaseService.ts:50-86 | FATO: `normalizarUuid` converte qualquer texto em UUID "determinístico" e `'empresa-agda-rodrigues-01'`/`'empresa-padrao'` em Agda. Para id nulo, usa `Math.random` em fallback. | Referência inválida vira UUID plausível, passa na validação e vira erro de FK ou aponta o registro errado. | Validar formato e falhar alto; migrar ids legados uma vez. | M |
| D19 | M | supabaseService.ts:1141-1261, 130-131 | FATO: `salvarEmpresa` tem 4 tentativas, cada uma removendo colunas (registro profissional, horário, logos, `esteticas_salvas`) e devolve `true` mesmo assim. Todas essas colunas existem no banco, então as tentativas 2-4 só mascaram erro real. `empresaToDb` envia `total_usuarios`/`total_pacientes` (recalculados por trigger, o valor do cliente é inútil) e `created_at` do cliente. | Configuração salva pela metade sem aviso. | Uma tentativa só, com erro visível; não enviar contadores. | P |
| D20 | M | supabaseService.ts:88-94, 931, 1027, 1077, 1114, 1489, 1634, 1722; supabase.ts:310 | FATO: o nome `fichas_leads` (que não existe) é tratado em 8 lugares com função `getFichasTableName` e fallback. O comentário da linha 91 já admite que o nome antigo não existe. | Código morto que parece proteção; teste de conexão faz 1 requisição com erro garantida. | Usar `'fichas_lead'` direto (seção 4). | P |
| D21 | M | supabaseService.ts:780-849, 1360-1393, 1415-1429; RLS | FATO: soft delete só filtra `deleted_at` na leitura do cliente; as políticas RLS não filtram `deleted_at` (exceto `usuarios_mesma_empresa`). Cascata do lead: 5 chamadas sem transação, sem `empresa_id`. Banco: 33 leads apagados, 17 com ficha ainda ativa. `softDeleteCompra`/`Procedimento` não enviam `updated_at` (o trigger cobre). `apagarDados...` e `limparTodosLeads` ignoram o soft delete. Todas as chaves estrangeiras são `ON DELETE CASCADE` (exclusão física leva tudo). | Dado "apagado" fica acessível pela API; órfãos; sem restauração de verdade. | RLS com `deleted_at is null` para leitura comum; cascata em função SQL; tela de lixeira. | M |
| D22 | M | supabaseService.ts:2573-2583, 2655-2675, 2008 ; CrmContext.tsx | FATO: cache em `localStorage`: `estetica_crm_tarefas_<empresa>` (tarefas inteiras, com descrição), `crm_kpis_secretaria_snapshots_v1_<empresa>` (KPI), `crm_supabase_config_v1` (URL e chave do Supabase, e sobrescreve o `.env`), mais chaves de sessão/empresa em outros contextos. Tarefas do cache só entram se Supabase e Firestore vierem vazios (`tarefasMap.size === 0`); sem expiração; `atualizarStatusTarefa` varre todo `localStorage` por prefixo. | Dado de paciente (tarefa com nome/descrição) fica no navegador após logout; cache de KPI vira "verdade". | Cache só em memória, ou limpar no logout; config do Supabase só por `.env`. | P |
| D23 | M | supabaseService.ts:2570-2583, 2680-2837 | FATO: tarefas `update`/`delete` por `id` sem `empresa_id` (só RLS); `fetchTarefasPorEmpresa(undefined)` assume a clínica da Agda; `criarTarefaSupabase` grava Firestore antes do Supabase e usa `status 'PENDENTE'` em maiúsculas. | Dependência total do RLS. | Passar `empresa_id` em todas as operações. | P |
| D24 | M | banco: view `vw_indicadores_tarefas` | FATO: a view compara `status = 'pendente'`/`'concluida'` (minúsculas), mas a tabela grava `'PENDENTE'`/`'CONCLUIDA'` (maiúsculas, todas as 15 linhas). A view sempre devolve zeros. O código não a usa (calcula no cliente, `calcularIndicadoresTarefas`). | Quem tentar usar a view terá indicadores zerados. | Normalizar o status (migração) e usar `upper()`/`lower()` na view. | P |
| D25 | B | CrmContext.tsx:1014, 1213, 1219-1253, 1268-1274, 1264-1266, 206-207 | FATO: `lancarCompra` ignora a forma de pagamento informada (fixa 'Pix / Cartão') e não grava `procedimento_id`; `importarLeadsEmLote` ignora `modoDuplicados` (não detecta duplicado) e conta sucesso mesmo se o banco falhou (D07); `resetarDadosExemplo` só recarrega; `limparTodosLeads` apaga em série com timeout de 4 s cada; `isFirestoreConnected` é sempre `true` e `isSyncing` nunca muda. | Importação cria lead duplicado; botões com nome que não corresponde ao efeito. | Implementar ou remover; renomear. | M |
| D26 | B | utils/formatters.ts:24; 32 ocorrências de `toISOString().slice/split` em src | FATO: "hoje" é calculado em UTC. Depois das 21h (Brasília) `obterDataHoje()` devolve o dia seguinte. Afeta tarefa "atrasada/hoje" (`calcularIndicadoresTarefas`, linha 2957) e datas de contato. | Tarefa de hoje aparece como futura à noite; data de entrada um dia à frente. | Função única `hojeLocal()` (fuso `America/Sao_Paulo`). | P |
| D27 | B | utils/cadencia.ts:266, :8-25, :47-60; seedData.ts:432-434 | FATO: `classificarTempoSituacao` não é chamada em lugar nenhum; textos dizem "Na reativação a mais tempo" mesmo para outras situações; constantes de cadência fixas no código (só serve estética de clínica: 5/4/3 contatos). `SEED_LEADS/FICHAS/COMPRAS` são arrays vazios exportados sem uso. | Peso morto; cadência por nicho (briefing) precisa sair do código. | Remover o morto agora; cadência configurável na fase de nichos. | P |

---

## 3. Conferência com o banco vivo

### 3.1 Colunas/tabelas usadas no código que NÃO existem no banco
| Onde no código | Nome usado | Situação |
|---|---|---|
| supabaseService.ts:365-369 (`dbToFicha`) | `fichas_lead.email`, `idade`, `como_conheceu`, `gasto_estimado` | Não existem. Valor sempre vazio/0 na leitura; `email`/`idade` descartados na gravação (D15). |
| supabaseService.ts:328-329 (`dbToLead`) | `leads.data_envio_lembrete_24h`, `mensagem_lembrete_24h_enviada_por` | Não existem (só fallback; o dado vive no JSON `_agendamento`). |
| supabaseService.ts:487-489 (`dbToUsuario`) | `usuarios.senha_padrao`, `senha` | Não existem (fallback). |
| supabaseService.ts:2125, 2138 | tabela `historico_compras`, coluna `valor_total` | Não existem; erro ignorado (D16). |
| supabaseService.ts:2479-2510, 2401, 2510 | `kpis_secretaria_mensal.mes_ano`, `leads_pos_consulta`, `leads_venda_feita`, `faturamento_realizado`, `fechado`, `fechado_em`, `observacoes`; `onConflict 'empresa_id,mes_ano'` | Não existem. Reais: `mes_referencia`, `orcamentos_pos_consulta`, `vendas_fechadas`, `faturamento_total`, `status_fechamento` (D02). |
| supabaseService.ts:88-94 e mais 7 pontos; CrmContext.tsx:432; supabase.ts:310; SupabaseConfigView.tsx:683 (fora do escopo) | tabela `fichas_leads` | Não existe; a real é `fichas_lead` (D05, D20). |

Colunas gravadas em `empresas`, `empresa_membros`, `plataforma_admins`, `procedimentos`, `compras`, `tarefas`, `historico_atendimentos` e as demais de `leads`/`usuarios` conferem com o banco.

### 3.2 Colunas/tabelas do banco que o código nunca usa
| Tabela | Coluna/objeto | Observação |
|---|---|---|
| leads | `telefone`, `canal_origem` | Preenchidos só pelo trigger `sync_lead_contato_da_ficha` (a partir da ficha); `dbToLead` não lê (227 e 367 linhas preenchidas). |
| leads | `data_agendamento`, `horario_agendamento`, `profissional_agendamento`, `tipo_consulta`, `unidade_agendamento`, `observacoes_agendamento`, `status_confirmacao_agendamento`, `lembrete_24h_enviado` | O código só lê como fallback e nunca grava; 0 linhas com `data_agendamento`. O agendamento real fica em `etapa_por_situacao->_agendamento` (345 leads), então há duas representações. |
| fichas_lead | `instagram` | 0 linhas preenchidas. |
| compras | `procedimento_id` | Código não grava nem lê; 15 linhas têm valor (veio de importação). Compra liga a procedimento só por texto (`procedimento`). |
| usuarios | `auth_user_id` | Só o trigger `vincular_usuario_auth` usa; o código não. |
| historico_atendimentos | `usuario_id`; a tabela inteira nunca é lida | Só se grava (`registrarEventoHistorico`, na criação de tarefa) e se apaga em cascata; nenhuma tela mostra histórico. 20 linhas. |
| kpis_secretaria_mensal | `mes_referencia`, `usuario_id`, `comparecimentos_efetivos`, `orcamentos_pos_consulta`, `vendas_fechadas`, `faturamento_total`, `status_fechamento`, `created_at` | Ver D02. |
| tabelas | `logs_auditoria`, `workflows_automacoes`, `diagnosticos` (site), `zz_import_firestore`, view `vw_indicadores_tarefas` | Nenhum acesso na camada de dados (0 linhas em auditoria e workflows). |

### 3.3 Verificações pontuais (FATO, consultas de leitura)
- Triggers `set_updated_at_and_version` existem em leads, fichas, compras, procedimentos, usuarios, empresas, empresa_membros; **não** em `tarefas`, `historico_atendimentos`, `kpis_secretaria_mensal` (versão e `updated_at` dessas ficam por conta do cliente).
- RPC `atualizar_agendamento_lead` existe (`SECURITY INVOKER`, sem filtro de empresa dentro, depende do RLS); só a função morta `salvarAgendamentoLead` a chama.
- Views `vw_agendamentos` e `vw_indicadores_tarefas` têm `security_invoker=on` e permissão só para `authenticated` (ok).
- Realtime: publicação inclui leads, fichas_lead, compras, procedimentos, usuarios, empresas, empresa_membros, plataforma_admins, tarefas, historico_atendimentos, logs_auditoria, workflows_automacoes. O código ouve 7 delas mais a tabela inexistente.

---

## 4. Lista "limpar agora" (remoção segura, sem mudar comportamento)

Critério: zero chamadores fora do próprio arquivo (conferido com `grep` em `src/`) ou ramo inalcançável. Cada item pode virar um commit pequeno; rodar `tsc` e o build depois de cada um.

**supabaseService.ts**
1. `supabaseService.criarLead` (562-642), `atualizarLead` (647-750) e `excluirLead` (755-757): nenhum componente chama a versão do serviço (as telas usam as de `CrmContext`). Remove também o risco D14.
2. `salvarAgendamentoLead` (859-880) e `fetchAgendamentos` (885-906): sem chamadores.
3. `salvarTodasEmpresas` (1266-1277), `carregarEmpresas` (1282-1299), `salvarAdminPlataforma` (1327-1338): sem chamadores. `salvarMembroEmpresa` e o alias `salvarEmpresaMembro`: manter um só.
4. `softDeleteFicha` (1063-1095): sem chamador. `salvarFichaLead` pode ser fundida em `salvarFicha` (só chamada interna).
5. `getFichasTableName`, `cachedFichasTableName` e os 7 blocos `if (error.code === 'PGRST205' ...) fichas_lead`: ramos que nunca executam (a tabela `fichas_leads` não existe); usar `'fichas_lead'`.
6. Import `isSupabaseConfigured` (linha 1) sem uso no arquivo.
7. Chaves de `supabaseService` (1846-1851) `registrarEventoHistorico`: sem chamador externo (a função segue usada internamente).
8. Rótulos de fallback de `salvarEmpresa` tentativas 2-4 (1188-1255): inalcançáveis na prática porque todas as colunas existem; **mas** remover muda o que acontece num erro real, então marcar como "limpar com revisão".
9. `calcularRegraComissao`: só uso interno; tirar o `export` (opcional).

**firestoreService.ts**
10. `isQuotaExhausted`, `espelharLote`, `salvarSnapshotKpi` (retornam vazio/false/no-op), `carregarDadosCompletos` (sem chamador), `OperationType`, `FirestoreErrorInfo`, `handleFirestoreError` (0 referências), e os imports `getDoc`, `deleteDoc`, `auth` que sobram.
11. Chamada `firestoreService.salvarSnapshotKpi(payload)` em supabaseService.ts:2516-2519 (no-op).

**lib/supabase.ts**
12. `getRealtimeLogs` (sem uso externo); `iniciarEscutaSupabaseConfigFirestore` é no-op (App.tsx:53 e SupabaseConfigView.tsx:137 só a chamam e descartam): remover as duas chamadas e a função; aliases de tipo `RealtimeLogEntry`/`RealtimeStatusType` podem ser unificados.
13. Teste de `fichas_leads` em `testSupabaseConnection` (310-316).

**CrmContext.tsx**
14. Estado `isSyncing` (nunca muda), `isFirestoreConnected` (constante `true`; conferir o único consumidor antes), bloco de assinatura realtime `fichas_leads` (430-437).
15. Membros do contexto sem nenhum consumidor fora do arquivo: `adicionarLead`, `registrarCompra`, `salvarFichaExtra`, `importarLeadsEmMassa`, `resetarDadosExemplo`, `adicionarResponsavel`, `removerResponsavel`, `marcarComoPerdido`, `definirEtapaSituacaoAtual`, `obterEtapaAtual`, `obterProcedimentoPorId`, `fecharModalFichaLead`, `abrirModalFichaLead`, `todosProcedimentos`, `casarProcedimentoComTexto` (a exportação; o uso interno continua).

**utils / data**
16. `cadencia.ts`: `classificarTempoSituacao` e `FaixaTempoSituacao` (sem uso); tirar `export` de `CADENCIA_*`, `REGRAS_*`, `ItemCadenciaConfig`, `normalizarEtapa` (só uso interno).
17. `estetica.ts`: `isFundoEscuro` só uso interno (tirar `export`).
18. `seedData.ts`: `SEED_LEADS`, `SEED_FICHAS`, `SEED_COMPRAS` (vazios, sem uso) e `ID_EMPRESA_LUMINA` (sem uso externo). `ID_EMPRESA_PADRAO` está duplicado (`seedData.ts:16` e `supabaseService.ts:29`): `AuthContext` importa do seed, o resto do serviço; unificar em um só módulo.

Não entra em "limpar agora" (muda comportamento): D01 a D13, D15 a D19 e D21 a D26.

---

## 5. Mapa de funções (função -> tabelas)

Legenda: L = lê, E = escreve (upsert/insert), S = soft delete, X = delete físico. "F" = também espelha no Firestore. Filtra empresa? "RLS" = confia só no banco.

### 5.1 supabaseService.ts
| Função | Quem chama | Tabelas | Erro tratado? | Filtra empresa_id? | Obs. |
|---|---|---|---|---|---|
| `sanitizeDate`, `normalizarUuid`, `ID_EMPRESA_PADRAO` | telas e contextos | nenhuma | n/a | n/a | D18 |
| `supabaseMapper.*ToDb / dbTo*` (empresa, membro, plataformaAdmin, lead, ficha, compra, procedimento, usuario) | serviço; `AuthContext` (`dbToUsuario`), `EmpresaContext` (`dbToEmpresa`) | empresas, empresa_membros, plataforma_admins, leads, fichas_lead, compras, procedimentos, usuarios | n/a | n/a | D01, D15 |
| `fetchLeads` | ninguém | L leads | sim (devolve `[]`) | opcional | código morto, mas é a única leitura filtrada |
| `criarLead` / `atualizarLead` / `excluirLead` | ninguém (telas usam `CrmContext`) | leads, fichas_lead (F) | lança | não | mortas (D14) |
| `salvarLead` | CrmContext | E leads (F) | lança | usa `lead.empresaId` | D06 |
| `softDeleteLead` | CrmContext.excluirLead | S leads, fichas_lead, compras, tarefas, historico_atendimentos | só no lead; cascata engolida; `true` após 4 s | não | D07, D21 |
| `salvarAgendamentoLead` | ninguém | RPC `atualizar_agendamento_lead` | lança | não | morta |
| `fetchAgendamentos` | ninguém | L vw_agendamentos | sim | opcional | morta |
| `fetchFichaByLeadId` | FichaLeadModal, `salvarFichaLead` | L fichas_lead | sim (`null`) | não | fabrica ficha (D15) |
| `salvarFichaLead` / `salvarFicha` | CrmContext (3 pontos) | E fichas_lead (F) | lança | usa `ficha.empresaId` | `email`/`idade` descartados |
| `softDeleteFicha`, `softDeleteFichaByLeadId` | só interna (a primeira nunca) | S fichas_lead | lança | não | |
| `salvarEmpresa` | EmpresaContext | E empresas (F) | devolve `false` | id = empresa | D19 |
| `salvarTodasEmpresas`, `carregarEmpresas` | ninguém | E/L empresas | lança / `[]` | não | mortas |
| `salvarMembroEmpresa`, `salvarEmpresaMembro` | EmpresaContext | E empresa_membros | lança | usa `membro.empresaId` | alias duplicado |
| `salvarAdminPlataforma` | ninguém | E plataforma_admins | lança | n/a | morta |
| `salvarCompra` | CrmContext | E compras (F) | lança | sim, no objeto | |
| `softDeleteCompra`, `softDeleteComprasByLeadId` | CrmContext / cascata | S compras | lança | não | |
| `salvarProcedimento` | CrmContext | E procedimentos (F) | lança | sim, no objeto | |
| `softDeleteProcedimento` | CrmContext | S procedimentos | lança | não | |
| `salvarUsuario` | AuthContext (4) | E usuarios (F, com senha) | lança | usa `usuario.empresaId` | D01 |
| `carregarDadosCompletos` | CrmContext | L empresas, leads, fichas_lead, compras, procedimentos, usuarios | **não** (ignora `error` de cada consulta) | **não (RLS)** | D09 |
| `sincronizarTodosOsDados` | SupabaseConfigView | E empresas, empresa_membros, plataforma_admins, procedimentos, usuarios, leads, fichas_lead, compras | parcial (membros/admins sem checar `error`) | não | importação em massa a partir do estado local |
| `apagarDadosPacientesSupabase` | SupabaseConfigView | X compras, fichas_lead, leads | sim | **não** | D03 |
| `buscarLinhasTabelaAoVivo` | SupabaseConfigView | L qualquer tabela (nome vindo do parâmetro) | sim | não | painel técnico; tabela livre |
| `testarEnvioEmTempoReal` | SupabaseConfigView | E+X leads | parcial | Agda fixa | D04 |
| `calcularRegraComissao` | `fetchKpisMesAtual` | nenhuma | n/a | n/a | faixas em R$ fixas (D16) |
| `fetchKpisMesAtual` | KpiSecretariaView | L leads, historico_compras (inexistente), compras | sim (engole) | sim | D16 |
| `fetchHistoricoKpis` | KpiSecretariaView, `salvarSnapshotKpi` | L kpis_secretaria_mensal; `localStorage` | engole | sim | D02 |
| `salvarSnapshotKpi` | KpiSecretariaView | E kpis_secretaria_mensal (falha); `localStorage`; Firestore (no-op) | engole | sim | D02 |
| `registrarEventoHistoricoSupabase` | `criarTarefaSupabase` | E historico_atendimentos | ignora `error` | sim | tabela nunca lida |
| `fetchTarefasPorEmpresa` | CrmContext (2) | L tarefas; Firestore; `localStorage` | engole | sim (padrão Agda se vazio) | D10, D22 |
| `criarTarefaSupabase` | CrmContext | E tarefas, historico_atendimentos; Firestore primeiro | engole | sim | D11 |
| `atualizarStatusTarefaSupabase` | CrmContext | E tarefas; Firestore; `localStorage` | engole, `true` sempre | **não** | |
| `excluirTarefaSupabase` | CrmContext | S tarefas; Firestore; `localStorage` | engole, `true` sempre | **não** | |
| `calcularIndicadoresTarefas` | CrmContext | nenhuma | n/a | n/a | hora em UTC (D26) |

### 5.2 firestoreService.ts (coleções Firestore, sem isolamento por clínica)
`salvarTarefa`, `fetchTarefas` (lê a coleção inteira), `atualizarStatusTarefa`, `excluirTarefa`, `salvarLead`, `salvarFicha`, `salvarCompra`, `salvarProcedimento`, `salvarUsuario` (inclui senha), `salvarEmpresa`, `salvarEmpresaMembro`, `salvarPlataformaAdmin`: todas com `try/catch` que devolve `false`, chamadas pelo serviço do Supabase e por `EmpresaContext`/`AuthContext`. Mortas: `carregarDadosCompletos`, `espelharLote`, `salvarSnapshotKpi`, `isQuotaExhausted`, `handleFirestoreError`.

### 5.3 lib/supabase.ts
`getSupabaseConfig` (localStorage antes do `.env`), `saveSupabaseConfig`, `clearSupabaseConfig`, `isSupabaseConfigured`, `getSupabaseClient` (singleton), `testSupabaseConnection` (L empresas, leads, fichas_leads/fichas_lead, procedimentos, compras, usuarios, empresa_membros), `logRealtimeEvent`, `setRealtimeStatus`, `getRealtimeStatus`, `subscribeRealtimeStatus`, `subscribeRealtimeLogs`, `getRealtimeLogs` (morta), `iniciarEscutaSupabaseConfigFirestore` (no-op). Realtime em si fica em `CrmContext` (não neste arquivo). Os logs de realtime ficam só em memória (50 itens).

### 5.4 CrmContext.tsx (operações que tocam o banco)
| Função de contexto | Chama | Tabelas |
|---|---|---|
| `carregarDadosCompletos` | `supabaseService.carregarDadosCompletos`, `fetchTarefas` | todas as listadas acima |
| `criarLead` | `salvarLead`, `salvarFicha` | leads, fichas_lead (F) |
| `atualizarLead` (e `reativarLead`, `marcarComoPerdido`, `definirEtapaPorSituacao`, `registrarContatoHoje`, `definirStatusGrupoNutricao`) | `salvarLead`, `salvarFicha` | leads, fichas_lead |
| `excluirLead`, `limparTodosLeads` | `softDeleteLead` | leads + cascata |
| `atualizarFichaLead` | `salvarFicha` | fichas_lead |
| `lancarCompra` | `atualizarLead`, `salvarCompra` | leads, compras |
| `removerCompra` | `softDeleteCompra` | compras |
| `criarProcedimento`, `atualizarProcedimento` | `salvarProcedimento` | procedimentos |
| `excluirProcedimento` | `softDeleteProcedimento` | procedimentos |
| `importarLeadsEmLote` | `criarLead` em série | leads, fichas_lead |
| `verificarEExecutarReativacaoAutomatica` | `reativarLead` em série | leads |
| `criarTarefa`, `atualizarStatusTarefa`, `excluirTarefa` | funções de tarefa do serviço | tarefas, historico_atendimentos |
| Realtime (efeito) | `client.channel(...).on('postgres_changes')` | leads, fichas_leads(inexistente), fichas_lead, compras, procedimentos, usuarios, empresas, tarefas |

### 5.5 utils e data (funções puras, sem banco)
- `formatters.ts`: `formatarMoeda`, `formatarDataBR`, `obterDataHoje` (UTC, D26), `formatarDataHoraAgora`.
- `cadencia.ts`: etapas e regras fixas de cadência de estética (5/4/3 contatos); funções puras de cálculo (`calcularStatusCadencia`, `calcularEtapaEsperada`, `verificarSeDeveContatarHoje` etc.) lêem `dataEntradaSituacao`/`dataUltimoContato` do lead (campos guardados em colunas e no JSON `_cadenciaMeta`, duplicados).
- `estetica.ts`: cores do tema por empresa (`obterCoresSidebarCompletas`, `aplicarVariaveisCss`).
- `guiaIntencoes.ts`: textos fixos de mensagem por etapa (`GUIA_INTENCOES_OFICIAL`), específico de clínica de estética.
- `seedData.ts`: `SEED_EMPRESAS` (só a clínica da Agda), `SEED_USUARIOS` (8, com senha padrão), `SEED_PROCEDIMENTOS`, `SEED_PLATAFORMA_ADMINS`; usados como valor inicial e fallback em `EmpresaContext`, `AuthContext`, `CrmContext` e duas telas.

---

## 6. Resposta às perguntas do escopo (resumo)

- **Filtra por `empresa_id`?** Em escrita, sim (vem no objeto). Em leitura geral (`carregarDadosCompletos`) e em `update`/`delete` por `id`, não: tudo depende do RLS, que hoje enxerga só a primeira clínica do usuário (ver relatório de segurança).
- **Trata erro?** Quase nunca de forma útil: D07.
- **Duplicação Firestore x Supabase:** escrita dupla em 6 entidades e leitura mista em tarefas (D10); três versões de `carregarDadosCompletos`.
- **Cache em localStorage:** tarefas, snapshot de KPI e configuração do Supabase (D22).
- **Realtime:** um canal único, recarrega tudo a cada evento, assina tabela inexistente, recriado a cada foco (D05, D13).
- **Soft delete:** existe nas tabelas e nas escritas, mas a leitura depende do cliente e a cascata falha (17 fichas órfãs ativas); botão de apagar físico existe (D03, D21).
- **Conflito de versão (`version`):** inexistente; o cliente e o trigger somam, ninguém compara (D06).

## 7. Ordem sugerida (para o Arquiteto decidir)

1. D01, D03, D04 (risco imediato, pequenos).
2. D02 (KPI honesto) e D07 (erros visíveis).
3. D05, D12, D13 (realtime e recarga).
4. D06 (versão) junto com a decisão sobre o JSON `etapa_por_situacao`.
5. Seção 4 ("limpar agora") em commits pequenos, antes ou depois de 1-4 sem conflito.
6. D10 (sair do Firestore) e D09 (filtro no servidor) com a fase de isolamento por espaço de trabalho.

## 8. Não verificado / pendente
- D05 e D08 precisam de teste no navegador (comportamento do servidor realtime e do React).
- D11 precisa de um caso real de tarefa com responsável vindo de `seedData`.
- Não li `AuthContext.tsx` nem `EmpresaContext.tsx` por inteiro (outro módulo); só as chamadas à camada de dados.
- `supabase/schema.sql` não foi comparado linha a linha (o briefing já registra a divergência); a conferência acima foi feita contra o banco vivo.
