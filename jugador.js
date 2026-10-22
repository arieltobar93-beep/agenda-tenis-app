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
const J={u:null,perfil:null,jugadores:[],armed:null,nHijos:0};
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
`;document.head.appendChild(st);

/* ---------- datos ---------- */
const sinTabla=e=>!!e&&(e.code==='PGRST205'||e.code==='42P01'||/could not find the table|does not exist/i.test(e.message||''));
function nombreSugerido(u){const m=(u&&u.user_metadata)||{};return String(m.full_name||m.name||((u&&u.email)||'').split('@')[0]||'').slice(0,80)}
async function cargarJugadores(){
  const {data,error}=await sb().from('jugadores').select('*').eq('cuenta_id',J.u.id).order('creado',{ascending:true});
  if(error)throw error;
  J.jugadores=data||[];store.set(kJug(J.u.id),JSON.stringify({perfil:J.perfil,jugadores:J.jugadores}));
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
    mostrarJugador();return false;
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
function mostrarJugador(aviso){
  const nom=String((J.perfil&&J.perfil.nombre)||'').split(' ')[0];
  let h=`<div class="jug"><div class="jug-head"><h2>Hola${nom?', '+esc(nom):''}</h2><p class="muted">Este es tu espacio de jugador. Comparte el código de cada jugador con su profe para conectarse.</p></div>`;
  if(aviso)h+=`<div class="msg bad">${esc(aviso)}</div>`;
  if(!J.jugadores.length)h+=`<div class="auth-card"><h2>Agrega quién juega</h2><p class="muted" style="margin:0">Crea tu perfil de jugador o el de tus hijos para recibir su código.</p><button class="btn primary" data-act="jug-add">+ Agregar jugador</button></div>`;
  for(const j of J.jugadores){
    const e=edad(j.fecha_nacimiento);
    const meta=[e!=null?e+' años':'',j.mano?(j.mano==='zurda'?'Zurdo/a':'Diestro/a'):'',j.nivel||'',j.club||''].filter(Boolean).join(' · ');
    h+=`<article class="jcard">
     <div class="jtop"><span class="javatar">${esc(iniciales(j.nombre))}</span><div class="jname"><b>${esc(j.nombre)}</b><span>${esc(meta||(j.es_titular?'Tu perfil':'Perfil de tu hijo o hija'))}</span></div><button class="btn small" data-act="jug-edit" data-id="${esc(j.id)}">Editar</button></div>
     ${e!=null&&e<18?`<span class="muted" style="font-size:12.5px">Menor de edad: solo tú, como apoderado, puedes aceptar conexiones con profes.</span>`:''}
     <div class="codigo"><span>Código para el profe</span><strong>${esc(j.codigo)}</strong>
      <div class="acts"><button class="btn" data-act="jug-copy" data-id="${esc(j.id)}">Copiar</button><a class="btn wa" href="https://wa.me/?text=${encodeURIComponent(codigoTxt(j))}" target="_blank" rel="noopener">Enviar por WhatsApp</a></div></div>
     <div class="jprofes"><span class="jlbl">Profes conectados</span><p class="muted">Aún no hay profes conectados. Muy pronto tu profe podrá conectarse usando este código.</p></div>
    </article>`;
  }
  h+=`<div class="jfoot">${J.jugadores.length?`<button class="btn" data-act="jug-add">+ Agregar otro jugador</button>`:''}<button class="btn" data-act="jug-cuenta">Mi cuenta</button></div>
   <section class="pronto"><span class="jlbl">Próximamente en tu app</span><div class="chips"><span>Historial de clases</span><span>Plan de entrenamiento</span><span>Ejercicios para la casa</span><span>Avance</span><span>Torneos y logros</span></div></section></div>`;
  cuerpo(h);
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
  if(act!=='jug-borrar')J.armed=null;
  switch(act){
    case 'rol-elegir':b.dataset.v==='profe'?formProfe():formJugador();break;
    case 'rol-volver':mostrarRol();break;
    case 'rol-mas-hijo':{if(J.nHijos>=7)break;document.getElementById('rj-hijos').insertAdjacentHTML('beforeend',filaHijo(J.nHijos));document.getElementById('h-nom-'+J.nHijos).focus();J.nHijos++;break}
    case 'jug-add':sheetJugador();break;
    case 'jug-edit':sheetJugador(J.jugadores.find(x=>x.id===id));break;
    case 'jug-cuenta':sheetCuenta();break;
    case 'jug-copy':{const j=J.jugadores.find(x=>x.id===id);if(!j)break;try{await navigator.clipboard.writeText(j.codigo);toast('Código copiado: '+j.codigo)}catch(_){toast('Tu código es '+j.codigo)}break}
    case 'jug-borrar':{
      if(J.armed!==id){J.armed=id;b.textContent='Toca otra vez para eliminar';b.classList.add('armed');break}
      J.armed=null;const {error}=await sb().from('jugadores').delete().eq('id',id);
      if(error){toast('No se pudo eliminar');break}
      closeSheet();try{await cargarJugadores()}catch(_){}mostrarJugador();toast('Perfil eliminado');break}
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target;if(!['f-rol-profe','f-rol-jug','f-jug','f-cuenta'].includes(f.id))return;
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
    if(f.id==='f-cuenta'){
      const {data,error}=await sb().from('perfiles').update({nombre:v('cu-nombre'),telefono:v('cu-tel')||null}).eq('user_id',J.u.id).select().single();
      if(error){toast(errJug(error));return}
      J.perfil=data;closeSheet();mostrarJugador();toast('Cuenta actualizada');
    }
  }catch(err){toast(errJug(err))}
  finally{if(btn.isConnected)btn.disabled=false}
},true);

window.TAJ={antesDeCargar};
})();
