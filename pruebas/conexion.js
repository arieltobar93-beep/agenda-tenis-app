/* Setly · lado del profe: verificación de la cuenta y conexión de la ficha del alumno con su app (código TEN-XXXX).
   Usa window.TA (index.html) y las funciones de sql/etapa1bc-planes-verificacion-conexion.sql. */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {esc,toast,sheet,closeSheet}=A;
const sb=()=>A.sb();
const T={verif:null,conex:[],cargado:false,cargando:false,sinScript:false,armed:null};

const st=document.createElement('style');st.id='cstyle';st.textContent=`
.conx{display:flex;flex-direction:column;gap:10px}
.conx .codigo-in{display:flex;gap:8px}
.conx .codigo-in input{flex:1;min-width:0;text-transform:uppercase;letter-spacing:.12em;font-family:var(--f-display);font-size:20px;font-weight:600;border:1px solid var(--line);background:var(--bg);border-radius:8px;padding:8px 11px}
.conx .ok{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.verif-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;border-radius:999px;padding:3px 9px;background:var(--ok-bg);color:var(--ok)}
`;document.head.appendChild(st);

const verificado=()=>!!(A.sub()&&A.sub().admin)||(T.verif&&T.verif.estado==='aprobado');
const falta=e=>!!e&&(e.code==='PGRST202'||e.code==='PGRST205'||e.code==='42P01'||e.code==='42883'||/could not find|does not exist/i.test(e.message||''));

async function cargar(){
  if(T.cargando||!A.isCloud())return;T.cargando=true;
  try{
    const u=A.user();
    const [v,c]=await Promise.all([sb().from('verificaciones').select('*').eq('user_id',u.id).maybeSingle(),sb().rpc('mis_conexiones_profe')]);
    if(falta(v.error)||falta(c.error)){T.sinScript=true}
    else{T.verif=v.data||null;if(T.verif&&!T.verif.estado)T.verif.estado='pendiente';T.conex=Array.isArray(c.data)?c.data:[]}
  }catch(_){}
  T.cargando=false;T.cargado=true;A.render();
}
function recargar(){T.cargado=false;return cargar()}

/* Sección dentro del perfil del alumno */
function seccion(alumnoId){
  if(!A.isCloud())return '';
  if(!T.cargado){cargar();return `<section class="xp"><div class="sec-h"><h3>App del alumno</h3></div><div class="note">Cargando…</div></section>`}
  if(T.sinScript)return '';
  const c=T.conex.find(x=>x.alumno_id===alumnoId);
  let h=`<section class="xp conx"><div class="sec-h"><h3>App del alumno</h3></div>`;
  if(c&&c.estado==='aceptada'){
    h+=`<div class="box"><div class="ok"><div><b>Conectado con ${esc(c.jugador)}</b><div class="muted" style="font-size:12.5px">Código ${esc(c.codigo)}${c.respondido?' · desde el '+new Date(c.respondido).toLocaleDateString('es-CL'):''}</div></div>
      <button class="btn small danger" data-cact="terminar" data-id="${esc(c.id)}">Desconectar</button></div>
      <span class="muted" style="font-size:12.5px">Muy pronto tu alumno verá en su app su historial de clases, planes, avance y torneos.</span></div>`;
  }else if(c&&c.estado==='pendiente'){
    h+=`<div class="box"><b>Solicitud enviada a ${esc(c.jugador)} (${esc(c.codigo)})</b><span class="muted" style="font-size:13px">Falta que acepte en su app${''}. Si es menor de edad, la acepta su apoderado.</span>
      <button class="btn small ghost" data-cact="terminar" data-id="${esc(c.id)}" style="align-self:flex-start">Cancelar solicitud</button></div>`;
  }else if(!verificado()){
    const v=T.verif;
    h+=`<div class="note">${!v?'Para conectarte con la app de tus alumnos, primero verifica tu cuenta de profe. Lo revisamos a mano para proteger a los jugadores, sobre todo a los menores de edad.'
      :v.estado==='pendiente'?'Tu verificación está en revisión. Cuando la aprobemos podrás conectarte con tus alumnos.'
      :'Tu verificación fue rechazada'+(v.motivo?': '+esc(v.motivo):'')+'. Puedes corregir y enviarla de nuevo.'}</div>
      ${!v||v.estado==='rechazado'?`<button class="btn small primary" data-cact="verif" style="align-self:flex-start">Verificar mi cuenta</button>`:''}`;
  }else{
    h+=`<p class="muted" style="margin:0;font-size:13.5px">Pídele a tu alumno (o a su apoderado) el código que aparece en su app Setly.</p>
      <div class="codigo-in"><input id="cx-cod-${esc(alumnoId)}" placeholder="TEN-XXXX" maxlength="8" autocomplete="off" aria-label="Código del jugador"><button class="btn primary" data-cact="conectar" data-id="${esc(alumnoId)}">Conectar</button></div>`;
  }
  return h+`</section>`;
}

