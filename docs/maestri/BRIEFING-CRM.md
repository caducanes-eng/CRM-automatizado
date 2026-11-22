# Briefing: CRM público para profissionais e estabelecimentos

## Produto
CRM em que cada profissional ou estabelecimento tem seu **espaço de trabalho isolado**, com funil, campos e linguagem do seu **nicho**. Hoje atende duas clínicas de estética (Agda e Lapelle). Meta: qualquer nicho, incluindo a consultoria do Carlos.

## Decisões (ver DECISOES.md)
- Fase 1 é limpar e dar clareza ao back end. Funções novas só depois.
- Isolamento por espaço de trabalho no servidor (RLS), nunca só no navegador.
- Funil, etapas e campos configuráveis por nicho, a partir de modelos.
- Migração dos dados atuais sem perda, testada antes.

## Estado do back end vivo (22/11/2026, só leitura)
- Políticas por clínica via `get_user_empresa_id()`, que devolve só a primeira clínica do usuário.
- `handle_new_user` coloca todo novo usuário, inativo, na primeira empresa.
- 8 situações de lead fixas em texto; `status_venda` com 3 valores travados.
- `usuarios.role` e `permissoes` não são consultados por nenhuma política.
- `usuarios.senha_hash` convive com o Supabase Auth.
- `diagnosticos` (site de consultoria) aceita inserção anônima e nenhum usuário logado a lê.
- 11 chaves estrangeiras sem índice; 34 avisos de políticas duplicadas; tabela `zz_import_firestore` sem política; funções `is_platform_admin` e `is_plataforma_admin` duplicadas.
- Repositório não versiona o DDL real (`supabase/schema.sql` diverge do banco).

## Perguntas em aberto
- Cadastro público: autoatendimento, convite ou os dois.
- A partir de quantos dias sem resposta um lead conta como parado (por nicho).
- Quais campos mínimos cada nicho exige.
