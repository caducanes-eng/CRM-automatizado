# 07. Crítica independente do Lote 2 (branch maestri/lote-2-gravacoes)

Revisor: Crítico (não implementou o Lote 2). Base: `git diff maestri/lote-1-codigo..maestri/lote-2-gravacoes`, relatório 06, relatório 05 (seção Lote 2). Banco: só `list_tables` e SELECT em `pg_indexes`/`pg_constraint` no projeto `msiuqiyndnvpwkpkaglm`. Nenhum código ou dado alterado. O app não foi aberto no navegador: tudo abaixo vem de leitura de código, de `tsc`, do `build` e do banco.

## Resultado do build
- `npx tsc --noEmit`: sem erros.
- `npx vite build`: passa (só o aviso de chunk grande, pré-existente).

## Veredito por item

| Item | Veredito |
|---|---|
| 2A Gravações honestas | APROVADO COM RESSALVA |
| 2B KPI honesto | APROVADO |
| 2C Regra de contato | APROVADO COM RESSALVA |
| 2D Perdido / Venda feita | APROVADO COM RESSALVA |
| 2E Defeitos pequenos | APROVADO COM RESSALVA |
| Regressão "tarefa sem paciente" (efeito de 2A) | REPROVADO: bloqueia o merge |

## BLOQUEIO DO MERGE

**B1. Nova tarefa sem paciente agora sempre falha, e a tela diz que o paciente é opcional.**
- Fato: `TarefasView.tsx:612` rotula o campo "Vincular a Paciente (Opcional)" e a opção padrão é "Nenhum (Tarefa geral da clínica)". `TarefasView.tsx:147` envia `leadId: leadIdNova || null`.
- Fato: `supabaseService.ts:2469` agora lança "Escolha o paciente da tarefa: o banco exige um paciente vinculado" quando não há `leadId`. O banco confirma: `tarefas.lead_id` é NOT NULL (`list_tables`).
- Efeito: com o formulário no estado inicial, preencher só o título e salvar dá erro. Antes a tarefa aparecia (espelho Firestore/cache) e nunca chegava ao Supabase. A falha agora é honesta, mas o fluxo "tarefa geral" deixou de existir e a tela ainda o oferece. O relatório 06 trata isso como "decisão do Carlos", mas não corrigiu o formulário.
- Correção sugerida (só descrição): ou (a) tornar o campo obrigatório em `TarefasView.tsx` (rótulo com `*`, sem a opção "Nenhum", botão Salvar desabilitado sem paciente), ou (b) o Carlos decide mudar `tarefas.lead_id` para aceitar NULL por migração (Lote 4, com aprovação). Sem (a) ou (b) o merge entrega um botão que parece quebrado.
- Não trava a tela: o erro volta como `{ok:false}`, `TarefasView.tsx:150-153` mostra "A tarefa NÃO foi salva" e mantém o modal aberto. É falha clara, sem loop.

## Item 2A. Gravações honestas: APROVADO COM RESSALVA

Confere com o relatório:
- `softDeleteLead` sem `true` por timeout: `supabaseService.ts:836` rejeita após 15 s. Passos 4 e 5 leem `error` (`errTarefas`, `errHist`) e somam falhas, lançadas no fim.
- `atualizarLead` calcula o lead novo fora do updater (D08): função pura `calcularLeadAtualizado` (`CrmContext.tsx:102`), estado lido de ref (`:789` em diante). Em falha, reverte só se a versão ainda é a da própria gravação (`CrmContext.tsx:838`), avisa e devolve `{ok:false, erro}`. Não há loop de reversão: nenhum efeito chama `atualizarLead`; a reversão só roda no `catch`.
- Aviso `role="alert"` em `CrmContext.tsx:1552`: fecha por botão e por timer de 12 s (`avisarErro`/`fecharAvisoErro`). Não fica preso.
- `salvarEmpresa` com uma tentativa (`supabaseService.ts:1135` em diante). Todas as colunas do mapper existem em `public.empresas` (conferido em `list_tables`), então tirar os 4 fallbacks não quebra o caminho feliz.
- `criarLead` reverte e lança; os 3 chamadores (`QuickLeadForm`, `NovoPacienteModal`, `ConsultasAgendadasView:461`) têm `try/catch` e mantêm o formulário aberto. A importação usa modo silencioso e devolve `{ok, erro, totalErros}`.
- Colaborador e empresa: `ControleAcessosView.tsx:224-267` e `PainelPlataformaView.tsx:134-153` já tinham `try/catch` e agora recebem erros reais.
- D12: `carregarDadosCompletos` e o realtime de tarefas leem a clínica ativa por ref; o efeito depende de `empresaIdEfetiva`.

