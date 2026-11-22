# Relatório 03: telas e funcionalidades (leitor + simulador)

Data: 22/11/2026. Branch: `maestri/limpeza-backend`. Papel: leitor do módulo "telas" e simulador de um consultor iniciante (nicho consultoria). Nenhum código nem banco foi alterado; só este relatório foi escrito.

Convenções: "Fato" = lido no código, com `arquivo:linha`. "Suspeita" = deduzido, precisa de teste. Caminhos relativos a `src/`. Segurança, RLS e isolamento entre espaços de trabalho são assunto de outros relatórios; aqui só aparecem quando a tela expõe o problema.

---

## 1. Visão geral em 6 linhas

1. O CRM é um funil fixo de **8 situações** em texto (`types.ts:493-501`) mais **3 status de venda** (`types.ts:514`). Tudo (menu, cadências, funil, KPIs) é montado em cima desses 11 valores. Não há como renomear, esconder ou criar etapa.
2. Quase todas as telas existem para o roteiro de uma clínica: consulta, procedimento, pós-procedimento, "reativação por duração do efeito", lembrete 24h, bônus de secretária.
3. A "inteligência" (parado, atrasado, contatar hoje, reativar) está espalhada em `utils/cadencia.ts` e `context/CrmContext.tsx`, com prazos fixos no código e sem tela para ajustar.
4. A tela inicial "Cadastro rápido" não é um cadastro rápido: é a tabela completa de pacientes.
5. Várias ações gravam "otimista" na memória e só registram erro no console. A tela diz "salvo" mesmo quando o banco falhou.
6. Para consultoria, o CRM funciona como lista de nomes com cadência de mensagens. Falta empresa, cargo, e-mail, reunião online, proposta e recorrência.

---

## 2. Mapa das telas

Entrada: `App.tsx:48` abre em `cadastro_rapido`. Menu em `components/Sidebar.tsx:36-160`. Troca de tela é por estado (`setActiveSection`), sem rota/URL: não dá para abrir link direto nem usar botão "voltar" do navegador (Fato: `App.tsx:84-176`).

| # | Tela (menu) | Componente | Dado que lê/grava |
|---|---|---|---|
| 1 | Cadastro rápido | `CadastroRapidoView` + `LeadTableView` + `NovoPacienteModal` | leads, compras, fichas |
| 2 | Tarefas & Agendamentos | `TarefasView` | tarefas (Supabase e Firestore) |
| 3-5, 7, 8 | Em captação / Em negociação / Pós consulta / Pós procedimento / Reativação | `CadenciaView` (uma tela, 5 filtros) | leads por `situacao` |
| 6, 8b | Consultas agendadas / Procedimento agendado | `ConsultasAgendadasView` (uma tela, 2 modos) | leads com data de agendamento |
| 9 | Nutrição | `NutricaoView` | leads em `Nutrição`, `statusGrupoNutricao` |
| 10 | Leads perdidos | `LeadsPerdidosView` | leads `statusVenda = Perdido` |
| 11 | Histórico de compras | `HistoricoComprasView` | compras |
| 12 | Funil de conversão | `FunilConversaoView` | leads + compras (só leitura) |
| 13 | Comissão & KPIs | `KpiSecretariaView` | cálculo em `services/supabaseService.ts:1900-2060` + snapshots mensais |
| 14 | Controle de acessos (Gestor) | `ControleAcessosView` | usuários (fora do escopo deste relatório) |
| 15 | Configurações da clínica (Gestor) | `ConfiguracoesEmpresaView` com abas Identidade, Dados, Estética, **Procedimentos** (`ControleProcedimentosView`), **Supabase** (`SupabaseConfigView`), Backup | empresa, catálogo, conexão |
| 16 | Painel da plataforma | `PainelPlataformaView` | empresas (fora do escopo) |
| modal global | Ficha do lead | `FichaLeadModal` (abas Dados, Compras, Tarefas) | lead, ficha, compras, tarefas |
| modal | Importar/Exportar | `ImportExportModal` (aberto só pela `LeadTableView`) | leads em lote |
| nunca aparece | `PlaceholderView`, `QuickLeadForm` | ver T-14 e T-15 | nada |

### 2.1 O que cada tela faz de verdade

**App.tsx / Sidebar.tsx / Header.tsx**
- Faz: login, menu lateral por permissão, cabeçalho com nome da empresa e (para admin da plataforma) seletor de empresa.
- Liga a: `useAuth`, `useEmpresa` (cores e nome vêm de `config.estetica`).
- Esconde: fallback fixo "Dra. Agda Rodrigues", "Clínica Estética" e monograma "AR" (`Header.tsx:99-106`, `Sidebar.tsx:254`). Um espaço novo sem nome configurado aparece com o nome da Dra. Agda.
- Menu: o grupo se chama "Etapas do Funil" e mistura etapas (captação) com listas operacionais (Nutrição) e agenda. Item "Configurações da clínica" e "Comissão & KPIs (BON-001)" têm nome interno de política de uma clínica.

**CadastroRapidoView (tela inicial)**
- Faz: botão único "Cadastrar Paciente" e, embaixo, a tabela completa de leads com filtros e cadência.
- Ação sem efeito: o `ImportExportModal` montado aqui nunca abre, porque `setIsImportExportOpen` nunca é chamado (`CadastroRapidoView.tsx:14,78-82`). O botão real de importar está na `LeadTableView`.
- Confunde: o nome "Cadastro rápido" promete formulário de 10 segundos; o usuário vê uma planilha densa.

