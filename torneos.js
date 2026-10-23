/* Setly · torneos y logros (etapa 2, parte 6).
   Los torneos son del jugador (tabla torneos, sql/etapa2d-torneos.sql). Los registra el jugador o su apoderado
   en "Mi tenis"; el profe conectado los ve en el perfil del alumno y también puede agregarlos.
   Los logros se calculan solos con clases, torneos, Test Setly y prácticas. */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {esc,toast}=A;
const RES={campeon:['🏆','Campeón',7],finalista:['🥈','Finalista',6],semifinal:['🥉','Semifinal',5],cuartos:['🎾','Cuartos de final',4],
  octavos:['🎾','Octavos de final',3],primera:['🎾','Primera ronda',2],participo:['🎾','Participó',1]};
const T={cache:{},cargando:{},armed:null};

const st=document.createElement('style');st.textContent=`
.trn{display:flex;flex-direction:column;gap:0}
.trow{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px dashed var(--line);text-align:left;background:none;border-left:0;border-right:0;border-bottom:0;font:inherit;color:inherit;width:100%}
.trow:first-child{border-top:0}
.trow .md{font-size:22px;text-align:center}
.trow b{display:block;font-size:14.5px}
.trow span{font-size:12.5px;color:var(--muted)}
.trow .wl{font-size:12.5px;font-variant-numeric:tabular-nums;color:var(--muted);text-align:right}
.logros{display:flex;flex-wrap:wrap;gap:6px}
.logro{display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:5px 10px;font-size:12.5px;font-weight:600;background:var(--info-bg);color:var(--court)}
.logro.no{background:transparent;border:1px dashed var(--line);color:var(--muted);font-weight:400}
`;document.head.appendChild(st);