Ressalvas (fato observado):
- R1. Os atalhos de etapa mostram sucesso mesmo com falha. `CadenciaView.tsx:105,120`, `LeadTableView.tsx:208,223,235` e `FichaLeadModal.tsx:647,659,1099` ignoram o `{ok}` de `definirEtapaPorSituacao` e exibem "Etapa concluída!" logo depois. O aviso vermelho global também aparece, então há duas mensagens contraditórias, mas o relatório 06 afirma que as telas só mostram sucesso quando `ok`, e isso não vale para esses 3 arquivos.
- R2. `suspenderEmpresa`/`reativarEmpresa` (`EmpresaContext.tsx:674,690`) capturam o erro e devolvem `false`; `PainelPlataformaView.tsx:554,564` ignora o retorno. A tela reverte, mas o usuário não vê motivo. Falha silenciosa, só que sem sucesso falso.
- R3. `PainelPlataformaView.tsx:152` troca qualquer erro por "Verifique os campos", escondendo a mensagem real que o serviço agora devolve.
- R4. `lancarCompra`, `criarProcedimento`, `atualizarProcedimento`, `atualizarStatusTarefa`, `excluirTarefa` continuam engolindo erro (o relatório 06 admite). Como `lancarCompra` chama `atualizarLead` (`CrmContext.tsx:1086`), uma falha ali agora dispara aviso, mas a compra fica na tela mesmo se `salvarCompra` falhar (`:1090`).
- R5. `limparTodosLeads` (`CrmContext.tsx:1340`) chama `excluirLead` em laço; sem rede dispara um aviso e um reload por lead. Suspeita de ruído, não de dano.
- R6. `FichaLeadModal.tsx:625` ignora o retorno de `excluirLead`: se falhar, a ficha já foi fechada e só o aviso global informa. Aceitável, mas o relatório 06 não lista.

Teste de regressão por fluxo (leitura de código):
- Criar lead: ok (reverte e avisa em falha). Editar lead: ok. Agendar: ok (T-06 abaixo). Apagar lead: ok, com aviso e recarga em falha. Criar tarefa com paciente: ok. Criar tarefa sem paciente: falha (B1). Compra e procedimento: comportamento igual ao anterior (não foram tocados).
- D11 (usuário fora de `usuarios`): `supabaseService.ts` tenta de novo sem responsável quando o erro é FK de usuário; o banco tem `tarefas_usuario_id_fkey ... ON DELETE SET NULL`, coerente.

## Item 2B. KPI honesto: APROVADO