**NovoPacienteModal (cadastro)**
- Campos: Nome (obrigatório), Situação inicial (8 opções), Responsável, Interesse/Procedimento (lista do catálogo ou texto livre), Possível valor.
- Não tem: telefone, e-mail, origem, empresa, cargo. Para ligar ou mandar WhatsApp o usuário precisa abrir a ficha depois.
- Regra escondida: escolher um procedimento do catálogo preenche o valor sozinho (`NovoPacienteModal.tsx:270-273`).
- A situação inicial oferece "Consulta agendada" e "Procedimento agendado" sem pedir data; o lead entra sem data de agendamento.
- Suspeita: o `useState` do responsável usa `colaboradoresAtivos[0]` no primeiro render (`:53-55`), quando a lista ainda pode estar vazia; o padrão pode cair em "Gestão Geral".

**FichaLeadModal (ficha)**
- Aba Dados: nome, situação, etapa da cadência, interesse, valor, status da venda, data de entrada, responsável, bloco de agendamento (data, hora, profissional, tipo, sala, orientações, status, lembrete 24h), bloco de perda (motivo, data), e a ficha complementar (telefone, origem, nascimento, endereço, observações). Botão "Apagar".
- Aba Compras: lança compra (procedimento, valor, data). Aba Tarefas: cria tarefa com prioridade.
- Não tem na tela: e-mail e idade, embora existam no tipo `FichaLead` (`types.ts:632-640` (interface `FichaLead`)).
- Regra escondida: salvar a ficha sempre regrava a etapa, o que marca "contato feito hoje" (ver T-01).
- Regra escondida: lançar compra muda o status para "Venda feita" (`CrmContext.tsx:1022-1023`).
- Texto fixo: tipo padrão "sua avaliação de Harmonização Facial", unidade padrão "Consultório Principal", "Aguardamos você! ✨" (`FichaLeadModal.tsx:216,326,512-531`).

**LeadTableView (tabela da tela inicial)**
- Faz: busca, filtros por situação, status e cadência, 5 cartões (Contatar hoje, Em dia, Atrasados, Adiantados, Sem etapa), colunas redimensionáveis (larguras no `localStorage`), troca de situação direto na tabela, janela "Gerenciar etapa do paciente" (concluir, ajustar manual, reiniciar) e botão Importar/Exportar.
- Liga a: leads, compras (coluna "Total Realizado" soma tudo, inclusive de outras situações).
- Botão sem efeito: o cartão "Sem etapa" e o filtro correspondente nunca têm resultado, porque nenhuma função devolve esse status (ver T-04).
- Regra escondida: o seletor de situação na linha troca a situação sem confirmar e sem validar (`LeadTableView.tsx:457-459,938-945`). Um clique em "Pós procedimento" põe o lead num fluxo de 29 dias.
- Confunde: a coluna se chama "Etapa atual", mas mostra a **próxima** etapa a executar (`obterEtapaExibida` chama `obterProximaEtapa`, `:438-445`).

**TarefasView**
- Faz: lista tarefas por aba (Hoje, Atrasadas, Futuras, Concluídas), filtro de prioridade, busca, cria tarefa (título, descrição, data, hora, prioridade, lead), conclui com observação, reabre, exclui.
- Liga a: tarefas, gravadas em Firestore **e** Supabase (`services/supabaseService.ts:2742-2800`), com falhas só no console.
- Regra escondida: horário padrão 14:00 quando o usuário não informa (`TarefasView.tsx:59`, `CadenciaView.tsx:75`, e na leitura `supabaseService.ts:2589`).
- Regra escondida: "hoje" é calculado uma vez ao abrir a tela e em UTC (`TarefasView.tsx:76`). Depois das 21h em Brasília, "hoje" já é amanhã; com a aba aberta de um dia para o outro, nada atualiza.
- Prioridade: a ficha oferece "Média" (`FichaLeadModal.tsx:2256`, valor `media`), mas o tipo só aceita `normal` (`types.ts:899`). A tarefa criada na ficha volta como "normal" depois de recarregar, e antes disso fica sem selo de prioridade.

**CadenciaView (Em captação, Em negociação, Pós consulta, Pós procedimento, Reativação)**
- Faz: tabela dos leads da situação com dias corridos, próxima etapa, etapa esperada, status (Em dia, Atrasado, Adiantado), botões Concluir etapa / Reiniciar, "Agendar tarefa" e guia de mensagens por etapa com botão Copiar.
- Regras escondidas (todas em `utils/cadencia.ts`): marcos de contato fixos (captação/negociação/pós-consulta/reativação: dias 1, 3, 5, 9, 17; pós-procedimento: 1, 7, 15, 29; nutrição: 0, 3, 6, 10, 15, 21, 28, 36, 45, 60). Em reativação os dias não geram atraso (`:304-306,347-350`). "Parado" não existe como conceito: o lead só fica "Atrasado" se a etapa guardada está atrás da etapa esperada.
- Filtro: mostra qualquer lead da situação, inclusive `Perdido` e `Venda feita` (`CadenciaView.tsx:173-175`, ver T-05).
- Texto fixo: rodapé "Dra. Agda Rodrigues • POP-COM-001" (`CadenciaView.tsx:751`); mensagens-modelo do guia citam "Dra. Agda" (`utils/guiaIntencoes.ts:30,52,74,87`).
- Bug pequeno: o botão "Agendar tarefa" monta a descrição com `lead.etapaAtual`, campo que não existe nesse objeto (`:716`); sempre cai em "Contato".

