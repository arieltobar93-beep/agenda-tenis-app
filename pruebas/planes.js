/* Setly · planes por cantidad de alumnos activos.
   Gratis (3) · Inicial (10) · Pro (30) · Academia (100). La prueba de 7 días usa el plan Pro.
   El límite lo controla la base de datos (sql/etapa1bc-…); aquí se avisa antes y se ofrece cambiar de plan.
   Links de pago: config.js puede traer pagos:{inicial:'…',pro:'…',academia:'…'}; si no, se usa payUrl. */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {S,esc,toast,sheet,closeSheet,clp}=A;
const PLANES=[
  {id:'gratis',nombre:'Gratis',max:3,precio:0,premium:false},
  {id:'inicial',nombre:'Inicial',max:10,precio:7990,premium:true},
  {id:'pro',nombre:'Pro',max:30,precio:14990,premium:true},
  {id:'academia',nombre:'Academia',max:100,precio:29990,premium:true}
];

const st=document.createElement('style');st.id='pstyle';st.textContent=`
.plan-uso{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.plan-uso .top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.plan-uso .top b{font-size:15px}
.plan-uso .barra{height:8px;border-radius:99px;background:var(--line);overflow:hidden}
.plan-uso .barra i{display:block;height:100%;background:var(--court);border-radius:99px}
.plan-uso.casi .barra i{background:var(--warn)}
.plan-uso.lleno .barra i,.plan-uso.excedido .barra i{background:var(--bad)}
.plan-uso.excedido{border-color:var(--bad)}
.plan-uso .txt{font-size:12.5px;color:var(--muted)}
.planes{display:flex;flex-direction:column;gap:10px}
.pcard{border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;background:var(--bg)}
.pcard.actual{border-color:var(--court);box-shadow:inset 0 0 0 1px var(--court)}
.pcard h3{margin:0;font-family:var(--f-display);font-size:20px;font-weight:600}
.pcard .precio{font-family:var(--f-display);font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.pcard .precio small{font-family:var(--f-body);font-size:12px;color:var(--muted);font-weight:400}
.pcard .det{grid-column:1/-1;font-size:13px;color:var(--muted)}
.pcard .acc{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
a.btn{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
`;document.head.appendChild(st);

const activos=arr=>(arr||[]).filter(a=>a&&!a.archivado).length;
const sub=()=>A.sub()||{};
const cloud=()=>A.isCloud&&A.isCloud();
function limite(){const s=sub();return cloud()&&s.max_alumnos?s.max_alumnos:Infinity}
function planActual(){const s=sub();return PLANES.find(p=>p.id===s.plan)||null}

/* Antes de guardar: true = no guardar (y se muestra por qué). */
function frena(col,obj){
  const lim=limite();if(lim===Infinity)return false;
  const antes=activos(S.alumnos);let despues=antes;
  if(col==='alumnos')despues=activos(S.alumnos.filter(x=>x.id!==obj.id).concat([obj]));
  if(despues>lim&&despues>=antes){closeSheet();sheetPlanes(despues>antes&&antes>=lim?'nuevo':'exceso');return true}
  return false;
}
function frenaBorrar(col){
  if(col==='alumnos')return false; // borrar alumnos siempre ayuda a volver al límite
  const lim=limite();if(lim===Infinity||activos(S.alumnos)<=lim)return false;
  closeSheet();sheetPlanes('exceso');return true;
}
const esLimite=e=>/LIMITE_ALUMNOS/.test(String((e&&(e.message||e.details||e.hint))||e||''));
function alLimite(){if(!document.querySelector('#modal .sheet'))sheetPlanes('exceso')}

/* Barra de uso: pestaña Alumnos */
function usoHtml(){
  if(!cloud()||limite()===Infinity)return '';
  const s=sub(),n=activos(S.alumnos),lim=limite(),pct=Math.min(100,Math.round(n/lim*100));
  const cls=n>lim?'excedido':n===lim?'lleno':pct>=80?'casi':'';
  const txt=n>lim?`Superaste tu plan: archiva ${n-lim} ${n-lim===1?'alumno':'alumnos'} que ya no vengan o elige un plan más grande para seguir guardando cambios.`
    :n===lim?'Llegaste al límite de tu plan. Para agregar otro alumno, archiva uno o cambia de plan.'
    :s.tipo==='prueba'?`Prueba gratis con el plan Pro: ${s.dias} ${s.dias==1?'día':'días'} más. Después pasas al plan Gratis (3 alumnos) si no eliges uno.`:'';
  return `<div class="plan-uso ${cls}"><div class="top"><b>${n} de ${lim} alumnos activos</b><button class="btn small" data-pact="planes">${esc(s.plan_nombre?'Plan '+s.plan_nombre:'Ver planes')} · Cambiar</button></div>
   <div class="barra"><i style="width:${pct}%"></i></div>${txt?`<span class="txt">${esc(txt)}</span>`:''}</div>`;
}
/* Bloque para Ajustes */
function ajustesHtml(){
  const s=sub();if(!s.plan)return '';
  const n=activos(S.alumnos),fin=s.fin?new Date(s.fin).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}):'';
  const estado=s.tipo==='prueba'?`Prueba gratis hasta el ${fin}`:s.tipo==='plan'?`Pagado hasta el ${fin}`:'Plan gratuito';
  return `<div class="field"><span>Tu plan</span><div class="acct">Plan ${esc(s.plan_nombre||s.plan)} · ${n} de ${s.max_alumnos>=100000?'∞':s.max_alumnos} alumnos activos</div>
   <span class="muted" style="font-size:12.5px">${esc(estado)}${s.premium?' · incluye videos e IA':' · sin videos ni IA'}</span>
   <button type="button" class="btn small" data-pact="planes" style="align-self:flex-start">Ver planes</button></div>`+(window.TAC?window.TAC.ajustesHtml():'');
}

