-- HARNESS DE COMPORTAMENTO (rascunho). Rodar SOMENTE em branch de desenvolvimento.
-- Uso: rodar ANTES e DEPOIS de cada migracao, salvar as duas saidas e comparar (diff vazio = comportamento igual).
-- Para cada usuario vinculado ao Auth, para o admin da plataforma e para um usuario sem vinculo, mede:
--   contagem de linhas visiveis por tabela, tentativa de gravar em outra empresa, e na propria.
-- Tudo ocorre numa transacao revertida (ROLLBACK). Nao imprime nome, e-mail nem telefone: so rotulos u1, u2...
begin;
create or replace function pg_temp.sonda() returns table(sujeito text, objeto text, acao text, resultado text)
language plpgsql as $f$
declare
  s record; t text; n bigint; own uuid; outra uuid; ok boolean;
  tabelas text[] := array['empresas','empresa_membros','plataforma_admins','usuarios','procedimentos','leads',
    'fichas_lead','compras','historico_atendimentos','tarefas','workflows_automacoes','logs_auditoria',
    'kpis_secretaria_mensal','diagnosticos','vw_agendamentos','vw_indicadores_tarefas'];
begin
  for s in
    select 'u'||row_number() over (order by id) as rotulo, auth_user_id as uid
      from public.usuarios where auth_user_id is not null and ativo and deleted_at is null
    union all select 'admin_plat'||row_number() over (order by id), user_id from public.plataforma_admins where deleted_at is null
    union all select 'sem_vinculo', '00000000-0000-0000-0000-00000000dead'::uuid
    order by 1
  loop
    perform set_config('request.jwt.claim.sub', s.uid::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s.uid, 'role', 'authenticated')::text, true);
    -- empresa "propria" = primeira empresa ativa do usuario (mesma regra de get_user_empresa_id)
    select coalesce(
      (select u.empresa_id from public.usuarios u where u.auth_user_id = s.uid and u.ativo and u.deleted_at is null order by u.created_at limit 1),
      (select m.empresa_id from public.empresa_membros m where m.user_id = s.uid and m.ativo and m.deleted_at is null order by m.created_at limit 1)) into own;
    select e.id into outra from public.empresas e where e.id is distinct from own order by e.id limit 1;
    set local role authenticated;
    foreach t in array tabelas loop
      begin
        execute format('select count(*) from public.%I', t) into n;
        return query select s.rotulo, t, 'select_count', n::text;
      exception when others then
        return query select s.rotulo, t, 'select_count', 'ERRO '||sqlstate;
      end;
    end loop;
    -- a funcao auxiliar continua executavel por quem esta logado e devolve a mesma empresa
    begin
      execute format('select %s()', coalesce(to_regproc('private.get_user_empresa_id')::text, 'public.get_user_empresa_id')) into own;
      return query select s.rotulo, 'get_user_empresa_id', 'igual_a_regra', (own is not distinct from (select coalesce(
        (select u.empresa_id from public.usuarios u where u.auth_user_id = s.uid and u.ativo and u.deleted_at is null order by u.created_at limit 1),
        (select m.empresa_id from public.empresa_membros m where m.user_id = s.uid and m.ativo and m.deleted_at is null order by m.created_at limit 1))))::text;
    exception when others then
      return query select s.rotulo, 'get_user_empresa_id', 'igual_a_regra', 'ERRO '||sqlstate;
    end;
    -- gravacao em OUTRA empresa e na PROPRIA (cada tentativa desfeita por subtransacao)
    foreach t in array array['leads','procedimentos','usuarios'] loop
      for ok in select unnest(array[false, true]) loop
        begin
          if (case when ok then own else outra end) is null then
            return query select s.rotulo, t, case when ok then 'insert_propria' else 'insert_outra' end, 'sem_empresa';
          else
            if t = 'leads' then insert into public.leads(empresa_id, nome) values (case when ok then own else outra end, '__sonda__');
            elsif t = 'procedimentos' then insert into public.procedimentos(empresa_id, nome) values (case when ok then own else outra end, '__sonda__');
            else insert into public.usuarios(empresa_id, nome, email, cargo, ativo) values (case when ok then own else outra end, '__sonda__', '__sonda__@invalido.test', 'x', false);
            end if;
            return query select s.rotulo, t, case when ok then 'insert_propria' else 'insert_outra' end, 'permitido';
            raise exception using errcode = 'P0001', message = 'desfaz_sonda';
          end if;
        exception when others then
          if sqlerrm <> 'desfaz_sonda' then
            return query select s.rotulo, t, case when ok then 'insert_propria' else 'insert_outra' end, 'bloqueado '||sqlstate;
          end if;
        end;
      end loop;
    end loop;
    -- update/delete em linhas de OUTRA empresa: quantas linhas foram afetadas (esperado 0 para usuario comum)
    begin
      update public.leads set interesse = interesse where empresa_id = outra;
      get diagnostics n = row_count;
      return query select s.rotulo, 'leads', 'update_outra_linhas', n::text;
      raise exception using errcode = 'P0001', message = 'desfaz_sonda';
    exception when others then
      if sqlerrm <> 'desfaz_sonda' then return query select s.rotulo, 'leads', 'update_outra_linhas', 'ERRO '||sqlstate; end if;
    end;
    begin
      delete from public.procedimentos where empresa_id = outra;
      get diagnostics n = row_count;
      return query select s.rotulo, 'procedimentos', 'delete_outra_linhas', n::text;
      raise exception using errcode = 'P0001', message = 'desfaz_sonda';
    exception when others then
      if sqlerrm <> 'desfaz_sonda' then return query select s.rotulo, 'procedimentos', 'delete_outra_linhas', 'ERRO '||sqlstate; end if;
    end;
    reset role;
  end loop;
  -- anon: so pode inserir diagnostico (nao ler nada)
  set local role anon;
  foreach t in array array['leads','usuarios','diagnosticos','empresas'] loop
    begin execute format('select count(*) from public.%I', t) into n; return query select 'anon', t, 'select_count', n::text;
    exception when others then return query select 'anon', t, 'select_count', 'ERRO '||sqlstate; end;
  end loop;
  reset role;
end $f$;
select * from pg_temp.sonda() order by 1, 2, 3;
rollback;
