-- Setly · planes por cantidad de alumnos, verificación de profes y conexión profe–jugador.
-- Córrelo DESPUÉS de etapa1a-perfiles-jugadores.sql (Supabase → SQL Editor → New query → Run).
-- Se puede volver a correr sin problema. No borra datos: agrega tablas y cambia reglas de acceso.
--
-- Resumen de reglas:
--   · Prueba de 7 días = límites del plan Pro (30 alumnos, con videos e IA).
--   · Sin pago al terminar la prueba = plan Gratis (3 alumnos, sin videos ni IA). Ya no se bloquea la cuenta.
--   · Plan pagado = el plan asignado hasta la fecha de pago (plan_until).
--   · Si un profe tiene más alumnos activos que su plan, no puede guardar cambios que no reduzcan ese número.
--   · Solo profes verificados (o administradores) pueden conectarse con jugadores, y el jugador o apoderado acepta.

-- 1. Planes ------------------------------------------------------------------------------
create table if not exists public.planes (
  id          text primary key,
  nombre      text not null,
  max_alumnos int  not null,
  precio_clp  int  not null,
  premium     boolean not null,          -- incluye videos e IA
  orden       int  not null
);
insert into public.planes (id, nombre, max_alumnos, precio_clp, premium, orden) values
  ('gratis',   'Gratis',     3,      0,     false, 0),
  ('inicial',  'Inicial',   10,   7990,     true,  1),
  ('pro',      'Pro',       30,  14990,     true,  2),
  ('academia', 'Academia', 100,  29990,     true,  3),
  ('medida',   'A medida', 100000,  0,      true,  4)
on conflict (id) do update set nombre = excluded.nombre, max_alumnos = excluded.max_alumnos,
  precio_clp = excluded.precio_clp, premium = excluded.premium, orden = excluded.orden;
alter table public.planes enable row level security;
drop policy if exists "planes visibles" on public.planes;
create policy "planes visibles" on public.planes for select to anon, authenticated using (true);
grant select on public.planes to anon, authenticated;

alter table public.suscripciones add column if not exists plan text references public.planes(id);

-- 2. Administradores --------------------------------------------------------------------
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
drop policy if exists "admin se ve" on public.admins;
create policy "admin se ve" on public.admins for select to authenticated using (user_id = (select auth.uid()));
grant select on public.admins to authenticated;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- Ariel queda como administrador (si su cuenta ya existe; si no, ver la última línea del archivo).
insert into public.admins (user_id)
  select id from auth.users where lower(email) in ('arieltobar93@gmail.com', 'dr.arieltobar@gmail.com')
on conflict do nothing;

-- 3. Plan vigente de cada profe -------------------------------------------------------
create or replace function public.plan_de(p_user uuid, p_app text)
returns table (plan text, tipo text, fin timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare r public.suscripciones;
begin
  select * into r from public.suscripciones s where s.user_id = p_user and s.app = p_app;
  if found and r.plan_until is not null and r.plan_until > now() then
    return query select coalesce(r.plan, 'medida'), 'plan'::text, r.plan_until;      -- pagado (sin plan asignado = sin límite)
  elsif found and r.trial_start + interval '7 days' > now() then
    return query select 'pro'::text, 'prueba'::text, r.trial_start + interval '7 days';
  elsif found then
    return query select 'gratis'::text, 'gratis'::text, null::timestamptz;
  else
    return query select 'pro'::text, 'prueba'::text, now() + interval '7 days';      -- cuenta recién creada
  end if;
end $$;

create or replace function public.max_alumnos(p_user uuid, p_app text)
returns int language sql stable security definer set search_path = public
as $$ select case when exists (select 1 from public.admins where user_id = p_user) then 100000
             else (select p.max_alumnos from public.plan_de(p_user, p_app) x join public.planes p on p.id = x.plan) end $$;

-- La app pide su estado al entrar. "activo" ahora es siempre verdadero (el plan Gratis no bloquea).
create or replace function public.estado_suscripcion(p_app text)
returns json language plpgsql security definer set search_path = public
as $$
declare x record; p public.planes;
begin
  if auth.uid() is null then return json_build_object('activo', false, 'tipo', 'anon', 'dias', 0); end if;
  insert into public.suscripciones (user_id, app) values (auth.uid(), p_app) on conflict (user_id, app) do nothing;
  select * into x from public.plan_de(auth.uid(), p_app);
  select * into p from public.planes where id = x.plan;
  return json_build_object(
    'activo', true, 'tipo', x.tipo, 'fin', x.fin,
    'dias', case when x.fin is null then 0 else greatest(0, ceil(extract(epoch from (x.fin - now())) / 86400)) end,
    'plan', p.id, 'plan_nombre', p.nombre, 'max_alumnos', p.max_alumnos, 'premium', p.premium,
    'admin', public.es_admin());
end $$;

-- Videos e IA: solo prueba o plan pagado (igual que antes).
create or replace function public.tiene_acceso(p_app text)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select p.premium from public.plan_de(auth.uid(), p_app) x join public.planes p on p.id = x.plan), false) $$;

