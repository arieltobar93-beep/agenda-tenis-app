-- Setly · Etapa 1c y 3 (cierre): el jugador ve su historial de clases, lo que debe y las evaluaciones por golpe.
-- - Historial: últimas clases ya ocurridas (realizada, canceló tarde, cancelada, suspendida).
-- - Cuenta: por mes, clases cobradas × tarifa − pagos (igual que la pestaña Cobros del profe).
--   Solo si el profe no lo desactivó en Ajustes de cobro (config perfil: cuentaAlumno = false).
-- - Evaluaciones 1 a 5: solo si el profe no las ocultó para ese alumno (evalVis = false).

create or replace function public.mi_tenis_datos(d jsonb, aid text)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  a jsonb; f jsonb; vis jsonb; ficha jsonb := '{}'::jsonb; k text; cfg jsonb;
  hoy text := to_char((now() at time zone 'America/Santiago')::date, 'YYYY-MM-DD');
  prox jsonb; hechas jsonb; total int; hist jsonb; cuenta jsonb := null; evals jsonb := null;
  tarifa numeric;
begin
  if d is null or aid is null then return null; end if;
  select e into a from jsonb_array_elements(coalesce(d->'alumnos', '[]'::jsonb)) e where e->>'id' = aid limit 1;
  if a is null then return null; end if;
  select e into cfg from jsonb_array_elements(coalesce(d->'config', '[]'::jsonb)) e where e->>'id' = 'perfil' limit 1;
  cfg := coalesce(cfg, '{}'::jsonb);

  -- ficha técnica (solo lo visible)
  f := coalesce(a->'ficha', '{}'::jsonb);
  vis := coalesce(f->'vis', '{}'::jsonb);
  foreach k in array array['foco', 'errores', 'fortalezas', 'fisico', 'mental'] loop
    if coalesce(vis->>k, 'true') <> 'false' and f ? k then ficha := ficha || jsonb_build_object(k, f->k); end if;
  end loop;
  if f ? 'upd' then ficha := ficha || jsonb_build_object('upd', f->'upd'); end if;

  -- próximas clases
  select coalesce(jsonb_agg(x order by x->>'fecha', x->>'hora'), '[]'::jsonb) into prox from (
    select jsonb_build_object('fecha', c->>'fecha', 'hora', c->>'hora', 'duracion', c->'duracion',
             'club', (select k2->>'nombre' from jsonb_array_elements(coalesce(d->'clubes', '[]'::jsonb)) k2 where k2->>'id' = c->>'clubId' limit 1)) x
      from jsonb_array_elements(coalesce(d->'clases', '[]'::jsonb)) c
     where coalesce(c->'alumnoIds', '[]'::jsonb) ? aid and c->>'estado' = 'agendada' and c->>'fecha' >= hoy
     order by c->>'fecha', c->>'hora' limit 6) s;

  -- clases realizadas
  select count(*) into total from jsonb_array_elements(coalesce(d->'clases', '[]'::jsonb)) c
   where coalesce(c->'alumnoIds', '[]'::jsonb) ? aid and c->>'estado' = 'realizada';
  select coalesce(jsonb_agg(fe order by fe desc), '[]'::jsonb) into hechas from (
    select c->>'fecha' fe from jsonb_array_elements(coalesce(d->'clases', '[]'::jsonb)) c
     where coalesce(c->'alumnoIds', '[]'::jsonb) ? aid and c->>'estado' = 'realizada'
     order by c->>'fecha' desc limit 12) s;

  -- historial (últimas 40 clases que ya ocurrieron o se cancelaron)
  select coalesce(jsonb_agg(x order by x->>'fecha' desc, x->>'hora' desc), '[]'::jsonb) into hist from (
    select jsonb_build_object('fecha', c->>'fecha', 'hora', c->>'hora', 'duracion', c->'duracion', 'estado', c->>'estado',
             'club', (select k2->>'nombre' from jsonb_array_elements(coalesce(d->'clubes', '[]'::jsonb)) k2 where k2->>'id' = c->>'clubId' limit 1)) x
      from jsonb_array_elements(coalesce(d->'clases', '[]'::jsonb)) c
     where coalesce(c->'alumnoIds', '[]'::jsonb) ? aid and c->>'estado' in ('realizada', 'cobrada', 'cancelada', 'lluvia')
     order by c->>'fecha' desc, c->>'hora' desc limit 40) s;

  -- cuenta (lo que debe), últimos 6 meses con movimiento
  if coalesce(cfg->>'cuentaAlumno', 'true') <> 'false' then
    tarifa := case when (a->>'tarifa') ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then (a->>'tarifa')::numeric else 0 end;
    with cl as (
      select left(c->>'fecha', 7) mes, count(*) n,
             sum(tarifa * (case when (c->>'duracion') ~ '^[0-9]+(\.[0-9]+)?$' then (c->>'duracion')::numeric else 60 end) / 60) monto
        from jsonb_array_elements(coalesce(d->'clases', '[]'::jsonb)) c
       where coalesce(c->'alumnoIds', '[]'::jsonb) ? aid and c->>'estado' in ('realizada', 'cobrada')
       group by 1),
    pg as (
      select p->>'mes' mes, sum(case when (p->>'monto') ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then (p->>'monto')::numeric else 0 end) pagado
        from jsonb_array_elements(coalesce(d->'pagos', '[]'::jsonb)) p
       where p->>'alumnoId' = aid group by 1),
    m as (
      select coalesce(cl.mes, pg.mes) mes, coalesce(cl.n, 0) n, round(coalesce(cl.monto, 0)) monto, round(coalesce(pg.pagado, 0)) pagado
        from cl full join pg on pg.mes = cl.mes)
    select jsonb_build_object(
             'meses', coalesce((select jsonb_agg(jsonb_build_object('mes', mes, 'clases', n, 'monto', monto, 'pagado', pagado, 'saldo', monto - pagado) order by mes desc)
                                  from (select * from m where mes is not null order by mes desc limit 6) z), '[]'::jsonb),
             'saldo', coalesce((select sum(monto - pagado) from m), 0),
             'tarifa', tarifa,
             'link', nullif(coalesce(nullif(a->>'link', ''), cfg->>'link'), ''),
             'transf', nullif(cfg->>'transf', ''))
      into cuenta;
  end if;

  -- evaluaciones 1 a 5 por golpe
  if coalesce(a->>'evalVis', 'true') <> 'false' then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('fecha', e->>'fecha', 'd', e->'d', 'r', e->'r', 's', e->'s', 'v', e->'v', 'm', e->'m', 'nota', nullif(e->>'nota', '')))
                     order by e->>'fecha', e->>'id'), '[]'::jsonb)
      into evals
      from jsonb_array_elements(coalesce(d->'evals', '[]'::jsonb)) e where e->>'alumnoId' = aid;
  end if;

  return jsonb_build_object(
    'proximas', prox,
    'realizadas', total,
    'ultimas', hechas,
    'historial', hist,
    'cuenta', cuenta,
    'evals', evals,
    'ficha', ficha,
    'tests', case when coalesce(a->>'testVis', 'true') <> 'false'
                  then (select coalesce(jsonb_agg(jsonb_build_object('p', t->>'p', 'v', t->'v', 'fecha', t->>'fecha')), '[]'::jsonb)
                          from jsonb_array_elements(case when jsonb_typeof(a->'tests') = 'array' then a->'tests' else '[]'::jsonb end) t)
                  else null end
  );
end $$;
revoke all on function public.mi_tenis_datos(jsonb, text) from public, anon, authenticated;
