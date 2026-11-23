# 05. Crítica dos relatórios 01 a 04 e ordem de correção da fase limpeza (Crítico)

Data: 22/11/2026. Branch `maestri/limpeza-backend`. Não escrevi os relatórios 01 a 04. Não alterei código nem banco. No banco usei só SELECT (projeto `msiuqiyndnvpwkpkaglm`). Nenhum dado de paciente foi copiado para cá.
Convenção: **CONFIRMADO** = abri o arquivo:linha ou rodei a consulta e bate. **PARCIAL** = o fato existe, mas o relatório exagera, subestima ou mistura com suspeita. **NÃO CONFIRMADO** = não achei evidência.

## Veredito geral

Os quatro relatórios são sólidos: dos 14 achados que abri, 10 estão CONFIRMADOS, 4 PARCIAIS, nenhum NÃO CONFIRMADO. Os erros são de dimensão e de causa, não de existência. Três correções importantes ao que foi escrito:
1. A Edge Function `gerenciar-colaborador` **já existe no banco vivo e o app não a chama** (grep em `src/` vazio). O relatório 01 (A-01) propõe "criar uma função de borda" como se não houvesse. O caminho certo é trazer o código dela para o repositório e ligá-la à tela, não escrever outra.
2. O achado D02 (KPI) está **subestimado**: além dos nomes citados, `percentual_meta_faturamento` deveria ser `percentual_meta` e `mes_referencia` é do tipo `date`, não texto `'2026-07'`.
3. O harness de comportamento (rascunho 00) só prova algo se rodar com **dados e usuários reais**. Um branch do Supabase criado pelo fluxo normal nasce sem os dados de produção; ali todas as contagens seriam 0 e o "diff vazio" seria vazio por vazio. Ver seção 3.

Sobre a migração 04 (a única que toca o isolamento): conferi as 26 políticas vivas contra o texto do rascunho e a equivalência lógica **se sustenta**. Não vi mudança de comportamento. Mesmo assim ela só deve ir para produção depois de o harness rodar com dados reais (seção 3).

---

## 1. Verificação por amostragem