-- 4. Límite de alumnos activos al guardar la agenda ------------------------------------------
create or replace function public.alumnos_activos(d jsonb)
returns int language sql immutable set search_path = public
as $$ select count(*)::int from jsonb_array_elements(case when jsonb_typeof(d->'alumnos') = 'array' then d->'alumnos' else '[]'::jsonb end) a
      where coalesce(a->>'archivado', 'false') <> 'true' $$;

create or replace function public.controlar_limite_alumnos()
returns trigger language plpgsql security definer set search_path = public
as $$
declare n_new int; n_old int; lim int;
begin
  n_new := public.alumnos_activos(new.data);
  n_old := case when tg_op = 'UPDATE' then public.alumnos_activos(old.data) else 0 end;
  lim := coalesce(public.max_alumnos(new.user_id, 'tenis'), 3);
  if n_new > lim and n_new >= n_old and not (tg_op = 'UPDATE' and new.data = old.data) then
    raise exception 'LIMITE_ALUMNOS:%:%', n_new, lim using hint = 'Archiva alumnos o cambia de plan';
  end if;
  return new;
end $$;
drop trigger if exists app_data_limite on public.app_data;
create trigger app_data_limite before insert or update on public.app_data
  for each row execute function public.controlar_limite_alumnos();

-- Guardar la agenda ya no depende de pagar (el límite lo pone el trigger); leer siempre fue libre.
drop policy if exists "crear lo propio"  on public.app_data;
drop policy if exists "editar lo propio" on public.app_data;
drop policy if exists "borrar lo propio" on public.app_data;
create policy "crear lo propio"  on public.app_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "editar lo propio" on public.app_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "borrar lo propio" on public.app_data for delete to authenticated using ((select auth.uid()) = user_id);

-- 5. Verificación de profes --------------------------------------------------------------------
create table if not exists public.verificaciones (
  user_id   uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  nombre    text not null check (length(trim(nombre)) between 3 and 80),
  rut       text not null check (length(rut) between 8 and 12),
  club      text not null check (length(trim(club)) between 2 and 80),
  instagram text check (instagram is null or length(instagram) <= 80),
  doc_path  text not null,
  estado    text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo    text,
  enviado   timestamptz not null default now(),
  revisado  timestamptz
);
alter table public.verificaciones enable row level security;
drop policy if exists "mi verificacion ver"    on public.verificaciones;
drop policy if exists "mi verificacion crear"  on public.verificaciones;
drop policy if exists "mi verificacion editar" on public.verificaciones;
create policy "mi verificacion ver"    on public.verificaciones for select to authenticated using (user_id = (select auth.uid()) or (select public.es_admin()));
create policy "mi verificacion crear"  on public.verificaciones for insert to authenticated with check (user_id = (select auth.uid()));
create policy "mi verificacion editar" on public.verificaciones for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on public.verificaciones to authenticated;

