-- Apply to a dedicated Supabase project. The gate hash is set separately at deploy time.
create schema if not exists lord_private;

create table if not exists lord_private.settings (
    singleton boolean primary key default true check (singleton),
    gate_hash text not null
);

create table if not exists lord_private.users (
    id bigint generated always as identity primary key,
    username text not null unique,
    password_hash text not null,
    full_name text,
    email text,
    role text not null default 'User',
    created_at timestamptz not null default now()
);

alter table lord_private.settings enable row level security;
alter table lord_private.users enable row level security;
revoke all on schema lord_private from public, anon, authenticated;
revoke all on all tables in schema lord_private from public, anon, authenticated;

create or replace function public.lord_register(p_gate text, p_username text, p_password_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
    if not exists (
        select 1 from lord_private.settings
        where gate_hash = pg_catalog.encode(extensions.digest(p_gate, 'sha256'), 'hex')
    ) then
        raise exception 'not authorized' using errcode = '28000';
    end if;
    if p_username !~ '^[A-Za-z0-9_]{3,20}$' or length(p_password_hash) > 200 then
        raise exception 'invalid input' using errcode = '22023';
    end if;
    insert into lord_private.users (username, password_hash) values (p_username, p_password_hash);
    return pg_catalog.jsonb_build_object('created', true);
exception when unique_violation then
    return pg_catalog.jsonb_build_object('created', false);
end;
$$;

create or replace function public.lord_lookup_user(p_gate text, p_username text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
    if not exists (
        select 1 from lord_private.settings
        where gate_hash = pg_catalog.encode(extensions.digest(p_gate, 'sha256'), 'hex')
    ) then
        raise exception 'not authorized' using errcode = '28000';
    end if;
    select pg_catalog.jsonb_build_object('id', id, 'username', username, 'password_hash', password_hash)
    into result from lord_private.users where username = p_username;
    return result;
end;
$$;

create or replace function public.lord_profile(p_gate text, p_user_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
    if not exists (
        select 1 from lord_private.settings
        where gate_hash = pg_catalog.encode(extensions.digest(p_gate, 'sha256'), 'hex')
    ) then
        raise exception 'not authorized' using errcode = '28000';
    end if;
    select pg_catalog.jsonb_build_object(
        'id', id, 'username', username, 'full_name', full_name,
        'email', email, 'role', role, 'created_at', created_at
    ) into result from lord_private.users where id = p_user_id;
    return result;
end;
$$;

revoke execute on function public.lord_register(text,text,text) from public, anon, authenticated;
revoke execute on function public.lord_lookup_user(text,text) from public, anon, authenticated;
revoke execute on function public.lord_profile(text,bigint) from public, anon, authenticated;
grant execute on function public.lord_register(text,text,text) to anon;
grant execute on function public.lord_lookup_user(text,text) to anon;
grant execute on function public.lord_profile(text,bigint) to anon;
