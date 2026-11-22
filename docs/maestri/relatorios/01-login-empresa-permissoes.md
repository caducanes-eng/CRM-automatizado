# Relatório 01: login, empresa e permissões

Leitor: módulo 1 do método Maestri. Branch `maestri/limpeza-backend`. Nenhum código, banco ou migração foi alterado; só este arquivo foi criado.

Escopo lido por inteiro: `src/context/AuthContext.tsx` (1010 linhas), `src/context/EmpresaContext.tsx` (997), `src/components/LoginView.tsx` (203), `ControleAcessosView.tsx` (1282), `ConfiguracoesEmpresaView.tsx` (2220; lógica 1-520 e 2030-2220 lidas, JSX visual 520-2030 lido por busca de textos e estados), `PainelPlataformaView.tsx` (907; lógica 1-330 lida, tabelas e modais por busca), `src/types.ts` (944; trechos de empresa, permissões e estética) e `src/utils/estetica.ts` (151). Apoio: `src/data/seedData.ts`, `src/services/supabaseService.ts`, `src/services/firestoreService.ts`, `src/lib/supabase.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`.

Convenção: **[FATO]** é o que o código mostra. **[SUSPEITA]** depende do estado do banco vivo ou de política RLS que este relatório não consultou (o banco vivo só entra pelo que o `BRIEFING-CRM.md` e o pedido já informam). Nenhuma consulta SQL foi feita.

---

## 1. Resumo para decisão

1. O login em si funciona (Supabase Auth, `AuthContext.tsx:587-640`). Todo o resto da gestão de pessoas e empresas **não funciona de ponta a ponta**: criar colaborador, redefinir senha, desativar, criar empresa, promover administrador da plataforma, vincular membro e suspender empresa gravam no estado local e/ou no localStorage, mas não criam nem alteram usuário no Supabase Auth, não gravam membros nem administradores no banco, e os erros do banco são engolidos com `console.warn` enquanto a tela mostra "sucesso".
2. A autorização inteira é do navegador. `isGestor`, `temPermissao`, `podeAcessarSecao` e `isPlataformaAdmin` leem localStorage, seed e um e-mail fixo. O briefing confirma que o servidor não consulta `role`/`permissoes`.
3. A clínica da Agda está embutida como padrão: id fixo `00000000-...-0001` em 88 ocorrências no `src`, dados cadastrais fictícios da Agda como fallback de qualquer empresa, usuários seed com senha `Agda@2026`, empresa fictícia Lumina e e-mail de superadministrador fixo.

---

## 2. Mapa das funções e fluxos

Legenda de "ponta a ponta" (código para Supabase): **Sim**, **Parcial**, **Não**.

### 2.1 AuthContext.tsx

| Função / fluxo | Linhas | O que faz | Ponta a ponta |
|---|---|---|---|
| Estado inicial de sessão | 110-141 | Lê `crm_agda_rodrigues_auth_sessao_v1` do localStorage e já monta `user` e `sessionPerfil` antes de qualquer verificação | Não. Cria "login" sem sessão Supabase (achado A-05) |
| Lista de usuários (cache) | 147-167 | Inicia com cache localStorage ou `SEED_USUARIOS`; regrava o cache a cada mudança, **com `senhaPadrao`** | Não. Dado de segurança no navegador (A-04, A-06) |
| `carregarUsuariosDatabase` | 170-231 | Busca `usuarios` (sem `deleted_at`) no Supabase e substitui a lista local quando vem pelo menos 1 linha; roda na carga, no foco e na troca de aba | Sim para leitura. A mescla de senha (199-205) compara com o literal `'Agda@2026'` |
| `carregarPerfilUsuarioSupabase` | 234-323 | Depois do login, procura a linha de `usuarios` por e-mail **ou** id (limit 1) e monta o perfil; se não achar, cria perfil **GESTOR** em memória (291-319) | Parcial. Liga por e-mail, não por `auth_user_id` (A-08, A-02) |
| Escuta de sessão | 326-373 | `getSession` + `onAuthStateChange`; no `SIGNED_OUT` limpa user e cache | Parcial. Sessão nula no `getSession` não limpa o `user` vindo do localStorage (A-05) |
| Sincronia perfil/permissões | 391-429 | Se a lista mudou, regrava o perfil de sessão; se `ativo === false`, desloga | Parcial. Só reage ao que a lista local mostra |
| `isGestor` | 472-479 | Verdadeiro se role GESTOR, ou permissão de controle de acessos, ou **cargo/nome contém "gest"** | Não é regra de servidor (A-03) |
| `temPermissao` | 482-494 | Gestor tem tudo; senão lê o JSON de permissões | Só cliente |
| `podeAcessarSecao` | 497-539 | Traduz seção do menu em permissões; usa `as any` em 5 chaves (507, 509, 513, 527, 533); `tarefas` cai no `default: true` (535) | Só cliente |
| `loginComResponsavel` | 542-582 | "Testar visão": troca o perfil de sessão para qualquer usuário da lista, **sem Supabase Auth** | Não. Impersonação só de tela; grava a chave `crm_empresa_ativa_id` que ninguém lê (A-11) |
| `loginComEmailSenha` / `login` | 587-640 | `signInWithPassword` e carrega perfil | **Sim** (único fluxo íntegro) |
| `cadastrarComEmailSenha` | 643-693 | `signUp` e, se falhar a conexão, cria colaborador **local** | Não é chamada por nenhuma tela (código morto, A-17); o ramo local (674-689) é perigoso |
| `deslogar` / `logout` | 696-745 | `signOut` e limpeza de chaves | Parcial. Não apaga o cache de usuários com senhas (A-06) |
| `criarColaborador` | 753-810 | Cria usuário em memória e faz `upsert` em `usuarios`; falha só vira `console.warn` (801-803); espelha no Firestore (806) | **Não.** Não cria usuário no Supabase Auth, então a pessoa criada não consegue entrar (A-01) |
| `atualizarColaborador` | 812-893 | Atualiza estado, cache e `upsert` (erro engolido 885-887) | Parcial |
| `alternarStatusColaborador` | 895-897 | `ativo` verdadeiro/falso via `atualizarColaborador` | Parcial. O Auth continua ativo (A-02) |
| `redefinirSenhaColaborador` | 899-901 | Grava a nova senha **em texto** em `usuarios.senha_hash` | **Não.** Não altera a senha real do Auth (A-01) |
| `excluirColaborador` | 903-939 | Soft delete (`deleted_at`) local e no banco; o parâmetro `hardDelete` não é usado por nenhuma tela e os dois ramos gravam igual | Parcial. O Auth continua válido e o usuário excluído reentra como GESTOR (A-02) |
| `resetarUsuariosPadrao` | 941-948 | Troca a lista local pelos 7 usuários seed | Só cliente. Botão com texto errado (A-13) |
| `validarSenhaGestor` | 950-965 | Compara o que o usuário digitou com a **senha em texto guardada na lista** de qualquer gestor ativo | Não. Usado em `SupabaseConfigView.tsx:305` para liberar apagar pacientes (A-07) |