/* Hoja de planes */
function linkPago(id){const C=window.APP_CONFIG||{};return (C.pagos&&C.pagos[id])||C.payUrl||''}
function sheetPlanes(motivo){
  const s=sub(),n=activos(S.alumnos),lim=limite(),act=s.plan;
  const C=window.APP_CONFIG||{};
  const intro=motivo==='nuevo'?`<div class="msg bad">Llegaste al límite de tu plan (${lim} alumnos activos). Para agregar otro, archiva un alumno que ya no venga o elige un plan más grande.</div>`
    :motivo==='exceso'?`<div class="msg bad">Tienes ${n} alumnos activos y tu plan permite ${lim}. Tus datos están a salvo, pero para seguir guardando cambios archiva alumnos que ya no vengan o elige un plan más grande.</div>`
    :motivo==='premium'?`<div class="msg bad">Los videos y el análisis con IA están en los planes pagados.</div>`:'';
  const cards=PLANES.map(p=>{
    const esAct=p.id===act&&s.tipo!=='prueba', link=linkPago(p.id);
    const cabe=n<=p.max;
    return `<div class="pcard${esAct?' actual':''}"><h3>${esc(p.nombre)}${esAct?' <span class="chip aldia">Tu plan</span>':''}</h3>
     <div class="precio">${p.precio?clp(p.precio)+'<small> /mes</small>':'Gratis'}</div>
     <div class="det">Hasta ${p.max} alumnos activos · ${p.premium?'videos y análisis con IA':'sin videos ni IA'}${!cabe?` · tienes ${n}, tendrías que archivar ${n-p.max}`:''}</div>
     ${p.precio&&!esAct?`<div class="acc">${link?`<a class="btn small primary" href="${esc(link)}" target="_blank" rel="noopener">Pagar plan ${esc(p.nombre)}</a>`:`<span class="muted" style="font-size:12.5px">Escribe a ${esc(C.contacto||'Setly')} para contratarlo.</span>`}</div>`:''}</div>`}).join('');
  sheet(`<h2>Planes Setly</h2>${intro}
   ${s.tipo==='prueba'?`<p class="muted" style="margin:0">Estás en la prueba gratis con el plan Pro (${s.dias} ${s.dias==1?'día':'días'} más).</p>`:''}
   <div class="planes">${cards}</div>
   <p class="muted" style="margin:0;font-size:13px">Pagas solo por alumnos activos: los que archivas no cuentan y conservan todo su historial. Después de pagar, toca <b>Ya pagué</b>; activamos tu plan apenas se confirma el pago.${C.contacto?' Dudas: '+esc(C.contacto)+'.':''}</p>
   <div class="sheet-actions"><button type="button" class="btn" data-pact="archivar">Archivar alumnos</button><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button type="button" class="btn primary" data-pact="refrescar">Ya pagué</button></div></div>`);
}

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-pact]');if(!b)return;
  const act=b.dataset.pact;
  if(act==='planes'){sheetPlanes();return}
  if(act==='archivar'){closeSheet();A.ui.tab='alumnos';A.ui.perfil=null;A.render();window.scrollTo(0,0);toast('Abre cada alumno que ya no viene y toca "Archivar alumno"');return}
  if(act==='refrescar'){
    const antes=sub().plan+'|'+sub().fin;b.disabled=true;b.textContent='Revisando…';
    try{await A.refrescarPlan()}catch(_){}
    const ahora=sub().plan+'|'+sub().fin;closeSheet();
    toast(antes!==ahora?'¡Listo! Tu plan quedó activo: Plan '+(sub().plan_nombre||''):'Aún no vemos el pago. Si ya pagaste, lo activaremos muy pronto.');
  }
});

window.TAP={frena,frenaBorrar,esLimite,alLimite,usoHtml,ajustesHtml,sheetPlanes,activos,PLANES};
})();
