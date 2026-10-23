/* Setly · tareas con video "clase" (etapa 2, parte 4).
   El profe asigna tareas (a uno o varios alumnos) con instrucciones y un link de video
   (YouTube, Instagram, Drive…). Se guardan en el alumno (a.tareas). El jugador las ve en "Mi tenis"
   y marca "Lo practiqué"; aquí se muestra cuántas veces (sql/etapa2b-tareas.sql). */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {S,esc,toast,uid}=A;
const T={prac:{},t:0,cargando:false,sinScript:false,verCerradas:{}};

const st=document.createElement('style');st.textContent=`
.tar{border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;background:var(--surface);display:flex;flex-direction:column;gap:6px}
.tar b{font-size:15px}
.tar .det{font-size:13.5px;white-space:pre-line}
.tar .meta{font-size:12.5px;color:var(--muted)}
.tar .meta.ok{color:var(--ok);font-weight:600}
.tar .acc{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px}
.tar.cerrada{opacity:.7}
a.btn.small{text-decoration:none}
.tasig{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.tasig label{display:flex;gap:8px;align-items:center;font-size:14px}
.tasig input{width:auto;margin:0}
`;document.head.appendChild(st);

const lista=a=>(a&&Array.isArray(a.tareas)?a.tareas:[]).filter(Boolean);
const limpio=n=>String(n||'').replace(/^Ejemplo:\s*/,'');
const fmtF=f=>{try{return A.dayName(f)}catch(_){return f}};
const linkOk=u=>/^https?:\/\/\S+\.\S+/i.test(u||'');
const tipoLink=u=>/youtu\.?be/i.test(u)?'YouTube':/instagram\./i.test(u)?'Instagram':/tiktok\./i.test(u)?'TikTok':/drive\.google|docs\.google/i.test(u)?'Drive':'el link';

async function cargarPracticas(){
  if(T.cargando||!A.isCloud()||T.sinScript)return;
  T.cargando=true;
  try{
    const {data,error}=await A.sb().rpc('practicas_profe');
    if(error){if(error.code==='PGRST202'||error.code==='42883'||/could not find|does not exist/i.test(error.message||''))T.sinScript=true}
    else{const m={};for(const r of (data||[]))m[r.alumno_id+'|'+r.tarea_id]={veces:r.veces,ultima:r.ultima};
      const cambio=JSON.stringify(m)!==JSON.stringify(T.prac);T.prac=m;T.t=Date.now();T.cargando=false;if(cambio)A.render();return}
  }catch(_){}
  T.t=Date.now();T.cargando=false;
}

function tarjeta(a,t){
  const p=T.prac[a.id+'|'+t.id];
  const prac=p?`<span class="meta ok">Practicó ${p.veces} ${p.veces===1?'vez':'veces'} · última ${esc(fmtF(p.ultima))}</span>`:`<span class="meta">Aún no marca práctica</span>`;
  return `<div class="tar${t.estado==='cerrada'?' cerrada':''}"><b>${esc(t.titulo)}</b>${t.detalle?`<div class="det">${esc(t.detalle)}</div>`:''}
   <span class="meta">Asignada ${esc(fmtF(t.creada))}${t.estado==='cerrada'?' · terminada':''}</span>${t.estado==='cerrada'?'':prac}
   <div class="acc">${t.link?`<a class="btn small" href="${esc(t.link)}" target="_blank" rel="noopener">▶ Ver video</a>`:''}
    ${t.estado==='cerrada'?`<button class="btn small ghost" data-kact="reabrir" data-id="${esc(a.id)}" data-t="${esc(t.id)}">Reactivar</button>`
      :`<button class="btn small ghost" data-kact="editar" data-id="${esc(a.id)}" data-t="${esc(t.id)}">Editar</button><button class="btn small ghost" data-kact="cerrar" data-id="${esc(a.id)}" data-t="${esc(t.id)}">Terminar</button>`}</div></div>`;
}
function seccion(id){
  const a=A.alumno(id);if(!a)return '';
  if(A.isCloud()&&Date.now()-T.t>60000)setTimeout(cargarPracticas,0);
  const L=lista(a),act=L.filter(t=>t.estado!=='cerrada').sort((x,y)=>(y.creada||'').localeCompare(x.creada||'')),cer=L.filter(t=>t.estado==='cerrada');
  let h=`<section class="xp"><div class="sec-h"><h3>Tareas</h3><button class="btn small primary" data-kact="nueva" data-id="${esc(id)}">+ Asignar tarea</button></div>`;
  if(!L.length)h+=`<div class="note">Deja ejercicios para la casa, por ejemplo "Swing de derecha: 3 series de 20 sombras", con un video tuyo de YouTube o Instagram. El alumno la ve en su app y marca cuando la practica.</div>`;
  h+=act.map(t=>tarjeta(a,t)).join('');
  if(cer.length){
    h+=`<button class="btn small ghost" data-kact="ver-cer" data-id="${esc(id)}" style="align-self:flex-start">${T.verCerradas[id]?'Ocultar':'Ver'} terminadas (${cer.length})</button>`;
    if(T.verCerradas[id])h+=cer.map(t=>tarjeta(a,t)).join('');
  }
  if(L.length&&window.TAC&&window.TAC.conectado&&!window.TAC.conectado(id))h+=`<span class="muted" style="font-size:12.5px">Para que vea sus tareas, conecta la app del alumno (más abajo).</span>`;
  return h+`</section>`;
}