### 2.2 EmpresaContext.tsx

| Função / fluxo | Linhas | O que faz | Ponta a ponta |
|---|---|---|---|
| Estado de empresas, membros, admins | 157-208 | Lê localStorage e **soma** os seeds que faltam (Agda e Lumina) | Não. Fonte de verdade é o navegador |
| Empresa ativa | 211-228, 384-389 | Define por `authEmpresaId`, localStorage ou `ID_EMPRESA_PADRAO`; força a empresa do usuário se não for superadmin | Só cliente |
| Carga de empresas | 256-323 | Lê `empresas` e assina realtime; **recria a assinatura a cada foco da janela** (307-312) | Sim para leitura |
| Membros e admins da plataforma | 175-208 | **Nunca são lidos do banco** neste contexto (só localStorage + seed) | Não (A-09) |
| `isPlataformaAdmin` | 327-341 | Verdadeiro para o e-mail fixo `caducanes@gmail.com`, o id `user-cadu` ou quem está na lista do localStorage | Só cliente (A-03) |
| `membroAtual` / `statusAcesso` / `isEmpresaSuspensa` | 344-427 | Calcula pendente, ativo, suspensa | **Calculado e nunca consumido** fora do contexto: nenhum arquivo usa `statusAcesso` nem `isEmpresaSuspensa` (A-10) |
| `config` | 430-475 | Mistura a empresa ativa com `CONFIGURACOES_PADRAO_EMPRESA` (dados da Agda) | Sim para a parte da empresa; o padrão vaza (A-12) |
| `criarEmpresa` | 485-562 | Cria empresa local, `salvarEmpresa` (erro engolido), vínculo de admin com id falso `user-adm-<timestamp>` | **Não.** `adminSenha` (`types.ts:101`) é ignorado; não cria Auth nem linha em `usuarios` (A-01) |
| `atualizarEmpresa` | 566-654 | Atualiza e faz upsert; se a empresa não está na lista usa uma **base fictícia da Agda** (574-599) | Parcial. Falha do banco vira `console.warn` (647-649) e retorna sucesso |
| `suspender` / `reativar` | 656-678 | Muda `status` | Parcial e sem efeito: ninguém bloqueia a empresa suspensa (A-10) |
| `excluirEmpresa` | 680-693 | Remove da lista local; não grava em lugar nenhum | **Não** (e nenhuma tela chama) |
| `vincularUsuarioEmpresa` | 696-728 | Cria membro local e tenta Supabase (erro ignorado) | Parcial; nenhuma tela chama |
| `transferir`, `alterarPapel`, `remover` membro | 730-776 | Só estado local (e Firestore nos dois primeiros) | **Não**; nenhuma tela chama |
| `promover` / `remover` admin da plataforma | 779-802 | Só estado local e Firestore; **não grava `plataforma_admins` no Supabase** | **Não** (A-09) |
| `atualizarConfig` e derivadas | 805-900 | Traduz formulário em `atualizarEmpresa` | Parcial |
| `uploadLogoArquivo` | 902-945 | Converte imagem de até 2 MB em data URL e salva dentro de `logo_url` | Sim, mas guardando base64 na linha da empresa e no localStorage (A-15) |
| `resetarConfiguracoes` | 947-949 | Reaplica o padrão da Agda na empresa ativa | Sim, e é destrutivo para outra empresa (A-12) |

### 2.3 LoginView.tsx

| Fluxo | Linhas | Observação |
|---|---|---|
| Formulário e-mail e senha | 14-39, 101-183 | Chama `login`. Neutro, sem texto de clínica (bom), salvo o placeholder `seu.email@clinica.com.br` (121) |
| Ramo "login curto" (só o início do e-mail) | `AuthContext.tsx:604-615` | O campo é `type="email" required` (113-114), então o navegador exige "@": o ramo nunca roda (A-17) |
| Ausências | n/a | Não há "esqueci a senha", nem convite, nem cadastro. O briefing deixa em aberto "autoatendimento, convite ou os dois" |
| Erro | 83-98 | Exibe `erroAuth`. Se o perfil falhar depois do login, `carregarPerfilUsuarioSupabase` engole o erro (320-322) e a tela fica sem mensagem |

### 2.4 ControleAcessosView.tsx

