# 06. Lote 2 implementado: gravações honestas, KPI honesto, regra de contato

Branch `maestri/lote-2-gravacoes`. Só código; nenhuma escrita no banco (só `list_tables` no projeto `msiuqiyndnvpwkpkaglm` para conferir colunas). `tsc --noEmit` e `vite build` passaram antes de cada commit. Nenhum dado real no repositório. O app não foi aberto no navegador: os testes abaixo são manuais e ainda não foram feitos.

## O que mudou, por item

### 2A. Gravações honestas (D07, A-16, D19, T-21, D08, D12)
- Novo tipo `ResultadoGravacao<T> { ok, erro?, dados? }` em `types.ts`.
- `supabaseService.softDeleteLead`: não devolve `true` por timeout (agora estourar 15 s é erro); passos 4 e 5 da cascata leem `error`; falhas da cascata são somadas e lançadas.
- `CrmContext.atualizarLead`: o lead novo é calculado fora do updater do `setState`, por função pura `calcularLeadAtualizado` e uma ref com o estado atual (D08). Em falha, reverte só se nenhuma alteração mais nova foi aplicada por cima, mostra aviso e devolve `{ok:false, erro}`. Os atalhos (`reativarLead`, `marcarComoPerdido`, `definirEtapa*`, `registrarContatoHoje`, `definirStatusGrupoNutricao`) devolvem o mesmo resultado.
- D12: `carregarDadosCompletos` e o realtime de tarefas leem a clínica ativa por ref; o efeito de carga também depende de `empresaIdEfetiva`.
- Aviso: `CrmProvider` renderiza um aviso simples (`role="alert"`, botão Fechar, some em 12 s), exposto como `avisarErro`.
- `criarLead` reverte e lança em falha (a importação usa modo silencioso e devolve `{ok, erro, totalErros}`); `atualizarFichaLead` reverte e devolve `null`; `criarTarefa` devolve `{ok, erro}` e o serviço não grava mais só no espelho.
- Empresa e colaborador: `salvarEmpresa` faz uma única tentativa e lança o erro (sem os 4 fallbacks que gravavam parcial). `criarEmpresa`, `atualizarEmpresa`, `criarColaborador`, `atualizarColaborador`, `excluirColaborador` revertem e lançam mensagem em português; as telas mostram o erro.
- Telas que mostravam sucesso incondicional agora só mostram quando `ok`: `FichaLeadModal`, `ConsultasAgendadasView`, `TarefasView`, `CadenciaView`, `QuickLeadForm`, `NovoPacienteModal`, `ImportExportModal`, `ControleAcessosView`.
- Efeito colateral: tarefa com `usuario_id` fora de `usuarios` (D11) é regravada sem responsável, em vez de falhar; tarefa sem paciente agora falha com mensagem clara (o banco exige `lead_id`).

### 2B. KPI honesto (D02)
- `salvarSnapshotKpi` grava `mes_referencia` (date, dia 1), `percentual_meta`, `orcamentos_pos_consulta`, `vendas_fechadas`, `faturamento_total`, `comparecimentos_efetivos`, `status_fechamento` ('fechado'), com `onConflict: 'empresa_id,mes_referencia'`; lê `error` e lança.
- `fetchHistoricoKpis` lê só o banco (ordem por `mes_referencia`), sem seed de R$ 92 mil, sem comissão 3.600 inventada e sem cache local que esconda falha. Sem linhas, a aba Histórico mostra o estado vazio. Falha de leitura vira aviso na tela.
- Não persistem (não há coluna): `dataInicioMetrificacao`, `observacoes`, data exata do fechamento (usa `updated_at`).

### 2C. Regra de contato (confirmada)
- Só "Concluir etapa" e "Registrar contato" atualizam `dataUltimoContato` e `dataUltimaAcao`. `calcularLeadAtualizado` não os define mais por edição qualquer (antes `stepChanged` e `timestamp`).
- `FichaLeadModal`: salvar a ficha grava a etapa dentro do `atualizarLead` (só se mudou) em vez de chamar `definirEtapaPorSituacao`.
- Regra documentada no topo de `utils/cadencia.ts`.

