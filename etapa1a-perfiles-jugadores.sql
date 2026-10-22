-- Etapa 1a: cuentas de profe y de jugador (Agenda de Tenis).
-- Córrelo una sola vez en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.
-- No modifica ni borra nada existente (app_data, suscripciones, videos): solo agrega tablas nuevas.
--
--   perfiles  = una fila por cuenta: dice si es "profe" o "jugador" (el jugador puede ser apoderado).
--   jugadores = los perfiles deportivos de esa cuenta: el propio dueño y/o sus hijos.
--               Cada uno tiene un código personal (TEN-XXXX) para conectarse con profes (etapa 1c).

-- 1. Código personal: 4 caracteres sin letras confusas (sin 0/O, 1/I/L) ----------------
create or replace function public.nuevo_codigo()
returns text language plpgsql volatile set search_path = ''
as $$
declare
  abc constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := 'TEN-';
    for i in 1..4 loop
      c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1);
    end loop;
    exit when not exists (select 1 from public.jugadores where codigo = c);
  end loop;
  return c;
end $$;

-- 2. Tablas --------------------------------------------------------------------------
create table if not exists public.perfiles (
  user_id   uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  rol       text not null check (rol in ('profe', 'jugador')),
  nombre    text not null check (length(trim(nombre)) between 2 and 80),
  telefono  text check (telefono is null or length(telefono) <= 30),
  creado    timestamptz not null default now()
);

create table if not exists public.jugadores (
  id               uuid primary key default gen_random_uuid(),
  cuenta_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  es_titular       boolean not null default false,  -- true = juega el dueño de la cuenta; false = hijo/a
  nombre           text not null check (length(trim(nombre)) between 2 and 80),
  fecha_nacimiento date,
  mano             text check (mano in ('derecha', 'zurda')),
  nivel            text check (nivel is null or length(nivel) <= 40),
  club             text check (club is null or length(club) <= 80),
  codigo           text,
  creado           timestamptz not null default now()
);
-- El código se agrega después de crear la tabla porque la función lo busca en ella.
alter table public.jugadores alter column codigo set default public.nuevo_codigo();
update public.jugadores set codigo = public.nuevo_codigo() where codigo is null;
alter table public.jugadores alter column codigo set not null;
create unique index if not exists jugadores_codigo_unico on public.jugadores (codigo);
create index if not exists jugadores_cuenta on public.jugadores (cuenta_id);

-- Nadie puede inventar ni cambiar su código a mano: siempre lo genera la base.
create or replace function public.proteger_codigo()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.codigo := public.nuevo_codigo();
  else
    new.codigo := old.codigo;        -- el código no se cambia
    new.cuenta_id := old.cuenta_id;  -- el dueño tampoco
  end if;
  return new;
end $$;
drop trigger if exists jugadores_codigo on public.jugadores;
create trigger jugadores_codigo before insert or update on public.jugadores
  for each row execute function public.proteger_codigo();

-- Máximo 8 perfiles de jugador por cuenta (evita abusos).
create or replace function public.limite_jugadores()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (select count(*) from public.jugadores where cuenta_id = new.cuenta_id) >= 8 then
    raise exception 'Máximo 8 jugadores por cuenta';
  end if;
  return new;
end $$;
drop trigger if exists jugadores_limite on public.jugadores;
create trigger jugadores_limite before insert on public.jugadores
  for each row execute function public.limite_jugadores();

-- 3. Reglas de acceso ----------------------------------------------------------------
alter table public.perfiles  enable row level security;
alter table public.jugadores enable row level security;

drop policy if exists "mi perfil ver"      on public.perfiles;
drop policy if exists "mi perfil crear"    on public.perfiles;
drop policy if exists "mi perfil editar"   on public.perfiles;
drop policy if exists "mis jugadores ver"    on public.jugadores;
drop policy if exists "mis jugadores crear"  on public.jugadores;
drop policy if exists "mis jugadores editar" on public.jugadores;
drop policy if exists "mis jugadores borrar" on public.jugadores;

create policy "mi perfil ver" on public.perfiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mi perfil crear" on public.perfiles for insert to authenticated
  with check (user_id = (select auth.uid()));
-- Se puede cambiar nombre y teléfono; el rol queda fijo (ver trigger abajo).
create policy "mi perfil editar" on public.perfiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.rol_fijo()
returns trigger language plpgsql set search_path = ''
as $$ begin new.rol := old.rol; new.user_id := old.user_id; return new; end $$;
drop trigger if exists perfiles_rol_fijo on public.perfiles;
create trigger perfiles_rol_fijo before update on public.perfiles
  for each row execute function public.rol_fijo();

create policy "mis jugadores ver" on public.jugadores for select to authenticated
  using (cuenta_id = (select auth.uid()));
create policy "mis jugadores crear" on public.jugadores for insert to authenticated
  with check (cuenta_id = (select auth.uid()));
create policy "mis jugadores editar" on public.jugadores for update to authenticated
  using (cuenta_id = (select auth.uid())) with check (cuenta_id = (select auth.uid()));
create policy "mis jugadores borrar" on public.jugadores for delete to authenticated
  using (cuenta_id = (select auth.uid()));

grant select, insert, update on public.perfiles to authenticated;
grant select, insert, update, delete on public.jugadores to authenticated;

-- 4. Los jugadores no pagan: la app solo consulta la suscripción de las cuentas de profe.