-- El profe solo puede (re)enviar su solicitud: el estado lo cambia el administrador.
create or replace function public.verificacion_estado_protegido()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.es_admin() and tg_op = 'UPDATE' then return new; end if;
  if tg_op = 'UPDATE' and old.estado = 'aprobado' then raise exception 'Tu cuenta ya está verificada'; end if;
  new.estado := 'pendiente'; new.motivo := null; new.revisado := null; new.enviado := now();
  return new;
end $$;
drop trigger if exists verificaciones_estado on public.verificaciones;
create trigger verificaciones_estado before insert or update on public.verificaciones
  for each row execute function public.verificacion_estado_protegido();

create or replace function public.profe_verificado(p_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.verificaciones where user_id = p_user and estado = 'aprobado')
         or exists (select 1 from public.admins where user_id = p_user) $$;

-- Documentos de verificación: privados (los ve el profe dueño y el administrador).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verificaciones', 'verificaciones', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','application/pdf'];
drop policy if exists "verif subir propio" on storage.objects;
drop policy if exists "verif ver propio"   on storage.objects;
drop policy if exists "verif cambiar propio" on storage.objects;
create policy "verif subir propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verif cambiar propio" on storage.objects for update to authenticated
  using (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verif ver propio" on storage.objects for select to authenticated
  using (bucket_id = 'verificaciones' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_admin())));

-- 6. Conexiones profe–jugador --------------------------------------------------------------------
create table if not exists public.conexiones (
  id          uuid primary key default gen_random_uuid(),
  profe_id    uuid not null references auth.users(id) on delete cascade,
  jugador_id  uuid not null references public.jugadores(id) on delete cascade,
  alumno_id   text not null,                        -- ficha del alumno en la agenda del profe
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada', 'terminada')),
  creado      timestamptz not null default now(),
  respondido  timestamptz
);
create index if not exists conexiones_profe on public.conexiones (profe_id);
create index if not exists conexiones_jugador on public.conexiones (jugador_id);
create unique index if not exists conexiones_una_viva on public.conexiones (profe_id, jugador_id) where estado in ('pendiente', 'aceptada');
alter table public.conexiones enable row level security;
-- Se lee y escribe solo con las funciones de abajo, que revisan quién es quién.
drop policy if exists "conexiones ver" on public.conexiones;
create policy "conexiones ver" on public.conexiones for select to authenticated
  using (profe_id = (select auth.uid()) or jugador_id in (select id from public.jugadores where cuenta_id = (select auth.uid())));
grant select on public.conexiones to authenticated;

create table if not exists public.reportes (
  id         uuid primary key default gen_random_uuid(),
  profe_id   uuid not null references auth.users(id) on delete cascade,
  autor_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  motivo     text not null check (length(trim(motivo)) between 3 and 500),
  creado     timestamptz not null default now(),
  revisado   boolean not null default false
);
alter table public.reportes enable row level security;
drop policy if exists "reportar" on public.reportes;
drop policy if exists "reportes admin" on public.reportes;
create policy "reportar" on public.reportes for insert to authenticated with check (autor_id = (select auth.uid()));
create policy "reportes admin" on public.reportes for select to authenticated using ((select public.es_admin()));
grant insert, select on public.reportes to authenticated;

