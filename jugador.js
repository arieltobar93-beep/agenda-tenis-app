/* Setly · cuentas de jugador y apoderado (etapa 1a).
   Al iniciar sesión pregunta si la cuenta es de profe o de jugador. Los profes siguen a su agenda
   como siempre; los jugadores ven su espacio con el código personal (TEN-XXXX) de cada jugador.
   Usa la API que index.html publica en window.TA y necesita el script sql/etapa1a-perfiles-jugadores.sql. */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {esc,toast,sheet,closeSheet,today,parse}=A;
const sb=()=>A.sb();
const NIVELES=['Iniciación','Intermedio','Avanzado','Competencia'];
const J={u:null,perfil:null,jugadores:[],conex:[],armed:null,nHijos:0,visible:false,nov:{}};
const kRol=id=>'tenis-rol-'+id, kJug=id=>'tenis-jug-'+id;
const store={get(k){try{return localStorage.getItem(k)}catch(_){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(_){}}};

const st=document.createElement('style');st.id='jstyle';st.textContent=`
.rol-cards{display:flex;flex-direction:column;gap:10px}
.rol-card{display:flex;flex-direction:column;gap:4px;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;color:var(--ink)}
.rol-card b{font-family:var(--f-display);font-size:20px;font-weight:600;letter-spacing:.01em}
.rol-card span{font-size:13.5px;color:var(--muted)}
.rol-card:hover{border-color:var(--court)}
.hijo{border-top:1px dashed var(--line);padding-top:10px}
.jug{display:flex;flex-direction:column;gap:16px}
.jug-head h2{margin:0;font-family:var(--f-display);font-size:28px;font-weight:600}
.jug-head p{margin:4px 0 0}
.jcard{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px;display:flex;flex-direction:column;gap:12px}
.jtop{display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:center}
.javatar{width:40px;height:40px;border-radius:50%;background:var(--info-bg);color:var(--court);display:grid;place-items:center;font-family:var(--f-display);font-weight:700;font-size:17px}
.jname{min-width:0}.jname b{display:block;font-size:16px}.jname span{font-size:12.5px;color:var(--muted)}
.codigo{background:var(--court);color:var(--chalk);border-radius:var(--r);padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.codigo>span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.85}
.codigo strong{font-family:var(--f-display);font-size:34px;font-weight:700;letter-spacing:.12em;line-height:1.05}
.codigo .acts{display:flex;gap:8px;flex-wrap:wrap}
.auth .codigo .btn{width:auto;padding:6px 12px;font-size:13px;background:var(--surface);color:var(--ink);border-color:transparent}
.auth .codigo .btn.wa{background:var(--ball);color:var(--ball-ink)}
.auth .jcard .btn.small,.auth .jug>.btn{width:auto;padding:6px 12px;font-size:13px}
.jlbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.jprofes p{margin:4px 0 0;font-size:13.5px}
.pronto{display:flex;flex-direction:column;gap:8px}
.pronto .chips{display:flex;flex-wrap:wrap;gap:6px}
.pronto .chips span{border:1px dashed var(--line);border-radius:999px;padding:4px 10px;font-size:12.5px;color:var(--muted)}
.jfoot{display:flex;gap:8px;flex-wrap:wrap}
.solic{border:1px solid var(--ball);background:var(--surface);border-radius:var(--r);padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.solic b{font-size:15px}
.auth .solic .btn,.auth .jprof .btn{width:auto;padding:6px 12px;font-size:13px}
.jprof{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-top:1px dashed var(--line)}
.jprof:first-of-type{border-top:0}
.vbadge{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--ok-bg);color:var(--ok)}
.nobadge{font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--warn-bg);color:var(--warn)}

.mt{display:flex;flex-direction:column;gap:14px}
.mt .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px;display:flex;flex-direction:column;gap:8px}
.mt .prox{background:var(--court);color:var(--chalk);border-color:var(--court)}
.mt .prox strong{font-family:var(--f-display);font-size:26px;line-height:1.1}
.mt .prox .jlbl{color:var(--chalk);opacity:.8}
.mt .foco{border-left:4px solid var(--ball)}
.mt ol,.mt ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px}
.mt .nv{display:flex;align-items:center;gap:14px}
.mt .nv b{font-family:var(--f-display);font-size:44px;line-height:1;font-variant-numeric:tabular-nums}
.mt .tl{display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:13.5px;align-items:center}
.mt .tl .bar{grid-column:1/-1;height:6px;border-radius:99px;background:var(--line);overflow:hidden;margin-bottom:6px}
.mt .tl .bar i{display:block;height:100%;background:var(--court)}
.mt .chs{display:flex;flex-wrap:wrap;gap:6px}
.mt .chs span{background:var(--info-bg);color:var(--court);border-radius:99px;padding:4px 10px;font-size:12.5px;font-weight:600}
.auth .mt .btn{width:auto;padding:6px 12px;font-size:13px}
.mt .mtar{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-top:1px dashed var(--line)}
.mt .mtar:first-of-type{border-top:0;padding-top:2px}
.mt .mtar b{font-size:15px}.mt .mtar .det{font-size:13.5px;white-space:pre-line}
.auth .mt .btn.hecha{background:var(--ok-bg);color:var(--ok);border-color:transparent}
.mt .vgal{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mt .vit{position:relative;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--bg);text-align:left;padding:0;font:inherit;color:inherit;cursor:pointer}
.mt .vit .th{aspect-ratio:16/10;background:#0e2d4a;display:grid;place-items:center;color:#fff;font-size:22px;position:relative}
.mt .vit .th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.mt .vit .in{padding:6px 8px;font-size:12.5px;display:flex;flex-direction:column}
.mt .vit .ia{position:absolute;top:6px;right:6px;background:var(--ball);color:var(--ball-ink);font-size:11px;font-weight:700;border-radius:99px;padding:1px 7px}
.mtv video{width:100%;border-radius:10px;background:#000;max-height:60vh}
.mtv h4{margin:10px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.mtv ul{margin:0;padding-left:20px}
.mtv .aviso{font-size:12px;color:var(--muted);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-top:8px}
.nov{background:var(--info-bg);color:var(--court);border-radius:10px;padding:9px 12px;font-size:14px}
.nov.cl{background:var(--surface);border:1px solid var(--ball);color:var(--ink)}
.nuevo{display:inline-block;vertical-align:middle;background:var(--ball);color:var(--ball-ink);font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:99px;padding:1px 7px;margin-left:4px}
.auth .jcard .btn.mtbtn{width:100%;padding:10px 12px;font-size:15px}
`;document.head.appendChild(st);

/* ---------- datos ---------- */
const sinTabla=e=>!!e&&(e.code==='PGRST205'||e.code==='42P01'||/could not find the table|does not exist/i.test(e.message||''));
function nombreSugerido(u){const m=(u&&u.user_metadata)||{};return String(m.full_name||m.name||((u&&u.email)||'').split('@')[0]||'').slice(0,80)}
async function cargarJugadores(){
  const {data,error}=await sb().from('jugadores').select('*').eq('cuenta_id',J.u.id).order('creado',{ascending:true});
  if(error)throw error;
  J.jugadores=data||[];store.set(kJug(J.u.id),JSON.stringify({perfil:J.perfil,jugadores:J.jugadores}));
}
async function cargarConexiones(){
  try{const {data,error}=await sb().rpc('mis_conexiones_jugador');J.conex=error||!Array.isArray(data)?[]:data}catch(_){J.conex=[]}
}
async function crearPerfil(rol,nombre,telefono){
  const {data,error}=await sb().from('perfiles').insert({rol,nombre,telefono:telefono||null}).select().single();
  if(error)throw error;J.perfil=data;store.set(kRol(J.u.id),rol);return data;
}
function errJug(e){const m=String((e&&e.message)||e||'');
  if(/Máximo 8/.test(m))return 'Puedes tener hasta 8 jugadores en una cuenta.';
  if(/check constraint|violates/i.test(m))return 'Revisa los datos: el nombre debe tener entre 2 y 80 letras.';
  if(/duplicate key/i.test(m))return 'Esta cuenta ya tiene perfil. Cierra sesión y vuelve a entrar.';
  return 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.';}

/* Se llama desde index.html justo después de iniciar sesión. true = seguir a la agenda del profe. */
async function antesDeCargar(u){
  J.u=u;J.perfil=null;J.jugadores=[];
  let r;
  try{r=await sb().from('perfiles').select('*').eq('user_id',u.id).maybeSingle()}catch(e){r={error:e}}
  if(r.error){
    if(sinTabla(r.error))return true;                  // aún no se corre el script: la app sigue como antes
    if(store.get(kRol(u.id))==='jugador'){             // sin señal: mostrar lo último guardado
      const c=JSON.parse(store.get(kJug(u.id))||'null');if(c){J.perfil=c.perfil;J.jugadores=c.jugadores||[]}
      mostrarJugador('Sin conexión: estás viendo lo último guardado.');return false;
    }
    return true;
  }
  if(r.data){
    J.perfil=r.data;store.set(kRol(u.id),r.data.rol);
    if(r.data.rol==='profe')return true;
    try{await cargarJugadores()}catch(_){}
    await cargarConexiones();
    mostrarJugador();cargarNovedades();return false;
  }
  // Cuenta sin perfil: si ya tiene agenda es un profe de antes y sigue directo.
  let tieneAgenda=!!store.get('tenis-cloud-'+u.id);
  if(!tieneAgenda){try{const q=await sb().from('app_data').select('user_id').eq('user_id',u.id).maybeSingle();tieneAgenda=!q.error&&!!q.data}catch(_){}}
  if(tieneAgenda){try{await crearPerfil('profe',nombreSugerido(u)||'Profe')}catch(_){}return true}
  mostrarRol();return false;
}

/* ---------- pantallas de entrada ---------- */
function cuerpo(html){A.showAuth('loading');document.getElementById('auth').classList.remove('splash');document.getElementById('auth-body').innerHTML=html}
function mostrarRol(){
  J.visible=false;
  cuerpo(`<div class="auth-card"><h2>¡Bienvenido!</h2>
   <p class="muted" style="margin:0">Cuéntanos cómo vas a usar la app. Esta elección no se puede cambiar después.</p>
   <div class="rol-cards">
    <button class="rol-card" data-act="rol-elegir" data-v="jugador"><b>Soy jugador o apoderado</b><span>Veo mis clases, planes de entrenamiento, avance y torneos. Gratis.</span></button>
    <button class="rol-card" data-act="rol-elegir" data-v="profe"><b>Soy profe</b><span>Manejo mi agenda, alumnos y cobros. 7 días gratis y luego suscripción.</span></button>
   </div>
   <button class="btn ghost" data-act="del-logout">Usar otra cuenta</button></div>`);
}
function formProfe(){
  cuerpo(`<div class="auth-card"><h2>Tu perfil de profe</h2><form id="f-rol-profe" style="display:flex;flex-direction:column;gap:12px">
   <div class="field"><label for="rp-nombre">Nombre y apellido</label><input id="rp-nombre" value="${esc(nombreSugerido(J.u))}" required minlength="2" maxlength="80" autocomplete="name"></div>
   <div class="field"><label for="rp-tel">WhatsApp</label><input id="rp-tel" type="tel" placeholder="+56 9 …" maxlength="30" autocomplete="tel"></div>
   <button class="btn primary" type="submit">Crear cuenta de profe</button><button class="btn ghost" type="button" data-act="rol-volver">Volver</button></form></div>`);
}
const filaHijo=i=>`<div class="hijo" data-hijo="${i}"><div class="grid2"><div class="field"><label for="h-nom-${i}">Nombre del hijo o hija</label><input id="h-nom-${i}" maxlength="80"></div>
  <div class="field"><label for="h-fn-${i}">Fecha de nacimiento</label><input id="h-fn-${i}" type="date" max="${today()}"></div></div></div>`;
function formJugador(){
  J.nHijos=0;
  cuerpo(`<div class="auth-card"><h2>Tu cuenta de jugador</h2><form id="f-rol-jug" style="display:flex;flex-direction:column;gap:12px">
   <div class="field"><label for="rj-nombre">Tu nombre y apellido</label><input id="rj-nombre" value="${esc(nombreSugerido(J.u))}" required minlength="2" maxlength="80" autocomplete="name"></div>
   <div class="field"><label for="rj-tel">WhatsApp</label><input id="rj-tel" type="tel" placeholder="+56 9 …" maxlength="30" autocomplete="tel"></div>
   <div class="field"><span>¿Quién juega?</span>
    <label class="check-row"><input type="checkbox" id="rj-yo" checked><span>Yo juego</span></label>
    <div id="rj-hijos"></div>
    <button type="button" class="btn" data-act="rol-mas-hijo">+ Agregar hijo o hija</button>
    <span class="muted" style="font-size:12.5px">Si eres apoderado, agrega aquí a tus hijos. Tú administras sus perfiles y decides qué profe se conecta con ellos.</span></div>
   <button class="btn primary" type="submit">Crear cuenta</button><button class="btn ghost" type="button" data-act="rol-volver">Volver</button></form></div>`);
}

/* ---------- espacio del jugador ---------- */
function edad(f){if(!f)return null;const n=parse(f),h=parse(today());let e=h.getFullYear()-n.getFullYear();if(h<new Date(h.getFullYear(),n.getMonth(),n.getDate()))e--;return e}
const iniciales=n=>String(n||'').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const codigoTxt=j=>`Hola profe! Mi código de jugador en Setly es ${j.codigo}${j.es_titular?'':' ('+j.nombre+')'}. Conéctame desde mi ficha de alumno.`;
/* ---------- novedades (avisos dentro de la app) ---------- */
const kVisto=jid=>'setly-visto-'+jid;
function visto(jid){try{return JSON.parse(localStorage.getItem(kVisto(jid))||'null')}catch(_){return null}}
function marcarVisto(jid,data){
  const v={t:[],v:[]};for(const c of data||[]){for(const t of (c.tareas||[]))v.t.push(t.id);for(const x of (c.videos||[]))v.v.push(x.id)}
  try{localStorage.setItem(kVisto(jid),JSON.stringify(v))}catch(_){}
}
function resumenNov(jid,data){
  const v=visto(jid)||{t:[],v:[]};let tareas=0,videos=0,prox=null;
  for(const c of data||[]){
    tareas+=(c.tareas||[]).filter(t=>!v.t.includes(t.id)).length;
    videos+=(c.videos||[]).filter(x=>!v.v.includes(x.id)).length;
    const p=c.datos&&c.datos.proximas&&c.datos.proximas[0];
    if(p&&(!prox||(p.fecha+p.hora)<(prox.fecha+prox.hora)))prox={...p,profe:c.profe};
  }
  return {tareas,videos,prox};
}
async function cargarNovedades(){
  const con=J.jugadores.filter(j=>J.conex.some(c=>c.jugador_id===j.id&&c.estado==='aceptada'));
  const antes=JSON.stringify(J.nov);
  for(const j of con){try{const r=await sb().rpc('mi_tenis',{p_jugador:j.id});if(!r.error&&Array.isArray(r.data))J.nov[j.id]=resumenNov(j.id,r.data)}catch(_){}}
  for(const k of Object.keys(J.nov))if(!con.some(j=>j.id===k))delete J.nov[k];
  badge();
  if(JSON.stringify(J.nov)!==antes&&J.visible&&!J.mt&&!document.querySelector('#modal .sheet'))mostrarJugador();
}
function badge(){
  const n=Object.values(J.nov).reduce((s,x)=>s+x.tareas+x.videos,0);
  try{if(navigator.setAppBadge){n?navigator.setAppBadge(n):navigator.clearAppBadge()}}catch(_){}
}
function novHtml(j){
  const n=J.nov[j.id];if(!n)return '';
  const partes=[n.tareas?`${n.tareas} ${n.tareas===1?'tarea nueva':'tareas nuevas'}`:'',n.videos?`${n.videos} ${n.videos===1?'video nuevo':'videos nuevos'}`:''].filter(Boolean);
  let h='';
  if(partes.length)h+=`<div class="nov">🔔 <b>${partes.join(' y ')}</b> de ${esc(j.es_titular?'tu profe':'su profe')}</div>`;
  if(n.prox){const hoy=today(),man=A.addDays?A.addDays(hoy,1):'';
    if(n.prox.fecha===hoy||n.prox.fecha===man)h+=`<div class="nov cl">📅 ${n.prox.fecha===hoy?'Hoy':'Mañana'} a las ${esc(n.prox.hora||'')}${j.es_titular?' tienes':' tiene'} clase${n.prox.club?' en '+esc(n.prox.club):''}</div>`}
  return h;
}
function mostrarJugador(aviso){
  J.mt=null;
  J.visible=true;
  const nom=String((J.perfil&&J.perfil.nombre)||'').split(' ')[0];
  let h=`<div class="jug"><div class="jug-head"><h2>Hola${nom?', '+esc(nom):''}</h2><p class="muted">Este es tu espacio de jugador. Comparte el código de cada jugador con su profe para conectarse.</p></div>`;
  if(aviso)h+=`<div class="msg bad">${esc(aviso)}</div>`;
  const nomJug=id=>(J.jugadores.find(x=>x.id===id)||{}).nombre||'';
  const badge=c=>c.verificado?'<span class="vbadge">✓ Profe verificado</span>':'<span class="nobadge">Sin verificar</span>';
  for(const c of J.conex.filter(x=>x.estado==='pendiente')){
    h+=`<div class="solic"><span class="jlbl">Solicitud de conexión</span><b>${esc(c.profe||'Un profe')} quiere conectarse con ${esc(nomJug(c.jugador_id))}</b>
     <div>${badge(c)}${c.club?` <span class="muted" style="font-size:12.5px">· ${esc(c.club)}</span>`:''}</div>
     <span class="muted" style="font-size:12.5px">Si aceptas, podrá ver el perfil deportivo de ${esc(nomJug(c.jugador_id))} y dejarle planes, ejercicios y evaluaciones. Puedes desconectarlo cuando quieras.</span>
     <div class="jfoot"><button class="btn primary" data-act="con-aceptar" data-id="${esc(c.id)}">Aceptar</button><button class="btn" data-act="con-rechazar" data-id="${esc(c.id)}">Rechazar</button></div></div>`;
  }
  if(!J.jugadores.length)h+=`<div class="auth-card"><h2>Agrega quién juega</h2><p class="muted" style="margin:0">Crea tu perfil de jugador o el de tus hijos para recibir su código.</p><button class="btn primary" data-act="jug-add">+ Agregar jugador</button></div>`;
  for(const j of J.jugadores){
    const e=edad(j.fecha_nacimiento);
    const meta=[e!=null?e+' años':'',j.mano?(j.mano==='zurda'?'Zurdo/a':'Diestro/a'):'',j.nivel||'',j.club||''].filter(Boolean).join(' · ');
    h+=`<article class="jcard">
     <div class="jtop"><span class="javatar">${esc(iniciales(j.nombre))}</span><div class="jname"><b>${esc(j.nombre)}</b><span>${esc(meta||(j.es_titular?'Tu perfil':'Perfil de tu hijo o hija'))}</span></div><button class="btn small" data-act="jug-edit" data-id="${esc(j.id)}">Editar</button></div>
     ${e!=null&&e<18?`<span class="muted" style="font-size:12.5px">Menor de edad: solo tú, como apoderado, puedes aceptar conexiones con profes.</span>`:''}
     <div class="codigo"><span>Código para el profe</span><strong>${esc(j.codigo)}</strong>
      <div class="acts"><button class="btn" data-act="jug-copy" data-id="${esc(j.id)}">Copiar</button><a class="btn wa" href="https://wa.me/?text=${encodeURIComponent(codigoTxt(j))}" target="_blank" rel="noopener">Enviar por WhatsApp</a></div></div>
     ${novHtml(j)}
     ${J.conex.some(x=>x.jugador_id===j.id&&x.estado==='aceptada')?`<button class="btn primary mtbtn" data-act="mt-ver" data-id="${esc(j.id)}">Ver ${j.es_titular?'mi tenis':'el tenis de '+esc(String(j.nombre).split(' ')[0])}</button>`:''}
     <div class="jprofes"><span class="jlbl">Profes conectados</span>${(()=>{const cs=J.conex.filter(x=>x.jugador_id===j.id&&x.estado==='aceptada');
       return cs.length?cs.map(c=>`<div class="jprof"><div><b>${esc(c.profe||'Profe')}</b> ${c.verificado?'<span class="vbadge">✓</span>':''}${c.club?`<div class="muted" style="font-size:12.5px">${esc(c.club)}</div>`:''}</div>
         <div class="jfoot"><button class="btn" data-act="con-reportar" data-id="${esc(c.profe_id)}">Reportar</button><button class="btn danger" data-act="con-terminar" data-id="${esc(c.id)}">Desconectar</button></div></div>`).join('')
       :`<p class="muted">Aún no hay profes conectados. Dale este código a tu profe: él lo ingresa en tu ficha y tú aceptas la solicitud aquí.</p>`})()}</div>
    </article>`;
  }
  h+=`<div class="jfoot">${J.jugadores.length?`<button class="btn" data-act="jug-add">+ Agregar otro jugador</button>`:''}<button class="btn" data-act="jug-cuenta">Mi cuenta</button></div>
   </div>`;
  cuerpo(h);
}
/* ---------- Mi tenis (etapa 2, parte 3) ---------- */
const GOLPE={derecha:'Derecha',reves:'Revés',saque:'Saque',volea:'Volea',remate:'Remate',otro:'Golpe'};
async function firmar(paths){try{const {data,error}=await sb().storage.from('videos').createSignedUrls(paths,3600);if(error||!data)return {};return Object.fromEntries(data.filter(d=>d&&d.signedUrl).map(d=>[d.path,d.signedUrl]))}catch(_){return {}}}
async function cargarMiniaturas(){
  const imgs=[...document.querySelectorAll('img[data-mtthumb]')];if(!imgs.length)return;
  const m=await firmar(imgs.map(i=>i.dataset.mtthumb));
  for(const i of imgs){const u=m[i.dataset.mtthumb];if(u){i.onload=()=>{i.hidden=false};i.src=u}}
}
async function verVideo(cid,vid){
  const c=(J.mtData||[]).find(x=>x.id===cid);const v=c&&(c.videos||[]).find(x=>x.id===vid);if(!v)return;
  const L=(t,arr)=>Array.isArray(arr)&&arr.length?`<h4>${t}</h4><ul>${arr.map(x=>`<li>${esc(typeof x==='string'?x:(x&&x.nombre?x.nombre+': ':'')+((x&&x.observacion)||''))}</li>`).join('')}</ul>`:'';
  const ia=v.ia;
  sheet(`<div class="mtv"><h2>${esc(GOLPE[v.golpe]||'Video')} · ${esc(fCorta(v.fecha))}</h2>
   <video id="mtv-v" controls playsinline preload="metadata"></video><p class="muted" id="mtv-m" style="margin:6px 0 0;font-size:13px">Cargando video…</p>
   ${v.nota?`<h4>Comentario de ${esc(c.profe||'tu profe')}</h4><div>${esc(v.nota)}</div>`:''}
   ${ia?`${ia.notaProfe?`<h4>Lo que dice ${esc(c.profe||'tu profe')}</h4><div>${esc(ia.notaProfe)}</div>`:''}
     ${ia.resumen?`<h4>Análisis IA · resumen</h4><div>${esc(ia.resumen)}</div>`:''}${L('Lo que está bien',ia.fortalezas)}${L('Para mejorar',ia.mejoras)}${L('Por fases del golpe',ia.fases)}${L('Para la próxima grabación',ia.puntos_a_revisar)}
     <div class="aviso">El análisis IA es orientativo y puede equivocarse. Lo que manda es lo que te dice tu profe en la cancha.</div>`:''}
   <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button></div></div></div>`);
  const m=await firmar([v.path]);const el=document.getElementById('mtv-v'),msg=document.getElementById('mtv-m');if(!el)return;
  if(m[v.path]){el.src=m[v.path];if(msg)msg.remove()}else if(msg)msg.textContent='No se pudo cargar el video. Revisa tu conexión.';
}
const TPR={derecha:['Derecha','de 10'],reves:['Revés','de 10'],saque:['Saque','de 10'],volea:['Volea','de 10'],peloteo:['Peloteo','golpes seguidos'],pies:['Desplazamiento','segundos']};
function fechaLarga(f,h){try{const d=parse(f);const t=d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'});const hoy=today(),man=A.addDays?A.addDays(hoy,1):'';
  const pre=f===hoy?'Hoy':f===man?'Mañana':t.charAt(0).toUpperCase()+t.slice(1);return pre+(h?' · '+h:'')}catch(_){return f+(h?' '+h:'')}}
const fCorta=f=>{try{return parse(f).toLocaleDateString('es-CL',{day:'numeric',month:'short'})}catch(_){return f}};
async function mostrarMiTenis(jid){
  const j=J.jugadores.find(x=>x.id===jid);if(!j)return;
  J.mt=jid;cuerpo(`<div class="mt"><button class="btn ghost" data-act="mt-volver" style="align-self:flex-start">‹ Volver</button><p class="muted">Cargando…</p></div>`);
  let data=null;
  try{const r=await sb().rpc('mi_tenis',{p_jugador:jid});if(r.error)throw r.error;data=Array.isArray(r.data)?r.data:[]}
  catch(_){cuerpo(`<div class="mt"><button class="btn ghost" data-act="mt-volver" style="align-self:flex-start">‹ Volver</button><div class="msg bad">No pudimos cargar la información. Revisa tu conexión e intenta de nuevo.</div><button class="btn" data-act="mt-ver" data-id="${esc(jid)}">Reintentar</button></div>`);return}
  let TS=[];try{const tr=await sb().from('torneos').select('*').eq('jugador_id',jid).order('fecha',{ascending:false});if(!tr.error)TS=tr.data||[]}catch(_){}
  if(J.mt!==jid)return;
  J.mtData=data;window.__torneosJug=TS;
  const VISTO=visto(jid)||{t:[],v:[]};
  const nom=String(j.nombre).split(' ')[0];
  let h=`<div class="mt"><button class="btn ghost" data-act="mt-volver" style="align-self:flex-start">‹ Volver</button>
   <div class="jug-head"><h2>${j.es_titular?'Mi tenis':'El tenis de '+esc(nom)}</h2></div>`;
  if(!data.length)h+=`<div class="note">Aún no hay profes conectados con ${esc(nom)}.</div>`;
  for(const c of data){
    const d=c.datos;
    h+=`<span class="jlbl">Con ${esc(c.profe||'tu profe')} ${c.verificado?'<span class="vbadge">✓ Verificado</span>':''}${c.club?` · ${esc(c.club)}`:''}</span>`;
    if(!d){h+=`<div class="note">Tu profe aún no tiene información para compartir.</div>`;continue}
    const P=d.proximas||[];
    h+=P.length?`<div class="card prox"><span class="jlbl">Próxima clase</span><strong>${esc(fechaLarga(P[0].fecha,P[0].hora))}</strong>${P[0].club?`<span>${esc(P[0].club)}</span>`:''}
      ${P.length>1?`<span style="font-size:13px;opacity:.85">Después: ${P.slice(1,4).map(x=>esc(fechaLarga(x.fecha,x.hora))).join(' · ')}</span>`:''}</div>`
      :`<div class="card"><span class="jlbl">Próxima clase</span><span class="muted">No hay clases agendadas por ahora.</span></div>`;
    const f=d.ficha||{};
    if(f.foco&&f.foco.length)h+=`<div class="card foco"><span class="jlbl">Estamos trabajando</span><ol>${f.foco.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>`;
    // Tareas
    const TK=Array.isArray(c.tareas)?c.tareas:[],PR=Array.isArray(c.practicas)?c.practicas:[];
    if(TK.length){const hoy=today();
      h+=`<div class="card"><span class="jlbl">Tus tareas</span>${TK.map(t=>{const mias=PR.filter(x=>x.tarea===t.id),hecha=mias.some(x=>x.fecha===hoy);
        return `<div class="mtar"><b>${esc(t.titulo)}${VISTO.t.includes(t.id)?'':' <span class="nuevo">Nuevo</span>'}</b>${t.detalle?`<div class="det">${esc(t.detalle)}</div>`:''}
         <div class="jfoot">${t.link?`<a class="btn" href="${esc(t.link)}" target="_blank" rel="noopener">▶ Ver video</a>`:''}
          <button class="btn ${hecha?'hecha':'primary'}" data-act="mt-prac" data-id="${esc(c.id)}" data-t="${esc(t.id)}" data-v="${hecha?'0':'1'}">${hecha?'✓ Practicado hoy':'Lo practiqué hoy'}</button></div>
         <span class="muted" style="font-size:12.5px">${mias.length?`Llevas ${mias.length} ${mias.length===1?'práctica':'prácticas'}`:'Aún no la practicas'}${hecha?' · toca de nuevo para deshacer':''}</span></div>`}).join('')}</div>`}
    // Videos
    const VS=Array.isArray(c.videos)?c.videos:[];
    if(VS.length)h+=`<div class="card"><span class="jlbl">Tus videos</span><div class="vgal">${VS.map(v=>`<button class="vit" data-act="mt-video" data-id="${esc(c.id)}" data-v="${esc(v.id)}"><div class="th">▶${v.thumb?`<img alt="" hidden data-mtthumb="${esc(v.path)}.jpg">`:''}${v.ia?'<span class="ia">IA</span>':''}</div><div class="in"><b>${esc(GOLPE[v.golpe]||'Video')}${VISTO.v.includes(v.id)?'':' <span class="nuevo">Nuevo</span>'}</b><span class="muted">${esc(fCorta(v.fecha))}${v.nota?' · 💬':''}</span></div></button>`).join('')}</div></div>`;
    // Test Setly
    if(Array.isArray(d.tests)&&d.tests.length&&window.TAT){
      const al={tests:d.tests.map((t,i)=>({id:'t'+i,p:t.p,v:+t.v,fecha:t.fecha}))};
      const est=window.TAT.estado(al),n=window.TAT.nivel(al);
      h+=`<div class="card"><span class="jlbl">Test Setly</span><div class="nv">${n.completo?`<b>${n.valor}</b><div><strong>Nivel Setly</strong><div class="muted" style="font-size:13px">de 100</div></div>`:`<b>${n.hechas}/6</b><div><strong>Pruebas al día</strong><div class="muted" style="font-size:13px">Con las 6 se calcula tu Nivel Setly</div></div>`}</div>
       <div class="tl">${window.TAT.PRUEBAS.map(p=>{const x=est[p.k];if(!x.u)return `<span>${TPR[p.k][0]}</span><span class="muted">Pendiente</span><div class="bar"></div>`;
         const sube=x.ant?(x.pts-p.score(+x.ant.v)):0;
         return `<span>${TPR[p.k][0]}${sube>0?' <span style="color:var(--ok)">▲</span>':''}</span><span>${esc(String(x.u.v).replace('.',','))} <span class="muted">${TPR[p.k][1]}</span></span><div class="bar"><i style="width:${x.pts*10}%"></i></div>`}).join('')}</div></div>`;
    }
    if(f.fortalezas&&f.fortalezas.length)h+=`<div class="card"><span class="jlbl">Tus fortalezas</span><div class="chs">${f.fortalezas.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>`;
    if(f.errores&&f.errores.length)h+=`<div class="card"><span class="jlbl">Lo que vamos a corregir</span><ul>${f.errores.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    if(f.fisico)h+=`<div class="card"><span class="jlbl">Físico</span><div>${esc(f.fisico)}</div></div>`;
    if(f.mental)h+=`<div class="card"><span class="jlbl">Cabeza</span><div>${esc(f.mental)}</div></div>`;
    h+=`<div class="card"><span class="jlbl">Clases</span><div><b>${d.realizadas||0}</b> clases realizadas${d.ultimas&&d.ultimas.length?` · última el ${esc(fCorta(d.ultimas[0]))}`:''}</div></div>`;
  }
  // Torneos (del jugador, no del profe) y logros
  if(window.TAR){
    h+=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="jlbl">Torneos</span><button class="btn" data-act="mt-torneo" data-id="${esc(jid)}">+ Registrar torneo</button></div>
     ${TS.length?window.TAR.listaHtml(TS,{editar:true}):`<span class="muted" style="font-size:13.5px">Registra tus torneos y resultados. Quedan contigo aunque cambies de profe.</span>`}</div>`;
    let realizadas=0,practicas=0,nivel=0,subio=false;
    for(const c of data){const d=c.datos||{};realizadas+=d.realizadas||0;practicas+=(c.practicas||[]).length;
      if(Array.isArray(d.tests)&&d.tests.length&&window.TAT){const al={tests:d.tests.map((t,i)=>({id:'t'+i,p:t.p,v:+t.v,fecha:t.fecha}))};
        const n=window.TAT.nivel(al);if(n.completo)nivel=Math.max(nivel,n.valor);
        const e=window.TAT.estado(al);if(window.TAT.PRUEBAS.some(p=>e[p.k].ant&&e[p.k].pts>p.score(+e[p.k].ant.v)))subio=true}}
    h+=`<div class="card"><span class="jlbl">Logros</span>${window.TAR.logrosHtml({realizadas,torneos:TS,nivel,subio,practicas})}</div>`;
  }
  h+=`</div>`;
  cuerpo(h);cargarMiniaturas();
  marcarVisto(jid,data);if(J.nov[jid]){J.nov[jid]={...J.nov[jid],tareas:0,videos:0};badge()}
}
function sheetJugador(j){
  const nuevo=!j,hayTitular=J.jugadores.some(x=>x.es_titular);
  j=j||{nombre:'',fecha_nacimiento:'',mano:'',nivel:'',club:'',es_titular:false};
  J.armed=null;
  sheet(`<h2>${nuevo?'Nuevo jugador':'Editar jugador'}</h2><form id="f-jug" data-id="${esc(j.id||'')}"><div style="display:flex;flex-direction:column;gap:14px">
   ${nuevo&&!hayTitular?`<div class="field"><label for="jg-quien">¿Quién es?</label><select id="jg-quien"><option value="hijo">Mi hijo o hija</option><option value="yo">Yo</option></select></div>`:''}
   <div class="field"><label for="jg-nombre">Nombre y apellido</label><input id="jg-nombre" value="${esc(j.nombre)}" required minlength="2" maxlength="80"></div>
   <div class="grid2"><div class="field"><label for="jg-fn">Fecha de nacimiento</label><input id="jg-fn" type="date" max="${today()}" value="${esc(j.fecha_nacimiento||'')}"></div>
   <div class="field"><label for="jg-mano">Mano</label><select id="jg-mano"><option value="">Sin indicar</option><option value="derecha" ${j.mano==='derecha'?'selected':''}>Diestro/a</option><option value="zurda" ${j.mano==='zurda'?'selected':''}>Zurdo/a</option></select></div></div>
   <div class="grid2"><div class="field"><label for="jg-nivel">Nivel</label><select id="jg-nivel"><option value="">Sin indicar</option>${NIVELES.map(n=>`<option ${j.nivel===n?'selected':''}>${n}</option>`).join('')}</select></div>
   <div class="field"><label for="jg-club">Club donde juega</label><input id="jg-club" value="${esc(j.club||'')}" maxlength="80"></div></div>
   <div class="sheet-actions">${!nuevo&&!j.es_titular?`<button type="button" class="btn danger" data-act="jug-borrar" data-id="${esc(j.id)}">Eliminar perfil</button>`:''}
   <div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Guardar</button></div></div>
  </div></form>`);
}
function sheetCuenta(){
  const p=J.perfil||{};
  sheet(`<h2>Mi cuenta</h2><form id="f-cuenta"><div style="display:flex;flex-direction:column;gap:14px">
   <div class="field"><label for="cu-nombre">Nombre y apellido</label><input id="cu-nombre" value="${esc(p.nombre||'')}" required minlength="2" maxlength="80"></div>
   <div class="field"><label for="cu-tel">WhatsApp</label><input id="cu-tel" type="tel" value="${esc(p.telefono||'')}" maxlength="30"></div>
   <div class="field"><span>Cuenta</span><div class="acct">${esc((J.u&&J.u.email)||'')}</div></div>
   <div class="sheet-actions"><button type="button" class="btn" data-act="del-logout">Cerrar sesión</button><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Guardar</button></div></div>
  </div></form>`);
}

/* ---------- eventos ---------- */
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b||!J.u)return;
  const act=b.dataset.act,id=b.dataset.id;
  if(act!=='jug-borrar'&&act!=='con-terminar')J.armed=null;
  if(act==='del-logout')J.visible=false;
  switch(act){
    case 'rol-elegir':b.dataset.v==='profe'?formProfe():formJugador();break;
    case 'rol-volver':mostrarRol();break;
    case 'rol-mas-hijo':{if(J.nHijos>=7)break;document.getElementById('rj-hijos').insertAdjacentHTML('beforeend',filaHijo(J.nHijos));document.getElementById('h-nom-'+J.nHijos).focus();J.nHijos++;break}
    case 'jug-add':sheetJugador();break;
    case 'mt-ver':mostrarMiTenis(id);break;
    case 'mt-volver':J.mt=null;mostrarJugador();break;
    case 'mt-video':verVideo(id,b.dataset.v);break;
    case 'mt-torneo':if(window.TAR)window.TAR.sheetTorneo({modo:'jugador',jugadorId:id});break;
    case 'mt-prac':{if(b.disabled)break;b.disabled=true;
      const {error}=await sb().rpc('marcar_practica',{p_conexion:id,p_tarea:b.dataset.t,p_hecho:b.dataset.v==='1'});
      if(error){b.disabled=false;toast('No se pudo guardar. Revisa tu conexión.');break}
      if(b.dataset.v==='1')toast('¡Bien! Tu profe verá que practicaste');
      const y=window.scrollY;await mostrarMiTenis(J.mt);window.scrollTo(0,y);break}
    case 'jug-edit':sheetJugador(J.jugadores.find(x=>x.id===id));break;
    case 'jug-cuenta':sheetCuenta();break;
    case 'con-aceptar':case 'con-rechazar':{
      const {error}=await sb().rpc('responder_conexion',{p_id:id,p_acepta:act==='con-aceptar'});
      if(error){toast('No se pudo responder. Revisa tu conexión.');break}
      await cargarConexiones();mostrarJugador();toast(act==='con-aceptar'?'Conexión aceptada':'Solicitud rechazada');break}
    case 'con-terminar':{
      if(J.armed!=='c-'+id){J.armed='c-'+id;b.textContent='Toca otra vez para desconectar';b.classList.add('armed');break}
      J.armed=null;const {error}=await sb().rpc('terminar_conexion',{p_id:id});
      if(error){toast('No se pudo desconectar');break}
      await cargarConexiones();mostrarJugador();toast('Profe desconectado');break}
    case 'con-reportar':sheet(`<h2>Reportar profe</h2><form id="f-reporte" data-id="${esc(id)}"><div style="display:flex;flex-direction:column;gap:14px">
       <div class="field"><label for="rp-motivo">¿Qué pasó?</label><textarea id="rp-motivo" rows="4" required minlength="3" maxlength="500" placeholder="Cuéntanos qué pasó. Lo revisamos y podemos quitarle la verificación."></textarea></div>
       <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Enviar reporte</button></div></div></div></form>`);break;
    case 'jug-copy':{const j=J.jugadores.find(x=>x.id===id);if(!j)break;try{await navigator.clipboard.writeText(j.codigo);toast('Código copiado: '+j.codigo)}catch(_){toast('Tu código es '+j.codigo)}break}
    case 'jug-borrar':{
      if(J.armed!==id){J.armed=id;b.textContent='Toca otra vez para eliminar';b.classList.add('armed');break}
      J.armed=null;const {error}=await sb().from('jugadores').delete().eq('id',id);
      if(error){toast('No se pudo eliminar');break}
      closeSheet();try{await cargarJugadores()}catch(_){}mostrarJugador();toast('Perfil eliminado');break}
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target;if(!['f-rol-profe','f-rol-jug','f-jug','f-cuenta','f-reporte'].includes(f.id))return;
  e.preventDefault();e.stopImmediatePropagation();
  const v=id=>((document.getElementById(id)||{}).value||'').trim();
  const btn=f.querySelector('button[type=submit]');if(btn.disabled)return;btn.disabled=true;
  try{
    if(f.id==='f-rol-profe'){
      if(v('rp-nombre').length<2){toast('Escribe tu nombre');return}
      await crearPerfil('profe',v('rp-nombre'),v('rp-tel'));
      A.showAuth('loading','Preparando tu agenda…');A.continuar(J.u);
    }
    if(f.id==='f-rol-jug'){
      const yo=document.getElementById('rj-yo').checked,nombre=v('rj-nombre');
      const hijos=[...f.querySelectorAll('.hijo')].map(r=>({nombre:v('h-nom-'+r.dataset.hijo),fecha_nacimiento:v('h-fn-'+r.dataset.hijo)||null})).filter(x=>x.nombre.length>=2);
      if(nombre.length<2){toast('Escribe tu nombre');return}
      if(!yo&&!hijos.length){toast('Marca "Yo juego" o agrega al menos un hijo o hija');return}
      await crearPerfil('jugador',nombre,v('rj-tel'));
      const filas=[...(yo?[{nombre,es_titular:true}]:[]),...hijos.map(x=>({...x,es_titular:false}))];
      const {error}=await sb().from('jugadores').insert(filas);
      try{await cargarJugadores()}catch(_){}
      mostrarJugador(error?errJug(error):'');if(!error)toast('¡Listo! Ya tienes tu código de jugador');
    }
    if(f.id==='f-jug'){
      const datos={nombre:v('jg-nombre'),fecha_nacimiento:v('jg-fn')||null,mano:v('jg-mano')||null,nivel:v('jg-nivel')||null,club:v('jg-club')||null};
      const q=f.dataset.id?sb().from('jugadores').update(datos).eq('id',f.dataset.id):sb().from('jugadores').insert({...datos,es_titular:v('jg-quien')==='yo'});
      const {error}=await q;if(error){toast(errJug(error));return}
      closeSheet();await cargarJugadores();mostrarJugador();toast('Jugador guardado');
    }
    if(f.id==='f-reporte'){
      const motivo=v('rp-motivo');if(motivo.length<3){toast('Cuéntanos qué pasó');return}
      const {error}=await sb().from('reportes').insert({profe_id:f.dataset.id,motivo});
      if(error){toast('No se pudo enviar el reporte');return}
      closeSheet();toast('Reporte enviado. Gracias por avisar.');
    }
    if(f.id==='f-cuenta'){
      const {data,error}=await sb().from('perfiles').update({nombre:v('cu-nombre'),telefono:v('cu-tel')||null}).eq('user_id',J.u.id).select().single();
      if(error){toast(errJug(error));return}
      J.perfil=data;closeSheet();mostrarJugador();toast('Cuenta actualizada');
    }
  }catch(err){toast(errJug(err))}
  finally{if(btn.isConnected)btn.disabled=false}
},true);

document.addEventListener('setly:torneos',async()=>{if(!J.mt)return;const y=window.scrollY;await mostrarMiTenis(J.mt);window.scrollTo(0,y)});
document.addEventListener('visibilitychange',async()=>{
  if(document.visibilityState!=='visible'||!J.visible||!J.u||document.querySelector('#modal .sheet'))return;
  if(J.mt){mostrarMiTenis(J.mt);return}
  const antes=JSON.stringify(J.conex);await cargarConexiones();if(JSON.stringify(J.conex)!==antes)mostrarJugador();cargarNovedades();
});
window.TAJ={antesDeCargar};
})();