**ConsultasAgendadasView (Consultas agendadas e Procedimento agendado)**
- Faz: agenda de leads com data, cartões (Lembretes 24h hoje, Amanhã, Hoje, Confirmadas, Realizadas com % de comparecimento), troca de status (Agendada, Confirmada, Realizada, Cancelada, Remarcada), botão "Disparar WhatsApp 24h", editar, remover só o agendamento, excluir paciente.
- Regras escondidas: janela de "24h" = hoje ou amanhã por data, sem hora (`:171-185`); disparo abre `wa.me/55` + telefone e marca "enviado" na hora, sem confirmar que a mensagem saiu (`:331-346`); "Remover apenas o agendamento" devolve o lead para "Em captação" (`:539-549`); mudar para "Realizada" **não** move o lead para "Pós consulta" (só altera o texto do status, `:1012-1038`).
- Efeito colateral: agendar sobrescreve o campo Interesse do lead com o "tipo de consulta" digitado (`:464,508`) e o Responsável com o profissional (`:470`). O interesse comercial original se perde.
- Botão que falha em silêncio: sem telefone, o link vira `wa.me/55` vazio (`:333,914`).
- Texto fixo: "Avaliação de Harmonização Facial", "Consultório Principal", "Chegar 15 minutos antes. Vir sem maquiagem facial ou protetor solar com cor.", "Aguardamos você com muito carinho ✨" (`:121-128,309-327,405-416`). Para o espaço da Agda sem colaboradores, puxa nomes de `SEED_USUARIOS` (`:411,1277`).

**NutricaoView**
- Faz: lista os leads em "Nutrição" com data de entrada e um seletor Ativo/Removido; botão copia "Nome: telefone" dos ativos.
- Não faz: nenhum envio, nenhum grupo real. "Grupo" é uma lista de transmissão que a secretária monta à mão no WhatsApp. "Removido" só muda um texto no CRM.
- Esconde: Nutrição tem cadência de 10 contatos (dias 0 a 60), mas essa tela não a mostra; ela aparece só na tabela da tela inicial. Ao concluir o contato 10, o lead pula sozinho para "Reativação" (`CrmContext.tsx:855-897`).
- Confunde: o nome do array é `CADENCIA_NUTRICAO_3_CONTATOS` mas tem 10 itens (`cadencia.ts:25`).

**LeadsPerdidosView**
- Faz: filtra os perdidos por origem, motivo, situação em que estavam, período e texto; painel de insights; "campanha de recuperação" (texto sugerido + copiar contatos); "Reativar" individual e em lote.
- Regra escondida: "Reativar" = status "Em processo" + situação "Reativação" (`CrmContext.tsx:802-810`). Não limpa motivo nem data da perda e não pede confirmação no individual. Em lote, dispara uma atualização por lead sem fila.
- Problema de dado: o filtro de motivo usa a lista `MOTIVOS_PERDA_PADRAO` (`types.ts:530-538`, "Preço / Acima do orçamento"), mas a ficha oferece outra lista (`FichaLeadModal.tsx:74-82`, "Preço alto / sem orçamento") e campo livre. As duas listas não casam, então o filtro por motivo deixa de achar leads (ver T-09).
- Texto fixo: mensagem de resgate "Aqui é da clínica ... interessada em [Procedimento] ... horários prioritários" (`:977-979`) e motivo "Distância / Localização da clínica".

**HistoricoComprasView**
- Faz: lista de compras com filtros de período, ranking dos maiores compradores, "campanha de fidelização" (texto + copiar), lançar e excluir compra.
- Esconde: toda compra grava forma de pagamento "Pix / Cartão" fixa (`CrmContext.tsx:1014`); o formulário nem pergunta. "Excluir" pede confirmação, mas as outras telas não.
- Não tem: parcelas, data de vencimento, pagamento recorrente, status pago/pendente. É um registro de venda à vista.
- Texto fixo: mensagem "agradecer pela sua confiança e carinho conosco" (`:1147`).

**ControleProcedimentosView (aba dentro de Configurações)**
- Faz: catálogo de procedimentos (nome, categoria, valor, formas de pagamento, **duração do efeito em dias**, descrição, argumentos), estatísticas (procura, conversão, faturamento, ticket) e o botão "Executar reativação automática".
- Regra escondida mais importante do sistema: a "reativação automática" **não é automática**. É um botão manual nesta aba (`ControleProcedimentosView.tsx:192-204`). Ao clicar, todo lead em "Pós procedimento" com compra cuja data + duração do procedimento já passou vai para "Reativação"; sem catálogo casado, usa 180 dias (`CrmContext.tsx:1163-1197`, padrão `:1177` e `:1075`). Só olha leads já em "Pós procedimento".
- Fica fora do alcance de quem vende: a aba está em Configurações, tela restrita ao Gestor.
- Confunde: "duração do efeito" só faz sentido para estética.

**FunilConversaoView**
- Faz: 4 blocos fixos (Captação+Negociação, Consulta, Procedimento, Relacionamento+Reativação), taxa geral = vendas / total de leads, ticket médio, pipeline em processo, tabela filtrável por responsável.
- Não é funil de verdade: conta **onde cada lead está hoje**, sem histórico de passagem entre etapas. Não mostra "de 100 entradas, 40 chegaram à consulta". A "conversão" mistura leads novos com antigos e inclui perdidos no denominador.
- Texto fixo: "Toda a Clínica (Geral)", "Procedimento & Execução", "qualificação do paciente" (`FunilConversaoView.tsx:41-85,226`).