/* Bloque para Ajustes */
function ajustesHtml(){
  if(!A.isCloud()||T.sinScript)return '';
  if(!T.cargado)cargar();
  const v=T.verif;
  const txt=A.sub()&&A.sub().admin?'<span class="verif-badge">✓ Administrador</span>'
    :!v?'Sin verificar. Necesario para conectarte con la app de tus alumnos.'
    :v.estado==='aprobado'?'<span class="verif-badge">✓ Profe verificado</span>'
    :v.estado==='pendiente'?'En revisión.':'Rechazada'+(v.motivo?': '+esc(v.motivo):'')+'.';
  return `<div class="field"><span>Verificación de profe</span><div>${txt}</div>${(!v||v.estado==='rechazado')&&!(A.sub()&&A.sub().admin)?`<button type="button" class="btn small" data-cact="verif" style="align-self:flex-start">Verificar mi cuenta</button>`:''}</div>`;
}

/* Formulario de verificación */
function rutValido(r){
  const s=String(r).replace(/[.\s-]/g,'').toUpperCase();if(!/^\d{7,8}[0-9K]$/.test(s))return false;
  let sum=0,m=2;for(let i=s.length-2;i>=0;i--){sum+=+s[i]*m;m=m===7?2:m+1}
  const dv=11-(sum%11);return s.slice(-1)===(dv===11?'0':dv===10?'K':String(dv));
}
function fmtRut(r){const s=String(r).replace(/[.\s-]/g,'').toUpperCase();return s.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'-'+s.slice(-1)}
function sheetVerif(){
  const v=T.verif||{};
  sheet(`<h2>Verificar mi cuenta</h2><p class="muted" style="margin:0">Revisamos cada profe a mano antes de que pueda conectarse con jugadores. Tus documentos solo los ve el equipo de Setly.</p>
  <form id="f-verif"><div style="display:flex;flex-direction:column;gap:14px">
   ${v.estado==='rechazado'&&v.motivo?`<div class="msg bad">Motivo del rechazo: ${esc(v.motivo)}</div>`:''}
   <div class="field"><label for="vf-nombre">Nombre completo</label><input id="vf-nombre" value="${esc(v.nombre||'')}" required minlength="3" maxlength="80" autocomplete="name"></div>
   <div class="grid2"><div class="field"><label for="vf-rut">RUT</label><input id="vf-rut" value="${esc(v.rut||'')}" required placeholder="12.345.678-5" maxlength="12"></div>
   <div class="field"><label for="vf-club">Club o canchas donde enseñas</label><input id="vf-club" value="${esc(v.club||'')}" required maxlength="80"></div></div>
   <div class="field"><label for="vf-ig">Instagram o página (opcional)</label><input id="vf-ig" value="${esc(v.instagram||'')}" maxlength="80" placeholder="@tuprofe"></div>
   <div class="field"><label for="vf-doc">Certificación o carta del club</label><input id="vf-doc" type="file" accept="image/*,application/pdf" ${v.doc_path?'':'required'}>
    <span class="muted" style="font-size:12.5px">Foto o PDF de tu título o certificación (Federación, PTR, ITF u otra), o una carta del club donde trabajas. Máximo 5 MB.${v.doc_path?' Si no adjuntas uno nuevo, se usa el que enviaste antes.':''}</span></div>
   <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Enviar a revisión</button></div></div>
  </div></form>`);
}