Evidência contra o banco vivo (`public.kpis_secretaria_mensal`, 0 linhas):
- Colunas gravadas por `salvarSnapshotKpi` (`supabaseService.ts:2253` em diante): `empresa_id`, `mes_referencia` (`${mesAno}-01`, tipo `date`), `consultas_realizadas`, `total_agendamentos`, `comparecimentos_efetivos`, `taxa_comparecimento`, `trava_comparecimento_ok`, `orcamentos_pos_consulta`, `vendas_fechadas`, `taxa_fechamento`, `faturamento_total`, `meta_faturamento`, `percentual_meta`, `bonus_captacao/comparecimento/fechamento/faturamento`, `comissao_total`, `status_fechamento`, `updated_at`. Todas existem com tipo compatível (inteiros, numeric, boolean, varchar, date).
- `onConflict: 'empresa_id,mes_referencia'` (`:2291`) tem constraint real: `uq_empresa_mes UNIQUE (empresa_id, mes_referencia)` (SELECT em `pg_constraint`). O upsert não dará erro 42P10.
- `usuario_id` fica fora do payload (nullable). `created_at`/`id` pelo default.
- `fetchHistoricoKpis` ordena por `mes_referencia`, lê `error` e lança; sem seed e sem cache local. `KpiSecretariaView.tsx` zera o histórico e avisa em falha; o congelamento mostra "O mês NÃO foi congelado".
- Observação (não bloqueia): `observacoes` e `dataInicioMetrificacao` (`KpiSecretariaView.tsx:137,145`) ainda são montados e enviados mas não persistem (sem coluna); a tela de histórico (`:914`) cai em "01/MM" quando a data falta. O relatório 06 já declara isso. Pendente de ciência do Carlos: passa a gravar em produção.

## Item 2C. Regra de contato: APROVADO COM RESSALVA

Leitura de `cadencia.ts` e `CrmContext.tsx`, com leads fictícios:
- Lead A: "Em captação", `dataUltimoContato` = 2026-11-20, `dataUltimaAcao` = 2026-11-20T10:00, `statusCadencia` = Atrasado. Edita telefone, responsável ou interesse e salva a ficha. `calcularLeadAtualizado` mantém os dois campos (`CrmContext.tsx:166` e `:176`: só mudam quando `dados.*` é passado). `verificarSeDeveContatarHoje` (`cadencia.ts:451` em diante) calcula `jaContatadoHoje` = falso, cai em `statusCadencia === 'Atrasado'` e devolve verdadeiro. Continua em "Contatar hoje". Confirmado.
- Lead A, "Concluir etapa" (`CadenciaView.tsx:105` -> `definirEtapaPorSituacao`, `CrmContext.tsx:942-950`): passa `dataUltimoContato: hoje` e `dataUltimaAcao: timestamp` -> `jaContatadoHoje` verdadeiro -> sai da lista. Confirmado.
- "Registrar contato" (`registrarContatoHoje`, `CrmContext.tsx:964-980`): idem. Confirmado.
- Ficha: `FichaLeadModal.tsx:425` e `:471` só gravam a etapa dentro do `atualizarLead` quando mudou, sem datas de contato. Confirmado.

Ressalvas (fato):
- R7. Três seletores de etapa ainda contam como contato porque chamam `definirEtapaPorSituacao`: `CadenciaView.tsx:246-248` (`handleMudarEtapa`), `LeadTableView.tsx:223` (etapa manual) e `FichaLeadModal.tsx:1093-1099` (select rápido). O relatório 06 só cita o da ficha. "Reiniciar cadência" (`CadenciaView.tsx:116`, `LeadTableView.tsx:235`) também conta como contato. Se "só Concluir etapa e Registrar contato contam" é a regra literal, esses 4 caminhos a contrariam; se o Carlos considera que mexer na etapa manualmente é contato, a regra no topo de `cadencia.ts` precisa dizer isso.
- R8. O teste 6 do relatório 06 ("trocar a etapa na ficha e salvar continua em Contatar hoje") só vale se a nova etapa não mudar o `statusCadencia` de Atrasado para Em dia/Adiantado. Avançar a etapa pode tirar o lead da lista por outro motivo (etapa nova), não por contar como contato. Teste precisa de lead cuja etapa nova continue atrasada.
- R9. Efeito colateral aceito: `criarLead` ainda grava `dataUltimaAcao` (`CrmContext.tsx:720`), então lead novo some de "Contatar hoje" no dia da criação.

## Item 2D. Perdido e Venda feita: APROVADO COM RESSALVA