**KpiSecretariaView (Comissão & KPIs)**
- Faz: calcula bônus mensal de uma secretária pela política BON-001: captação (consultas realizadas: 30, 40 ou 50 = R$ 300, 400, 500), comparecimento (trava de 75%; R$ 300, 500, 700), fechamento (30%, 46%, 60% = R$ 400, 700, 1.000), faturamento contra meta (R$ 80.000; R$ 1.000 a 3.000). Congela o mês em snapshot.
- Regras escondidas: meta padrão 80.000 em 6 pontos de `supabaseService.ts`; data de início da operação 15/08/2026 fixa (`KpiSecretariaView.tsx:46-52`); se ninguém está em "Pós consulta" mas há venda, a taxa de fechamento vira 100% (`supabaseService.ts:1976-1978`); a meta digitada (`metaBaseManual`) é estado de tela e volta a 80.000 ao reabrir.
- Confunde: "Realizada" é o único status que conta comparecimento e ninguém é lembrado de marcá-lo, porque marcar não move o lead.
- Para outro nicho: regra de comissão de uma clínica específica, não é função geral.

**ImportExportModal**
- Faz: exporta a tabela, importa CSV/texto colado com detecção de separador, baixa planilha modelo.
- Ação sem efeito: o seletor "Ignorar duplicados / Atualizar existente / Criar todos" é ignorado; a função recebe `_modoDuplicados` e não usa (`CrmContext.tsx:1210-1214`). Importar duas vezes cria tudo duas vezes.
- Mapeamento por trecho do cabeçalho (`ImportExportModal.tsx:~190-290`): a coluna "Data de nascimento" cai no teste de `data` e vira data de entrada; "Nome da empresa" pode virar o nome do lead; "Contato" vira telefone; colunas "Empresa", "Cargo", "E-mail", "LinkedIn" são descartadas sem aviso.
- Origem padrão da importação: "WhatsApp" (`CrmContext.tsx:1233`). Exemplos do modelo são todos de estética.

**SupabaseConfigView (aba Supabase em Configurações)**
- Faz: tela técnica com URL e chave anon do Supabase, teste de conexão, log de realtime, inspeção de tabelas, SQL do schema, migração e "apagar todos os pacientes" (pede senha).
- Para quem é: desenvolvedor. Está a um clique do gestor de qualquer clínica. Também liga um ouvinte global de Firestore que atualiza credenciais (`App.tsx:51-55`). Detalhe de risco: relatório de segurança.

**PlaceholderView**
- Faz: tela "Em construção". Só renderiza se `activeSection` não bater com nenhum `case`; hoje os 17 ids têm tela (`App.tsx:84-176`), então **é código morto**. Contém texto "9 seções", paleta Navy e Dourado de uma versão antiga.

**QuickLeadForm**
- Não é importado por nenhum arquivo (busca em `src/`); duplica o `NovoPacienteModal` (código morto de 303 linhas).

---

## 3. Tabela de achados

Esforço: P = até meio dia; M = 1 a 3 dias; G = mais de 3 dias ou depende de migração de banco. Impacto: Alto = trava uso ou gera dado errado; Médio = confunde ou desperdiça; Baixo = acabamento.

