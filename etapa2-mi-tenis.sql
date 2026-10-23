-- Setly · Etapa 2, parte 3: "Mi tenis" (lo que ve el jugador).
-- El jugador o su apoderado pide los datos de un jugador suyo; por cada profe conectado (conexión aceptada)
-- se devuelve SOLO lo compartido: próximas clases, clases realizadas, ficha técnica visible y Test Setly visible.
-- Nunca se devuelven notas privadas, pagos, tarifas ni datos de otros alumnos.

-- Extrae lo compartible de un alumno desde el JSON del profe. Uso interno (no se puede llamar desde la app).
create or replace function public.mi_tenis_datos(d jsonb, aid text)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  a jsonb; f jsonb; vis jsonb; ficha jsonb := '{}'::jsonb; k text;
  hoy text := to_char((now() at time zone 'America/Santiago')::date, 'YYYY-MM-DD');
  prox jsonb; hechas jsonb; total int;
begin
  if d is null or aid is null then return null; end if;
  select e into a from jsonb_array_elements(coalesce(d->'alumnos', '[]'::jsonb)) e where e->>'id' = aid limit 1;
  if a is null then return null; end if;

  f := coalesce(a->'ficha', '{}'::jsonb);
  vis := coalesce(f->'vis', '{}'::jsonb);
  foreach k in array array['foco', 'errores', 'fortalezas', 'fisico', 'mental'] loop
    if coalesce(vis->>k, 'true') <> 'false' and f ? k then ficha := ficha || jsonb_build_object(k, f->k); end if;
  end loop;
  if f ? 'upd' then ficha := ficha || jsonb_build_object('upd', f->'upd'); end if;

  select coalesce(jsonb_agg(x order by x->>'fecha', x->>'hora'), '[]'::jsonb) into prox from (
    select jsonb_build_object('fecha', c->>'fecha', 'hora', c->>'hora', 'duracion', c->'duracion',
             'club', (select k2->>'nombre' from jsonb_array_elements(coalesce(d->'clubes', '[]'::jsonb)) k2 where k2->>'id' = c->>'clubId' limit 1)) x
      from jsonb_array_elements(coalesce(d->'clases', '[]'::jsonb)) c
     where coalesce(c->'alumnoIds', '[]'::jsonb) ? aid and c->>'estado' = 'agendada' and c->>'fecha' >= hoy
     order by c->>'fecha', c->>'hora' limit 6) s;

  select count(*) into total from jsonb_array_elements(coalesce(d->'clases', '[]'::jsonb)) c
   where coalesce(c->'alumnoIds', '[]'::jsonb) ? aid and c->>'estado' = 'realizada';
  select coalesce(jsonb_agg(fe order by fe desc), '[]'::jsonb) into hechas from (
    select c->>'fecha' fe from jsonb_array_elements(coalesce(d->'clases', '[]'::jsonb)) c
     where coalesce(c->'alumnoIds', '[]'::jsonb) ? aid and c->>'estado' = 'realizada'
     order by c->>'fecha' desc limit 12) s;

  return jsonb_build_object(
    'proximas', prox,
    'realizadas', total,
    'ultimas', hechas,
    'ficha', ficha,
    'tests', case when coalesce(a->>'testVis', 'true') <> 'false'
                  then (select coalesce(jsonb_agg(jsonb_build_object('p', t->>'p', 'v', t->'v', 'fecha', t->>'fecha')), '[]'::jsonb)
                          from jsonb_array_elements(case when jsonb_typeof(a->'tests') = 'array' then a->'tests' else '[]'::jsonb end) t)
                  else null end
  );
end $$;
revoke all on function public.mi_tenis_datos(jsonb, text) from public, anon, authenticated;

-- Lo que llama la app del jugador.
create or replace function public.mi_tenis(p_jugador uuid)
returns json language plpgsql stable security definer set search_path = public
as $$
declare r json;
begin
  if not exists (select 1 from public.jugadores where id = p_jugador and cuenta_id = auth.uid()) then
    raise exception 'NO_ES_TUYO'; end if;
  select coalesce(json_agg(x order by x.creado), '[]'::json) into r from (
    select c.id, c.creado, coalesce(v.nombre, p.nombre) as profe, v.club, public.profe_verificado(c.profe_id) as verificado,
           public.mi_tenis_datos(d.data::jsonb, c.alumno_id) as datos
      from public.conexiones c
      left join public.perfiles p on p.user_id = c.profe_id
      left join public.verificaciones v on v.user_id = c.profe_id
      left join public.app_data d on d.user_id = c.profe_id
     where c.jugador_id = p_jugador and c.estado = 'aceptada') x;
  return r;
end $$;
revoke all on function public.mi_tenis(uuid) from public, anon;
grant execute on function public.mi_tenis(uuid) to authenticated;