| Fluxo | Linhas | Ponta a ponta |
|---|---|---|
| Proteção da aba | 332-353 | Usa `isGestor` do cliente |
| Lista por empresa | 288-296 | Filtra no navegador; usuário sem empresa cai em `ID_EMPRESA_PADRAO` (293) |
| Novo colaborador / editar | 197-261, 824-1184 | Grava via `criarColaborador` / `atualizarColaborador`: ver A-01 |
| Senha visível e copiar | 594-629 | Mostra a senha em texto de todos os colaboradores (A-04) |
| "Testar visão" | 721-733 | `loginComResponsavel`: troca a identidade de tela sem Auth (A-11) |
| Ativar/desativar | 551-567 | Bloqueia só desativar a si mesmo; **permite desativar o último gestor** |
| Redefinir senha | 276-285, 1189-1236 | Não muda a senha real do login (A-01) |
| Excluir | 264-273 | Soft delete; o texto do modal diz "desativar" (1258) |
| Matriz de permissões | 1025-1155 | Mostra só **10 das 20** permissões; faltam leads perdidos, funil de conversão, configurações, painel da plataforma, negociação, consulta agendada, tarefas e as 4 permissões "sensíveis" (A-14) |
| Restaurar padrões | 493-506 | Texto cita a "Lumina Estética" mas carrega a lista seed inteira (A-13) |

### 2.5 ConfiguracoesEmpresaView.tsx

| Fluxo | Linhas | Ponta a ponta |
|---|---|---|
| Abas | 49, 428-513 | identidade, dados, estética, procedimentos, supabase, backup |
| Dados da clínica | 183-208 | `atualizarConfig` e portanto `empresas`: Parcial (A-16) |
| Logo | 148-180 | Data URL na linha da empresa (A-15) |
| Cores e presets | 211-300 | Persiste cada alteração com debounce de 250 ms regravando a linha inteira da empresa, inclusive o logo em base64 (263-265) |
| Formulário reiniciado por `config` | 98-123 | O efeito recarrega todo o formulário sempre que `config` muda; como o foco da janela refaz a carga das empresas (EmpresaContext 307-312), **edição não salva pode ser sobrescrita** (A-16, suspeita de comportamento a validar na tela) |
| Exportar JSON | 303-312 | Baixa só o `config`, não é backup real |
| Restaurar padrão | 315-344 | Reaplica dados e identidade da Agda (A-12) |
| Zerar leads | 347-362, 2064-2081 | Chama `limparTodosLeads` (apaga lead por lead). A tela não tem guarda própria: `isGestor` é lido na linha 67 e nunca usado |
| Aba Supabase e Procedimentos | 513, 2113 | Fora deste módulo |

### 2.6 PainelPlataformaView.tsx

| Fluxo | Linhas | Ponta a ponta |
|---|---|---|
| Guarda | 213-237 | `isPlataformaAdmin` do cliente |
| Métricas globais | 195-210, 427-430 | Soma `todosLeads`/`todasCompras`; o que chega depende da RLS (suspeita) |
| Nova / editar clínica | 113-159 | Ver `criarEmpresa` e A-01 |
| Trocar clínica ativa | 527 | Só muda o `empresaAtivaId` local; o servidor devolve só a primeira clínica em `get_user_empresa_id` (A-18) |
| Suspender / reativar | 554, 564 | Muda o campo; ninguém bloqueia (A-10) |
| Super admins | 161-176, 639 | Só localStorage (A-09); o id é falso `user-plat-<timestamp>` (166) |
| Aba "visão geral" | 59 | O tipo existe, a aba não (código morto) |

### 2.7 types.ts e estetica.ts

- `NivelAcesso` (132-137) e `PapelEmpresa` (36-41) são dois sistemas de papel diferentes (A-14).
- `PermissoesUsuario` (139-161) é o funil da clínica transformado em permissões (captação, negociação, pós-consulta, procedimento, nutrição...). Os 4 presets (163-250) têm os mesmos nomes. Para outro nicho essas chaves não fazem sentido.
- `estetica.ts`: o nome engana. "Estética" aqui é **tema visual** (cores), não o nicho de estética. Todo texto de interface mistura os dois sentidos ("Estéticas & Temas", "Salvar Estética"). `ESTETICAS_PRESET[0]` (linha 32) é o preset "Dra. Agda Rodrigues (Oficial)".

---

## 3. Tabela de achados

Esforço: P = até meio dia, M = 1 a 3 dias, G = mais de 3 dias ou exige decisão e migração.

