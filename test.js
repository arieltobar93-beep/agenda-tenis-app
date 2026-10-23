/* Setly · Test Setly (etapa 2, parte 2).
   6 pruebas objetivas que el profe registra de a poco en clases normales.
   Cada resultado se guarda en el alumno (a.tests = [{id,p,v,fecha}]); vale 90 días.
   Con las 6 vigentes se calcula el Nivel Setly (0 a 100). */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {esc,toast,uid}=A;
const VIGENCIA=90;
const PRUEBAS=[
  {k:'derecha',n:'Derecha',u:'de 10',min:0,max:10,how:'10 derechas cruzadas desde el fondo, con la pelota lanzada por el profe. Cuenta las que caen dentro de la cancha y pasada la línea de saque.',score:v=>v},
  {k:'reves',n:'Revés',u:'de 10',min:0,max:10,how:'10 reveses cruzados desde el fondo, con la pelota lanzada por el profe. Cuenta las que caen dentro de la cancha y pasada la línea de saque.',score:v=>v},
  {k:'saque',n:'Saque',u:'de 10',min:0,max:10,how:'10 saques, 5 por cada lado. Cuenta los que entran en el cuadro de saque.',score:v=>v},
  {k:'volea',n:'Volea',u:'de 10',min:0,max:10,how:'10 voleas en la red, alternando derecha y revés. Cuenta las que caen dentro, pasada la línea de saque.',score:v=>v},
  {k:'peloteo',n:'Peloteo',u:'golpes',min:0,max:200,how:'Peloteo con el profe desde el fondo. Anota el peloteo más largo sin fallar en 2 minutos (golpes del alumno). 30 o más = puntaje máximo.',score:v=>Math.min(10,v/3)},
  {k:'pies',n:'Desplazamiento',u:'segundos',min:5,max:90,step:'0.1',how:'Carrera "araña": 5 conos sobre las líneas, partiendo del centro de la línea de fondo, ida y vuelta a cada cono. Anota el tiempo. 16 s o menos = puntaje máximo, 30 s o más = 0.',score:v=>Math.max(0,Math.min(10,(30-v)/1.4))}
];
const P=Object.fromEntries(PRUEBAS.map(p=>[p.k,p]));

const st=document.createElement('style');st.textContent=`
.tst .box.nivel{display:flex;flex-direction:row;align-items:center;gap:14px}
.tst .nivel b{font-family:var(--f-display);font-size:44px;line-height:1;font-variant-numeric:tabular-nums}
.tst .nivel span{font-size:13px;color:var(--muted)}
.tgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tcel{border:1px solid var(--line);border-radius:var(--r);padding:10px 11px;background:var(--surface);display:flex;flex-direction:column;gap:5px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.tcel b{font-size:14px}
.tcel .v{font-size:13px;font-variant-numeric:tabular-nums}
.tcel .s{font-size:11.5px;color:var(--muted)}
.tcel.falta{border-style:dashed;background:transparent}
.tcel.vence .s{color:var(--warn)}
.tbar{height:6px;border-radius:99px;background:var(--line);overflow:hidden}.tbar i{display:block;height:100%;background:var(--court)}
.tpick{display:flex;flex-wrap:wrap;gap:6px}
.tpick label{border:1px solid var(--line);border-radius:99px;padding:6px 11px;font-size:13px;cursor:pointer;background:var(--bg)}
.tpick label.falta{border-style:dashed}
.tpick input{position:absolute;opacity:0;pointer-events:none}
.tpick label:has(input:checked){background:var(--court);color:#fff;border-color:var(--court)}
.thow{font-size:13.5px;background:var(--surface);border-radius:8px;padding:10px 12px;border:1px solid var(--line)}
.tclase{display:flex;flex-wrap:wrap;gap:6px}
`;document.head.appendChild(st);

const dias=f=>Math.floor((new Date(A.today()+'T12:00')-new Date(f+'T12:00'))/864e5);
const tests=a=>(a&&Array.isArray(a.tests)?a.tests:[]).filter(t=>t&&P[t.p]).sort((x,y)=>x.fecha.localeCompare(y.fecha)||x.id.localeCompare(y.id));
function estado(a){
  const T=tests(a),out={};
  for(const p of PRUEBAS){
    const h=T.filter(t=>t.p===p.k),u=h[h.length-1],ant=h[h.length-2];
    const d=u?dias(u.fecha):null;
    out[p.k]={p,u,ant,dias:d,vigente:!!u&&d<=VIGENCIA,vence:!!u&&d>VIGENCIA-14&&d<=VIGENCIA,pts:u?Math.round(p.score(+u.v)*10)/10:null};
  }
  return out;
}
function nivel(a){
  const e=estado(a),vig=PRUEBAS.filter(p=>e[p.k].vigente);
  return {completo:vig.length===PRUEBAS.length,hechas:vig.length,valor:vig.length===PRUEBAS.length?Math.round(PRUEBAS.reduce((s,p)=>s+e[p.k].pts,0)/PRUEBAS.length*10):null};
}
/* Nivel de una fecha pasada (para mostrar "antes") */
function nivelAl(a,fecha){
  const T=tests(a).filter(t=>t.fecha<=fecha);let s=0;
  for(const p of PRUEBAS){const h=T.filter(t=>t.p===p.k);const u=h[h.length-1];if(!u||dias(u.fecha)-dias(fecha)>VIGENCIA)return null;s+=p.score(+u.v)}
  return Math.round(s/PRUEBAS.length*10);
}
const faltan=a=>{const e=estado(a);return PRUEBAS.filter(p=>!e[p.k].vigente||e[p.k].vence)};
const fmtV=(p,v)=>p.k==='pies'?`${String(v).replace('.',',')} s`:p.k==='peloteo'?`${v} golpes`:`${v} de 10`;
const fmtF=f=>{try{return A.dayName(f)}catch(_){return f}};

