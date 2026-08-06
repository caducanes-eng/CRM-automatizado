# Arquitetura de Banco de Dados Supabase (PostgreSQL 15+)

## Visão Geral
Esta arquitetura foi projetada para suportar o CRM Inteligente com alto desempenho, integridade referencial estrita, auditoria, versionamento otimista e conformidade com as diretrizes do projeto (`PROJECT_RULES.md`).

---

## 1. Regras de Governança Obrigatórias

Todas as tabelas implementam os 5 campos essenciais de governança:
1. **`id`**: Identificador único global `UUID` (gerado por `gen_random_uuid()`).
2. **`created_at`**: Timestamp com fuso horário da criação (`TIMESTAMPTZ DEFAULT now()`).
3. **`updated_at`**: Timestamp com fuso horário da última modificação (`TIMESTAMPTZ DEFAULT now()`).
4. **`deleted_at`**: Soft delete (`TIMESTAMPTZ NULL`). Registros ativos possuem `deleted_at IS NULL`.
5. **`version`**: Controle de concorrência otimista (`INTEGER DEFAULT 1`), incrementado automaticamente a cada `UPDATE` via trigger no PostgreSQL.

---

## 2. Mapa das 10 Tabelas

| Tabela | Responsabilidade | Relacionamentos |
|---|---|---|
| **`empresas`** | Cadastro da clínica, configurações de marca, monograma e identidade visual | Raiz multi-inquilino |
| **`usuarios`** | Perfis de colaboradores, médicos, secretárias e gestores | `empresa_id -> empresas(id)` |
| **`procedimentos`** | Catálogo oficial de procedimentos, valores de tabela e prazos de reativação | `empresa_id -> empresas(id)` |
| **`leads`** | Pacientes, contatos, situação no funil e valores potenciais | `empresa_id -> empresas(id)` |
| **`fichas_leads`** | Dados cadastrais e clínicos complementares (1:1 com `leads`) | `lead_id (UNIQUE) -> leads(id)` |
| **`compras`** | Histórico financeiro e procedimentos realizados (N:1 com `leads`) | `lead_id -> leads(id)`, `procedimento_id -> procedimentos(id)` |
| **`historico_atendimentos`** | Linha do tempo cronológica e imutável de interações | `lead_id -> leads(id)`, `usuario_id -> usuarios(id)` |
| **`tarefas`** | Cadência comercial e tarefas pendentes | `lead_id -> leads(id)`, `usuario_id -> usuarios(id)` |
| **`workflows_automacoes`** | Motor de workflows configurável (orientado a eventos) | `empresa_id -> empresas(id)` |
| **`logs_auditoria`** | Registro imutável de alterações (dados anteriores e novos em JSONB) | `empresa_id -> empresas(id)` |

---

## 3. Triggers Automáticos de Atualização

```sql
CREATE OR REPLACE FUNCTION set_updated_at_and_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Como Executar no Supabase

1. Acesse o **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Selecione seu projeto.
3. No menu lateral esquerdo, clique em **SQL Editor**.
4. Abra o arquivo `supabase/schema.sql` deste projeto (ou copie direto da aba **Configurações da Clínica → Banco de Dados Supabase** no CRM).
5. Cole no editor e clique em **Run**.
6. Suas 10 tabelas, índices e triggers estarão prontos para receber dados em tempo real.