| id | arquivo:linha | problema | impacto | correção sugerida | esforço |
|---|---|---|---|---|---|
| A-01 | `AuthContext.tsx:753-810`, `899-901`; `EmpresaContext.tsx:485-562`; `types.ts:101`; `supabaseService.ts:454-478` [FATO] | Criar colaborador, redefinir senha e criar empresa só mexem na tabela `usuarios`/`empresas`. Nenhum código cria ou altera usuário no Supabase Auth. `adminSenha` é ignorado. `usuarioToDb` não grava `auth_user_id` (a coluna existe em `supabase/schema.sql:139`). A "senha" vai em texto para a coluna `senha_hash` (`supabaseService.ts:462`) | Colaborador criado não entra. Senha "redefinida" não vale. Novo espaço não tem administrador que consiga logar. A tela diz sucesso nos três casos | Função de borda (Edge Function com chave de serviço) para convidar/criar usuário no Auth, gravar `auth_user_id`, e reset por e-mail. Remover o campo de senha do cadastro | G |
| A-02 | `AuthContext.tsx:291-319`, `903-939`, `895-897` [FATO no cliente; SUSPEITA no servidor] | Se o usuário autenticado não tem linha em `usuarios` (por exemplo foi excluído com `deleted_at`, filtrado na linha 246), o cliente cria um perfil **GESTOR** com `PERMISSOES_PRESET_GESTOR` na empresa padrão. Excluir ou desativar não revoga o Auth | Um usuário removido volta a ter menu de gestor na tela. Se a RLS ainda o aceitar, o dano passa da tela (verificar `get_user_empresa_id` e `handle_new_user`) | Sem linha ativa em `usuarios`: negar acesso e deslogar. Desativar deve também bloquear no servidor (flag lida pela RLS ou ban no Auth) | M |
| A-03 | `AuthContext.tsx:472-479`; `EmpresaContext.tsx:327-341`; `PainelPlataformaView.tsx:610` [FATO] | `isGestor` considera gestor qualquer cargo ou nome que contenha "gest" e quem tiver a permissão de controle de acessos. `isPlataformaAdmin` é o e-mail fixo `caducanes@gmail.com`, o id `user-cadu` ou uma lista no localStorage editável pelo usuário. Briefing: `role`/`permissoes` não valem no servidor | Autorização é decoração de tela. Um usuário que edite o próprio localStorage vê o painel da plataforma. Cargo "Gestora comercial" vira administrador | Papel e permissão lidos do banco por função segura usada na RLS (`is_platform_admin` única); `isGestor` só por `role`. Remover o e-mail fixo | G |
| A-04 | `ControleAcessosView.tsx:594-629`; `AuthContext.tsx:779`; `supabaseService.ts:462`, `486-490`; `AuthContext.tsx:34-47`; `seedData.ts:255-409` [FATO] | Senhas em texto: gravadas em `usuarios.senha_hash`, exibidas e copiáveis na tela, enviadas ao Firestore (`firestoreService.ts:265-274` salva o usuário inteiro) e padrão `Agda@2026` em 10 pontos do código mais 8 usuários seed | Qualquer gestor vê a senha de todos. Vazamento do banco expõe credenciais reais se alguém usar a senha dada | Eliminar `senhaPadrao` do tipo e do banco (coluna `senha_hash` legada: migração de remoção após A-01). Parar de espelhar usuário no Firestore | M |
| A-05 | `AuthContext.tsx:110-141`, `333-341`, `344-357` [FATO] | A tela entra como logada a partir do localStorage mesmo sem sessão Supabase: `getSession` sem sessão só desliga o carregamento e não limpa `user`. O callback de `onAuthStateChange` é assíncrono e faz consultas dentro dele (padrão que o supabase-js desaconselha, SUSPEITA de travamento) | Interface de usuário "logado" com RLS devolvendo vazio: parece falha de dados. Qualquer pessoa com um JSON no localStorage vê a casca do sistema | Fonte única: a sessão do Supabase. Sem sessão, `user = null`. Tirar `await` de dentro do callback (agendar com `setTimeout`) | M |
| A-06 | `AuthContext.tsx:147-167`, `696-745`; `EmpresaContext.tsx:231-253` [FATO] | O logout remove só chaves com "sessao", "sb-" etc. As chaves `crm_agda_rodrigues_usuarios_cache_v1`, `crm_multiempresa_empresas_v1`, `..._membros_v1` e `..._plat_admins_v1` ficam. O cache de usuários tem senha em texto | Em computador compartilhado o próximo usuário herda lista de pessoas, empresas e senhas | Parar de persistir esses dados (A-09); no logout apagar tudo com o prefixo `crm_` | P |
| A-07 | `AuthContext.tsx:950-965`; `SupabaseConfigView.tsx:305-314` [FATO] | `validarSenhaGestor` confere com a senha em texto de **qualquer** gestor ativo, sem diferenciar maiúscula, e não com a senha real do Auth | A trava "confirme sua senha" antes de apagar pacientes protege pouco. Se a coluna ficar vazia, a trava passa a aceitar `Agda@2026` | Reautenticar com `signInWithPassword` do próprio usuário. Confirmar no servidor | M |
| A-08 | `AuthContext.tsx:242-247`, `376-388`, `supabaseService.ts:480-505` [FATO] | O usuário do Auth e a linha de `usuarios` são ligados por e-mail ou id. O id local (`user-<uuid>`) vira outro UUID por hash em `normalizarUuid` (`supabaseService.ts:64-80`). `limit(1)` sem ordenação. `handle_new_user` (briefing) cria outra linha para o mesmo e-mail | Dois registros para a mesma pessoa; o `limit(1)` pega um deles. Mesmo e-mail em duas empresas é ambíguo | Ligar por `auth_user_id`. Uma linha por (usuário, empresa) numa tabela de vínculo; escolher a empresa por seleção | G |
| A-09 | `EmpresaContext.tsx:175-208`, `730-802`; `supabaseService.ts:1305-1340` [FATO] | Membros e superadmins só existem em localStorage e seed. Só `criarEmpresa` e `vincularUsuarioEmpresa` tentam gravar `empresa_membros` (e engolem o erro). Transferir, alterar papel, remover, promover e remover admin nunca gravam no Supabase | "Adicionar Super Admin" vale só naquele navegador. Vínculo de membro some ou diverge por máquina | Tabelas `empresa_membros` e `plataforma_admins` como fonte de verdade, com leitura e escrita pelo contexto. Ou remover o conceito até existir convite (decisão do Arquiteto) | G |
| A-10 | `EmpresaContext.tsx:414-427`; `App.tsx:55-80`; `PainelPlataformaView.tsx:554-564` [FATO] | `statusAcesso`, `isEmpresaSuspensa` e `membroAtual` são calculados, mas nenhum componente os lê. A App só testa `user` | "Suspender empresa" não bloqueia ninguém. Usuário pendente também não é barrado | Bloqueio na App com tela "acesso pendente/suspenso" e a mesma regra na RLS | M |
| A-11 | `ControleAcessosView.tsx:721-733`; `AuthContext.tsx:542-582` [FATO] | "Testar visão" troca a identidade local para qualquer usuário, incluindo outra empresa, e grava `crm_empresa_ativa_id` (575), chave que nenhum código lê | Mostra permissões de outro perfil sem validar nada no servidor; dá a impressão de teste real. Chave morta | Trocar por "Pré-visualizar menu" (só simulação visual, sem gravar sessão) ou remover | P |
| A-12 | `EmpresaContext.tsx:43-63`, `462-470`, `574-599`, `947-949`; `supabaseService.ts:1147`, `1157`, `152-157`; `ConfiguracoesEmpresaView.tsx:315-344` [FATO] | Qualquer campo vazio de qualquer empresa cai nos dados da Agda: CNPJ `45.123.456/0001-89`, telefone, e-mail, endereço da Faria Lima, horário, "Consultório Principal - Sala 1402". "Restaurar padrão oficial" reescreve a empresa ativa com esses dados. `atualizarEmpresa` inventa uma empresa "Dra. Agda Rodrigues" quando não acha a real | Empresa nova mostra CNPJ e endereço de outra clínica e os envia ao banco ao salvar. Exportar JSON leva dados de outro cliente | Padrão neutro vazio (`''`). "Restaurar" volta ao último valor salvo no banco, não a um seed. Remover a base fictícia | M |
| A-13 | `ControleAcessosView.tsx:497`, `924`, `937`, `103`, `115`, `136`, `750` [FATO] | Botão "restaurar padrões" fala da "Lumina Estética" e carrega a equipe seed (incluindo a Agda). Placeholders citam Lumina. Senha inicial `Agda@2026` fixa | Gestor de outra empresa recebe usuários fictícios e senha conhecida | Remover o botão. Placeholders neutros. Sem senha inicial (convite por e-mail) | P |
| A-14 | `types.ts:36-41`, `132-161`, `163-250`; `ControleAcessosView.tsx:966-1155`; `AuthContext.tsx:497-539` [FATO] | Dois sistemas de papel (`PapelEmpresa` do vínculo e `NivelAcesso` do usuário) sem relação. As permissões são o funil de estética. 4 permissões nunca são lidas por nenhum código: `podeExcluirRegistros`, `podeExportarRelatorios`, `podeVisualizarValores`, `podeEditarFichaClinica` (grep sem resultado fora de types, seed e presets). `podeAcessarTarefas` também nunca é lida. A tela só deixa marcar 10 de 20 | Gestor acredita que bloqueou exclusão ou valores e não bloqueou. Não dá para conceder "Funil" ou "Leads perdidos" individualmente. Papéis "MEDICO" e "POS_VENDA" não servem a outro nicho | Um só modelo: papéis e permissões por **ação** (ver, criar, editar, excluir, exportar, ver valores) e por **módulo** lido do modelo de nicho; aplicar na RLS | G |
| A-15 | `EmpresaContext.tsx:902-945`; `ConfiguracoesEmpresaView.tsx:263-265`; `supabaseService.ts:120` [FATO] | Logo de até 2 MB entra como base64 dentro da linha da empresa e é copiado para o localStorage. Cada ajuste de cor (debounce de 250 ms) regrava a linha toda com o logo | Linha pesada, localStorage pode estourar sem aviso (`try/catch` vazio), tráfego desnecessário | Subir o logo para Storage e guardar só a URL. Salvar cores em um único botão ou debounce maior | M |
| A-16 | `ConfiguracoesEmpresaView.tsx:98-123`, `183-208`; `EmpresaContext.tsx:307-312`, `643-649`; `supabaseService.ts:1180-1240` [FATO; efeito na tela é SUSPEITA] | O `salvarEmpresa` tenta 4 cargas cada vez menores até uma passar, descartando colunas sem avisar. Falha total vira só `console.warn` e a tela diz "salvas com sucesso". O formulário é reiniciado por `config` e o foco da janela recarrega as empresas | Dados que somem sem aviso (registro profissional, horário). Edição não salva pode ser apagada ao voltar à aba | Um único `upsert` com colunas conhecidas, erro propagado e exibido. Só reiniciar o formulário quando muda a empresa, não a cada `config` | M |
| A-17 | `AuthContext.tsx:604-615`, `643-693`, `983-987`; `LoginView.tsx:34` [FATO] | Código sem uso real: ramo de login curto (campo é `type=email`), `cadastrarComEmailSenha` (nenhuma tela chama), ramo local de cadastro (674-689), aliases `login`/`loginComEmailSenha` e `logout`/`deslogar` | Confunde quem lê; o ramo local cria usuário sem Auth | Ver lista "limpar agora" | P |
| A-18 | `EmpresaContext.tsx:391-404`, `359-389`; `PainelPlataformaView.tsx:527`; briefing [FATO no cliente; SUSPEITA no servidor] | Trocar de empresa só muda o estado local. `get_user_empresa_id` devolve só a primeira clínica. A empresa do usuário é deduzida de 5 fontes (Auth, membros locais, seed) | Superadmin troca de clínica e pode continuar vendo ou gravando dados da primeira. Usuário em duas empresas não consegue escolher | Empresa ativa vem de vínculo no banco e vai em cada consulta; RLS por pertencimento (vários vínculos) | G |
| A-19 | `PainelPlataformaView.tsx:161-176`, `EmpresaContext.tsx:541-553` [FATO] | Ids falsos `user-plat-<timestamp>` e `user-adm-<timestamp>` passam por hash para UUID e nunca correspondem a um usuário do Auth | Vínculos órfãos que nunca ligam a uma pessoa real | Resolvido junto de A-01 e A-09 | M |
| A-20 | `EmpresaContext.tsx:130-154` [FATO] | `useAuth()` dentro de `try/catch`; as props `userAuthEmail` e `userAuthId` não são passadas em `main.tsx:11-16`. `isCarregando` nunca muda de `false`. `generateId(_prefix)` ignora o argumento | Código de defesa para um cenário que não existe | Ver "limpar agora" | P |
| A-21 | `types.ts:443-447`, `supabaseService.ts:454-478`; `ControleAcessosView.tsx:906-916` [FATO] | O campo "Login / Usuário (apelido)" é pedido e mostrado, mas `usuarioToDb` não o grava e o login não o usa. `ultimoAcesso` nunca é atualizado por código | Campo que parece funcionar e se perde ao recarregar. "Último acesso" sempre velho | Remover o apelido e o campo de último acesso, ou implementar atualização no login | P |
| A-22 | `types.ts:56-69` e `EmpresaContext.tsx:518-519`; `PainelPlataformaView.tsx:200`, `322-326` [FATO] | `Empresa.totalUsuarios` e `totalPacientes` são gravados como 1 e 0 na criação e nunca recalculados; o painel calcula por conta própria. `statsGlobais.totalUsuarios` conta usuários carregados de todas as empresas, mas não aparece como cartão | Dois números diferentes para a mesma coisa | Remover os campos da empresa; calcular com `count` | P |
| A-23 | `estetica.ts:1-62`, `4-6`, `98-100`, `119-121` [FATO] | Os valores de reserva `|| '#...'` são redundantes (o preset 0 já tem tudo). O comentário promete "garantia de contraste" e não há cálculo de contraste. A fórmula chamada de "luminância relativa ITU-R BT.709" usa cores sem linearizar | Sem risco, só texto enganoso e código a mais | Simplificar e corrigir comentários; nomear "tema" em vez de "estética" | P |
| A-24 | `ConfiguracoesEmpresaView.tsx:67`, `2064-2081`; `Sidebar.tsx:143-160`, `274-282` [FATO] | `isGestor` lido e não usado. A tela de Configurações (inclusive "Zerar banco de leads") só é protegida por esconder o item do menu | Quem chegar à seção apaga todos os leads da empresa ativa | Guarda dentro da tela, como existe em `ControleAcessosView.tsx:332`; e permissão no servidor | P |
| A-25 | `AuthContext.tsx:201`, `258`, `299`, `779`; `supabaseService.ts:462`, `490` [FATO] | Dez pontos do código (fora o seed) usam o literal `Agda@2026` como senha de reserva ou inicial | Se a coluna vier vazia, o sistema "vê" essa senha | Sai junto de A-04 | P |