| id | arquivo:linha | problema | impacto | sugestão | esforço |
|---|---|---|---|---|---|
| T-01 | `context/CrmContext.tsx:738`; `utils/cadencia.ts:456-458`; `components/FichaLeadModal.tsx:462-533` | Toda atualização grava `dataUltimaAcao = agora`, e `verificarSeDeveContatarHoje` trata isso como "já contatado hoje". Editar um telefone, trocar o responsável ou salvar a ficha tira o lead de "Contatar hoje" e esconde o atraso. A ficha ainda regrava a etapa, o que também grava `dataUltimoContato`. | Alto: a lista de trabalho do dia perde leads sem aviso. | Separar "contato registrado" (clique em Concluir etapa / Registrar contato) de "edição". Só o primeiro conta como contato. | M |
| T-02 | `components/ImportExportModal.tsx:384,1035-1040`; `context/CrmContext.tsx:1210-1214` | Seletor de duplicados não faz nada: `_modoDuplicados` é ignorado. O padrão mostrado, "Ignorar duplicados", cria duplicados. | Alto: lista de prospecção importada 2 vezes dobra a base e as cadências. | Implementar comparação por telefone/e-mail normalizado e relatório de ignorados; até lá, remover o seletor. | M |
| T-03 | `components/NovoPacienteModal.tsx:147-318`; `types.ts:603-620` | Cadastro sem telefone, e-mail, empresa, cargo, origem. Ficha só tem telefone e origem; e-mail e idade existem no tipo e não na tela. Não há conceito de empresa cliente nem de contato. | Alto para consultoria e jurídico: sem canal de contato não há cadência. | Campos mínimos por nicho (decisão pendente do BRIEFING-CRM): consultoria pede empresa, cargo, e-mail, telefone, origem. Mostrar e-mail na ficha. | M-G |
| T-04 | `utils/cadencia.ts:40`; `components/LeadTableView.tsx:416,498`; `components/CadenciaView.tsx:277-297,326-420` | Status "Sem etapa selecionada" e seu cartão nunca são produzidos (`calcularStatusCadencia` só devolve Atrasado, Em dia, Adiantado). Cartão e filtro sempre em zero. | Médio: o usuário acha que "ninguém está sem etapa" e na verdade não há essa checagem. | Retornar o status quando não há etapa guardada, ou remover o cartão. | P |
| T-05 | `components/CadenciaView.tsx:173-175`; `context/CrmContext.tsx:812-822` | Marcar "Perdido" ou "Venda feita" não muda a situação; o lead continua nas cadências e nos "Contatar hoje". Não existe regra ligando `statusVenda` e `situacao`. | Alto: a equipe é mandada contatar quem já recusou ou já comprou. | Filtrar `statusVenda !== 'Em processo'` nas telas de cadência e nos cartões, ou definir a transição de situação ao perder/ganhar. Decisão de regra: Carlos. | P-M |
| T-06 | `components/ConsultasAgendadasView.tsx:464,470,508` | Agendar sobrescreve Interesse com o "tipo de consulta" e o Responsável com o profissional. | Médio-Alto: perde-se o interesse comercial original. | Gravar só em `tipoConsulta` e `profissionalAgendamento`. | P |
| T-07 | `components/ConsultasAgendadasView.tsx:331-346,333,914`; `components/FichaLeadModal.tsx:541,1976` | `wa.me/55` fixo (só Brasil) e sem telefone gera link vazio. O envio é marcado como feito ao abrir o link. | Médio: lembrete "enviado" que não foi. | Validar telefone antes; DDI por espaço de trabalho; marcar enviado só por confirmação do usuário. | P |
| T-08 | `components/ConsultasAgendadasView.tsx:1012-1038`; `:234` | Status "Realizada" não leva o lead a "Pós consulta"; o KPI de comparecimento depende dele. | Alto para o KPI; Médio no uso. | Ao marcar Realizada, perguntar "mover para Pós consulta?" ou mover por regra configurável. | P |
| T-09 | `types.ts:530-538`; `components/FichaLeadModal.tsx:74-82,899-925`; `components/LeadsPerdidosView.tsx:660` | Duas listas de motivo de perda diferentes e campo livre; o filtro de motivo compara por trecho de texto e não encontra os da ficha. | Médio: análise de perdas sai incompleta. | Uma lista única por nicho, selecionável, com "Outro" + texto. | P |
| T-10 | `context/CrmContext.tsx:1163-1197`; `components/ControleProcedimentosView.tsx:192-204` | Reativação "automática" é um botão escondido em Configurações, dentro de uma aba que só o Gestor abre; só olha "Pós procedimento"; padrão de 180 dias. | Alto: ninguém é reativado se o gestor não lembrar. | Rodar no servidor/diariamente; mover o resultado para a tela Reativação; prazo configurável por oferta. | M-G |
| T-11 | `utils/cadencia.ts:8-36,302-333,484-503`; `utils/cadencia.ts:25` | Marcos de dias fixos no código e nenhum lugar para o usuário ajustar. Nome `CADENCIA_NUTRICAO_3_CONTATOS` tem 10 itens. Não existe "dias parados" (pergunta aberta do BRIEFING). | Alto para consultoria: ciclo B2B é mais longo e por canal. | Cadência como dado (tabela por espaço de trabalho e nicho), com modelo inicial. | G |
| T-12 | `components/CadenciaView.tsx:751`; `utils/guiaIntencoes.ts:30,52,74,87`; `components/Header.tsx:99-106`; `components/Sidebar.tsx:254`; `components/FichaLeadModal.tsx:512`; `components/ConsultasAgendadasView.tsx:309` | Nome "Dra. Agda Rodrigues", "POP-COM-001", "Clínica Estética" aparecem como padrão em qualquer espaço. O guia de mensagens trata a paciente no feminino. | Alto para lançamento público (regra fixa do README: realidade da Agda não vira regra geral). | Trocar por nome do espaço de trabalho e mensagens modelo por nicho. | M |
| T-13 | `types.ts:493-501`; `components/Sidebar.tsx:36-160`; `components/NovoPacienteModal.tsx:193`; todo o texto "Paciente" | Vocabulário de clínica em ~600 ocorrências nas telas do escopo (paciente, consulta, procedimento, harmonização, sala). 8 situações e 3 status fixos. Funil e KPIs somam por esses nomes. | Alto: base do problema de multi-nicho. | Rótulos por nicho (tabela de dicionário) e etapas configuráveis; é a decisão de arquitetura do BRIEFING. | G |
| T-14 | `components/QuickLeadForm.tsx` (arquivo todo); `components/PlaceholderView.tsx:70,142`; `components/CadastroRapidoView.tsx:14,78-82` | Código morto: formulário não importado, tela "Em construção" inalcançável, modal de importação que nunca abre. | Baixo, mas gera confusão para quem mantém. | Remover após aprovação. | P |
| T-15 | `components/CadastroRapidoView.tsx:52-68`; `App.tsx:40-42,48` | "Cadastro rápido" abre uma planilha de 10 colunas; o nome promete outra coisa. | Médio (clareza): iniciante procura "Leads" ou "Contatos". | Nomear a tela inicial pelo que é (Leads) e deixar o cadastro rápido como botão. | P |
| T-16 | `components/LeadTableView.tsx:438-445,97-106` | Coluna "Etapa atual" mostra a próxima etapa a executar. A ficha chama o mesmo campo "Etapa atual" (`FichaLeadModal.tsx:1272`) e salva a etapa guardada. Duas leituras para o mesmo nome. | Médio (clareza). | Rotular "Próximo contato". | P |
| T-17 | `components/LeadTableView.tsx:938-945` | Mudar situação na linha é um clique sem confirmação e sem pedir dados (data de consulta, motivo). | Médio: salto de etapa por engano, e o contador de dias recomeça. | Confirmar mudança; pedir dados obrigatórios da nova situação. | P |
| T-18 | `context/CrmContext.tsx:1014`; `components/HistoricoComprasView.tsx:253-294` | Forma de pagamento gravada como "Pix / Cartão" sempre. Sem parcelas, vencimento, status pago, recorrência. | Alto para consultoria (contrato mensal, entrada + parcelas). | Compra com condição de pagamento e recorrência; ver lista de funções novas. | M-G |
| T-19 | `components/KpiSecretariaView.tsx:46-52,51`; `services/supabaseService.ts:1906,1931-2010,2056,2287` | Política de comissão de uma secretária com valores em reais, meta R$ 80.000 e início 15/08/2026 no código; meta digitada não persiste. Regra "sem pós-consulta mas com venda = 100%" (`:1976`). | Alto como "regra da Agda virou regra do produto"; irrelevante para consultor solo. | Tratar como módulo opcional configurável, desligado por padrão. | M-G |
| T-20 | `utils/cadencia.ts:246-250`; `utils/formatters.ts:25`; `components/TarefasView.tsx:58,76`; `context/CrmContext.tsx:814,859,913` | Datas "hoje" via `toISOString()` (UTC). Depois das 21h em Brasília vira o dia seguinte; mistura com `hojeLocal` só em parte (`cadencia.ts:451-454`). | Médio: lead criado à noite sai com data de amanhã; tarefa "hoje" some. | Uma função de data local usada em todo lugar. | P |
| T-21 | `context/CrmContext.tsx:791-799` e todas as ações; `services/supabaseService.ts:2742-2800` | Atualização otimista: se o Supabase falha, só `console.error`; tela mostra "salvo". Tarefa grava em dois bancos (Firestore e Supabase) e engole erro de ambos. | Alto: dado some depois de recarregar. | Mostrar erro e reverter; definir uma única fonte de gravação. Cruzar com o relatório de back end. | M |
| T-22 | `components/ImportExportModal.tsx:~190-290` | Mapeamento por trecho: "Data de nascimento" vira data de entrada; "Empresa", "Cargo", "E-mail" são ignorados; origem padrão "WhatsApp". | Alto para quem importa lista de prospecção. | Tela de mapeamento coluna a coluna com prévia; campos extras. | M |
| T-23 | `components/FichaLeadModal.tsx:177,2255-2258`; `types.ts:899` | Prioridade "media" na ficha não existe no tipo (`normal`). | Baixo-Médio: selo some, valor muda ao recarregar. | Alinhar valores. | P |
| T-24 | `components/CadenciaView.tsx:716` | `lead.etapaAtual` não existe no objeto; texto da tarefa sai sempre "Contato". | Baixo. | Usar `proximaEtapa`. | P |
| T-25 | `components/ControleProcedimentosView.tsx` (aba "Procedimentos", `ConfiguracoesEmpresaView.tsx:471,2113`) | Catálogo comercial escondido em Configurações; "duração do efeito" só serve a estética. | Médio: quem vende não vê nem edita preço e oferta. | Tela "Ofertas/Serviços" fora de Configurações; duração opcional ("vigência"). | M |
| T-26 | `components/SupabaseConfigView.tsx` (aba Supabase) | Tela de desenvolvedor (chave anon, SQL, inspeção de tabelas, "apagar todos") ao alcance do gestor de qualquer clínica. | Alto (risco) e Médio (clareza). | Restringir ao admin da plataforma; ver relatório de segurança. | P |
| T-27 | `components/NutricaoView.tsx:97-120,259` | "Grupo" e "Removido" não têm efeito fora do CRM; nenhuma mensagem é enviada; cadência de 10 contatos invisível aqui. | Médio (clareza): usuário acredita que "Removido" tira alguém de uma lista. | Explicar na tela ou trocar por "Pausado"; mostrar a cadência. | P |
| T-28 | `components/FunilConversaoView.tsx:41-85,121-160` | Funil por situação atual, sem histórico de passagem; conversão = vendas / total; perdidos no denominador. | Médio-Alto: decisão comercial sobre número enganoso. | Registrar histórico de mudanças de situação e calcular conversão por etapa. Depende de tabela nova. | G |
| T-29 | `App.tsx:84-176`; `components/Sidebar.tsx:330-355` | Sem rotas: não há link direto nem botão voltar; ao abrir uma ficha de uma lista, a posição da lista se perde ao trocar de tela. | Baixo-Médio. | Adotar rotas. | M |
| T-30 | `components/NovoPacienteModal.tsx:53-55` (suspeita) | Responsável inicial calculado no primeiro render; pode ficar "Gestão Geral" mesmo com colaboradores. | Baixo. | Calcular quando a lista chega. | P |