| # | Achado | Veredito | Evidência |
|---|---|---|---|
| 1 | D01 / A-04 / A-25: senha em texto | **CONFIRMADO** | `supabaseService.ts:454-456`: `senha_hash = usuario.senhaPadrao \|\| ... \|\| 'Agda@2026'`; `:480-490` devolve `senha_hash` como `senhaPadrao`; `:1485` faz `select('*')` em `usuarios`. Banco: `senha_hash` não nulo em 5 de 9 usuários (4 não vazios), 0 começando com `$2` (não é bcrypt). |
| 2 | D02: KPI não grava | **CONFIRMADO e maior** | `:2479-2510`: `mes_ano`, `leads_pos_consulta`, `leads_venda_feita`, `faturamento_realizado`, `fechado`, `fechado_em`, `observacoes` não existem na tabela. Além do relatório: `percentual_meta_faturamento` (real: `percentual_meta`) e `mes_referencia` é `date`. `onConflict` usa `empresa_id,mes_ano`; o único unique é `uq_empresa_mes (empresa_id, mes_referencia)`. O `await` (`:2506-2508`) não lê `error`. Histórico inventado em `obterSeedSnapshotsHistoricos` (`:2262-2300`, 48 consultas, R$ 92.000). Tabela com 0 linhas. |
| 3 | D03: apagar todos os pacientes | **CONFIRMADO** (com ressalva) | `:1692-1754`: `_empresaId` nunca é lido; três `DELETE` com `.neq('id', zeros)`. Ressalva: para usuário comum a RLS limita à própria clínica; "alcança todas" vale só para o admin da plataforma. |
| 4 | D05: realtime em `fichas_leads` | **PARCIAL** | Tabela inexistente: CONFIRMADO (`information_schema`: 0 linhas para `fichas_leads`; `CrmContext.tsx:430-437`). O efeito é suspeita: o 02 diz "o realtime inteiro nunca conecta", o 04 diz "só a ficha não atualiza". Os dois divergem e nenhum testou. Precisa de teste no navegador (ver Lote 1, passo A). |
| 5 | D07 / T-21: erro engolido, tela mostra sucesso | **PARCIAL** | CONFIRMADO: `softDeleteLead` devolve `true` após 4 s (`:838-841`); `atualizarLead` captura o erro e só faz `console.error` (`CrmContext.tsx:791-799`); `salvarSnapshotKpi` não lê `error`. Impreciso: nos passos 2 e 3 da cascata (ficha, compras) as funções **lançam** e o `try/catch` pega; só os passos 4 e 5 (`tarefas`, `historico`) ignoram `error`. As 17 fichas ativas de leads apagados existem no banco (consulta), mas a causa não está provada. |
| 6 | D12: `empresaIdEfetiva` congelada | **CONFIRMADO** | `CrmContext.tsx:325-355`: `useCallback(..., [])` usa `empresaIdEfetiva` na linha 338; no realtime de tarefas (`:484`) o mesmo. |
| 7 | T-01: "última ação" esconde o atraso | **CONFIRMADO** | `CrmContext.tsx:738` `dataUltimaAcao = dados.dataUltimaAcao \|\| timestamp` em toda atualização; `cadencia.ts:458` trata `dataUltimaAcao` de hoje como "já contatado". Agrava: `FichaLeadModal.tsx:462-470` envia a etapa ao salvar, e `stepChanged = Boolean(dados.etapaPorSituacao)` (`CrmContext.tsx:~722`) também grava `dataUltimoContato`. |
| 8 | T-02 / D25: importação ignora duplicados | **CONFIRMADO** | `CrmContext.tsx:1210-1214`: `_modoDuplicados` nunca usado; retorno fixa `totalIgnorados: 0` e `totalAtualizados: 0`. |
| 9 | A-01: criar colaborador/senha/empresa não chega ao Auth | **CONFIRMADO, com correção** | `AuthContext.tsx:753-810`: só `salvarUsuario` + Firestore. O único `signUp` do `src` está em `cadastrarComEmailSenha` (`:658`), que nenhuma tela chama. Correção: existe a Edge Function `gerenciar-colaborador` viva (relatório 04) e `grep gerenciar-colaborador\|functions.invoke src` não acha chamada. |
| 10 | A-12 / D17 / T-12: padrão da Agda em qualquer empresa | **CONFIRMADO, e já contaminou o banco** | `EmpresaContext.tsx:43-63` (CNPJ `45.123.456/0001-89`, Faria Lima, "Consultório Principal - Sala 1402"), `:574-599` (empresa fictícia). Consulta: **1 das 3 empresas** já tem esse CNPJ placeholder e 1 já tem o endereço da Faria Lima gravados na linha. As 3 têm CNPJ, telefone, e-mail, endereço e unidade preenchidos. |
| 11 | A-06 / D22: logout não limpa caches | **CONFIRMADO** | `AuthContext.tsx:696-745` remove só chaves com `sb-`, `auth-token`, `sessao`, `user_session`. Ficam `crm_agda_rodrigues_usuarios_cache_v1` (`:50`), `crm_multiempresa_empresas_v1`, `..._membros_v1`, `..._plat_admins_v1` (`EmpresaContext.tsx:37-39`). |
| 12 | A-24 / T-26 / D03: tela de configurações sem guarda | **CONFIRMADO** | `ConfiguracoesEmpresaView.tsx:67` lê `isGestor` e ele nunca é usado de novo (grep). `limparTodosLeads` é chamado em `:350`. |
| 13 | 04 §2.1: `schema.sql` reabre o isolamento | **CONFIRMADO** | A própria tela `SupabaseConfigView.tsx:655-662` embute o SQL com `CREATE POLICY ... FOR ALL USING (true) WITH CHECK (true)` e oferece baixar/copiar (`:717`). Hoje o banco tem 26 políticas e 0 com `true`. |
| 14 | D08: variável atribuída dentro do updater do `setState` | **PARCIAL** | O padrão existe (`CrmContext.tsx:664-764`, `leadAtualizado` lido em `:785`). Com React 19 o updater pode rodar adiado e o `if (leadAtualizado)` pular o `salvarLead`. Efeito intermitente **não provado**; é risco, não bug demonstrado. |

Outros pontos conferidos de passagem: `historico_compras` não existe (CONFIRMADO), mas o ramo `else` (`supabaseService.ts:2141-2152`) lê `compras`, então a suspeita do 04 de que "o KPI de faturamento fica vazio" **não procede**: o 02 está certo. Status de tarefa: 15 de 15 linhas em maiúsculas (confirma D24).