---

## 4. Duplicações

| Item | Onde | Observação |
|---|---|---|
| Montagem de `ResponsavelPerfil` a partir de `UsuarioColaborador` | `AuthContext.tsx:253-266`, `409-422`, `434-447`, `549-562`, `862-875` | Cinco cópias do mesmo bloco de 12 campos. Um mapeador resolve |
| Preset por role | `AuthContext.tsx:829-834` e `ControleAcessosView.tsx:168-172` | Mesma troca role para preset, duas vezes |
| `empresaId` e `empresa_id` | `types.ts:443-444`, usos `AuthContext.tsx:46`, `251`, `421`, `446`, `547`, `757-762` | O tipo tem os dois nomes e o código sempre testa os dois |
| `ID_EMPRESA_PADRAO` | `seedData.ts:16` e `supabaseService.ts:29` | Duas definições do mesmo valor; `AuthContext` importa de uma, `ControleAcessosView` de outra |
| Dois sistemas de papel | `PapelEmpresa` (`types.ts:36-41`) e `NivelAcesso` (`types.ts:132-137`) | Ver A-14 |
| Dois destinos de gravação | Supabase e Firestore em `criarColaborador`, `atualizarColaborador`, `criarEmpresa`, `atualizarEmpresa` | O briefing não cita Firestore como destino; espelhar usuário e empresa ali dobra o risco (A-04) |
| Apagar chaves de sessão | `AuthContext.tsx:710-711` | A mesma chave removida duas vezes (a linha 711 repete 710) |
| Fallback de cores | `estetica.ts:34-60` | `padrao.x || '#...'` repetido 20 vezes |
| Aliases | `AuthContext.tsx:983-987` | `login`=`loginComEmailSenha`; `logout`=`deslogar` |
| Fallback de gestor fictício | `AuthContext.tsx:291-319` e `452-466` | Duas rotas diferentes que fabricam um perfil GESTOR |
| Atualização do cache de usuários | `AuthContext.tsx:161-167`, `206-208`, `855-857` | Três lugares gravam o mesmo cache |

