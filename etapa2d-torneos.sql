-- Setly · Etapa 2, parte 6: torneos del jugador.
-- Los torneos son del jugador (lo acompañan aunque cambie de profe). Los registra el jugador o su apoderado;
-- el profe conectado (conexión aceptada) puede verlos y también agregarlos.

create table if not exists public.torneos (
  id          uuid primary key default gen_random_uuid(),
  jugador_id  uuid not null references public.jugadores(id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) between 2 and 120),
  fecha       date not null,
  categoria   text check (categoria is null or length(categoria) <= 60),
  resultado   text not null check (resultado in ('campeon', 'finalista', 'semifinal', 'cuartos', 'octavos', 'primera', 'participo')),
  ganados     int check (ganados is null or ganados between 0 and 50),
  perdidos    int check (perdidos is null or perdidos between 0 and 50),
  nota        text check (nota is null or length(nota) <= 500),
  creado_por  uuid default auth.uid() references auth.users(id) on delete set null,
  creado      timestamptz not null default now()
);
create index if not exists torneos_jugador on public.torneos (jugador_id, fecha desc);
alter table public.torneos enable row level security;

-- El dueño de la cuenta (jugador o apoderado) maneja los torneos de sus jugadores.
drop policy if exists "torneos del dueno" on public.torneos;
create policy "torneos del dueno" on public.torneos for all to authenticated
  using (exists (select 1 from public.jugadores j where j.id = jugador_id and j.cuenta_id = (select auth.uid())))
  with check (exists (select 1 from public.jugadores j where j.id = jugador_id and j.cuenta_id = (select auth.uid())));

-- El profe ve los torneos de un alumno suyo conectado.
create or replace function public.torneos_de_alumno(p_alumno text)
returns table (id uuid, nombre text, fecha date, categoria text, resultado text, ganados int, perdidos int, nota text, mio boolean)
language sql stable security definer set search_path = public
as $$
  select t.id, t.nombre, t.fecha, t.categoria, t.resultado, t.ganados, t.perdidos, t.nota, t.creado_por = auth.uid()
    from public.torneos t
    join public.conexiones c on c.jugador_id = t.jugador_id
   where c.profe_id = auth.uid() and c.alumno_id = p_alumno and c.estado = 'aceptada'
   order by t.fecha desc
$$;
revoke all on function public.torneos_de_alumno(text) from public, anon;
grant execute on function public.torneos_de_alumno(text) to authenticated;

-- El profe agrega un torneo a un alumno suyo conectado.
create or replace function public.profe_agrega_torneo(p_alumno text, p_nombre text, p_fecha date, p_categoria text,
                                                     p_resultado text, p_ganados int, p_perdidos int, p_nota text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare c public.conexiones; nuevo uuid;
begin
  select * into c from public.conexiones where profe_id = auth.uid() and alumno_id = p_alumno and estado = 'aceptada' limit 1;
  if not found then raise exception 'NO_CONECTADO'; end if;
  insert into public.torneos (jugador_id, nombre, fecha, categoria, resultado, ganados, perdidos, nota, creado_por)
  values (c.jugador_id, trim(p_nombre), p_fecha, nullif(trim(coalesce(p_categoria, '')), ''), p_resultado, p_ganados, p_perdidos,
          nullif(trim(coalesce(p_nota, '')), ''), auth.uid())
  returning id into nuevo;
  return nuevo;
end $$;
revoke all on function public.profe_agrega_torneo(text, text, date, text, text, int, int, text) from public, anon;
grant execute on function public.profe_agrega_torneo(text, text, date, text, text, int, int, text) to authenticated;

-- El profe borra un torneo que él mismo registró (mientras siga conectado).
create or replace function public.profe_borra_torneo(p_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from public.torneos t
   where t.id = p_id and t.creado_por = auth.uid()
     and exists (select 1 from public.conexiones c where c.jugador_id = t.jugador_id and c.profe_id = auth.uid() and c.estado = 'aceptada');
  if not found then raise exception 'NO_ENCONTRADO'; end if;
end $$;
revoke all on function public.profe_borra_torneo(uuid) from public, anon;
grant execute on function public.profe_borra_torneo(uuid) to authenticated;