---

## 2. Contradições e duplicações, agrupadas em temas

### 2.1 Contradições entre relatórios
| # | Onde | Contradição | Quem tem razão |
|---|---|---|---|
| C1 | 01 A-01 x 04 §1 | 01 propõe criar função de borda; 04 registra que ela já existe (v1, `verify_jwt`, `service_role`) e que o código não está no repositório. | 04. O app não a chama. Trazer o código para `supabase/functions/` primeiro. |
| C2 | 02 D05 x 04 §2.2 | 02: o canal realtime inteiro pode falhar; 04: só a ficha deixa de atualizar. | Indeterminado. Testar. |
| C3 | 04 §2.2 x 02 D16 | 04: KPI de faturamento "fica vazio"; 02: cai em `compras`. | 02 (código `:2141`). |
| C4 | 01 A-18 x 02 D09 | 01: superadmin troca de clínica e pode continuar gravando na primeira; 02: admin da plataforma carrega tudo. | 02. Para o admin da plataforma a política `admin_plataforma_*` libera tudo e a escrita leva o `empresa_id` do objeto. A-18 vale para usuário comum com duas clínicas, não para o superadmin. |
| C5 | BRIEFING x banco | Briefing: duas clínicas. Banco: 3 empresas. | A terceira está `suspensa`, com 0 leads e 0 usuários (consulta). Provavelmente a Lumina de teste. Não é uma terceira clínica real. Confirmar com Carlos e corrigir o BRIEFING. |
| C6 | 02 D01 x 04 | 02: "5 de 9 usuários com senha_hash"; 04 não repete. | Conferido: 5 não nulos, 4 não vazios. Diferença pequena. |
| C7 | Prioridade/status de tarefa | DB default `PENDENTE`/`MEDIA`, enum órfão `pendente`/`normal`, tipo TS `normal`, ficha envia `media` (T-23, 04 §1, D24). Cada relatório vê um pedaço. | Um só problema: três vocabulários de status e prioridade de tarefa. |

### 2.2 Achados duplicados (mesmo problema com ids diferentes)
- **Senhas em texto e senha padrão da Agda**: A-04, A-25, A-13, D01 (e T-12 em parte).
- **Padrão/dados da Agda em empresa nova**: A-12, A-13, D17, T-12, T-19 (comissão).
- **Gravação otimista que engole erro**: D07, D19, A-16, T-21, D11, D25 (importação conta sucesso).
- **Firestore como segundo banco**: D10, A-04 (espelha senha), A-09, T-21.
- **Código que existe mas não faz o que o nome diz**: D14, D25, A-10, A-17, A-20, T-04, T-14, T-24, 04 §6 (tabelas/colunas fantasma).
- **KPI/comissão**: D02, D16, T-19, T-08.
- **Datas em UTC**: D26, T-20.
- **Tela técnica ao alcance do gestor**: D03, D04, T-26, A-24.
- **Nome errado de tabela `fichas_leads`**: D05, D20, 04 §2.2, `supabase.ts:310`, `SupabaseConfigView` (25 ocorrências em `src/`).

### 2.3 Temas (para planejar, não por relatório)
- **T1. Credencial e identidade**: senha em texto, `Agda@2026`, Auth x `usuarios`, convite (A-01, A-04, A-07, A-08, D01). Exige decisão de cadastro (pendente do Carlos) e Edge Function.
- **T2. Isolamento e autorização**: RLS, `get_user_empresa_id` devolve só a 1ª clínica, `role`/`permissoes` sem efeito no servidor, `isGestor` por texto "gest" (A-02, A-03, A-14, A-18, 04 §2.1). Fase própria, com migração.
- **T3. Honestidade das gravações**: erro engolido, versão não comparada, updater do `setState` (D06, D07, D08, T-21).
- **T4. Nomes que não existem no banco**: `fichas_leads`, `historico_compras`, colunas do KPI e da ficha (D02, D05, D15, D16, D20).
- **T5. Regras de negócio escondidas ou vagas**: `dataUltimaAcao`, perdido/ganho não sai da cadência, "Realizada" não move, reativação "automática" é botão (T-01, T-05, T-08, T-10). Precisam de decisão do Carlos antes de mexer.
- **T6. A realidade da Agda como padrão do produto**: A-12, D17, T-12, T-13, T-19.
- **T7. Peso morto e duplicação de código**: seção 4 do relatório 02, A-17, A-20, T-14.
- **T8. Deriva do banco e do repositório**: baseline, `schema.sql`, políticas duplicadas, funções duplicadas (04).