## 5. Código morto

| Item | Evidência |
|---|---|
| `PERFIS_RESPONSAVEIS` | `AuthContext.tsx:34-47`; nenhum outro arquivo importa |
| `cadastrarComEmailSenha` | Exposto em `AuthContext.tsx:986`; nenhuma tela o chama |
| Ramo "login curto" | `AuthContext.tsx:604-615`; campo `type="email"` em `LoginView.tsx:113` |
| `logout`, `loginComEmailSenha` (exposto) | Só `login` e `deslogar` são usados (`LoginView`, `Sidebar`) |
| `hardDelete` em `excluirColaborador` | `AuthContext.tsx:903-920`; nenhuma chamada passa `true` |
| `statusAcesso`, `isEmpresaSuspensa`, `membroAtual`, `isCarregando` | `EmpresaContext.tsx:344-427`; sem consumidor |
| `excluirEmpresa`, `vincularUsuarioEmpresa`, `transferirUsuarioEmpresa`, `alterarPapelMembro`, `removerAcessoUsuario` | Sem chamada em nenhuma tela. No Painel, `excluirEmpresa`, `empresaMembros`, `vincularUsuarioEmpresa` e `removerAcessoUsuario` só são desestruturados (`PainelPlataformaView.tsx:39,43-45`) |
| `userAuthEmail`/`userAuthId` do `EmpresaProvider` | `EmpresaContext.tsx:131-134`; `main.tsx` não os passa |
| `CONFIGURACOES_PADRAO` (alias) | `EmpresaContext.tsx:63`; usado só por `ConfiguracoesEmpresaView.tsx:37` |
| `iniciarEscutaSupabaseConfigFirestore` | `lib/supabase.ts:165-167` devolve função vazia, mas `App.tsx:50-53` o chama achando que escuta credenciais |
| Aba `visao_geral` | `PainelPlataformaView.tsx:59`; nenhum botão nem bloco |
| Chaves de localStorage mortas | `crm_empresa_ativa_id` (`AuthContext.tsx:575`), `crm_sessao_responsavel_v2` e `crm_leads_col_widths_v2` (713-714; chaves antigas) |
| Importações sem uso | `ControleAcessosView.tsx`: `AtualizarUsuarioPayload` (41), `CriarUsuarioPayload` (40), `Building2` (31), `ChevronRight` (29), `DollarSign` (26), `FileText` (27), `HelpCircle` (28), `PhoneCall` (23), `RefreshCw` (24), `Sparkles` (17), `Stethoscope` (22), `Unlock` (7), `XCircle` (9). `PainelPlataformaView.tsx`: `Clock` (19), `ExternalLink` (21), `Layers` (23), `PapelEmpresa` (28), `Sparkles` (20). `EmpresaContext.tsx`: `obterCoresSidebarCompletas` (30). `ConfiguracoesEmpresaView.tsx`: `ConfiguracoesEmpresa` (41), variável `isGestor` (67) |
| Permissões que nada lê | `podeExcluirRegistros`, `podeExportarRelatorios`, `podeVisualizarValores`, `podeEditarFichaClinica`, `podeAcessarTarefas` |
| Campos sem efeito | `UsuarioColaborador.login` (`types.ts:447`), `ultimoAcesso` (456), `Empresa.totalUsuarios/totalPacientes` (67-68) |

