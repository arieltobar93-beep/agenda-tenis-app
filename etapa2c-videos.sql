-- Setly · Etapa 2, parte 5: el profe comparte videos (con su nota y el análisis IA) con el alumno.
-- Un video se comparte marcándolo en la app del profe (compartido: true en app_data).
-- El jugador conectado puede abrir SOLO esos archivos del bucket privado "videos" (y su miniatura).

-- ¿Este archivo es de un video que el profe compartió con ese alumno?
create or replace function public.video_compartido(p_profe uuid, p_alumno text, p_path text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.app_data d
      cross join lateral jsonb_array_elements(coalesce(d.data::jsonb->'videos', '[]'::jsonb)) v
     where d.user_id = p_profe and v->>'alumnoId' = p_alumno and coalesce(v->>'compartido', 'false') = 'true'
       and (v->>'path' = p_path or (v->>'path') || '.jpg' = p_path))
$$;
revoke all on function public.video_compartido(uuid, text, text) from public, anon;
grant execute on function public.video_compartido(uuid, text, text) to authenticated;

-- Permiso de lectura en Storage para el jugador o apoderado conectado (los archivos son <profe>/<alumno>/<video>).
drop policy if exists "videos compartidos con el jugador" on storage.objects;
create policy "videos compartidos con el jugador" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and exists (
    select 1 from public.conexiones c join public.jugadores j on j.id = c.jugador_id
     where j.cuenta_id = (select auth.uid()) and c.estado = 'aceptada'
       and c.profe_id::text = (storage.foldername(name))[1] and c.alumno_id = (storage.foldername(name))[2]
       and public.video_compartido(c.profe_id, c.alumno_id, name)));

-- Lista de videos compartidos para "Mi tenis" (sin datos internos del profe).
create or replace function public.mi_tenis_videos(d jsonb, aid text)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(x order by x->>'fecha' desc, x->>'id' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', v->>'id', 'fecha', v->>'fecha', 'golpe', v->>'golpe', 'angulo', v->>'angulo',
             'nota', v->>'nota', 'path', v->>'path', 'thumb', coalesce(v->'thumb', 'false'::jsonb),
             'ia', case when jsonb_typeof(v->'ia') = 'object' then jsonb_strip_nulls(jsonb_build_object(
                     'resumen', v->'ia'->'resumen', 'fases', v->'ia'->'fases', 'fortalezas', v->'ia'->'fortalezas',
                     'mejoras', v->'ia'->'mejoras', 'puntos_a_revisar', v->'ia'->'puntos_a_revisar',
                     'notaProfe', v->'ia'->'notaProfe', 'fecha', v->'ia'->'fecha')) end) x
      from jsonb_array_elements(coalesce(d->'videos', '[]'::jsonb)) v
     where v->>'alumnoId' = aid and coalesce(v->>'compartido', 'false') = 'true'
     order by v->>'fecha' desc limit 40) s
$$;
revoke all on function public.mi_tenis_videos(jsonb, text) from public, anon, authenticated;

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