---

## 3. Revisão dos rascunhos de migração 01 a 07

Veredito por rascunho: nenhum quebra o app atual por si só; apenas **04** muda o território do isolamento, e mesmo assim só em forma, não em resultado.

| # | Muda o isolamento? | Pode quebrar o app? | Observações do Crítico |
|---|---|---|---|
| 01 índices | Não | Não | Índices não alteram resultado. Bloqueio curto (tabelas de ~370 linhas). Sem `CONCURRENTLY` porque a migração roda em transação; aceitável neste tamanho. |
| 02 arquivar `zz_import_firestore` | Não | Não (nada em `src/` cita a tabela; está fora da publicação realtime) | Mantém os 57 registros com nomes. Bloqueada por decisão humana: as 36 linhas sem lead correspondente. Move a tabela, não apaga. |
| 03 helpers para `private` | Não, mas **toca todas as políticas** por OID | Médio: se algum cliente externo chamar `rpc/get_user_empresa_id`, falha | Conferi no banco: nenhuma função, view ou política de outro schema referencia as 3 funções por nome. Os corpos usam `search_path ''` e nomes qualificados, então mudar de schema é seguro. Pré-condição crítica: `private` não pode estar em "Exposed schemas". O rascunho já pede essa conferência. |
| 04 consolidar políticas | **Não, por equivalência; é o item de maior risco** | Só se o harness não for rodado com dados reais | Conferi as 26 políticas vivas: todas `TO authenticated`, `PERMISSIVE`. A fusão `A OR B` em `USING` e em `WITH CHECK` é equivalente. Os pontos delicados estão preservados: `procedimentos`/`empresa_membros` (USING com `deleted_at IS NULL` só para o tenant, WITH CHECK sem), `usuarios` (as três viram `tenant OR admin`) e `empresas` (INSERT/DELETE só admin, SELECT/UPDATE própria ou admin). A contagem esperada de 18 políticas confere (compras 1, fichas 1, histórico 1, leads 1, tarefas 1, procedimentos 1, membros 1, usuarios 1, empresas 4, plataforma_admins 1, workflows 1, kpis 1, logs 2, diagnosticos 1). O `(select fn())` não muda resultado (função STABLE). Lembrete: a 04 **não corrige** os furos reais (qualquer membro grava `role`/`permissoes`; clínica atualiza qualquer coluna de `empresas`). Reduz avisos, não reduz risco. |
| 05 remover duplicadas | Não | Não, desde que a 04 tenha rodado | O `DROP` sem CASCADE é uma boa trava. O `update_updated_at_column` com esse nome em `storage` é outra função (trigger `update_objects_updated_at`); a 05 qualifica `public.` e não o atinge. |
| 06 revogar EXECUTE | Não | Baixo | O argumento de que o Postgres só checa EXECUTE na criação do trigger é correto. **Mudança de regra para o futuro**: `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ... FROM authenticated` faz toda RPC nova nascer sem permissão. Quem criar a próxima RPC e esquecer o `GRANT` verá "permission denied". Documentar. |
| 07 DROP definitivo | Não | Perda de dado se rodar sem dump | Gates (30 dias, aprovação escrita, dump fora do repo) estão certos. Não aplicar nesta fase. |

### Problemas que o relatório 04 não destaca
1. **O harness em branch pode ser vazio.** Um branch do Supabase nasce a partir das migrações, sem os dados nem os `auth.users` de produção. O harness mede "linhas visíveis por usuário"; com tabelas vazias dá 0 em tudo antes e depois. Duas saídas: (a) rodar a parte somente de leitura do harness contra produção, em transação revertida, como `authenticated`, sem gravar; (b) restaurar um dump anonimizado no branch. O teste de INSERT/UPDATE/DELETE em outra empresa precisa de dados e fica no branch.
2. **O repositório não tem histórico de migrações aplicáveis.** O `00000000000000_baseline_vivo.sql` é rascunho e o banco vivo tem 7 migrações que o repositório não tem. Criar um branch "a partir do repositório" não reproduz produção. Antes de qualquer branch, decidir como o baseline entra (marcar como já aplicada, sem rodar).
3. **A 04 vem depois da 03 e a 05 depois da 04**; a ordem do rascunho está certa. Cada uma deve ser aplicada **sozinha** e conferida, nunca em lote.
4. **Perigo independente das migrações**: a tela `SupabaseConfigView` ainda entrega o SQL com `USING (true)`. Se alguém o colar, as 4 migrações deixam de importar. Esse conserto é de código (Lote 1) e vale mais do que a 04.
5. As reversões de 02 a 06 foram testadas só em PostgreSQL local com dados fictícios. Isso prova sintaxe e lógica, não comportamento com os papéis e extensões do Supabase.