const fCorta=f=>{try{return A.parse(f).toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'})}catch(_){return f}};

function listaHtml(ts,{editar,borrar}={}){
  if(!ts||!ts.length)return '';
  return `<div class="trn">${ts.map(t=>{const r=RES[t.resultado]||RES.participo;
    const wl=t.ganados!=null||t.perdidos!=null?`${t.ganados||0}G · ${t.perdidos||0}P`:'';
    const inner=`<span class="md">${r[0]}</span><div><b>${esc(t.nombre)}</b><span>${esc(r[1])}${t.categoria?' · '+esc(t.categoria):''} · ${esc(fCorta(t.fecha))}</span>${t.nota?`<span style="display:block">${esc(t.nota)}</span>`:''}</div>`;
    if(editar)return `<button type="button" class="trow" data-ract="editar" data-id="${esc(t.id)}">${inner}<span class="wl">${wl}</span></button>`;
    return `<div class="trow">${inner}<span class="wl">${wl}${borrar&&t.mio?`<br><button type="button" class="btn small ghost${T.armed===t.id?' armed':''}" data-ract="pborrar" data-id="${esc(t.id)}" data-al="${esc(borrar)}" style="margin-top:4px">${T.armed===t.id?'¿Borrar?':'Borrar'}</button>`:''}</span></div>`}).join('')}</div>`;
}

/* Logros: {realizadas, torneos, nivel, subio, practicas} */
function logros(x){
  const ts=x.torneos||[],rank=t=>(RES[t.resultado]||RES.participo)[2];
  const camp=ts.filter(t=>t.resultado==='campeon').length;
  const L=[
    ['🎾','Primera clase',x.realizadas>=1],['🔟','10 clases',x.realizadas>=10],['⭐','25 clases',x.realizadas>=25],['💯','50 clases',x.realizadas>=50],['🏅','100 clases',x.realizadas>=100],
    ['🎟️','Primer torneo',ts.length>=1],['✌️','Ganó un partido de torneo',ts.some(t=>(t.ganados||0)>0||rank(t)>=3)],['🥉','Semifinalista',ts.some(t=>rank(t)>=5)],
    ['🥈','Finalista',ts.some(t=>rank(t)>=6)],['🏆',camp>1?`Campeón ×${camp}`:'Campeón',camp>0],
    ['📈','Subió en el Test Setly',!!x.subio],['🔥','Nivel Setly 50',x.nivel>=50],['🚀','Nivel Setly 70',x.nivel>=70],
    ['💪','5 prácticas en casa',x.practicas>=5],['🧱','20 prácticas en casa',x.practicas>=20]
  ];
  return L.map(([i,t,ok])=>({i,t,ok}));
}
function logrosHtml(x){
  const L=logros(x),ok=L.filter(l=>l.ok),prox=L.filter(l=>!l.ok).slice(0,3);
  return `<div class="logros">${ok.map(l=>`<span class="logro">${l.i} ${esc(l.t)}</span>`).join('')}${prox.map(l=>`<span class="logro no">🔒 ${esc(l.t)}</span>`).join('')}</div>
   ${ok.length?'':'<span class="muted" style="font-size:12.5px">Cada clase, práctica y torneo suma. ¡El primer logro está cerca!</span>'}`;
}

/* Hoja para registrar o editar. modo: 'jugador' (tabla, dueño) o 'profe' (función, alumno conectado) */
function sheetTorneo({modo,jugadorId,alumnoId,t}){
  t=t||{};const nuevo=!t.id;
  A.sheet(`<h2>${nuevo?'Registrar torneo':'Editar torneo'}</h2>
  <form id="f-torneo" data-modo="${modo}" data-jug="${esc(jugadorId||'')}" data-al="${esc(alumnoId||'')}" data-id="${esc(t.id||'')}"><div style="display:flex;flex-direction:column;gap:14px">
  <div class="field"><label for="to-nom">Torneo</label><input id="to-nom" required maxlength="120" value="${esc(t.nombre||'')}" placeholder="Ej: Abierto de Primavera, Club Manquehue"></div>
  <div class="grid2"><div class="field"><label for="to-f">Fecha</label><input id="to-f" type="date" required value="${esc(t.fecha||A.today())}"></div>
   <div class="field"><label for="to-cat">Categoría</label><input id="to-cat" maxlength="60" value="${esc(t.categoria||'')}" placeholder="Ej: Sub-14, 3ª"></div></div>
  <div class="field"><label for="to-res">Resultado</label><select id="to-res">${Object.entries(RES).map(([k,v])=>`<option value="${k}" ${(t.resultado||'primera')===k?'selected':''}>${v[0]} ${v[1]}</option>`).join('')}</select></div>
  <div class="grid2"><div class="field"><label for="to-g">Partidos ganados</label><input id="to-g" type="number" min="0" max="50" inputmode="numeric" value="${t.ganados??''}"></div>
   <div class="field"><label for="to-p">Partidos perdidos</label><input id="to-p" type="number" min="0" max="50" inputmode="numeric" value="${t.perdidos??''}"></div></div>
  <div class="field"><label for="to-n">Comentario (opcional)</label><textarea id="to-n" rows="2" maxlength="500" placeholder="Cómo te fue, qué aprendiste…">${esc(t.nota||'')}</textarea></div>
  <div class="sheet-actions">${!nuevo&&modo==='jugador'?`<button type="button" class="btn danger" data-ract="borrar" data-id="${esc(t.id)}">Borrar</button>`:''}
   <div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Guardar</button></div></div>
  </div></form>`);
}
const avisar=()=>document.dispatchEvent(new CustomEvent('setly:torneos'));

/* ---------- lado profe: sección en el perfil ---------- */
async function cargarProfe(id){
  if(T.cargando[id])return;T.cargando[id]=true;
  try{const {data,error}=await A.sb().rpc('torneos_de_alumno',{p_alumno:id});
    T.cache[id]={t:Date.now(),data:error?null:(data||[]),sinScript:!!error&&(error.code==='PGRST202'||error.code==='42883'||/could not find|does not exist/i.test(error.message||''))}}
  catch(_){T.cache[id]={t:Date.now(),data:null}}
  T.cargando[id]=false;A.render();
}
function seccion(id){
  if(!A.isCloud()||!window.TAC||!window.TAC.conectado)return '';
  const head=`<section class="xp"><div class="sec-h"><h3>Torneos</h3>`;
  if(!window.TAC.conectado(id))return head+`</div><div class="note">Los torneos los registra el alumno o su apoderado en su app, y quedan con él aunque cambie de profe. Conéctalo (más abajo) para verlos aquí y agregarlos tú también.</div></section>`;
  const c=T.cache[id];
  if(!c||Date.now()-c.t>60000)setTimeout(()=>cargarProfe(id),0);
  if(c&&c.sinScript)return '';
  let h=head+`<button class="btn small primary" data-ract="pnuevo" data-id="${esc(id)}">+ Registrar torneo</button></div>`;
  if(!c||!c.data)return h+`<div class="note">Cargando…</div></section>`;
  if(!c.data.length)return h+`<div class="note">Aún no hay torneos registrados.</div></section>`;
  const camp=c.data.filter(t=>t.resultado==='campeon').length,g=c.data.reduce((s,t)=>s+(t.ganados||0),0),p=c.data.reduce((s,t)=>s+(t.perdidos||0),0);
  h+=`<div class="box"><div class="stats"><div><b>${c.data.length}</b><span>torneos</span></div><div><b>${camp}</b><span>títulos</span></div><div><b>${g}-${p}</b><span>partidos G-P</span></div></div></div>`;
  return h+`<div class="box">${listaHtml(c.data,{borrar:id})}</div></section>`;
}

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-ract]');if(!b)return;
  const act=b.dataset.ract,id=b.dataset.id;
  if(act!=='pborrar'&&act!=='borrar')T.armed=null;
  if(act==='pnuevo')sheetTorneo({modo:'profe',alumnoId:id});
  if(act==='editar'){const t=(window.__torneosJug||[]).find(x=>x.id===id);if(t)sheetTorneo({modo:'jugador',jugadorId:t.jugador_id,t})}
  if(act==='borrar'){
    if(T.armed!==id){T.armed=id;b.textContent='Toca otra vez para borrar';b.classList.add('armed');return}
    T.armed=null;const {error}=await A.sb().from('torneos').delete().eq('id',id);
    if(error){toast('No se pudo borrar');return}A.closeSheet();toast('Torneo borrado');avisar();
  }
  if(act==='pborrar'){
    if(T.armed!==id){T.armed=id;b.textContent='¿Borrar?';b.classList.add('armed');return}
    T.armed=null;const {error}=await A.sb().rpc('profe_borra_torneo',{p_id:id});
    if(error){toast('No se pudo borrar');return}toast('Torneo borrado');cargarProfe(b.dataset.al);
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target;if(f.id!=='f-torneo')return;
  e.preventDefault();e.stopImmediatePropagation();
  const v=id=>document.getElementById(id).value.trim(),num=id=>{const x=v(id);return x===''?null:Math.max(0,Math.min(50,parseInt(x,10)||0))};
  const d={nombre:v('to-nom'),fecha:v('to-f'),categoria:v('to-cat')||null,resultado:v('to-res'),ganados:num('to-g'),perdidos:num('to-p'),nota:v('to-n')||null};
  if(d.nombre.length<2){toast('Escribe el nombre del torneo');return}
  if(!d.fecha){toast('Elige la fecha');return}
  const btn=f.querySelector('button[type=submit]');btn.disabled=true;
  try{
    let error;
    if(f.dataset.modo==='profe'){
      ({error}=await A.sb().rpc('profe_agrega_torneo',{p_alumno:f.dataset.al,p_nombre:d.nombre,p_fecha:d.fecha,p_categoria:d.categoria,p_resultado:d.resultado,p_ganados:d.ganados,p_perdidos:d.perdidos,p_nota:d.nota}));
    }else if(f.dataset.id){({error}=await A.sb().from('torneos').update(d).eq('id',f.dataset.id))}
    else{({error}=await A.sb().from('torneos').insert({...d,jugador_id:f.dataset.jug}))}
    if(error){toast('No se pudo guardar. Revisa tu conexión.');return}
    A.closeSheet();toast(d.resultado==='campeon'?'¡Felicitaciones, campeón! 🏆':'Torneo guardado');
    if(f.dataset.modo==='profe')cargarProfe(f.dataset.al);else avisar();
  }finally{if(btn.isConnected)btn.disabled=false}
},true);

window.TAR={seccion,listaHtml,logros,logrosHtml,sheetTorneo,RES};
})();