function seccion(id){
  const a=A.alumno(id);if(!a)return '';
  const e=estado(a),n=nivel(a),T=tests(a);
  let h=`<section class="xp tst"><div class="sec-h"><h3>Test Setly</h3><button class="btn small primary" data-tact="nueva" data-id="${esc(id)}">+ Registrar prueba</button></div>`;
  if(!T.length)return h+`<div class="note">6 pruebas cortas (derecha, revés, saque, volea, peloteo y desplazamiento) que puedes ir tomando de a poco en clases normales. Con las 6 al día se calcula su Nivel Setly, de 0 a 100, y se ve cómo mejora cada 3 meses.</div></section>`;
  // nivel
  let antes=null;
  if(n.completo){const fechas=[...new Set(T.map(t=>t.fecha))].sort();for(let i=fechas.length-1;i>=0;i--){const f=fechas[i];if(dias(f)>=30){antes=nivelAl(a,f);if(antes!==null)break}}}
  h+=`<div class="box nivel">${n.completo?`<b>${n.valor}</b><div><div><strong>Nivel Setly</strong></div><span>de 100${antes!==null?` · ${n.valor>=antes?'+':''}${n.valor-antes} vs. hace un tiempo (${antes})`:''}</span></div>`
    :`<b>${n.hechas}/6</b><div><div><strong>Pruebas al día</strong></div><span>Faltan ${6-n.hechas} para calcular su Nivel Setly</span></div>`}</div>`;
  h+=`<div class="tgrid">${PRUEBAS.map(p=>{const x=e[p.k];
    if(!x.u)return `<button class="tcel falta" data-tact="nueva" data-id="${esc(id)}" data-p="${p.k}"><b>${p.n}</b><span class="s">Falta · toca para registrar</span></button>`;
    const cls=!x.vigente?'falta':x.vence?'vence':'';
    const dif=x.ant?Math.round((x.pts-p.score(+x.ant.v))*10)/10:null;
    return `<button class="tcel ${cls}" data-tact="nueva" data-id="${esc(id)}" data-p="${p.k}"><b>${p.n}</b><span class="v">${esc(fmtV(p,x.u.v))}${dif?` <span class="s">(${dif>0?'▲':'▼'} antes ${esc(fmtV(p,x.ant.v))})</span>`:''}</span>
      <div class="tbar"><i style="width:${x.pts*10}%"></i></div><span class="s">${!x.vigente?'Venció · toca repetir':x.vence?'Vence pronto · '+esc(fmtF(x.u.fecha)):esc(fmtF(x.u.fecha))}</span></button>`}).join('')}</div>`;
  h+=`<label class="fvis" style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted)"><input type="checkbox" data-tact="vis" data-id="${esc(id)}" style="width:auto;margin:0" ${a.testVis===false?'':'checked'}> Visible para el alumno</label>`;
  h+=`<button class="btn small ghost" data-tact="hist" data-id="${esc(id)}" style="align-self:flex-start">Ver historial (${T.length})</button>`;
  return h+`</section>`;
}