## 6. Estado que está só no navegador e deveria estar no banco

| Chave localStorage | Onde | O que guarda | Deveria |
|---|---|---|---|
| `crm_agda_rodrigues_auth_sessao_v1` | `AuthContext.tsx:49` | Perfil e permissões do usuário logado | Não guardar: a sessão vem do Auth; perfil e permissões vêm do banco a cada carga |
| `crm_agda_rodrigues_usuarios_cache_v1` | `AuthContext.tsx:50`, `161-167` | Todos os usuários, com senha em texto | Não persistir |
| `crm_multiempresa_empresas_v1` | `EmpresaContext.tsx:37`, `231-235` | Todas as empresas (com logo base64) | Só no banco; cache opcional sem logo |
| `crm_multiempresa_membros_v1` | `EmpresaContext.tsx:38`, `237-241` | Vínculos usuário-empresa | Banco (`empresa_membros`), lido e escrito |
| `crm_multiempresa_plat_admins_v1` | `EmpresaContext.tsx:39`, `243-247` | Superadministradores | Banco (`plataforma_admins`) com checagem no servidor |
| `crm_multiempresa_empresa_ativa_id_v1` | `EmpresaContext.tsx:40`, `249-253` | Empresa ativa | Preferência do usuário; a autorização da empresa deve ser do servidor |
| `crm_empresa_ativa_id` | `AuthContext.tsx:575` | Nada lê | Remover |
| `crm_supabase_config_v1` | citado em `AuthContext.tsx:727` | Credenciais do Supabase do navegador | Fora deste módulo; preservado no logout, ver Relatório de integração |

Dados que **já** estão no banco, mas por caminho frágil: tema e logo da empresa (`empresas.estetica_config`, `logo_url`), com os fallbacks do achado A-16.

## 7. O que impede vários nichos e espaços de trabalho

| Bloqueio | Evidência | Efeito |
|---|---|---|
| Clínica fixa por id | `ID_EMPRESA_PADRAO` em 88 pontos do `src`; no módulo: `AuthContext.tsx:17,46,120,251,306,313,421,446,465,547,688,762`; `EmpresaContext.tsx:217,410,688`; `ControleAcessosView.tsx:238,289,293` | Qualquer dado sem empresa cai na clínica 1 |
| Dados cadastrais da Agda como padrão | `EmpresaContext.tsx:43-61`, `462-470`, `574-599` | Vaza CNPJ, endereço e telefone para outras empresas (A-12) |
| Seed no código de produção | `seedData.ts:23-425` (Agda, Lumina, superadmin, 7 usuários com `Agda@2026`); usado em `AuthContext.tsx:157`, `942`; `EmpresaContext.tsx:164,171,182,189,200,207,373-379` | Toda máquina nova começa com empresas e pessoas fictícias; as listas de responsáveis e profissionais de outras telas usam `SEED_USUARIOS` (`FichaLeadModal.tsx:152,306-311`, `ConsultasAgendadasView.tsx:411,1277`), fora deste módulo |
| "Dra. Agda" em texto de tela | `ConfiguracoesEmpresaView.tsx:318`, `895`, `901`, `974`, `990`, `1866`, `1872`, `1974`, `1980`; `EmpresaContext.tsx:44-45`; `types.ts:295-297` (preset oficial) | Visual de prévia e mensagens citam a Agda e "Gestora Master" |
| Texto de estética e medicina na interface | `ControleAcessosView.tsx:433` "Médicas & Injetoras", `475-478`, `657-660`, `790` ("médicas, biomédicas"), `969-985` (descrições dos perfis); `ConfiguracoesEmpresaView.tsx:2072-2075`, `2126-2137` ("pacientes", "fichas clínicas"); `PainelPlataformaView.tsx:301` "Pacientes Registrados" | Consultoria, restaurante ou academia veriam vocabulário de clínica. "Cliente", "paciente", "lead" devem vir do modelo de nicho |
| Regra de comissão da Agda no cadastro de acesso | `ControleAcessosView.tsx:980`, `1138` ("BON-001") | Regra comercial de uma clínica virou permissão do produto |
| Permissões e menu = funil da estética | `types.ts:1-18`, `139-161`; `AuthContext.tsx:497-539` | O funil por nicho (decisão do briefing) exige permissões por módulo vindas do modelo |
| Nome "estética" para tema | `estetica.ts`, `types.ts:256-419`, `EmpresaContext.tsx:20-21`, `ConfiguracoesEmpresaView.tsx:1129`, `1142` | Ambiguidade com o nicho "estética"; presets de cores com nome de clínica |
| Superadministrador fixo no código | `EmpresaContext.tsx:331`; `PainelPlataformaView.tsx:610`; `seedData.ts:23-35` | Produto público não pode ter e-mail de pessoa embutido |
| Uma empresa por usuário | `get_user_empresa_id` (briefing); `AuthContext.tsx:242-247` (limit 1); `handle_new_user` (briefing) | Pessoa em dois espaços não escolhe; novo cadastro cai no espaço 1 |
| Cadastro público sem desenho | `LoginView.tsx` sem cadastro; `cadastrarComEmailSenha` sem uso; briefing: pergunta em aberto | Antes do autoatendimento: convite ou cadastro + criação do espaço |

