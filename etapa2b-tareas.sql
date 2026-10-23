-- Setly · Etapa 2, parte 4: tareas con video "clase".
-- Las tareas las escribe el profe dentro del alumno (a.tareas en app_data).
-- El jugador marca "Lo practiqué" (una vez por día y tarea) en la tabla practicas, solo a través de funciones.

create table if not exists public.practicas (
  id          uuid primary key default gen_random_uuid(),
  profe_id    uuid not null references auth.users(id) on delete cascade,
  alumno_id   text not null,
  jugador_id  uuid not null references public.jugadores(id) on delete cascade,
  tarea_id    text not null,
  fecha       date not null default ((now() at time zone 'America/Santiago')::date),
  creado      timestamptz not null default now(),
  unique (jugador_id, profe_id, tarea_id, fecha)
);
create index if not exists practicas_profe on public.practicas (profe_id, alumno_id);
alter table public.practicas enable row level security;
-- Sin políticas: nadie la lee ni escribe directo, solo con las funciones de abajo.

-- El jugador (o su apoderado) marca o desmarca la práctica de hoy.
create or replace function public.marcar_practica(p_conexion uuid, p_tarea text, p_hecho boolean)
returns int language plpgsql security definer set search_path = public
as $$
declare c public.conexiones; hoy date := (now() at time zone 'America/Santiago')::date; n int;
begin
  select x.* into c from public.conexiones x join public.jugadores j on j.id = x.jugador_id
   where x.id = p_conexion and x.estado = 'aceptada' and j.cuenta_id = auth.uid();
  if not found then raise exception 'NO_ENCONTRADA'; end if;
  if not exists (
    select 1 from public.app_data d
      cross join lateral jsonb_array_elements(coalesce(d.data::jsonb->'alumnos', '[]'::jsonb)) a
      cross join lateral jsonb_array_elements(case when jsonb_typeof(a->'tareas') = 'array' then a->'tareas' else '[]'::jsonb end) t
     where d.user_id = c.profe_id and a->>'id' = c.alumno_id and t->>'id' = p_tarea) then
    raise exception 'TAREA_NO_EXISTE'; end if;
  if p_hecho then
    insert into public.practicas (profe_id, alumno_id, jugador_id, tarea_id, fecha)
    values (c.profe_id, c.alumno_id, c.jugador_id, p_tarea, hoy) on conflict do nothing;
  else
    delete from public.practicas where jugador_id = c.jugador_id and profe_id = c.profe_id and tarea_id = p_tarea and fecha = hoy;
  end if;
  select count(*) into n from public.practicas where jugador_id = c.jugador_id and profe_id = c.profe_id and tarea_id = p_tarea;
  return n;
end $$;
revoke all on function public.marcar_practica(uuid, text, boolean) from public, anon;
grant execute on function public.marcar_practica(uuid, text, boolean) to authenticated;

-- Lo que ve el profe: cuántas veces practicó cada alumno cada tarea.
create or replace function public.practicas_profe()
returns table (alumno_id text, tarea_id text, veces int, ultima date)
language sql stable security definer set search_path = public
as $$ select p.alumno_id, p.tarea_id, count(*)::int, max(p.fecha)
        from public.practicas p where p.profe_id = auth.uid()
       group by p.alumno_id, p.tarea_id $$;
revoke all on function public.practicas_profe() from public, anon;
grant execute on function public.practicas_profe() to authenticated;

-- "Mi tenis" ahora también entrega las tareas activas y lo que el jugador ya practicó.
create or replace function public.mi_tenis_tareas(d jsonb, aid text)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t->>'id', 'titulo', t->>'titulo', 'detalle', t->>'detalle',
                                               'link', t->>'link', 'creada', t->>'creada') order by t->>'creada' desc), '[]'::jsonb)
    from jsonb_array_elements(coalesce(d->'alumnos', '[]'::jsonb)) a
    cross join lateral jsonb_array_elements(case when jsonb_typeof(a->'tareas') = 'array' then a->'tareas' else '[]'::jsonb end) t
   where a->>'id' = aid and coalesce(t->>'estado', 'activa') <> 'cerrada'
$$;
revoke all on function public.mi_tenis_tareas(jsonb, text) from public, anon, authenticated;

create or replace function public.mi_tenis(p_jugador uuid)
returns json language plpgsql stable security definer set search_path = public
as $$
declare r json;
begin
  if not exists (select 1 from public.jugadores where id = p_jugador and cuenta_id = auth.uid()) then
    raise exception 'NO_ES_TUYO'; end if;
  select coalesce(json_agg(x order by x.creado), '[]'::json) into r from (
    select c.id, c.creado, coalesce(v.nombre, p.nombre) as profe, v.club, public.profe_verificado(c.profe_id) as verificado,
           public.mi_tenis_datos(d.data::jsonb, c.alumno_id) as datos,
           public.mi_tenis_tareas(d.data::jsonb, c.alumno_id) as tareas,
           (select coalesce(json_agg(json_build_object('tarea', pr.tarea_id, 'fecha', pr.fecha)), '[]'::json)
              from public.practicas pr where pr.jugador_id = c.jugador_id and pr.profe_id = c.profe_id) as practicas
      from public.conexiones c
      left join public.perfiles p on p.user_id = c.profe_id
      left join public.verificaciones v on v.user_id = c.profe_id
      left join public.app_data d on d.user_id = c.profe_id
     where c.jugador_id = p_jugador and c.estado = 'aceptada') x;
  return r;
end $$;
revoke all on function public.mi_tenis(uuid) from public, anon;
grant execute on function public.mi_tenis(uuid) to authenticated;