---

## 4. Textos fixos que quebram em outro nicho

Lista curta, sem repetir o que está na tabela:

- **Consultoria:** "Paciente", "Consulta agendada", "Procedimento agendado", "Pós procedimento", "Harmonização Facial", "Consultório Principal", "sem maquiagem facial", "autoestima", "cuidar da sua autoestima com a Dra. Agda", "Distância / Localização da clínica", "Procedimento & Execução", "Total em Procedimentos" (rodapé da tabela, `LeadTableView.tsx:1053`).
- **Jurídico:** "Consulta" funciona, "Procedimento" confunde com processo judicial; motivos de perda sem "honorários"; falta número do processo e área de atuação.
- **Nutrição:** a única que se encaixa melhor (consulta, retorno, reativação), mas "Pós procedimento" pede troca de nome e a duração do efeito vira "duração do plano alimentar".
- **Gênero:** a maioria dos textos de mensagem usa "bem-vinda", "interessada", "sua autoestima".
- **Moeda/telefone:** R$ fixo, DDI 55 fixo.

---

## 5. Simulação: consultor iniciante (consultoria) usando só o CRM

Persona: consultora solo de estratégia, entra no CRM novo para prospectar donos de pequenas empresas por LinkedIn e indicação. Sem tutorial. Roteiro e onde trava, na ordem em que acontece.