- `estaForaDaCadencia` (`cadencia.ts:434`) devolve verdadeiro para 'Perdido' e 'Venda feita'; `verificarSeDeveContatarHoje` retorna falso logo na entrada (`:457`). Os valores batem com o CHECK do banco (`leads.status_venda`: Em processo / Venda feita / Perdido).
- `CadenciaView.tsx:150` filtra os dois da lista de cada situação; as métricas saem de `leadsProcessados`, então os cartões também ignoram.
- `LeadTableView.tsx:402` marca `foraDaCadencia`; `:413` tira dos cartões de contagem; `:489` os exclui dos filtros de cadência.
- Continuam visíveis: com `filtroCadencia === 'todos'` a tabela principal os lista (o filtro só age quando há filtro de cadência). `LeadsPerdidosView` e `FunilConversaoView` não usam `estaForaDaCadencia` (grep confirma: só `CadenciaView` e `LeadTableView`). Telas de histórico preservadas.
- `reativarLead` volta `statusVenda` para 'Em processo' (`CrmContext.tsx:857`), então o lead reentra na cadência.

Ressalvas:
- R10 (suspeita, regra de negócio). `lancarCompra` marca o lead como 'Venda feita' (`CrmContext.tsx:1086`), e existe cadência própria de 4 contatos para "Pós procedimento" (`cadencia.ts:23,73,315`). Com 2D, quem comprou e está em "Pós procedimento" some das cadências de pós-atendimento. Se o pós-procedimento serve para cuidar de quem já comprou, a regra desliga justamente esse público. Perguntar ao Carlos se "Venda feita" deve sair da cadência de "Pós procedimento" e "Pós consulta".
- R11. O cartão "Todos"/total do `LeadTableView` agora exclui esses leads (`:413`); o rótulo pode confundir quem compara com a contagem da tabela. Texto/rótulo a conferir.
- T-08 corretamente fora do lote (regra não confirmada).

## Item 2E. Defeitos pequenos: APROVADO COM RESSALVA

- T-06: `ConsultasAgendadasView.tsx` (criação e edição) deixou de gravar `interesse: formTipoConsulta`; novo lead usa `responsaveis[0]` em vez do profissional. Confirmado.
- T-24: `CadenciaView.tsx:693` usa `lead.proximaEtapa`. Confirmado.
- T-04: cartões e filtros "Sem etapa" removidos de `CadenciaView` e `LeadTableView`. Sobrou código morto sem efeito (`semEtapa` em `CadenciaView.tsx:194` e `LeadTableView.tsx:419,504`). Inofensivo.
- T-23: tipos e telas em MAIÚSCULAS como o banco (`types.ts`, `utils/tarefas.ts`). Normalização nas bordas (Supabase, Firestore, cache). `grep` não acha mais strings minúsculas de status ou prioridade fora de `FichaLeadModal.tsx:2264-2267`.
- Ressalva R12 (defeito novo, `FichaLeadModal.tsx:2261-2267`): o select de prioridade da aba Tarefas tem `value="baixa"`, `"MEDIA"`, `"alta"`, `"urgente"` (mistura), enquanto o estado começa em `'ALTA'` (`:178`). O valor padrão não casa com nenhuma opção, então o select mostra "Baixa" na tela enquanto grava ALTA. Escolher "Alta" manualmente grava 'alta', que `normalizarPrioridadeTarefa` converte para ALTA, então o dado final fica certo, mas o padrão exibido está errado. O `as any` em `:2261` escondeu isso do `tsc`. Correção sugerida: usar `BAIXA/MEDIA/ALTA/URGENTE` nos 4 `value`.

## O que precisa acontecer antes do merge
1. Resolver B1 (formulário de tarefa sem paciente), pela opção (a) ou (b) acima.
2. Corrigir R12 (4 valores do select).
3. Carlos responder: R10 (Venda feita sai do pós-procedimento?), R7 (seletores manuais de etapa contam como contato?), e dar ciência da escrita em `kpis_secretaria_mensal`.
4. Aceitável como ressalva para o lote seguinte: R1 a R6, R8, R11.

## Não verificado
App no navegador, simulação de rede offline, comportamento do realtime após uma reversão, testes com dados reais. Tudo isso continua pendente, como o relatório 06 já dizia.