---

## 4. Ordem de correção da fase limpeza (lotes pequenos)

Regras da ordem: 1) primeiro o que é só código, reversível e sem decisão de negócio; 2) o que depende de uma regra do Carlos só entra depois dela; 3) banco só com aprovação por escrito, um passo por vez, branch primeiro; 4) cada lote é um commit (ou PR) separado e se desfaz com `git revert`.
Verificação padrão de todo lote de código: `npm run lint` (`tsc --noEmit`) e `npm run build` limpos. Não há testes automatizados no projeto (`package.json` só tem `dev`, `build`, `preview`, `clean`, `lint`), então o teste de cada lote é manual e está descrito abaixo.

### Lote 1. Só código, sem banco, reversível, sem decisão de negócio
Quatro commits independentes, nesta ordem (do mais seguro ao que exige olhar o navegador):

**1A. Remover o botão/SQL perigoso e o nome de tabela inexistente na tela técnica**
- O que muda: `SupabaseConfigView.tsx` deixa de oferecer o SQL com `USING (true)` (aba `schema_sql`, linhas ~506-700 e o download em `:717`); troca o texto por um aviso apontando para `supabase/migrations/`. Remove as referências a `fichas_leads` na lista de tabelas (`:731`, `:1277`).
- Arquivos: `src/components/SupabaseConfigView.tsx`.
- Risco: baixo. Só a aba técnica muda; nenhum dado.
- Teste: abrir Configurações > Supabase, conferir que a aba não mostra mais SQL e que o teste de conexão continua rodando. `lint` e `build`.
- Banco de produção: **não**.

**1B. Nome de tabela errado: `fichas_leads` e `historico_compras`**
- O que muda: (i) apagar o bloco de assinatura realtime de `fichas_leads` (`CrmContext.tsx:430-437`); (ii) apagar o teste de `fichas_leads` em `testSupabaseConnection` (`supabase.ts:309-316`); (iii) remover a consulta a `historico_compras` e ir direto a `compras` em `fetchKpisMesAtual` (`supabaseService.ts:2123-2152`): hoje o erro é ignorado e o resultado já vem de `compras`, então o número do KPI **não muda**. Não mexer em `getFichasTableName` neste lote (mudança maior, fica no Lote 3).
- Arquivos: `CrmContext.tsx`, `lib/supabase.ts`, `supabaseService.ts`.
- Risco: baixo para (ii) e (iii). **Médio para (i)**: se o canal hoje está em erro por causa da tabela inexistente (C2), depois do commit o realtime pode passar a conectar e cada evento recarrega todos os dados (D05/D13). Isso é o comportamento pretendido, mas pode surpreender.
- Teste: abrir o app em dois navegadores com usuários de clínicas diferentes; editar um lead em um e ver se o outro atualiza; observar o console (sem `CHANNEL_ERROR`). KPI do mês: o mesmo valor antes e depois. Se a atualização em tempo real causar lentidão, reverter só (i).
- Banco de produção: **não**.

**1C. Limpar caches no logout**
- O que muda: `deslogar` passa a remover todas as chaves `crm_*` e `estetica_crm_*` (exceto `crm_supabase_config_v1`, que o código já preserva de propósito), incluindo `crm_agda_rodrigues_usuarios_cache_v1` (com senhas), `crm_multiempresa_*`, `estetica_crm_tarefas_*`, `crm_kpis_secretaria_snapshots_v1_*`. Tratar também o evento `SIGNED_OUT` (sessão expirada), que hoje não passa por `deslogar` (`AuthContext.tsx:344-357`).
- Arquivos: `AuthContext.tsx` (e uma função auxiliar em `utils/`).
- Risco: baixo. Efeito colateral aceitável: o primeiro carregamento depois de um novo login usa os dados semente até a leitura do banco terminar (o app já funciona assim com cache vazio).
- Teste: logar como usuário A, abrir Controle de acessos, sair, abrir o localStorage no navegador e conferir que não sobrou nenhuma chave `crm_*` de dados; logar como usuário B e conferir que nada de A aparece.
- Banco de produção: **não**.