---

## 8. Lista "limpar agora" (seguro, sem mudar comportamento)

Cada item só remove o que nenhuma tela chama ou texto que não afeta a lógica. Cada uma precisa de `tsc` e de abrir as telas de login, acessos, configurações e painel para conferir.

1. Apagar as importações sem uso: lista completa na seção 5 (`ControleAcessosView.tsx`, `PainelPlataformaView.tsx`, `EmpresaContext.tsx:30`, `ConfiguracoesEmpresaView.tsx:41`).
2. Remover `const { isGestor } = useAuth();` em `ConfiguracoesEmpresaView.tsx:67` (variável sem uso; a guarda de A-24 é mudança de comportamento e fica de fora desta lista).
3. Em `PainelPlataformaView.tsx:39,43-45` tirar `excluirEmpresa`, `empresaMembros`, `vincularUsuarioEmpresa`, `removerAcessoUsuario` da desestruturação, e o `'visao_geral'` do tipo na linha 59.
4. Apagar `PERFIS_RESPONSAVEIS` e a interface se ninguém mais usar (`AuthContext.tsx:19-47`; manter `ResponsavelPerfil`, usada no contexto).
5. Apagar a linha duplicada `AuthContext.tsx:711`.
6. Remover o parâmetro `hardDelete` de `excluirColaborador` e o ramo morto (`AuthContext.tsx:903-920`), já que nenhuma chamada o usa e os dois ramos gravam igual no banco.
7. Remover o ramo "login curto" `AuthContext.tsx:604-615`, mantendo a validação de "@" que o campo já faz.
8. Remover os aliases `loginComEmailSenha` e `logout` do valor do contexto (`AuthContext.tsx:984,987` e do tipo, 90 e 94) e usar `login` e `deslogar`, que são os únicos consumidos. `LoginView.tsx:17,34` passa a chamar só `login`.
9. Remover `userAuthEmail` e `userAuthId` de `EmpresaProvider` (`EmpresaContext.tsx:131-139`) e o estado `isCarregando` (`220`, `89`, `963`, `EmpresaContext` valor 964), pois nunca mudam.
10. Remover a escrita da chave morta `crm_empresa_ativa_id` (`AuthContext.tsx:575`) e as remoções das chaves antigas `crm_sessao_responsavel_v2` e `crm_leads_col_widths_v2` só depois de confirmar com o Carlos que nenhum navegador usa mais (a remoção do `crm_leads_col_widths_v2` apaga preferência de largura de colunas, então deixe essa chave).
11. Trocar os comentários que prometem o que o código não faz: `estetica.ts:4-5` ("garantia de contraste"), `estetica.ts:98-100`, `lib/supabase.ts:165` (função vazia). Texto, sem efeito.
12. Corrigir só os textos sem efeito lógico: `ControleAcessosView.tsx:497` (cita "Lumina"), `924` e `937` (placeholders de Lumina) para exemplos neutros; `LoginView.tsx:121` placeholder neutro.
13. Remover `setUsuarios`/`localStorage.setItem` repetidos de `AuthContext.tsx:206-208` e `855-857` **somente se** o efeito das linhas 161-167 for mantido (ele já grava o mesmo cache a cada mudança).

Ficam fora da limpeza segura, por mudar comportamento: tudo de A-01 a A-04, A-05, A-07 a A-10, A-12, A-14, A-16, A-18 e a remoção do botão de restaurar padrões (A-13), das permissões sem leitura e dos campos `login`/`ultimoAcesso`.

## 9. Ordem sugerida para o próximo ciclo

1. Decisão do Arquiteto sobre o modelo de acesso: vínculo usuário-espaço, papéis e permissões por módulo e por ação, convite ou autoatendimento (A-08, A-14, A-18).
2. Criação de usuário e reset de senha por função de borda com Supabase Auth (A-01), e então remover senha de tela e de banco (A-04, A-25).
3. Autorização no servidor: RLS por vínculo, `is_platform_admin` única, bloqueio de empresa suspensa e de usuário inativo (A-02, A-03, A-10). Apoio do relatório de Segurança.
4. Tirar o seed e o padrão da Agda do código (A-12, A-13), depois mover o menu e o vocabulário para o modelo de nicho.
5. Só então simplificar contextos (duplicações da seção 4).

Contexto do banco vivo usado como informado no pedido e no `BRIEFING-CRM.md`: `get_user_empresa_id` devolve só a primeira clínica; `handle_new_user` põe novo usuário inativo na primeira empresa; `usuarios.senha_hash` legado; `role` e `permissoes` não valem no servidor. Itens marcados como SUSPEITA devem ser confirmados com consulta de leitura pelo agente de Segurança.