### 2D. Perdido e Venda feita (T-05)
- `estaForaDaCadencia(statusVenda)` em `cadencia.ts`; `verificarSeDeveContatarHoje` recebe `statusVenda`. `CadenciaView` não lista esses leads; `LeadTableView` os tira das contagens e dos filtros de cadência.
- T-08 ("Realizada move para Pós consulta") NÃO foi implementado: regra não confirmada.

### 2E. Defeitos pequenos
- T-06: agendar não grava mais "tipo de consulta" em `interesse` nem o profissional em `responsavel`.
- T-23: `StatusTarefa` = PENDENTE/CONCLUIDA/CANCELADA e `PrioridadeTarefa` = BAIXA/MEDIA/ALTA/URGENTE, como no banco. `utils/tarefas.ts` converte valores antigos nas bordas (Supabase, Firestore, cache local).
- T-24: texto da tarefa usa `proximaEtapa`.
- T-04: removido o cartão e o filtro "Sem etapa" (nunca tinham resultado). Escolhi remover em vez de passar a devolver o status, para não mudar o que conta como Atrasado.

## Commits
2B, 2A (partes 1 e 2), 2C, 2D, 2E (partes 1 e 2), um por item, mais este relatório.

## Como testar manualmente (casos fictícios)
1. Falha de gravação: abrir "Paciente Teste A", DevTools > Network > Offline, mudar o interesse e salvar. Esperado: aviso vermelho no canto, campo volta ao valor anterior, nenhum "sucesso". Voltar online e repetir: salva e recarregar a página mantém.
2. Excluir offline: excluir "Paciente Teste B" sem rede. Esperado: aviso, lista recarrega e o paciente reaparece quando houver rede.
3. Importação: importar 3 linhas fictícias offline. Esperado: cartão vermelho "Nenhum paciente foi importado: 3 falharam". Online: 3 criados.
4. Tarefa: criar tarefa sem escolher paciente (TarefasView). Esperado: "A tarefa NÃO foi salva: Escolha o paciente...". Com paciente: salva; prioridade "Média" aparece como "Normal" no selo.
5. KPI: abrir Comissão & KPIs de uma clínica de teste. Histórico deve estar vazio (sem 2026-07/06 inventados). Congelar o mês, conferir a linha em `kpis_secretaria_mensal` (`mes_referencia` = dia 1, `status_fechamento` = fechado) e que re-congelar atualiza a mesma linha. Offline: aviso "O mês NÃO foi congelado".
6. Contato: lead em "Em captação" atrasado, aparecendo em "Contatar hoje". Editar telefone, responsável e salvar a ficha: continua em "Contatar hoje". Trocar a etapa na ficha e salvar: idem. "Concluir etapa" ou "Registrar contato": sai da lista.
7. Perdido/Venda feita: marcar "Paciente Teste C" como Perdido e "D" como Venda feita. Não aparecem em CadenciaView nem nas contagens de cadência da tabela.
8. Agendar: agendar consulta para lead com Interesse "Preenchimento labial". O interesse e o responsável continuam como estavam.
9. Colaborador/empresa: criar colaborador offline: erro no formulário e a lista não ganha o colaborador.

## O que ficou de fora e por quê
- T-08 (Realizada move para Pós consulta): regra não confirmada.
- Ainda engolem erro, fora do escopo pedido: `lancarCompra`, `criarProcedimento`, `atualizarProcedimento`, `atualizarStatusTarefa` e `excluirTarefa` (o status fica sem tratamento de falha do banco). Candidatos a um próximo lote.
- O espelho no Firestore de empresa e usuário continua sendo escrito antes/depois sem reversão (Firestore é D10, fase própria).
- `criarLead` ainda grava `dataUltimaAcao` na criação, então lead novo não aparece em "Contatar hoje" no próprio dia; não foi pedido mudar.
- O seletor de etapa no painel de cadência da ficha (`definirEtapaPorSituacao`, ~linha 1094) continua contando como contato, por ser "Concluir etapa".
- 2B passa a gravar em `kpis_secretaria_mensal` em produção (hoje 0 linhas); precisa da ciência do Carlos antes do merge. Reversível apagando as linhas.
- Tarefa sem paciente: o banco exige `lead_id`. Decisão do Carlos: manter a exigência ou mudar a coluna por migração.
- Não há testes automatizados e o app não foi executado no navegador.