**1D. Importação deixa de prometer o que não faz**
- O que muda: no `ImportExportModal` o seletor "Ignorar duplicados / Atualizar existente / Criar todos" passa a ter só a opção que existe hoje ("Criar todos") com aviso "importar duas vezes cria tudo de novo"; o resultado mostra o total real. Não implementa deduplicação (isso é função nova, fase 2).
- Arquivos: `ImportExportModal.tsx` (e o tipo, se necessário).
- Risco: baixo, é rótulo. Decisão necessária? Não, só honestidade da tela.
- Teste: importar uma planilha de 3 linhas fictícia e conferir a mensagem.
- Banco de produção: **não**.

Ficam **fora** do Lote 1, de propósito, e por quê:
- **Regra `dataUltimaAcao` x cadência (T-01)**: muda a lista "Contatar hoje" que Agda e Lapelle usam todo dia. Precisa da definição do que conta como contato (decisão do Carlos). Vai ao Lote 2.
- **Dados da Agda como padrão (A-12)**: o código é fácil, mas o banco **já** tem o CNPJ e o endereço placeholder gravados em 1 empresa. Trocar só o código não limpa isso. Vai ao Lote 3 com a conferência do que está gravado.
- **Gravação que mostra sucesso com banco falho (D07)**: exige decidir como o erro aparece e o que reverter. Lote 2.

### Lote 2. Honestidade das gravações e regra de cadência (código, depende de decisão)
Cada item é um commit. Banco de produção: **não**, mas há decisões do Carlos.
- **2A. Gravação que engole erro** (D07, A-16, D19): `salvarEmpresa` com uma única tentativa e erro devolvido; `softDeleteLead` sem o `true` por timeout; passos 4 e 5 da cascata leem `error`; `atualizarLead`, `criarTarefa`, importação e KPI devolvem `{ok, erro}`; a tela reverte o estado otimista e avisa. Risco médio: erros hoje invisíveis passam a aparecer (por exemplo tarefa com `usuario_id` inexistente, D11). Teste: simular falha (desligar a rede no navegador) e conferir que a tela avisa e a recarga não "desfaz sozinha". Exige escolher o componente de aviso (há 13 usos de toast/alert).
- **2B. KPI honesto** (D02): corrigir o mapeamento para as colunas reais (`mes_referencia` como `date`, `percentual_meta`, `orcamentos_pos_consulta`, `vendas_fechadas`, `faturamento_total`, `status_fechamento`), ler `error`, apagar o histórico inventado. Só código, porque as colunas existem. **Atenção**: passa a escrever na tabela `kpis_secretaria_mensal` em produção (hoje 0 linhas). Pedir a ciência do Carlos antes de mergear; o dado novo é reversível apagando as linhas.
- **2C. Regra `dataUltimaAcao` (T-01)**: depende da decisão "o que conta como contato". Proposta: só "Concluir etapa" e "Registrar contato" contam; editar telefone ou responsável não. Muda duas pontas: `cadencia.ts:456-458` e o envio da etapa em `FichaLeadModal.tsx:462-470`. Teste com 5 leads fictícios de cada situação em um espaço de teste, comparando a lista "Contatar hoje" antes e depois com o Carlos. Risco: médio (muda o trabalho diário).
- **2D. Perdido e venda feita saem das cadências (T-05)** e **"Realizada" move para Pós consulta (T-08)**: ambos regras de negócio, só depois da decisão.
- **2E. Defeitos pequenos já provados**: T-06 (agendar sobrescreve Interesse e Responsável), T-23 (`media` x `normal`), T-24 (`lead.etapaAtual` inexistente), T-04 (cartão "Sem etapa" morto), D12 (dependência do `useCallback`). Todos P e independentes.