function sheetPrueba(id,pk){
  const a=A.alumno(id);if(!a)return;
  const e=estado(a),pend=faltan(a);
  pk=pk||(pend[0]||PRUEBAS[0]).k;
  const nombre=String(a.nombre).replace(/^Ejemplo:\s*/,'');
  A.sheet(`<h2>Registrar prueba</h2><p class="muted" style="margin:0">${esc(nombre)}${pend.length?` · ${pend.length===6?'aún no tiene pruebas':'le faltan: '+pend.map(p=>p.n).join(', ')}`:' · tiene las 6 al día'}</p>
  <form id="f-test" data-id="${esc(id)}"><div style="display:flex;flex-direction:column;gap:14px">
  <div class="field"><span>Prueba</span><div class="tpick">${PRUEBAS.map(p=>`<label class="${pend.includes(p)?'falta':''}"><input type="radio" name="tp" value="${p.k}" ${p.k===pk?'checked':''}>${p.n}</label>`).join('')}</div></div>
  <div class="thow" id="t-how"></div>
  <div class="grid2"><div class="field"><label for="t-v" id="t-lab">Resultado</label><input id="t-v" type="number" inputmode="decimal" required></div>
  <div class="field"><label for="t-f">Fecha</label><input id="t-f" type="date" value="${A.today()}" required></div></div>
  <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Guardar</button></div></div>
  </div></form>`);
  pintar();
}
function pintar(){
  const fm=document.getElementById('f-test');if(!fm)return;
  const p=P[fm.querySelector('input[name=tp]:checked').value];
  const a=A.alumno(fm.dataset.id),x=estado(a)[p.k];
  document.getElementById('t-how').innerHTML=`<b>Cómo se mide:</b> ${esc(p.how)}${x.u?`<br><span class="muted">Última vez: ${esc(fmtV(p,x.u.v))} · ${esc(fmtF(x.u.fecha))}</span>`:''}`;
  document.getElementById('t-lab').textContent='Resultado ('+p.u+')';
  const v=document.getElementById('t-v');v.min=p.min;v.max=p.max;v.step=p.step||'1';
}
function sheetHist(id){
  const a=A.alumno(id);if(!a)return;
  const T=[...tests(a)].reverse();
  A.sheet(`<h2>Historial del test</h2><div class="box hist">${T.map(t=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(fmtF(t.fecha))} · <b>${esc(P[t.p].n)}</b> ${esc(fmtV(P[t.p],t.v))}</span><button type="button" class="btn small ghost${A.ui.armed===t.id?' armed':''}" data-tact="borrar" data-id="${esc(id)}" data-t="${esc(t.id)}">${A.ui.armed===t.id?'¿Borrar?':'Borrar'}</button></div>`).join('')}</div>
  <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button></div></div>`);
}
/* Para la hoja de la clase (index.html): un botón por alumno */
function claseHtml(c){
  const als=(c.alumnoIds||[]).map(A.alumno).filter(Boolean);if(!als.length)return '';
  return `<div class="field"><span>Test Setly</span><div class="tclase">${als.map(a=>{const f=faltan(a).length;
    return `<button type="button" class="btn small${f?'':' ghost'}" data-tact="nueva" data-id="${esc(a.id)}">${esc(String(a.nombre).replace(/^Ejemplo:\s*/,'').split(' ')[0])}${f?` · faltan ${f}`:' · al día ✓'}</button>`}).join('')}</div>
    <span class="muted" style="font-size:12px">Aprovecha la clase para tomar una prueba. Guarda antes los cambios de la clase.</span></div>`;
}

document.addEventListener('change',e=>{
  if(e.target.name==='tp'&&e.target.closest('#f-test'))pintar();
  const b=e.target.closest('input[data-tact=vis]');
  if(b){const a=A.alumno(b.dataset.id);if(a)A.save('alumnos',{...a,testVis:b.checked}).then(()=>toast(b.checked?'El alumno verá su test':'Test oculto para el alumno')).catch(()=>{})}
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-tact]');if(!b||b.dataset.tact==='vis')return;
  const id=b.dataset.id;
  if(b.dataset.tact==='nueva'){A.closeSheet();sheetPrueba(id,b.dataset.p);}
  if(b.dataset.tact==='hist')sheetHist(id);
  if(b.dataset.tact==='borrar'){
    const t=b.dataset.t;
    if(A.ui.armed!==t){A.ui.armed=t;b.classList.add('armed');b.textContent='¿Borrar?';return}
    A.ui.armed=null;const a=A.alumno(id);if(!a)return;
    try{await A.save('alumnos',{...a,tests:tests(a).filter(x=>x.id!==t)});toast('Prueba borrada');sheetHist(id)}catch(_){}
  }
});
document.addEventListener('submit',async e=>{
  const fm=e.target;if(fm.id!=='f-test')return;
  e.preventDefault();
  const a=A.alumno(fm.dataset.id);if(!a)return;
  const p=P[fm.querySelector('input[name=tp]:checked').value];
  const v=parseFloat(String(document.getElementById('t-v').value).replace(',','.'));
  if(isNaN(v)||v<p.min||v>p.max){toast(`Ingresa un número entre ${p.min} y ${p.max}`);return}
  const fecha=document.getElementById('t-f').value||A.today();
  A.closeSheet();
  try{await A.save('alumnos',{...a,tests:[...tests(a),{id:uid(),p:p.k,v,fecha}]});
    const n=nivel(A.alumno(a.id));toast(n.completo?`Guardado · Nivel Setly ${n.valor}`:`Guardado · ${n.hechas} de 6 pruebas al día`)}catch(_){}
});

window.TAT={seccion,claseHtml,estado,nivel,faltan,PRUEBAS};
})();