| Passo | O que ela tenta | O que acontece | Trava? |
|---|---|---|---|
| 1 | Entra | Cai em "Cadastro rápido", que é uma tabela com cabeçalho "Paciente". Header mostra o nome do espaço ou, se vazio, "Dra. Agda Rodrigues" (`Header.tsx:103`). | Leve: estranha, mas segue. |
| 2 | Cadastra a primeira prospect | Clica "Cadastrar Paciente". Formulário pede nome, situação (8 opções), responsável, interesse (lista vazia ou de estética), valor. Não tem empresa, e-mail nem telefone. | **Trava**: onde escrevo a empresa? Põe "Ana - Padaria Sol" no campo Nome. |
| 3 | Guarda o telefone | Abre a ficha, aba Dados, campo Telefone com exemplo "(11) 98765-4321". Não encontra e-mail nem cargo. Usa Observações. | **Trava**: não consegue buscar ou filtrar por e-mail. |
| 4 | Escolhe a etapa | Opções: Em captação, Em negociação, Consulta agendada, Pós consulta, Procedimento agendado, Pós procedimento, Reativação, Nutrição. Decide que "Consulta" = reunião de diagnóstico e "Procedimento" = projeto; "Pós procedimento" é um enigma. | **Trava**: precisa criar um dicionário mental; sem treino, usa errado. |
| 5 | Trabalha o dia | Abre "Em captação": vê dias corridos, "Contato 1 (dia 1)", "Contato 2 (dia 3)"... e o rodapé "Dra. Agda Rodrigues • POP-COM-001". Clica em Concluir etapa e o lead avança. Não consegue mudar os dias (B2B pede intervalos mais longos) nem o canal (LinkedIn, e-mail, ligação). | **Trava**: régua rígida, sem canal. |
| 6 | Copia mensagem do guia | O texto diz "Seja muito bem-vinda à clínica da Dra. Agda... procedimento". | **Trava**: precisa reescrever tudo. |
| 7 | Agenda reunião de diagnóstico | Em "Consultas agendadas": data, hora, "Profissional", "Tipo de consulta" já preenchido com "Avaliação de Harmonização Facial", "Unidade: Consultório Principal", observações "Vir sem maquiagem facial...". Não tem link de videochamada. O interesse da prospect é sobrescrito pelo "tipo de consulta" (T-06). | **Trava** e perde dado. |
| 8 | Dispara lembrete | Botão "Disparar WhatsApp 24h" abre o WhatsApp com texto de clínica ("na unidade ..., ✨ Aguardamos você"). Sem telefone, abre link vazio. Marca como enviado. | Parcial: precisa editar tudo no WhatsApp. |
| 9 | Fez a reunião | Muda o status para "Realizada" na lista. O lead **continua em "Consulta agendada"**. Procura "Pós consulta" e não o vê; precisa lembrar de trocar a situação na ficha. | **Trava** de lógica (T-08). |
| 10 | Envia proposta | Não há onde anexar ou registrar a proposta, nem status "proposta enviada". Usa "Em negociação" e anota o valor em "Possível valor". | **Trava** parcial: usa o jeito possível. |
| 11 | Fecha o contrato | Aba Compras: "Lançar compra" com "procedimento" e valor único. Forma de pagamento fixa "Pix / Cartão". Contrato de R$ 3.000 por mês por 6 meses vira 1 compra de R$ 18.000 ou 6 lançadas à mão. Lead vira "Venda feita", mas continua nas cadências (T-05). | **Trava**: sem recorrência/parcelas. |
| 12 | Perdeu um lead | Motivos sugeridos: "Desistiu do procedimento", "Problemas de saúde / contraindicação". Digita livre. Depois, em Leads perdidos, o filtro por motivo não encontra o que digitou (T-09). | Leve. |
| 13 | Quer o número do mês | "Funil de conversão" mostra "Toda a Clínica (Geral)", etapas "Procedimento & Execução" e a conversão sobre todos os leads de sempre, sem prazo. "Comissão & KPIs" fala de secretária e meta R$ 80.000. | **Trava**: o número não responde "quantas reuniões viraram proposta este mês". |
| 14 | Importa a lista do LinkedIn | Planilha com Nome, Empresa, Cargo, E-mail, LinkedIn. Só Nome (e talvez Contato como telefone) entra; empresa, cargo e e-mail somem sem aviso. Se importar de novo, duplica (T-02). | **Trava grave** para prospecção em volume. |
| 15 | Vai a Configurações | Abas Identidade, Dados, Estética (cores), Procedimentos (catálogo com "duração do efeito"), Supabase (URL e chave), Backup. Se for gestor, vê as telas técnicas sem entender. | Leve a médio. |