### Lote 3. Neutralizar o padrão da Agda e limpar peso morto (código; uma conferência no banco)
- **3A. Padrão neutro de empresa nova** (A-12, D17, T-12): `CONFIGURACOES_PADRAO_EMPRESA` vazio; remover a "empresa fictícia" de `atualizarEmpresa`; "Restaurar padrão" volta ao último valor do banco; `ID_EMPRESA_PADRAO` deixa de ser fallback silencioso (erro se faltar `empresa_id`). Pré-requisito: as 3 empresas já têm todos os campos preenchidos, então a tela da Agda não deve mudar; conferir. **Pedir ao Carlos**: corrigir o CNPJ/endereço placeholder gravados em 1 empresa. Isso é um UPDATE em produção, **exige aprovação por escrito**, e deve ser feito pela tela ou como migração de dados dele, não pelo código.
- **3B. Seção 4 do relatório 02 ("limpar agora")**, em commits pequenos, rodando `tsc` e `build` depois de cada um. Ficam de fora os itens que o próprio relatório marca como "com revisão" (fallbacks de `salvarEmpresa`).
- **3C. `getFichasTableName` e os 7 ramos `PGRST205`**: usar `'fichas_lead'` direto.

### Lote 4. Banco de produção (cada um exige aprovação por escrito do Carlos, em branch primeiro)
Antes de qualquer item: (a) decidir como o baseline entra no repositório sem ser reaplicado; (b) montar o ambiente de teste com dados (seção 3, itens 1 e 2); (c) conferir "Exposed schemas".
Ordem: **01 → 02 (após a pergunta das 36 linhas) → 03 → 04 → 05 → 06**; a 07 só depois de 30 dias, aprovação escrita e dump.
- 01: aprovação sim, risco baixo, reversão `DROP INDEX`.
- 02: aprovação sim; antes, resposta do Carlos sobre as 36 linhas.
- 03: aprovação sim; teste de fumaça de login das duas clínicas logo depois.
- 04: aprovação sim, **fora do horário de atendimento**, com a reversão pronta e um login real de cada clínica conferido. Rodar o harness com dados reais antes e depois e comparar.
- 05: aprovação sim; o `DROP` sem CASCADE é a trava.
- 06: aprovação sim; avisar quem cria RPCs sobre o novo `GRANT` explícito.

### Lote 5. Fica para a fase seguinte (precisa de arquitetura ou decisão de produto)
T1 (identidade, convite, Edge Function `gerenciar-colaborador` versionada e ligada), T2 (isolamento real: `role`/`permissoes`, 1+ clínicas por usuário, `handle_new_user`), D06 (controle de versão), D10 (sair do Firestore), D09 (filtrar no servidor), T-11/T-13 (cadência e etapas por nicho). Os três itens que mais pesam e não cabem em "limpeza": **senha em texto (D01)**, `handle_new_user` pondo todo novo usuário na primeira empresa e as permissões que não valem no servidor. Recomendo que o Segurança os trate com prioridade logo após o Lote 1, porque são os que expõem dado de clínica; a remoção da senha exige, em ordem: parar de gravar e ler (código), trocar as senhas existentes, só então migração para apagar a coluna (aprovação).

---

## 5. Resumo da ordem (uma linha por lote)

| Lote | Conteúdo | Tipo | Banco de produção |
|---|---|---|---|
| 1A | Tirar SQL com `USING (true)` da tela técnica | Código | Não |
| 1B | `fichas_leads` e `historico_compras` | Código | Não |
| 1C | Limpar caches no logout | Código | Não |
| 1D | Importação honesta sobre duplicados | Código | Não |
| 2A-2E | Erros visíveis, KPI honesto, regra de contato, perdido/ganho, defeitos pequenos | Código + decisão do Carlos | Não (2B passa a gravar em `kpis`) |
| 3A-3C | Padrão neutro, código morto, nome de tabela | Código + 1 correção de dado | Sim, só o UPDATE do placeholder |
| 4 | Migrações 01-06 | Banco | Sim, uma a uma |
| 5 | Identidade, isolamento, Firestore, nichos | Arquitetura | Sim |

## 6. Não verificado
- D05 e D08 dependem de teste no navegador; não executei o app.
- Não abri todos os 60+ achados; amostrei 14 (os mais graves). Os não amostrados mantêm o status declarado nos relatórios.
- Não li o código da Edge Function `gerenciar-colaborador` (não está no repositório); só a existência, via relatório 04.
- Não rodei o harness nem as migrações; a revisão da 04 foi lógica, comparando as 26 políticas vivas com o texto do rascunho.