/* Tareas anteriores del profe, para reutilizarlas */
function plantillas(){
  const m=new Map();
  for(const a of S.alumnos)for(const t of lista(a)){const k=t.titulo.trim().toLowerCase();if(!m.has(k)||(t.creada||'')>(m.get(k).creada||''))m.set(k,t)}
  return [...m.values()].sort((x,y)=>x.titulo.localeCompare(y.titulo));
}
function sheetTarea(id,tid){
  const a=A.alumno(id);if(!a)return;
  const t=tid?lista(a).find(x=>x.id===tid):null,nueva=!t;
  const pl=plantillas();
  const otros=S.alumnos.filter(x=>x.id!==id&&!x.archivado).sort((x,y)=>limpio(x.nombre).localeCompare(limpio(y.nombre)));
  A.sheet(`<h2>${nueva?'Asignar tarea':'Editar tarea'}</h2><p class="muted" style="margin:0">${esc(limpio(a.nombre))}</p>
  <form id="f-tarea" data-id="${esc(id)}" data-t="${esc(tid||'')}"><div style="display:flex;flex-direction:column;gap:14px">
  ${nueva&&pl.length?`<div class="field"><label for="tk-pl">Usar una tarea anterior</label><select id="tk-pl"><option value="">— Nueva —</option>${pl.map((p,i)=>`<option value="${i}">${esc(p.titulo)}</option>`).join('')}</select></div>`:''}
  <div class="field"><label for="tk-tit">Tarea</label><input id="tk-tit" required maxlength="80" value="${esc(t?t.titulo:'')}" placeholder="Ej: Swing de derecha"></div>
  <div class="field"><label for="tk-det">Cómo hacerla</label><textarea id="tk-det" rows="3" maxlength="600" placeholder="Ej: 3 series de 20 sombras frente al espejo. Fíjate en terminar el golpe sobre el hombro.">${esc(t?t.detalle||'':'')}</textarea></div>
  <div class="field"><label for="tk-link">Video de apoyo (opcional)</label><input id="tk-link" type="text" inputmode="url" autocapitalize="off" autocorrect="off" maxlength="500" value="${esc(t?t.link||'':'')}" placeholder="Link de YouTube, Instagram o Drive">
   <div class="muted" style="font-size:12px">Tip: sube tus videos a YouTube como "No listado"; solo los ve quien tiene el link.</div></div>
  ${nueva&&otros.length?`<div class="field"><span>Asignar también a</span><div class="tasig">${otros.map(x=>`<label><input type="checkbox" name="tk-al" value="${esc(x.id)}">${esc(limpio(x.nombre))}</label>`).join('')}</div></div>`:''}
  <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">${nueva?'Asignar':'Guardar'}</button></div></div>
  </div></form>`);
  const sel=document.getElementById('tk-pl');
  if(sel)sel.addEventListener('change',()=>{const p=pl[+sel.value];if(!p)return;
    document.getElementById('tk-tit').value=p.titulo;document.getElementById('tk-det').value=p.detalle||'';document.getElementById('tk-link').value=p.link||''});
}
async function cambiar(id,tid,cambio){
  const a=A.alumno(id);if(!a)return;
  try{await A.save('alumnos',{...a,tareas:lista(a).map(t=>t.id===tid?{...t,...cambio}:t)})}catch(_){}
}

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-kact]');if(!b)return;
  const id=b.dataset.id,tid=b.dataset.t;
  switch(b.dataset.kact){
    case 'nueva':sheetTarea(id);break;
    case 'editar':sheetTarea(id,tid);break;
    case 'cerrar':await cambiar(id,tid,{estado:'cerrada',cerrada:A.today()});toast('Tarea terminada. El alumno ya no la verá.');break;
    case 'reabrir':await cambiar(id,tid,{estado:'activa'});toast('Tarea reactivada');break;
    case 'ver-cer':T.verCerradas[id]=!T.verCerradas[id];A.render();break;
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target;if(f.id!=='f-tarea')return;
  e.preventDefault();
  const titulo=document.getElementById('tk-tit').value.trim(),detalle=document.getElementById('tk-det').value.trim();
  let link=document.getElementById('tk-link').value.trim();
  if(titulo.length<2){toast('Escribe la tarea');return}
  if(link&&!/^https?:\/\//i.test(link))link='https://'+link;
  if(link&&!linkOk(link)){toast('Revisa el link del video');return}
  const id=f.dataset.id,tid=f.dataset.t;
  A.closeSheet();
  try{
    if(tid){await cambiar(id,tid,{titulo,detalle,link});toast('Tarea guardada');return}
    const ids=[id,...[...f.querySelectorAll('input[name=tk-al]:checked')].map(x=>x.value)];
    let n=0;
    for(const aid of ids){const a=A.alumno(aid);if(!a)continue;
      await A.save('alumnos',{...a,tareas:[...lista(a),{id:uid(),titulo,detalle,link,creada:A.today(),estado:'activa'}]});n++}
    toast(n>1?`Tarea asignada a ${n} alumnos`:'Tarea asignada');
  }catch(_){}
});

window.TAK={seccion,tipoLink};
})();