const ERR={NO_VERIFICADO:'Primero verifica tu cuenta de profe.',CODIGO_NO_EXISTE:'No existe un jugador con ese código. Revisa las letras y números.',
  CODIGO_PROPIO:'Ese código es de tu propia cuenta.',SOLO_PROFES:'Solo las cuentas de profe pueden conectarse con jugadores.',NO_ENCONTRADA:'Esa solicitud ya no existe.'};
const errTxt=e=>{const m=String((e&&e.message)||e||'');const k=Object.keys(ERR).find(x=>m.includes(x));return k?ERR[k]:'No se pudo completar. Revisa tu conexión.'};

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-cact]');if(!b)return;
  const act=b.dataset.cact,id=b.dataset.id;
  if(act!=='terminar')T.armed=null;
  if(act==='verif'){sheetVerif();return}
  if(act==='conectar'){
    const inp=document.getElementById('cx-cod-'+id);let cod=(inp&&inp.value||'').toUpperCase().replace(/\s/g,'');
    if(/^[A-Z0-9]{4}$/.test(cod))cod='TEN-'+cod;
    if(!/^TEN-[A-Z0-9]{4}$/.test(cod)){toast('El código tiene la forma TEN-XXXX');return}
    b.disabled=true;
    const {data,error}=await sb().rpc('solicitar_conexion',{p_codigo:cod,p_alumno_id:id});
    b.disabled=false;
    if(error){toast(errTxt(error));return}
    await recargar();toast(data&&data.estado==='aceptada'?'Ya estaban conectados':'Solicitud enviada a '+(data&&data.jugador||'el jugador')+'. Falta que la acepte en su app.');
    return;
  }
  if(act==='terminar'){
    if(T.armed!==id){T.armed=id;b.textContent='Toca otra vez para confirmar';b.classList.add('armed');return}
    T.armed=null;const {error}=await sb().rpc('terminar_conexion',{p_id:id});
    if(error){toast(errTxt(error));return}
    await recargar();toast('Conexión terminada');
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target;if(f.id!=='f-verif')return;
  e.preventDefault();e.stopImmediatePropagation();
  const v=id=>((document.getElementById(id)||{}).value||'').trim();
  const btn=f.querySelector('button[type=submit]');if(btn.disabled)return;
  const nombre=v('vf-nombre'),rut=v('vf-rut'),club=v('vf-club'),ig=v('vf-ig');
  if(nombre.length<3){toast('Escribe tu nombre completo');return}
  if(!rutValido(rut)){toast('Revisa el RUT: el dígito verificador no calza');return}
  if(club.length<2){toast('Indica el club o las canchas donde enseñas');return}
  const file=document.getElementById('vf-doc').files[0];
  if(!file&&!(T.verif&&T.verif.doc_path)){toast('Adjunta tu certificación o la carta del club');return}
  if(file&&file.size>5*1024*1024){toast('El archivo pesa más de 5 MB');return}
  btn.disabled=true;btn.textContent='Enviando…';
  try{
    const u=A.user();let path=T.verif&&T.verif.doc_path;
    if(file){
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'jpg';
      path=u.id+'/documento-'+Date.now()+'.'+ext;
      const up=await sb().storage.from('verificaciones').upload(path,file,{upsert:true,contentType:file.type||undefined});
      if(up.error)throw up.error;
    }
    const {error}=await sb().from('verificaciones').upsert({user_id:u.id,nombre,rut:fmtRut(rut),club,instagram:ig||null,doc_path:path},{onConflict:'user_id'});
    if(error)throw error;
    closeSheet();await recargar();toast('Enviado. Te avisamos aquí apenas lo revisemos.');
  }catch(err){toast('No se pudo enviar: '+String((err&&err.message)||err).slice(0,80))}
  finally{if(btn.isConnected){btn.disabled=false;btn.textContent='Enviar a revisión'}}
},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&T.cargado&&A.isCloud())recargar()});

window.TAC={seccion,ajustesHtml,recargar,conectado:id=>!!(T.conex||[]).find(x=>x.alumno_id===id&&x.estado==='aceptada'),_rutValido:rutValido};
})();
