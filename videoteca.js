/* Setly · "Mis clases en video": videoteca propia del profe (S.biblio).
   El profe sube sus videos ordenados por golpe y elige quién los ve (todos sus alumnos conectados o algunos).
   Archivos en el bucket privado "videos": <profe>/clases/<id>.<ext> (+ .jpg miniatura).
   Los alumnos los ven en "Mi tenis" (sql/etapa2e-clases-video.sql). También se pueden adjuntar a una tarea. */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {S,esc,toast,uid}=A;
const BUCKET='videos',MAX=25*1024*1024;
const CATS=['Derecha','Revés','Saque','Volea','Remate','Pies y movilidad','Físico','Táctica','Otros'];
const T={armed:null,subiendo:false};

const st=document.createElement('style');st.textContent=`
.vtc-box{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}
.vtc-box b{font-size:15px}.vtc-box span{font-size:12.5px;color:var(--muted)}
.vtc-cat{display:flex;flex-direction:column;gap:6px}
.vtc-cat h4{margin:6px 0 0;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.vtc-it{display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--surface)}
.vtc-it b{font-size:14.5px}.vtc-it .m{font-size:12px;color:var(--muted)}
.vtc-it .acc{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.vtc-para{display:flex;flex-direction:column;gap:6px;max-height:200px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.vtc-para label{display:flex;gap:8px;align-items:center;font-size:14px}.vtc-para input,.vtc-r input{width:auto;margin:0}
.vtc-r{display:flex;gap:14px;flex-wrap:wrap}.vtc-r label{display:flex;gap:6px;align-items:center;font-size:14px}
.vtc-v video{width:100%;border-radius:10px;background:#000;max-height:60vh}
`;document.head.appendChild(st);

const lista=()=>(S.biblio||[]).filter(Boolean);
const limpio=n=>String(n||'').replace(/^Ejemplo:\s*/,'');
const paraTxt=x=>x.para==='todos'||!Array.isArray(x.para)?'Todos tus alumnos conectados':`${x.para.length} ${x.para.length===1?'alumno':'alumnos'}`;
const extDe=f=>{const m=(f.type||'').toLowerCase();if(m.includes('mp4'))return 'mp4';if(m.includes('quicktime'))return 'mov';if(m.includes('webm'))return 'webm';const e=(f.name||'').split('.').pop().toLowerCase();return /^[a-z0-9]{2,4}$/.test(e)?e:'mp4'};
const mb=b=>(b/1048576).toFixed(1).replace('.',',')+' MB';