-- El profe pide conectar la ficha de su alumno con el código del jugador.
create or replace function public.solicitar_conexion(p_codigo text, p_alumno_id text)
returns json language plpgsql security definer set search_path = public
as $$
declare j public.jugadores; c public.conexiones;
begin
  if not exists (select 1 from public.perfiles where user_id = auth.uid() and rol = 'profe') then
    raise exception 'SOLO_PROFES'; end if;
  if not public.profe_verificado(auth.uid()) then raise exception 'NO_VERIFICADO'; end if;
  select * into j from public.jugadores where codigo = upper(trim(p_codigo));
  if not found then raise exception 'CODIGO_NO_EXISTE'; end if;
  if j.cuenta_id = auth.uid() then raise exception 'CODIGO_PROPIO'; end if;
  select * into c from public.conexiones where profe_id = auth.uid() and jugador_id = j.id and estado in ('pendiente', 'aceptada');
  if found then
    update public.conexiones set alumno_id = p_alumno_id where id = c.id;
  else
    insert into public.conexiones (profe_id, jugador_id, alumno_id) values (auth.uid(), j.id, p_alumno_id) returning * into c;
  end if;
  return json_build_object('id', c.id, 'estado', c.estado, 'jugador', j.nombre);
end $$;

-- El jugador (o apoderado) acepta o rechaza.
create or replace function public.responder_conexion(p_id uuid, p_acepta boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.conexiones c set estado = case when p_acepta then 'aceptada' else 'rechazada' end, respondido = now()
   where c.id = p_id and c.estado = 'pendiente'
     and c.jugador_id in (select id from public.jugadores where cuenta_id = auth.uid());
  if not found then raise exception 'NO_ENCONTRADA'; end if;
end $$;

-- Cualquiera de los dos puede terminar la conexión.
create or replace function public.terminar_conexion(p_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.conexiones c set estado = 'terminada', respondido = now()
   where c.id = p_id and c.estado in ('pendiente', 'aceptada')
     and (c.profe_id = auth.uid() or c.jugador_id in (select id from public.jugadores where cuenta_id = auth.uid()));
  if not found then raise exception 'NO_ENCONTRADA'; end if;
end $$;

-- Lo que ve el profe: sus conexiones con el nombre del jugador.
create or replace function public.mis_conexiones_profe()
returns table (id uuid, alumno_id text, estado text, jugador text, codigo text, creado timestamptz, respondido timestamptz)
language sql stable security definer set search_path = public
as $$ select c.id, c.alumno_id, c.estado, j.nombre, j.codigo, c.creado, c.respondido
        from public.conexiones c join public.jugadores j on j.id = c.jugador_id
       where c.profe_id = auth.uid() and c.estado in ('pendiente', 'aceptada') order by c.creado $$;

-- Lo que ve el jugador: quién quiere conectarse o está conectado, con su club y si está verificado.
create or replace function public.mis_conexiones_jugador()
returns table (id uuid, jugador_id uuid, estado text, profe text, club text, verificado boolean, profe_id uuid, creado timestamptz)
language sql stable security definer set search_path = public
as $$ select c.id, c.jugador_id, c.estado, coalesce(v.nombre, p.nombre), v.club,
             public.profe_verificado(c.profe_id), c.profe_id, c.creado
        from public.conexiones c
        join public.jugadores j on j.id = c.jugador_id
        left join public.perfiles p on p.user_id = c.profe_id
        left join public.verificaciones v on v.user_id = c.profe_id
       where j.cuenta_id = auth.uid() and c.estado in ('pendiente', 'aceptada') order by c.creado $$;

-- 7. Panel de administración ---------------------------------------------------------------------
create or replace function public.admin_profes()
returns table (user_id uuid, email text, nombre text, telefono text, plan text, tipo text, fin timestamptz,
               plan_asignado text, plan_until timestamptz, alumnos int, verif_estado text, verif_nombre text,
               verif_rut text, verif_club text, verif_instagram text, verif_doc text, verif_motivo text, verif_enviado timestamptz, creado timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'SOLO_ADMIN'; end if;
  return query
    select u.id, u.email::text, pf.nombre, pf.telefono, x.plan, x.tipo, x.fin, s.plan, s.plan_until,
           coalesce(public.alumnos_activos(d.data), 0), v.estado, v.nombre, v.rut, v.club, v.instagram, v.doc_path, v.motivo, v.enviado, u.created_at
      from auth.users u
      left join public.perfiles pf on pf.user_id = u.id
      left join public.suscripciones s on s.user_id = u.id and s.app = 'tenis'
      left join public.app_data d on d.user_id = u.id
      left join public.verificaciones v on v.user_id = u.id
      cross join lateral public.plan_de(u.id, 'tenis') x
     where coalesce(pf.rol, 'profe') = 'profe'
     order by (v.estado = 'pendiente') desc nulls last, u.created_at desc;
end $$;

create or replace function public.admin_resumen()
returns json language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'SOLO_ADMIN'; end if;
  return json_build_object(
    'jugadores', (select count(*) from public.jugadores),
    'cuentas_jugador', (select count(*) from public.perfiles where rol = 'jugador'),
    'conexiones', (select count(*) from public.conexiones where estado = 'aceptada'),
    'reportes', (select count(*) from public.reportes where not revisado));
end $$;

create or replace function public.admin_set_plan(p_user uuid, p_plan text, p_hasta timestamptz)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'SOLO_ADMIN'; end if;
  insert into public.suscripciones (user_id, app, plan, plan_until) values (p_user, 'tenis', p_plan, p_hasta)
  on conflict (user_id, app) do update set plan = excluded.plan, plan_until = excluded.plan_until;
end $$;

create or replace function public.admin_verificar(p_user uuid, p_aprobar boolean, p_motivo text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'SOLO_ADMIN'; end if;
  update public.verificaciones set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
         motivo = case when p_aprobar then null else p_motivo end, revisado = now()
   where user_id = p_user;
  -- si se le quita la verificación, sus conexiones activas se terminan
  if not p_aprobar then
    update public.conexiones set estado = 'terminada', respondido = now() where profe_id = p_user and estado in ('pendiente', 'aceptada');
  end if;
end $$;

create or replace function public.admin_reportes()
returns table (id uuid, profe text, autor text, motivo text, creado timestamptz, revisado boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'SOLO_ADMIN'; end if;
  return query select r.id, coalesce(pf.nombre, up.email::text), ua.email::text, r.motivo, r.creado, r.revisado
    from public.reportes r join auth.users up on up.id = r.profe_id join auth.users ua on ua.id = r.autor_id
    left join public.perfiles pf on pf.user_id = r.profe_id order by r.creado desc;
end $$;

create or replace function public.admin_reporte_revisado(p_id uuid)
returns void language plpgsql security definer set search_path = public
as $$ begin if not public.es_admin() then raise exception 'SOLO_ADMIN'; end if; update public.reportes set revisado = true where id = p_id; end $$;

-- Las funciones las puede llamar cualquier usuario con sesión; adentro revisan permisos.
revoke execute on function public.admin_profes(), public.admin_resumen(), public.admin_set_plan(uuid, text, timestamptz),
  public.admin_verificar(uuid, boolean, text), public.admin_reportes(), public.admin_reporte_revisado(uuid),
  public.solicitar_conexion(text, text), public.responder_conexion(uuid, boolean), public.terminar_conexion(uuid),
  public.mis_conexiones_profe(), public.mis_conexiones_jugador(), public.plan_de(uuid, text), public.max_alumnos(uuid, text) from anon, public;
grant execute on function public.admin_profes(), public.admin_resumen(), public.admin_set_plan(uuid, text, timestamptz),
  public.admin_verificar(uuid, boolean, text), public.admin_reportes(), public.admin_reporte_revisado(uuid),
  public.solicitar_conexion(text, text), public.responder_conexion(uuid, boolean), public.terminar_conexion(uuid),
  public.mis_conexiones_profe(), public.mis_conexiones_jugador(), public.es_admin(), public.estado_suscripcion(text) to authenticated;

-- Si tu cuenta de administrador usa otro correo, corre solo esta línea con ese correo:
-- insert into public.admins (user_id) select id from auth.users where email = 'tu-correo@gmail.com' on conflict do nothing;