Resumo da simulação: a consultora consegue cadastrar nomes, mudar etapa e lançar valor, mas **não consegue** registrar a empresa/contato, adaptar a cadência, mandar mensagem própria, mover a reunião realizada para a etapa seguinte sem lembrar, medir conversão por etapa nem lançar contrato recorrente. Nada na tela explica o dicionário "consulta = reunião".

Simulações curtas dos outros nichos (só o que muda):
- **Jurídico:** "Consulta" ok; "Procedimento" confunde; falta número do processo, área, honorários (êxito, mensal); motivos de perda não servem.
- **Nutrição:** funciona quase inteiro; "Pós procedimento" vira "Acompanhamento"; "duração do efeito" vira "duração do plano".
- **Estética (Agda, Lapelle):** é o caso que o produto atende hoje; os achados T-01, T-05, T-08, T-10 valem também para elas.

---

## 6. Funções novas candidatas, por valor para quem faz prospecção de consultoria

Só entram depois da Fase 1 (BRIEFING-CRM, decisão "limpar e dar clareza ao back end primeiro"). Ordenadas por valor para prospecção B2B.

| # | Função | Por que importa para consultoria | Depende de | Esforço |
|---|---|---|---|---|
| 1 | **Contato e empresa** como campos (empresa, cargo, e-mail, LinkedIn, site) e vários contatos por empresa | Sem isso não há prospecção B2B (T-03) | campos por nicho, migração | M-G |
| 2 | **Cadência configurável** (intervalos, canal por passo: e-mail, LinkedIn, ligação, WhatsApp) com modelos por nicho | Ciclo B2B é mais longo e multicanal (T-11) | tabela de cadência | G |
| 3 | **Próxima ação obrigatória e "parado há N dias"** configurável por etapa, com lista "o que fazer hoje" correta | Resolve a pergunta aberta do BRIEFING e T-01, T-05 | regra de parado por nicho | M |
| 4 | **Importação com mapeamento e deduplicação** (telefone/e-mail), com prévia | Entrada de lista de prospecção é o gargalo (T-02, T-22) | campos novos | M |
| 5 | **Etapas e rótulos por nicho** (modelo Consultoria: Prospecção, Contato feito, Reunião de diagnóstico, Proposta enviada, Negociação, Fechado, Perdido) | Base de tudo (T-13) | arquitetura multi-nicho | G |
| 6 | **Proposta**: valor, escopo curto, data de envio, validade, status (enviada, vista, aceita) e lembrete de retorno | Etapa que mais perde venda em consultoria | etapas configuráveis | M |
| 7 | **Reunião online**: link da videochamada no agendamento, lembrete por e-mail/WhatsApp com modelo editável | Reunião de diagnóstico quase sempre é remota (T-07) | agenda | M |
| 8 | **Modelos de mensagem editáveis** com variáveis (nome, empresa, dor) por etapa e canal | Substitui o guia fixo da Agda (T-12) | cadência configurável | M |
| 9 | **Funil real por período** (entradas, reunião, proposta, fechado, % por etapa, tempo médio por etapa) | Responde "o que funciona" (T-28) | histórico de etapas (tabela nova) | G |
| 10 | **Contrato e recorrência** (mensal, parcelado, entrada + parcelas), receita recorrente prevista | Consultoria vive de retainer (T-18) | compras refeitas | G |
| 11 | **Motivos de perda por nicho** em lista única com análise | Aprende com as perdas (T-09) | lista configurável | P |
| 12 | **Origem e campanha** com custo opcional e conversão por origem | Mostra qual canal de prospecção compensa | origem como lista | M |
| 13 | **Indicações**: quem indicou, agradecimento e lembrete de retorno | Indicação é o principal canal de consultor | contato | P-M |
| 14 | **Notas e histórico de interações** por lead (linha do tempo) | Hoje só há um campo "Observações" livre | tabela de interações | M |
| 15 | **Tarefas com recorrência** e lembrete dentro do CRM (hoje só lista) | Rotina de prospecção semanal | tarefas | P-M |
| 16 | **Comissão/meta opcional** configurável (módulo que desliga) | Mantém o que a Agda usa sem impor ao consultor (T-19) | módulo opcional | M |

---

## 7. Recomendação de ordem (para o Crítico e o Arquiteto)

1. Corrigir sem esperar arquitetura (esforço P, alto impacto): T-01, T-04, T-05, T-06, T-08, T-09, T-23, T-24.
2. Pôr nas decisões do Carlos (regra de negócio, sem código ainda): o que muda de situação quando perde ou ganha (T-05); o que conta como "contato" (T-01); a partir de quantos dias o lead fica parado (pergunta aberta do BRIEFING); se "Reativação automática" roda sozinha (T-10).
3. Esperar o desenho multi-nicho do Arquiteto: T-03, T-11, T-12, T-13, T-18, T-19, T-28.
4. Limpeza de código morto (T-14) e restrição da tela técnica (T-26): depois de aprovadas.

## 8. Limites deste relatório

- Foi leitura estática; nenhuma tela foi aberta no navegador. As afirmações de comportamento vêm do código; "Suspeita" marca o que precisa de teste.
- `FichaLeadModal` (2.785 linhas) e `ConfiguracoesEmpresaView` foram lidos por seções (campos, ações, salvamento); detalhes de estilo e das abas Identidade, Estética e Backup não foram analisados.
- `ControleAcessosView`, `PainelPlataformaView` e `LoginView` ficaram fora do pedido.
- Não repeti achados de back end e segurança (`senha_hash`, políticas, `handle_new_user`); os relatórios de segurança e arquitetura devem cobrir.