function botonHtml(){
  if(!A.isCloud())return '';
  const n=lista().length;
  return `<div class="vtc-box"><div><b>🎬 Mis clases en video</b><br><span>${n?`${n} ${n===1?'video':'videos'} para tus alumnos`:'Sube tus propios videos por golpe para tus alumnos'}</span></div><button class="btn small primary" data-vact="abrir">${n?'Abrir':'Empezar'}</button></div>`;
}
function sheetLista(){
  const L=lista();
  let h=`<h2>Mis clases en video</h2><p class="muted" style="margin:0">Videos tuyos, ordenados por golpe. Solo los ven tus alumnos conectados (todos o los que elijas), dentro de su app.</p>
   <button class="btn primary" data-vact="nuevo" style="align-self:flex-start">+ Subir video</button>`;
  if(!L.length)h+=`<div class="note">Ideas: "Derecha: la preparación", "Saque: el lanzamiento", "Volea: posición de la raqueta". Clips cortos (30 s a 2 min) se ven mejor en el teléfono.</div>`;
  for(const c of CATS){const xs=L.filter(x=>x.cat===c).sort((a,b)=>(a.titulo||'').localeCompare(b.titulo||''));if(!xs.length)continue;
    h+=`<div class="vtc-cat"><h4>${esc(c)} (${xs.length})</h4>${xs.map(x=>`<div class="vtc-it"><div><b>${esc(x.titulo)}</b><div class="m">${esc(paraTxt(x))}${x.size?' · '+mb(x.size):''}</div></div>
      <div class="acc"><button class="btn small" data-vact="ver" data-id="${esc(x.id)}">▶</button><button class="btn small ghost" data-vact="editar" data-id="${esc(x.id)}">Editar</button><button class="btn small ghost${T.armed===x.id?' armed':''}" data-vact="borrar" data-id="${esc(x.id)}">${T.armed===x.id?'¿Borrar?':'Borrar'}</button></div></div>`).join('')}</div>`;
  }
  const usado=L.reduce((s,x)=>s+(x.size||0),0);
  if(L.length)h+=`<span class="muted" style="font-size:12px">${L.length} videos · ${mb(usado)}</span>`;
  h+=`<div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button></div></div>`;
  A.sheet(`<div style="display:flex;flex-direction:column;gap:12px">${h}</div>`);
}
function sheetForm(x){
  const nuevo=!x;x=x||{cat:'Derecha',titulo:'',nota:'',para:'todos'};
  const als=S.alumnos.filter(a=>!a.archivado).sort((a,b)=>limpio(a.nombre).localeCompare(limpio(b.nombre)));
  const elegir=Array.isArray(x.para);
  A.sheet(`<h2>${nuevo?'Subir video':'Editar video'}</h2>
  <form id="f-vclase" data-id="${esc(x.id||'')}"><div style="display:flex;flex-direction:column;gap:14px">
  ${nuevo?`<div class="field"><label for="vc-f">Video (máximo 25 MB)</label><input id="vc-f" type="file" accept="video/*" required>
    <div class="muted" style="font-size:12px">Tip: graba en horizontal y corto. Si pesa mucho, comprímelo o súbelo a YouTube como "No listado" y pégalo en una tarea.</div></div>`:''}
  <div class="grid2"><div class="field"><label for="vc-cat">Golpe o tema</label><select id="vc-cat">${CATS.map(c=>`<option ${c===x.cat?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
   <div class="field"><label for="vc-tit">Título</label><input id="vc-tit" required maxlength="80" value="${esc(x.titulo)}" placeholder="Ej: La preparación"></div></div>
  <div class="field"><label for="vc-nota">Explicación (opcional)</label><textarea id="vc-nota" rows="3" maxlength="800" placeholder="Qué mirar en el video, en qué fijarse…">${esc(x.nota||'')}</textarea></div>
  <div class="field"><span>¿Quién lo ve?</span><div class="vtc-r"><label><input type="radio" name="vc-para" value="todos" ${elegir?'':'checked'}> Todos mis alumnos conectados</label><label><input type="radio" name="vc-para" value="elegir" ${elegir?'checked':''}> Elegir alumnos</label></div>
   <div class="vtc-para" id="vc-als" ${elegir?'':'hidden'}>${als.length?als.map(a=>`<label><input type="checkbox" name="vc-al" value="${esc(a.id)}" ${elegir&&x.para.includes(a.id)?'checked':''}>${esc(limpio(a.nombre))}</label>`).join(''):'<span class="muted">Aún no tienes alumnos.</span>'}</div></div>
  <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-vact="abrir">Volver</button><button class="btn primary" type="submit">${nuevo?'Subir':'Guardar'}</button></div></div>
  </div></form>`);
}
async function firmar(paths){try{const {data,error}=await A.sb().storage.from(BUCKET).createSignedUrls(paths,3600);if(error||!data)return {};return Object.fromEntries(data.filter(d=>d&&d.signedUrl).map(d=>[d.path,d.signedUrl]))}catch(_){return {}}}
async function ver(id){
  const x=lista().find(v=>v.id===id);if(!x)return;
  A.sheet(`<div class="vtc-v" style="display:flex;flex-direction:column;gap:10px"><h2>${esc(x.cat)} · ${esc(x.titulo)}</h2><video id="vc-v" controls playsinline preload="metadata"></video>
   ${x.nota?`<div style="white-space:pre-line">${esc(x.nota)}</div>`:''}<span class="muted" style="font-size:12.5px">Lo ve: ${esc(paraTxt(x))}</span>
   <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-vact="abrir">Volver</button></div></div></div>`);
  const m=await firmar([x.path]);const v=document.getElementById('vc-v');if(v&&m[x.path])v.src=m[x.path];else if(v)toast('No se pudo cargar el video');
}
function miniatura(file){
  return new Promise(res=>{
    const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';
    const url=URL.createObjectURL(file);let done=false;
    const fin=(b,d)=>{if(done)return;done=true;URL.revokeObjectURL(url);res({blob:b,dur:d||0})};
    v.onloadeddata=()=>{try{v.currentTime=Math.min(1,(v.duration||2)/2)}catch(_){fin(null)}};
    v.onseeked=()=>{try{const w=320,h=Math.round(w*(v.videoHeight||180)/(v.videoWidth||320));const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(v,0,0,w,h);c.toBlob(b=>fin(b,v.duration),'image/jpeg',.72)}catch(_){fin(null,v.duration)}};
    v.onerror=()=>fin(null);setTimeout(()=>fin(null),8000);v.src=url;
  });
}
/* Para el selector de video en tareas.js */
function opciones(){return lista().sort((a,b)=>(a.cat+a.titulo).localeCompare(b.cat+b.titulo))}
function nombre(id){const x=lista().find(v=>v.id===id);return x?`${x.cat}: ${x.titulo}`:''}

document.addEventListener('change',e=>{
  if(e.target.name==='vc-para'){const b=document.getElementById('vc-als');if(b)b.hidden=e.target.value!=='elegir'}
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-vact]');if(!b)return;
  const act=b.dataset.vact,id=b.dataset.id;
  if(act!=='borrar')T.armed=null;
  if(act==='abrir')sheetLista();
  if(act==='nuevo'){if(A.sub()&&A.sub().premium===false&&window.TAP){A.closeSheet();window.TAP.sheetPlanes('premium');return}sheetForm()}
  if(act==='editar')sheetForm(lista().find(x=>x.id===id));
  if(act==='ver')ver(id);
  if(act==='borrar'){
    if(T.armed!==id){T.armed=id;b.textContent='¿Borrar?';b.classList.add('armed');return}
    T.armed=null;const x=lista().find(v=>v.id===id);if(!x)return;
    try{await A.sb().storage.from(BUCKET).remove([x.path,x.path+'.jpg'])}catch(_){}
    try{await A.removeDoc('biblio',id);toast('Video borrado')}catch(_){}
    sheetLista();
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target;if(f.id!=='f-vclase')return;
  e.preventDefault();
  const titulo=document.getElementById('vc-tit').value.trim(),cat=document.getElementById('vc-cat').value,nota=document.getElementById('vc-nota').value.trim();
  const elegir=f.querySelector('input[name=vc-para]:checked').value==='elegir';
  const para=elegir?[...f.querySelectorAll('input[name=vc-al]:checked')].map(x=>x.value):'todos';
  if(titulo.length<2){toast('Escribe un título');return}
  if(elegir&&!para.length){toast('Elige al menos un alumno');return}
  if(f.dataset.id){const x=lista().find(v=>v.id===f.dataset.id);if(!x)return;
    try{await A.save('biblio',{...x,titulo,cat,nota,para});toast('Video guardado')}catch(_){}sheetLista();return}
  const file=document.getElementById('vc-f').files[0];
  if(!file){toast('Elige un video');return}
  if(!/^video\//.test(file.type||'video/')){toast('El archivo no parece un video');return}
  if(file.size>MAX){toast(`El video pesa ${mb(file.size)}. El máximo es 25 MB: acórtalo o súbelo a YouTube como "No listado".`);return}
  if(T.subiendo)return;T.subiendo=true;
  const btn=f.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Subiendo…';
  try{
    const u=A.user(),id=uid(),path=`${u.id}/clases/${id}.${extDe(file)}`;
    const mime=file.type||'video/mp4';
    const up=await A.sb().storage.from(BUCKET).upload(path,file,{contentType:mime,cacheControl:'3600',upsert:false});
    if(up.error)throw up.error;
    const mi=await miniatura(file);let thumb=false;
    if(mi.blob){const t=await A.sb().storage.from(BUCKET).upload(path+'.jpg',mi.blob,{contentType:'image/jpeg',upsert:true});thumb=!t.error}
    await A.save('biblio',{id,cat,titulo,nota,para,path,thumb,mime,size:file.size,dur:Math.round((mi.dur||0)*10)/10,fecha:A.today()});
    toast('Video subido ✓');sheetLista();
  }catch(err){toast(/mime|type/i.test(String(err&&err.message))?'Ese formato de video no se acepta. Prueba con MP4.':'No se pudo subir. Revisa tu conexión e intenta de nuevo.');btn.disabled=false;btn.textContent='Subir'}
  finally{T.subiendo=false}
});

window.TAV={botonHtml,sheetLista,opciones,nombre,CATS,firmar};
})();
