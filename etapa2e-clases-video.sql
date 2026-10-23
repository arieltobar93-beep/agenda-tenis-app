-- Setly · Etapa 2, parte 7: "Mis clases en video" del profe (S.biblio en app_data) y tareas con video propio.
-- Archivos: bucket privado "videos", ruta <profe>/clases/<id>.<ext> (+ .jpg).
-- Un alumno conectado puede abrir un video de clase si el profe lo dejó para todos, si lo eligió a él,
-- o si está adjunto a una tarea activa suya.

-- ¿Este alumno puede ver este video de clase?
create or replace function public.clase_visible(p_profe uuid, p_alumno text, p_path text)
returns boolean language sql stable security definer set search_path = public
as $$
  with d as (select data::jsonb as data from public.app_data where user_id = p_profe),
  b as (select x from d cross join lateral jsonb_array_elements(coalesce(d.data->'biblio', '[]'::jsonb)) x
         where x->>'path' = p_path or (x->>'path') || '.jpg' = p_path)
  select exists (select 1 from b where b.x->>'para' = 'todos'
                    or (jsonb_typeof(b.x->'para') = 'array' and b.x->'para' ? p_alumno))
      or exists (select 1 from b, d
                   cross join lateral jsonb_array_elements(coalesce(d.data->'alumnos', '[]'::jsonb)) a
                   cross join lateral jsonb_array_elements(case when jsonb_typeof(a->'tareas') = 'array' then a->'tareas' else '[]'::jsonb end) t
                  where a->>'id' = p_alumno and coalesce(t->>'estado', 'activa') <> 'cerrada' and t->>'clase' = b.x->>'id')
$$;
revoke all on function public.clase_visible(uuid, text, text) from public, anon;
grant execute on function public.clase_visible(uuid, text, text) to authenticated;

drop policy if exists "clases en video para alumnos conectados" on storage.objects;
create policy "clases en video para alumnos conectados" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[2] = 'clases' and exists (
    select 1 from public.conexiones c join public.jugadores j on j.id = c.jugador_id
     where j.cuenta_id = (select auth.uid()) and c.estado = 'aceptada'
       and c.profe_id::text = (storage.foldername(name))[1]
       and public.clase_visible(c.profe_id, c.alumno_id, name)));

-- Videos de clase que ve el alumno. lista = aparece en "Clases de tu profe"; si es false, solo viene por una tarea.
create or replace function public.mi_tenis_clases(d jsonb, aid text)
returns jsonb language sql stable set search_path = public
as $$
  with tar as (
    select t->>'clase' as clase from jsonb_array_elements(coalesce(d->'alumnos', '[]'::jsonb)) a
      cross join lateral jsonb_array_elements(case when jsonb_typeof(a->'tareas') = 'array' then a->'tareas' else '[]'::jsonb end) t
     where a->>'id' = aid and coalesce(t->>'estado', 'activa') <> 'cerrada' and coalesce(t->>'clase', '') <> '')
  select coalesce(jsonb_agg(jsonb_build_object('id', x->>'id', 'cat', x->>'cat', 'titulo', x->>'titulo', 'nota', x->>'nota',
           'path', x->>'path', 'thumb', coalesce(x->'thumb', 'false'::jsonb), 'fecha', x->>'fecha',
           'lista', (x->>'para' = 'todos' or (jsonb_typeof(x->'para') = 'array' and x->'para' ? aid)))
           order by x->>'cat', x->>'titulo'), '[]'::jsonb)
    from jsonb_array_elements(coalesce(d->'biblio', '[]'::jsonb)) x
   where x->>'para' = 'todos' or (jsonb_typeof(x->'para') = 'array' and x->'para' ? aid)
      or x->>'id' in (select clase from tar)
$$;
revoke all on function public.mi_tenis_clases(jsonb, text) from public, anon, authenticated;

-- Las tareas ahora también traen el video propio adjunto (clase).
create or replace function public.mi_tenis_tareas(d jsonb, aid text)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t->>'id', 'titulo', t->>'titulo', 'detalle', t->>'detalle',
                                               'link', t->>'link', 'clase', t->>'clase', 'creada', t->>'creada') order by t->>'creada' desc), '[]'::jsonb)
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
           public.mi_tenis_videos(d.data::jsonb, c.alumno_id) as videos,
           public.mi_tenis_clases(d.data::jsonb, c.alumno_id) as clases,
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
