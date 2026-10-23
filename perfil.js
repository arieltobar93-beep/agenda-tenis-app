/* Setly · perfil del alumno, evaluaciones, videos, comparador e IA.
   Usa la API que index.html publica en window.TA. */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {S,ui,esc,uid,toast}=A;
const BUCKET='videos';
const MAX_SEG=20;            // segundos máximos al grabar
const MAX_DIA=10; // videos por día
const MAX_SUBIDA=25*1024*1024; // límite del bucket
const GOLPES={derecha:'Derecha',reves:'Revés',saque:'Saque',volea:'Volea',remate:'Remate',otro:'Otro'};
const ANGULOS={atras:'Desde atrás',costado:'De costado',frente:'De frente',otro:'Otro ángulo'};
const SKILLS=[['d','Derecha','#d95f02'],['r','Revés','#1b9e77'],['s','Saque','#7570b3'],['v','Volea','#e7298a'],['m','Movilidad','#66a61e']];
const CONSEJO_GOLPE={
  derecha:'Desde atrás, centrado en la línea de fondo, para ver la trayectoria. Otra toma de costado muestra el punto de impacto.',
  reves:'Desde atrás, centrado en la línea de fondo, para ver la trayectoria. Otra toma de costado muestra el punto de impacto.',
  saque:'Desde atrás y un poco hacia el lado del brazo que saca. Que se vea desde los pies hasta lo más alto del lanzamiento.',
  volea:'De costado, a la altura de la red o un poco más atrás. Que se vea la raqueta delante del cuerpo.',
  remate:'Desde atrás y un poco al lado del brazo que golpea, con el cuerpo completo en cuadro.',
  otro:'Lo más importante es repetir siempre el mismo ángulo y la misma distancia.'
};
const CONSEJOS=[
  ['Celular fijo','Apóyalo en un trípode o un lugar firme. Nunca en la mano.'],
  ['Horizontal','Gira el celular a lo ancho.'],
  ['Cuerpo completo','Que se vea al alumno entero y la raqueta, incluido el punto de impacto. A unos 4 a 6 metros, sin zoom.'],
  ['Altura','Cámara a la altura de la cintura o el pecho.'],
  ['Luz','Con el sol de frente o de costado. Evita grabar con el sol justo detrás del alumno.'],
  ['Fondo y ropa','Fondo limpio y ropa que contraste con el fondo.'],
  ['Clips cortos','10 a 15 segundos, con 2 o 3 repeticiones del mismo golpe.'],
  ['Siempre igual','Para comparar, repite el mismo ángulo, distancia y encuadre cada vez.']
];
const sb=()=>window.__SB_MOCK||A.sb();
const uid0=()=>{const u=A.user();return u&&u.id};
const fmtF=f=>{try{return A.dayName(f)}catch(_){return f}};
const ev=id=>S.evals.filter(e=>e.alumnoId===id).sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.id.localeCompare(b.id));
const vids=id=>S.videos.filter(v=>v.alumnoId===id).sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.id.localeCompare(a.id));
const mb=n=>(n/1048576).toFixed(1)+' MB';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- estilos ---------- */
const st=document.createElement('style');st.id='xstyle';st.textContent=`
.xp{display:flex;flex-direction:column;gap:14px}
.xp h2{margin:0;font-family:var(--f-display);font-size:28px;font-weight:600;line-height:1.1}
.xp h3{margin:0;font-family:var(--f-display);font-size:20px;font-weight:600;letter-spacing:.02em}
.xp .chips{display:flex;flex-wrap:wrap;gap:6px}
.xp .xc{background:var(--info-bg);color:var(--court);border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:600}
:root[data-theme="dark"] .xp .xc{color:var(--chalk)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .xp .xc{color:var(--chalk)}}
.xp .box{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px;display:flex;flex-direction:column;gap:10px}
.xp .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.xp .stats b{display:block;font-family:var(--f-display);font-size:24px;font-weight:600}
.xp .stats span{font-size:12px;color:var(--muted)}
.xp .sec-h{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.xp .bars{display:grid;grid-template-columns:84px 1fr 54px;gap:6px 8px;align-items:center;font-size:13.5px}
.xp .seg{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}
.xp .seg i{height:10px;border-radius:3px;background:var(--line)}
.xp .seg i.on{background:var(--court)}
.xp .dl{font-variant-numeric:tabular-nums;font-size:12.5px;color:var(--muted);text-align:right}
.xp .dl.up{color:var(--ok)}.xp .dl.down{color:var(--bad)}
.xp .legend{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--muted)}
.xp .legend i{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:5px;vertical-align:middle}
.xp .vgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.xp .vcard{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;text-align:left;padding:0;display:flex;flex-direction:column}
.xp .vcard .th{aspect-ratio:16/9;background:#0b1319;display:grid;place-items:center;color:#9fb0bf;font-size:26px;position:relative}
.xp .vcard .th img{width:100%;height:100%;object-fit:cover;display:block}
.xp .vcard .th .ia{position:absolute;top:6px;right:6px;background:var(--ball);color:var(--ball-ink);font-size:11px;font-weight:700;border-radius:999px;padding:1px 7px}
.xp .vcard .in{padding:8px 10px;display:flex;flex-direction:column;gap:2px;font-size:12.5px;color:var(--muted)}
.xp .vcard .in b{color:var(--ink);font-size:14px}
.xp .row2{display:flex;gap:8px;flex-wrap:wrap}
.xp .hist button{display:flex;justify-content:space-between;width:100%;padding:9px 0;background:none;border:0;border-top:1px solid var(--line);font-size:13.5px;text-align:left}
.xp .hist button:first-child{border-top:0}
.xrate{display:flex;flex-wrap:wrap;gap:6px}
.xrate label{position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:38px;border:1px solid var(--line);border-radius:8px;cursor:pointer;font-weight:700;background:var(--bg)}
.xrate input{position:absolute;opacity:0;pointer-events:none}
.xrate label:has(input:checked){background:var(--court);border-color:var(--court);color:var(--chalk)}
.xrate label:has(input:focus-visible){outline:2px solid var(--ball);outline-offset:2px}
#xov,#xrec{position:fixed;inset:0;z-index:60;background:#0b1319;color:#e8eef3;display:flex;flex-direction:column;font-family:var(--f-body)}
#xov button,#xrec button{font:inherit}
.xbar{display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px 8px;background:#101c26}
.xbar b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px}
.xb{background:#1d2f3d;color:#e8eef3;border:1px solid #2b4153;border-radius:999px;padding:7px 13px;font-size:13.5px;font-weight:600;min-height:36px}
.xb.on{background:var(--ball);color:var(--ball-ink);border-color:var(--ball)}
.xb.pri{background:#2a6d9e;border-color:#2a6d9e}
.xb.bad{color:#ffb4aa}
.xb:disabled{opacity:.45}
.xpanes{flex:1;min-height:0;display:flex;gap:4px;background:#000}
.xpanes.col{flex-direction:column}
.xpane{position:relative;flex:1;min-width:0;min-height:0;background:#000;overflow:hidden}
.xpane video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
.xpane canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.xpane canvas.on{cursor:crosshair}
.xpane .lab{position:absolute;left:6px;top:6px;background:rgba(0,0,0,.6);border-radius:6px;padding:2px 8px;font-size:12px;pointer-events:none}
.xctl{padding:8px 10px calc(env(safe-area-inset-bottom,0px) + 8px);background:#101c26;display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto}
.xctl .r{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.xctl input[type=range]{flex:1;min-width:120px;accent-color:#d5e63c}
.xctl .t{font-variant-numeric:tabular-nums;font-size:12.5px;color:#9fb0bf;min-width:56px;text-align:right}
.xinfo{font-size:13.5px;color:#c7d3dd;display:flex;flex-direction:column;gap:6px}
.xinfo textarea,.xinfo input,.xinfo select{background:#0b1319;color:#e8eef3;border:1px solid #2b4153;border-radius:8px;padding:8px;width:100%;font:inherit}
.xrec-v{flex:1;min-height:0;position:relative;background:#000}
.xrec-v video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
.xgrid{position:absolute;inset:0;pointer-events:none;background:
 linear-gradient(to right,transparent calc(33.33% - .5px),rgba(255,255,255,.35) calc(33.33% - .5px),rgba(255,255,255,.35) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.35) calc(66.66% - .5px),rgba(255,255,255,.35) calc(66.66% + .5px),transparent calc(66.66% + .5px)),
 linear-gradient(to bottom,transparent calc(33.33% - .5px),rgba(255,255,255,.35) calc(33.33% - .5px),rgba(255,255,255,.35) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.35) calc(66.66% - .5px),rgba(255,255,255,.35) calc(66.66% + .5px),transparent calc(66.66% + .5px))}
.xsil{position:absolute;left:50%;top:50%;width:min(24%,160px);height:80%;transform:translate(-50%,-50%);border:2px dashed rgba(213,230,60,.7);border-radius:48% 48% 12% 12%/22% 22% 6% 6%;pointer-events:none}
.xlvl{position:absolute;left:8px;bottom:8px;border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:700;background:rgba(0,0,0,.6)}
.xlvl.ok{color:#6cc792}.xlvl.no{color:#e6b45e}
.xrot{display:none;position:absolute;left:50%;top:10px;transform:translateX(-50%);background:rgba(230,180,94,.95);color:#1d2a06;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700;pointer-events:none;white-space:nowrap}
@media (orientation:portrait){.xrot{display:block}}
.xcount{position:absolute;inset:0;display:grid;place-items:center;font-size:120px;font-weight:700;color:#fff;text-shadow:0 2px 12px #000;pointer-events:none}
.xrecbar{display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 10px calc(env(safe-area-inset-bottom,0px) + 12px);background:#101c26;flex-wrap:wrap}
.xrecbtn{width:68px;height:68px;border-radius:50%;border:4px solid #fff;background:#d33;padding:0}
.xrecbtn.rec{border-radius:16px;width:56px;height:56px;background:#d33}
.xtips{padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:10px;flex:1}
.xtips h2{margin:0;font-family:var(--f-display);font-size:26px}
.xtips li{margin:0 0 7px;line-height:1.4}
.xtips ol{padding-left:20px;margin:0}
.xtips .hl{background:#1d2f3d;border-radius:10px;padding:10px 12px;font-size:14px}
.xtips select,.xtips textarea{background:#0b1319;color:#e8eef3;border:1px solid #2b4153;border-radius:8px;padding:8px;font:inherit;width:100%}
.xwait{position:fixed;inset:0;z-index:80;background:rgba(5,10,15,.82);color:#fff;display:grid;place-items:center;text-align:center;padding:24px}
.xwait div{max-width:320px;display:flex;flex-direction:column;gap:10px;align-items:center}
.xspin{width:34px;height:34px;border-radius:50%;border:4px solid #2b4153;border-top-color:#d5e63c;animation:xs 1s linear infinite}
@keyframes xs{to{transform:rotate(360deg)}}
.xia{display:flex;flex-direction:column;gap:10px;font-size:14px}
.xia h4{margin:0;font-family:var(--f-display);font-size:18px;font-weight:600}
.xia ul{margin:4px 0 0;padding-left:18px}
.xia li{margin-bottom:4px}
.xia .aviso{font-size:12.5px;color:var(--muted);background:var(--info-bg);border-radius:8px;padding:8px 10px}
`;
document.head.appendChild(st);

/* ---------- vista del perfil ---------- */
function statsClases(id){
  const cs=S.clases.filter(c=>(c.alumnoIds||[]).includes(id));
  const real=cs.filter(c=>c.estado==='realizada'||c.estado==='cobrada');
  const canc=cs.filter(c=>c.estado==='cancelada'||c.estado==='lluvia');
  const hoy=A.today();const mes=hoy.slice(0,7);
  const delMes=real.filter(c=>c.fecha.startsWith(mes)).length;
  const fechas=real.map(c=>c.fecha).sort();
  return {total:real.length,canc:canc.length,mes:delMes,desde:fechas[0]||'',ultima:fechas[fechas.length-1]||''};
}
function barsHtml(last,prev){
  return `<div class="bars">`+SKILLS.map(([k,n])=>{
    const v=last[k];if(!v)return `<span>${n}</span><span class="muted" style="font-size:12.5px">Sin evaluar</span><span></span>`;
    const p=prev&&prev[k]?v-prev[k]:0;
    return `<span>${n}</span><span class="seg" role="img" aria-label="${n}: ${v} de 5">${[1,2,3,4,5].map(i=>`<i class="${i<=v?'on':''}"></i>`).join('')}</span><span class="dl ${p>0?'up':p<0?'down':''}">${v}/5${p?` (${p>0?'+':''}${p})`:''}</span>`;
  }).join('')+`</div>`;
}
function chartSvg(list){
  const W=320,H=150,L=22,R=8,T=8,B=22;const n=list.length;
  const x=i=>L+(n===1?(W-L-R)/2:(W-L-R)*i/(n-1));const y=v=>T+(H-T-B)*(5-v)/4;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolución de las evaluaciones" style="display:block">`;
  for(let v=1;v<=5;v++)s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`;
  for(const [k,nm,col] of SKILLS){
    const pts=list.map((e,i)=>e[k]?[x(i),y(e[k])]:null).filter(Boolean);
    if(!pts.length)continue;
    if(pts.length>1)s+=`<polyline fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" points="${pts.map(p=>p.join(',')).join(' ')}"/>`;
    s+=pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="${col}"/>`).join('');
  }
  const f=d=>{const [y,m,dd]=d.split('-');return dd+'/'+m};
  s+=`<text x="${x(0)}" y="${H-6}" font-size="10" fill="var(--muted)" text-anchor="${n===1?'middle':'start'}">${f(list[0].fecha)}</text>`;
  if(n>1)s+=`<text x="${x(n-1)}" y="${H-6}" font-size="10" fill="var(--muted)" text-anchor="end">${f(list[n-1].fecha)}</text>`;
  return s+`</svg><div class="legend">${SKILLS.map(([k,nm,col])=>`<span><i style="background:${col}"></i>${nm}</span>`).join('')}</div>`;
}
function vPerfil(id){
  const a=A.alumno(id);if(!a)return '';
  const nombre=String(a.nombre).replace(/^Ejemplo:\s*/,'');
  const cs=statsClases(id);const E=ev(id);const V=vids(id);
  const chips=[a.mano&&('Es '+a.mano),a.reves&&('Revés '+a.reves),a.nivel].filter(Boolean).map(c=>`<span class="xc">${esc(c)}</span>`).join('');
  let h=`<div class="xp"><div class="row2" style="justify-content:space-between"><button class="btn small ghost" data-act="close-perfil">‹ Alumnos</button><button class="btn small" data-act="edit-alumno" data-id="${esc(id)}">Editar datos</button></div>
  <div><h2>${esc(nombre)}</h2>${chips?`<div class="chips" style="margin-top:8px">${chips}</div>`:''}</div>`;
  if(a.objetivo)h+=`<div class="box"><span class="muted" style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">Objetivo</span><div>${esc(a.objetivo)}</div></div>`;
  if(a.salud)h+=`<div class="note"><b>Cuidado:</b> ${esc(a.salud)}</div>`;
  if(!a.mano&&!a.reves&&!a.nivel&&!a.objetivo)h+=`<div class="note">Completa la ficha del alumno (mano dominante, revés, nivel y objetivo) en <button class="linkish" data-act="edit-alumno" data-id="${esc(id)}">Editar datos</button>.</div>`;
  h+=`<div class="box"><div class="stats"><div><b>${cs.total}</b><span>clases hechas</span></div><div><b>${cs.mes}</b><span>este mes</span></div><div><b>${cs.canc}</b><span>canceladas</span></div></div>
  ${cs.desde?`<span class="muted" style="font-size:12.5px;text-align:center">Entrena contigo desde ${esc(fmtF(cs.desde))}${cs.ultima?' · última clase '+esc(fmtF(cs.ultima)):''}</span>`:''}</div>`;
  // ficha técnica (ficha.js)
  if(window.TAF)h+=window.TAF.seccion(id);
  if(window.TAT)h+=window.TAT.seccion(id);
  if(window.TAK)h+=window.TAK.seccion(id);
  // evaluaciones
  h+=`<section class="xp"><div class="sec-h"><h3>Evaluaciones</h3><button class="btn small primary" data-xact="eval-new" data-id="${esc(id)}">+ Evaluar</button></div>`;
  if(!E.length)h+=`<div class="note">Evalúa del 1 al 5 la derecha, el revés, el saque, la volea y la movilidad. Con el tiempo verás el progreso en un gráfico.</div>`;
  else{
    const last=E[E.length-1],prev=E[E.length-2];
    h+=`<div class="box"><span class="muted" style="font-size:12.5px">Última evaluación · ${esc(fmtF(last.fecha))}${prev?' · cambio vs. la anterior':''}</span>${barsHtml(last,prev)}${last.nota?`<div style="font-size:13.5px">${esc(last.nota)}</div>`:''}</div>`;
    if(E.length>1)h+=`<div class="box">${chartSvg(E)}</div>`;
    h+=`<div class="box hist"><span class="muted" style="font-size:12.5px">Historial (toca para editar)</span>${[...E].reverse().map(e=>`<button data-xact="eval-edit" data-id="${esc(e.id)}"><span>${esc(fmtF(e.fecha))}</span><span class="muted">${SKILLS.map(([k,n])=>e[k]?n[0]+e[k]:'').filter(Boolean).join(' · ')}</span></button>`).join('')}</div>`;
  }
  h+=`</section>`;
  // conexión con la app del jugador (conexion.js)
  if(window.TAC)h+=window.TAC.seccion(id);
  // videos
  const usados=V.reduce((s,v)=>s+(v.size||0),0);
  h+=`<section class="xp"><div class="sec-h"><h3>Videos</h3><div class="row2"><button class="btn small primary" data-xact="rec" data-id="${esc(id)}">● Grabar</button><button class="btn small" data-xact="upl" data-id="${esc(id)}">Subir</button></div></div>`;
  if(!V.length)h+=`<div class="note">Guarda videos de sus golpes para ver cómo mejora. Antes de grabar, la app te muestra consejos para que todos los videos queden parecidos y se puedan comparar.</div>`;
  else{
    h+=`<div class="vgrid">${V.map(v=>`<button class="vcard" data-xact="vid" data-id="${esc(v.id)}"><div class="th">${v.thumb?`<img alt="" data-thumb="${esc(v.path)}.jpg" hidden>`:''}<span data-ph>▶</span>${v.ia?'<span class="ia">IA</span>':''}${v.compartido?'<span class="ia" style="left:6px;right:auto" title="Compartido con el alumno">👁</span>':''}</div><div class="in"><b>${esc(GOLPES[v.golpe]||'Golpe')}</b><span>${esc(fmtF(v.fecha))}${v.angulo&&ANGULOS[v.angulo]?' · '+esc(ANGULOS[v.angulo]):''}</span>${v.nota?`<span>${esc(v.nota.slice(0,48))}${v.nota.length>48?'…':''}</span>`:''}</div></button>`).join('')}</div>
    <div class="row2"><button class="btn small" data-xact="cmp-pick" data-id="${esc(id)}"${V.length<2?' disabled':''}>Comparar dos videos</button><button class="btn small ghost" data-xact="cam-nota" data-id="${esc(id)}">Cómo lo grabo</button></div>
    <span class="muted" style="font-size:12px">${V.length} video${V.length===1?'':'s'} · ${mb(usados)}</span>`;
  }
  h+=`</section></div>`;
  return h;
}

/* ---------- evaluaciones ---------- */
function sheetEval(e,alumnoId){
  const isNew=!e;e=e||{id:uid(),alumnoId,fecha:A.today(),nota:''};
  const a=A.alumno(e.alumnoId);
  A.sheet(`<h2>${isNew?'Nueva evaluación':'Evaluación'}</h2><p class="muted" style="margin:0">${esc(String(a?a.nombre:'').replace(/^Ejemplo:\s*/,''))}. Del 1 (por mejorar) al 5 (muy bien). Deja sin marcar lo que no evalúes hoy.</p>
  <form id="f-eval" data-id="${esc(e.id)}" data-al="${esc(e.alumnoId)}"><div style="display:flex;flex-direction:column;gap:14px">
  <div class="field"><label for="e-fecha">Fecha</label><input id="e-fecha" type="date" value="${esc(e.fecha)}" required></div>
  ${SKILLS.map(([k,n])=>`<div class="field"><span>${n}</span><div class="xrate" role="radiogroup" aria-label="${n}">${[1,2,3,4,5].map(i=>`<label><input type="radio" name="e-${k}" value="${i}" ${e[k]===i?'checked':''}>${i}</label>`).join('')}</div></div>`).join('')}
  <div class="field"><label for="e-nota">Comentario (opcional)</label><textarea id="e-nota" rows="2" placeholder="Qué viste hoy, qué trabajar…">${esc(e.nota||'')}</textarea></div>
  <div class="sheet-actions">${isNew?'':`<button type="button" class="btn danger${ui.armed===e.id?' armed':''}" data-xact="eval-del" data-id="${esc(e.id)}">${ui.armed===e.id?'Toca otra vez para borrar':'Borrar'}</button>`}
  <div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Guardar</button></div></div></div></form>`);
}
function sheetCamNota(id){
  const a=A.alumno(id);if(!a)return;
  A.sheet(`<h2>Cómo grabar a este alumno</h2><p class="muted" style="margin:0">Anota dónde dejas el celular para que todos los videos se vean parecidos y se puedan comparar. Esta nota aparece antes de cada grabación.</p>
  <form id="f-cam" data-id="${esc(id)}"><div style="display:flex;flex-direction:column;gap:14px"><div class="field"><label for="cam-n">Nota</label><textarea id="cam-n" rows="4" placeholder="Ej. Saque: detrás de la línea de fondo, lado derecho, celular a 1 m de altura. Derecha: desde atrás, centrado.">${esc(a.camNota||'')}</textarea></div>
  <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Guardar</button></div></div></div></form>`);
}

/* ---------- URLs firmadas y miniaturas ---------- */
const urlCache=new Map();
async function signed(paths){
  const need=paths.filter(p=>!(urlCache.get(p)&&urlCache.get(p).exp>Date.now()+60000));
  if(need.length&&sb()){
    try{
      const {data,error}=await sb().storage.from(BUCKET).createSignedUrls(need,3600);
      if(!error&&data)data.forEach(d=>{if(d&&d.signedUrl)urlCache.set(d.path,{url:d.signedUrl,exp:Date.now()+3500000})});
    }catch(_){}
  }
  return Object.fromEntries(paths.map(p=>[p,(urlCache.get(p)||{}).url||'']));
}
async function after(){
  const imgs=[...document.querySelectorAll('img[data-thumb]')];if(!imgs.length)return;
  const m=await signed(imgs.map(i=>i.dataset.thumb));
  for(const i of imgs){const u=m[i.dataset.thumb];if(!u)continue;i.onload=()=>{i.hidden=false;const ph=i.parentElement.querySelector('[data-ph]');if(ph)ph.hidden=true};i.src=u}
}

/* ---------- espera ---------- */
function wait(msg){let el=document.getElementById('xwait');if(!el){el=document.createElement('div');el.id='xwait';el.className='xwait';document.body.appendChild(el)}
  el.innerHTML=`<div><span class="xspin"></span><b>${esc(msg)}</b><span style="font-size:13px;color:#9fb0bf" id="xwait-s"></span></div>`;
  return {set:t=>{const s=document.getElementById('xwait-s');if(s)s.textContent=t},end:()=>{const e=document.getElementById('xwait');if(e)e.remove()}}}

/* ---------- eventos ---------- */
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-xact]');if(!b)return;
  const act=b.dataset.xact,id=b.dataset.id;
  switch(act){
    case 'eval-new':sheetEval(null,id);break;
    case 'eval-edit':sheetEval(S.evals.find(x=>x.id===id));break;
    case 'eval-del':{
      if(ui.armed!==id){ui.armed=id;b.classList.add('armed');b.textContent='Toca otra vez para borrar';return}
      ui.armed=null;A.closeSheet();await A.removeDoc('evals',id);toast('Evaluación borrada');break}
    case 'cam-nota':sheetCamNota(id);break;
    case 'rec':openRecorder(id);break;
    case 'upl':pickFile(id);break;
    case 'vid':openViewer(id);break;
    case 'cmp-pick':sheetComparar(id);break;
    case 'cmp-go':{const f=document.getElementById('f-cmp');const x=f.querySelector('select[name=a]').value,y=f.querySelector('select[name=b]').value;if(x===y){toast('Elige dos videos distintos');return}A.closeSheet();openViewer([x,y]);break}
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target;
  if(f.id==='f-eval'){
    const o={id:f.dataset.id,alumnoId:f.dataset.al,fecha:document.getElementById('e-fecha').value||A.today(),nota:document.getElementById('e-nota').value.trim()};
    let any=false;for(const [k] of SKILLS){const c=f.querySelector(`input[name=e-${k}]:checked`);if(c){o[k]=+c.value;any=true}}
    if(!any){toast('Marca al menos un puntaje');return}
    A.closeSheet();await A.save('evals',o);toast('Evaluación guardada');
  }
  if(f.id==='f-cam'){
    const a=A.alumno(f.dataset.id);if(!a)return;
    A.closeSheet();await A.save('alumnos',{...a,camNota:document.getElementById('cam-n').value.trim()});toast('Nota guardada');
  }
});
async function onDeleteAlumno(id){
  const V=S.videos.filter(v=>v.alumnoId===id);
  if(V.length&&sb()){try{await sb().storage.from(BUCKET).remove(V.flatMap(v=>[v.path,v.path+'.jpg']))}catch(_){}}
  for(const v of V)await A.removeDoc('videos',v.id);
  for(const x of S.evals.filter(e=>e.alumnoId===id))await A.removeDoc('evals',x.id);
}

/* ---------- utilidades de video ---------- */
function pickMime(){const c=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  return c.find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m))||''}
const baseMime=m=>(m||'video/webm').split(';')[0];
const extOf=m=>/mp4/.test(m)?'mp4':/quicktime/.test(m)?'mov':'webm';
function fixInf(v){return new Promise(r=>{const f=()=>{v.removeEventListener('timeupdate',f);v.currentTime=0;r()};v.addEventListener('timeupdate',f);v.currentTime=1e101;setTimeout(r,2500)})}
function loadVideo(url,cors){return new Promise((res,rej)=>{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';if(cors)v.crossOrigin='anonymous';
  v.onloadedmetadata=async()=>{if(!isFinite(v.duration))await fixInf(v);res(v)};v.onerror=()=>rej(new Error('video'));v.src=url;setTimeout(()=>rej(new Error('tiempo')),15000)})}
function seek(v,t){return new Promise(res=>{if(Math.abs(v.currentTime-t)<0.001&&v.readyState>=2)return res();const f=()=>{v.removeEventListener('seeked',f);res()};v.addEventListener('seeked',f);v.currentTime=Math.max(0,t);setTimeout(res,4000)})}
function frameCanvas(v,w){const r=v.videoHeight/v.videoWidth;const c=document.createElement('canvas');c.width=w;c.height=Math.max(2,Math.round(w*r));c.getContext('2d').drawImage(v,0,0,c.width,c.height);return c}
const toBlob=(c,q)=>new Promise(r=>c.toBlob(r,'image/jpeg',q));

async function transcode(file,onProg){
  const url=URL.createObjectURL(file);
  try{
    const v=await loadVideo(url);
    const k=Math.min(1,1280/Math.max(v.videoWidth,v.videoHeight));const w=Math.round(v.videoWidth*k/2)*2,h=Math.round(v.videoHeight*k/2)*2;
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
    if(!c.captureStream||!window.MediaRecorder)throw new Error('sin-captura');
    const mime=pickMime();const chunks=[];
    const mr=new MediaRecorder(c.captureStream(30),mime?{mimeType:mime,videoBitsPerSecond:3500000}:{videoBitsPerSecond:3500000});
    const done=new Promise(r=>mr.onstop=r);mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const lim=Math.min(v.duration||MAX_SEG,MAX_SEG+10);
    await seek(v,0);mr.start(250);await v.play();
    await new Promise(res=>{v.onended=res;const draw=()=>{g.drawImage(v,0,0,w,h);onProg&&onProg(Math.min(1,v.currentTime/lim));if(v.ended||v.currentTime>=lim){res();return}requestAnimationFrame(draw)};draw()});
    v.pause();mr.stop();await done;
    return {blob:new Blob(chunks,{type:baseMime(mime||mr.mimeType)}),mime:baseMime(mime||mr.mimeType),dur:lim,fps:30};
  }finally{URL.revokeObjectURL(url)}
}

/* ---------- subir a la nube ---------- */
async function saveVideo(m){
  const u=A.user(),s=sb();
  if(!u||!s){toast('Inicia sesión para guardar videos');return false}
  if(A.sub().premium===false){window.TAP?window.TAP.sheetPlanes('premium'):toast('Los videos están en los planes pagados');return false}
if((A.S.videos||[]).filter(v=>v.fecha===A.today()).length>=MAX_DIA){toast('Llegaste al máximo de '+MAX_DIA+' videos por día. Mañana puedes subir más.');return false}
  if(m.blob.size>MAX_SUBIDA){toast('El video pesa demasiado ('+mb(m.blob.size)+'). Graba un clip más corto.');return false}
  const id=uid(),ext=extOf(m.mime),path=`${u.id}/${m.alumnoId}/${id}.${ext}`;
  const w=wait('Subiendo video…');
  try{
    const up=await s.storage.from(BUCKET).upload(path,m.blob,{contentType:m.mime,cacheControl:'3600',upsert:false});
    if(up.error)throw up.error;
    let thumb=false;
    try{
      const url=URL.createObjectURL(m.blob);const v=await loadVideo(url);await seek(v,Math.min(1,(m.dur||2)/3));
      const tb=await toBlob(frameCanvas(v,360),.7);URL.revokeObjectURL(url);
      const t=await s.storage.from(BUCKET).upload(path+'.jpg',tb,{contentType:'image/jpeg',upsert:false});thumb=!t.error;
    }catch(_){}
    w.end();
    await A.save('videos',{id,alumnoId:m.alumnoId,fecha:A.today(),golpe:m.golpe,angulo:m.angulo,nota:m.nota||'',path,thumb,mime:m.mime,size:m.blob.size,dur:Math.round((m.dur||0)*10)/10,fps:m.fps||30,impacto:null,ia:null});
    toast('Video guardado');return true;
  }catch(e){
    w.end();
    const msg=String((e&&e.message)||e);
    toast(/row-level|policy|403|Unauthorized/i.test(msg)?'No se pudo guardar: llegaste al máximo de '+MAX_DIA+' videos por día o tu cuenta no está activa':'No se pudo subir el video. Revisa tu internet e intenta de nuevo');
    return false;
  }
}

/* ---------- pantalla de vista previa y guardado ---------- */
function mkOv(id){const old=document.getElementById(id);if(old)old.remove();const d=document.createElement('div');d.id=id;document.body.appendChild(d);return d}
async function calidad(blob,dur,w,h){
  const out=[];
  out.push({ok:dur>=3,txt:dur>=3?'Duración buena ('+Math.round(dur)+' s)':'Es muy corto (menos de 3 s)'});
  if(w&&h)out.push({ok:w>=h,txt:w>=h?'Está en horizontal':'Está en vertical: lo ideal es horizontal'});
  try{
    const url=URL.createObjectURL(blob);const v=await loadVideo(url);await seek(v,Math.min(v.duration||1,dur||1)/2);
    const c=frameCanvas(v,64),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=.299*d[i]+.587*d[i+1]+.114*d[i+2];
    const l=sum/(d.length/4);URL.revokeObjectURL(url);
    out.push({ok:l>=45&&l<=215,txt:l<45?'Se ve muy oscuro: busca más luz':l>215?'Se ve demasiado claro: evita el contraluz':'La luz se ve bien'});
  }catch(_){}
  return out;
}
async function showPreview(ov,m,alumnoId,onRetry){
  const url=URL.createObjectURL(m.blob);const a=A.alumno(alumnoId);
  ov.className='';ov.innerHTML=`<div id="xrec"><div class="xbar"><button class="xb" data-p="cancel" aria-label="Cerrar">✕</button><b>Revisa tu video</b></div>
  <div class="xtips"><video src="${url}" controls playsinline muted style="width:100%;max-height:36vh;background:#000;border-radius:10px"></video>
  <div id="xq" style="font-size:13.5px"><span style="color:#9fb0bf">Revisando…</span></div>
  <label style="font-size:12px;color:#9fb0bf">Golpe<select id="xp-golpe">${Object.entries(GOLPES).map(([k,n])=>`<option value="${k}" ${m.golpe===k?'selected':''}>${n}</option>`).join('')}</select></label>
  <label style="font-size:12px;color:#9fb0bf">Ángulo de cámara<select id="xp-ang">${Object.entries(ANGULOS).map(([k,n])=>`<option value="${k}" ${m.angulo===k?'selected':''}>${n}</option>`).join('')}</select></label>
  <label style="font-size:12px;color:#9fb0bf">Nota (opcional)<textarea id="xp-nota" rows="2" placeholder="Ej. primer saque, viento a favor"></textarea></label>
  <div class="row2" style="display:flex;gap:8px;flex-wrap:wrap"><button class="xb" data-p="retry">${onRetry?'Repetir':'Elegir otro'}</button><button class="xb pri" data-p="save">Guardar en ${esc(String(a?a.nombre:'').replace(/^Ejemplo:\s*/,'').split(' ')[0]||'el alumno')}</button></div></div></div>`;
  const vv=ov.querySelector('video');
  vv.addEventListener('loadedmetadata',async()=>{
    const q=await calidad(m.blob,m.dur,vv.videoWidth,vv.videoHeight);
    const el=ov.querySelector('#xq');if(el)el.innerHTML=q.map(c=>`<div style="color:${c.ok?'#6cc792':'#e6b45e'}">${c.ok?'✓':'!'} ${esc(c.txt)}</div>`).join('');
  },{once:true});
  ov.onclick=async e=>{
    const b=e.target.closest('[data-p]');if(!b)return;
    if(b.dataset.p==='cancel'){URL.revokeObjectURL(url);ov.remove()}
    if(b.dataset.p==='retry'){URL.revokeObjectURL(url);ov.remove();onRetry?onRetry():pickFile(alumnoId)}
    if(b.dataset.p==='save'){
      b.disabled=true;
      const ok=await saveVideo({...m,alumnoId,golpe:ov.querySelector('#xp-golpe').value,angulo:ov.querySelector('#xp-ang').value,nota:ov.querySelector('#xp-nota').value.trim()});
      if(ok){URL.revokeObjectURL(url);ov.remove()}else b.disabled=false;
    }
  };
}

/* ---------- elegir un video de la galería ---------- */
function pickFile(alumnoId){
  if(!A.isCloud()){toast('Inicia sesión para guardar videos');return}
  const inp=document.createElement('input');inp.type='file';inp.accept='video/*';
  inp.onchange=async()=>{
    const f=inp.files&&inp.files[0];if(!f)return;
    const w=wait('Preparando video…');
    let m;
    try{
      const url=URL.createObjectURL(f);const v=await loadVideo(url);const dur=v.duration||0;URL.revokeObjectURL(url);
      if(dur>90){w.end();toast('Ese video es muy largo (más de 90 s). Elige uno de 10 a 20 segundos.');return}
      if(f.size<=10*1048576&&dur<=MAX_SEG+10&&/mp4|webm/.test(f.type))m={blob:f,mime:baseMime(f.type),dur,fps:30};
      else{w.set('Optimizando para que pese menos… no cierres la app');m=await transcode(f,p=>w.set('Optimizando… '+Math.round(p*100)+'%'))}
    }catch(e){
      if(f.size<=MAX_SUBIDA&&/mp4|webm/.test(f.type))m={blob:f,mime:baseMime(f.type),dur:0,fps:30};
      else{w.end();toast('No se pudo preparar ese video. Prueba con uno más corto o grábalo desde aquí.');return}
    }
    w.end();
    if(m.blob.size>MAX_SUBIDA){toast('Sigue pesando mucho ('+mb(m.blob.size)+'). Elige un clip más corto.');return}
    showPreview(mkOv('xrec-wrap'),{...m,golpe:'saque',angulo:'atras'},alumnoId,null);
  };
  inp.click();
}

/* ---------- grabar con guía ---------- */
function openRecorder(alumnoId,golpe0){
  if(!A.isCloud()){toast('Inicia sesión para guardar videos');return}
  if(A.sub().premium===false){window.TAP?window.TAP.sheetPlanes('premium'):toast('Los videos están en los planes pagados');return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){toast('Aquí no se puede grabar. Usa "Subir" para elegir un video de tu galería.');return}
  const ov=mkOv('xrec-wrap');const al=A.alumno(alumnoId)||{};
  const S0={golpe:golpe0||'saque',face:'environment',countdown:true,stream:null,mr:null,chunks:[],t0:0,tick:null,orient:null,fps:30,mime:''};
  const stopStream=()=>{if(S0.stream)S0.stream.getTracks().forEach(t=>t.stop());S0.stream=null;if(S0.orient){window.removeEventListener('deviceorientation',S0.orient);S0.orient=null}clearInterval(S0.tick)};
  const close=()=>{try{if(S0.mr&&S0.mr.state!=='inactive'){S0.mr.onstop=null;S0.mr.stop()}}catch(_){}stopStream();ov.remove()};
  function tips(){
    ov.innerHTML=`<div id="xrec"><div class="xbar"><button class="xb" data-r="close" aria-label="Cerrar">✕</button><b>Antes de grabar</b></div><div class="xtips">
    <h2>Para que el video sirva</h2>
    ${al.camNota?`<div class="hl"><b>Nota de este alumno:</b><br>${esc(al.camNota)}</div>`:''}
    <label style="font-size:12px;color:#9fb0bf">¿Qué golpe vas a grabar?<select id="xr-golpe">${Object.entries(GOLPES).map(([k,n])=>`<option value="${k}" ${S0.golpe===k?'selected':''}>${n}</option>`).join('')}</select></label>
    <div class="hl" id="xr-cons">${esc(CONSEJO_GOLPE[S0.golpe])}</div>
    <ol>${CONSEJOS.map(([t,d])=>`<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join('')}</ol>
    <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="xr-cd" ${S0.countdown?'checked':''}> Cuenta regresiva de 5 s antes de grabar</label>
    <button class="xb pri" data-r="go" style="padding:12px">Entendido, abrir cámara</button></div></div>`;
  }
  async function cam(){
    ov.innerHTML=`<div id="xrec"><div class="xbar"><button class="xb" data-r="close" aria-label="Cerrar">✕</button><select id="xr-g2" class="xb" style="padding:6px 8px">${Object.entries(GOLPES).map(([k,n])=>`<option value="${k}" ${S0.golpe===k?'selected':''}>${n}</option>`).join('')}</select><span style="flex:1"></span><button class="xb" data-r="flip">Girar cámara</button><button class="xb" data-r="help">Ayuda</button></div>
    <div class="xrec-v"><video id="xr-v" muted playsinline autoplay></video><div class="xgrid"></div><div class="xsil"></div><div class="xlvl" id="xr-lvl" hidden></div><div class="xrot">Gira el celular a horizontal</div><div class="xcount" id="xr-cd2" hidden></div></div>
    <div class="xrecbar"><span id="xr-t" style="min-width:48px;font-variant-numeric:tabular-nums">0:00</span><button class="xrecbtn" id="xr-btn" data-r="rec" aria-label="Grabar"></button><span style="min-width:48px;font-size:12px;color:#9fb0bf" id="xr-fps"></span></div></div>`;
    stopStream();
    try{
      const tries=[{video:{facingMode:S0.face,width:{ideal:1280},height:{ideal:720},frameRate:{ideal:60}},audio:false},{video:{facingMode:S0.face},audio:false},{video:true,audio:false}];
      let last;for(const c of tries){try{S0.stream=await navigator.mediaDevices.getUserMedia(c);last=null;break}catch(err){last=err;if(/NotAllowed|Permission|denied/i.test(String(err&&err.name)))break}}
      if(last)throw last;
    }catch(e){ov.innerHTML='';close();toast(/denied|permission|NotAllowed/i.test(String(e&&e.name+e.message))?'Permite el uso de la cámara para grabar':'No se pudo abrir la cámara. Usa "Subir" para elegir un video de tu galería.');return}
    const v=ov.querySelector('#xr-v');v.srcObject=S0.stream;
    try{const set=S0.stream.getVideoTracks()[0].getSettings();S0.fps=Math.round(set.frameRate||30);ov.querySelector('#xr-fps').textContent=S0.fps+' fps'}catch(_){}
    if(!(window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission)){
      S0.orient=e=>{
        if(e.beta==null)return;const ang=(screen.orientation&&screen.orientation.angle)||window.orientation||0;const land=Math.abs(ang)===90||ang===270;
        const roll=land?Math.abs(Math.abs(e.beta)-90):Math.abs(e.gamma||0);const el=document.getElementById('xr-lvl');if(!el)return;
        el.hidden=false;const ok=roll<=3;el.className='xlvl '+(ok?'ok':'no');el.textContent=ok?'Nivelado':'Inclinado '+Math.round(roll)+'°';
      };window.addEventListener('deviceorientation',S0.orient);
    }
  }
  async function start(){
    const btn=document.getElementById('xr-btn');if(!btn||!S0.stream)return;
    if(S0.countdown){const c=document.getElementById('xr-cd2');btn.disabled=true;c.hidden=false;for(let i=5;i>0;i--){if(!document.getElementById('xr-cd2'))return;c.textContent=i;await sleep(1000)}c.hidden=true;btn.disabled=false}
    S0.mime=pickMime();S0.chunks=[];
    const bps=S0.fps>45?5000000:3500000;
    try{S0.mr=new MediaRecorder(S0.stream,S0.mime?{mimeType:S0.mime,videoBitsPerSecond:bps}:{videoBitsPerSecond:bps})}catch(_){S0.mr=new MediaRecorder(S0.stream)}
    S0.mr.ondataavailable=e=>{if(e.data&&e.data.size)S0.chunks.push(e.data)};
    S0.mr.onstop=()=>finish();
    S0.t0=performance.now();S0.mr.start(250);btn.classList.add('rec');btn.setAttribute('aria-label','Detener');btn.dataset.r='stop';
    S0.tick=setInterval(()=>{const s=(performance.now()-S0.t0)/1000;const t=document.getElementById('xr-t');if(t)t.textContent=Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');if(s>=MAX_SEG)stop()},200);
  }
  function stop(){clearInterval(S0.tick);try{if(S0.mr&&S0.mr.state!=='inactive')S0.mr.stop()}catch(_){}}
  function finish(){
    const dur=(performance.now()-S0.t0)/1000;const type=baseMime(S0.mime||(S0.mr&&S0.mr.mimeType));
    const blob=new Blob(S0.chunks,{type});stopStream();
    showPreview(ov,{blob,mime:type,dur,fps:S0.fps,golpe:S0.golpe,angulo:'atras'},alumnoId,()=>{ov.remove();openRecorder(alumnoId,S0.golpe)});
  }
  ov.addEventListener('change',e=>{
    if(e.target.id==='xr-golpe'){S0.golpe=e.target.value;ov.querySelector('#xr-cons').textContent=CONSEJO_GOLPE[S0.golpe]}
    if(e.target.id==='xr-cd')S0.countdown=e.target.checked;
    if(e.target.id==='xr-g2')S0.golpe=e.target.value;
  });
  ov.addEventListener('click',async e=>{
    const b=e.target.closest('[data-r]');if(!b)return;
    switch(b.dataset.r){
      case 'close':close();break;
      case 'go':await cam();break;
      case 'flip':S0.face=S0.face==='environment'?'user':'environment';await cam();break;
      case 'help':stopStream();tips();break;
      case 'rec':await start();break;
      case 'stop':stop();break;
    }
  });
  tips();
}

/* ---------- comparar: elegir dos videos ---------- */
function sheetComparar(alumnoId,preA){
  const V=vids(alumnoId);if(V.length<2){toast('Necesitas al menos dos videos');return}
  const lab=v=>`${fmtF(v.fecha)} · ${GOLPES[v.golpe]||'Golpe'}${v.angulo&&ANGULOS[v.angulo]?' · '+ANGULOS[v.angulo]:''}`;
  const opts=sel=>V.map(v=>`<option value="${esc(v.id)}" ${v.id===sel?'selected':''}>${esc(lab(v))}</option>`).join('');
  let a=preA||V[1].id,b=V[0].id;if(a===b)b=(V.find(v=>v.id!==a)||V[0]).id;
  A.sheet(`<h2>Comparar dos videos</h2><p class="muted" style="margin:0">Elige uno anterior y uno actual del mismo golpe. Para que la comparación sirva, que los dos tengan el mismo ángulo.</p>
  <form id="f-cmp" onsubmit="return false"><div style="display:flex;flex-direction:column;gap:14px">
  <div class="field"><label>Video A (antes)</label><select name="a">${opts(a)}</select></div>
  <div class="field"><label>Video B (ahora)</label><select name="b">${opts(b)}</select></div>
  <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button type="button" class="btn primary" data-xact="cmp-go">Comparar</button></div></div></div></form>`);
}

/* ---------- resultado de la IA ---------- */
function iaHtml(ia){
  const L=(t,arr)=>arr&&arr.length?`<div><h4>${t}</h4><ul>${arr.map(x=>`<li>${esc(typeof x==='string'?x:(x.nombre?x.nombre+': ':'')+(x.observacion||''))}</li>`).join('')}</ul></div>`:'';
  return `<div class="xia"><div class="aviso">Observaciones automáticas a partir de unos pocos fotogramas. Son orientativas y pueden equivocarse: tú tienes la última palabra.</div>
  ${ia.resumen?`<div><h4>Resumen</h4><div>${esc(ia.resumen)}</div></div>`:''}
  ${L('Por fases del golpe',ia.fases)}${L('Lo que está bien',ia.fortalezas)}${L('Para mejorar',ia.mejoras)}${L('Comparación',ia.comparacion)}${L('Para revisar en la próxima grabación',ia.puntos_a_revisar)}
  ${ia.calidad_video?`<div><h4>Calidad del video</h4><div>${esc(ia.calidad_video)}</div></div>`:''}</div>`;
}
let iaTit='',iaHab='';
function iaTexto(root,titulo){
const out=[titulo||'Análisis de tu golpe'];
root.querySelectorAll('.xia > div:not(.aviso)').forEach(b=>{const h=b.querySelector('h4');if(h)out.push('\n'+h.textContent+':');const li=b.querySelectorAll('li');if(li.length)li.forEach(x=>out.push('• '+x.textContent));else{const t=[...b.children].filter(c=>c!==h).map(c=>c.textContent).join(' ');if(t.trim())out.push(t.trim())}});
return out.join('\n');
}
const IA_MASC=/jorge|diego|juan|pablo|carlos|miguel|enrique|raul|ra[uú]l|alvaro|álvaro|antonio|pedro|andr[eé]s|jaime|lucas|male|masculin|hombre|man\b/i;
const iaMasc=v=>!!v&&IA_MASC.test(v.name||'');
function iaVoces(){const ss=window.speechSynthesis;const vs=ss?ss.getVoices().filter(x=>/^es/i.test(x.lang)):[];return vs.sort((a,b)=>(/es[-_]CL/i.test(b.lang)-/es[-_]CL/i.test(a.lang))||(/es[-_](US|MX|419)/i.test(b.lang)-/es[-_](US|MX|419)/i.test(a.lang)))}
function iaVoz(){const vs=iaVoces();let n='';try{n=localStorage.getItem('ta_voz')||''}catch(_){}return vs.find(x=>x.name===n)||vs[0]||null}
function iaCambiarVoz(){const vs=iaVoces();if(!vs.length){toast('Tu celular no tiene otras voces en español');return null}const a=iaVoz();const v=vs[(vs.indexOf(a)+1)%vs.length];try{localStorage.setItem('ta_voz',v.name)}catch(_){}return v}
function iaHablado(root,titulo){const t=iaTexto(root,titulo).split('\n');t.shift();return ((iaHab||'Análisis')+'.\n'+t.join('\n')).replace(/•\s*/g,'').replace(/:\n/g,': ').replace(/\n+/g,'. ').replace(/\.\s*\./g,'.').replace(/\s+/g,' ')}
function iaHablar(texto,btn){
const ss=window.speechSynthesis;
if(!ss||!window.SpeechSynthesisUtterance){toast('Tu celular no permite leer en voz alta');return}
if(btn._on){btn._on=false;ss.cancel();btn.textContent='🔊 Escuchar';return}
const parts=texto.match(/[^.!?]+[.!?]*/g)||[texto];const chunks=[];let cur='';
for(const p of parts){if(cur&&(cur+p).length>150){chunks.push(cur.trim());cur=p}else cur+=p}
if(cur.trim())chunks.push(cur.trim());
const v=iaVoz();let i=0;btn._on=true;btn.textContent='⏹ Detener';ss.cancel();
const fin=()=>{btn._on=false;btn.textContent='🔊 Escuchar'};
const next=()=>{if(!btn._on||i>=chunks.length){fin();return}const u=new SpeechSynthesisUtterance(chunks[i++]);if(v){u.voice=v;u.lang=v.lang}else u.lang='es-CL';u.rate=.95;u.onend=next;u.onerror=fin;ss.speak(u)};
setTimeout(next,80);
}
function iaHablarViejo(texto,btn){
const ss=window.speechSynthesis;
if(!ss||!window.SpeechSynthesisUtterance){toast('Tu celular no permite leer en voz alta');return}
if(ss.speaking||ss.pending){ss.cancel();btn.textContent='🔊 Escuchar';return}
const u=new SpeechSynthesisUtterance(texto);
const v=iaVoz();
if(v){u.voice=v;u.lang=v.lang}else u.lang='es-CL';
u.pitch=iaMasc(v)?.9:.55;u.rate=.95;u.onend=u.onerror=()=>{btn.textContent='🔊 Escuchar'};
btn.textContent='⏹ Detener';ss.speak(u);
}
let iaCtx=null;
function iaElegir(fr){
if(!fr||!fr.length)return [];
const ti=fr.ti||0;let b=fr.filter(f=>f.t>=ti-1&&f.t<=ti+.7);if(b.length<6)b=fr;
const n=Math.min(6,b.length),o=[];
for(let k=0;k<n;k++){const f=b[Math.round(k*(b.length-1)/Math.max(1,n-1))];if(!o.includes(f))o.push(f)}
return o;
}
async function iaFotosVideo(c){
const rec=c.rec;const url=(await signed([rec.path]))[rec.path];if(!url)throw new Error('No se pudo abrir el video');
const v=await loadVideo(url,true);const dur=isFinite(v.duration)&&v.duration>0?v.duration:(rec.dur||2);
const ts=c.ts&&c.ts.length?c.ts:Array.from({length:6},(_,k)=>.2+(dur-.4)*k/5);const out=[];
for(const t of ts){await seek(v,Math.min(t,dur-.05));const cv=frameCanvas(v,480);out.push({t,img:cv.toDataURL('image/jpeg',.75).split(',')[1],w:cv.width,h:cv.height})}
return out;
}
async function iaCargarPdf(){
if(window.jspdf)return window.jspdf.jsPDF;
await new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';s.onload=ok;s.onerror=()=>ko(new Error('No se pudo cargar el generador de PDF. Revisa tu internet.'));document.head.appendChild(s)});
return window.jspdf.jsPDF;
}
function iaPdfDoc(J,o){
const doc=new J({unit:'mm',format:'a4'});const W=210,M=14,LIM=282;
const limpia=t=>String(t==null?'':t).replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…]/g,'');
const ia=o.ia||{};let y=0;
doc.setFillColor(31,90,138);doc.rect(0,0,W,24,'F');
doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Setly',M,11);
doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(limpia('Análisis de técnica con IA'),M,18);
const partes=String(o.titulo||'Análisis de tu golpe').split(' · ');
let tit=partes[0];tit=tit.charAt(0).toUpperCase()+tit.slice(1);if(partes[1])tit+=' - '+partes[1];
y=34;doc.setTextColor(20,30,40);doc.setFont('helvetica','bold');doc.setFontSize(15);
const tl=doc.splitTextToSize(limpia(tit),W-2*M);doc.text(tl,M,y);y+=tl.length*7;
if(partes[2]){doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(100,110,120);doc.text(limpia('Fecha: '+partes[2]),M,y);y+=7}
y+=2;
const fotos=o.fotos||[];
if(fotos.length){
const cols=3,gap=4,cw=(W-2*M-gap*(cols-1))/cols;
for(let i=0;i<fotos.length;i+=cols){
const fila=fotos.slice(i,i+cols);const hs=fila.map(f=>Math.min(cw*f.h/f.w,72));const rh=Math.max(...hs)+7;
if(y+rh>LIM){doc.addPage();y=16}
fila.forEach((f,k)=>{const h=hs[k],w2=h*f.w/f.h,x=M+k*(cw+gap)+(cw-w2)/2;
doc.addImage('data:image/jpeg;base64,'+f.img,'JPEG',x,y,w2,h);
doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(110,120,130);doc.text(String(Math.round(f.t*10)/10).replace('.',',')+' s',M+k*(cw+gap)+cw/2,y+h+4,{align:'center'})});
y+=rh+2;
}
y+=2;
}
const salto=h=>{if(y+h>LIM){doc.addPage();y=16}};
const H=t=>{salto(14);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(31,90,138);doc.text(limpia(t),M,y);y+=6};
const P=(t,ind,pre)=>{doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(30,40,50);
const ls=doc.splitTextToSize(limpia(t),W-2*M-(ind||0));
ls.forEach((l,i)=>{salto(5.5);if(pre&&i===0)doc.text(pre,M+(ind||0)-4,y);doc.text(l,M+(ind||0),y);y+=5})};
const LST=(t,arr)=>{if(!arr||!arr.length)return;H(t);arr.forEach(x=>{P(typeof x==='string'?x:((x.nombre?x.nombre+': ':'')+(x.observacion||'')),5,'•');y+=1});y+=3};
if(ia.resumen){H('Resumen');P(ia.resumen);y+=4}
LST('Por fases del golpe',ia.fases);LST('Lo que está bien',ia.fortalezas);LST('Para mejorar',ia.mejoras);LST('Comparación',ia.comparacion);LST('Para revisar en la próxima grabación',ia.puntos_a_revisar);
if(ia.calidad_video){H('Calidad del video');P(ia.calidad_video);y+=4}
if(o.nota){H('Comentarios del profesor');P(o.nota);y+=4}
const n=doc.getNumberOfPages();
for(let p=1;p<=n;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(120,130,140);
doc.text(limpia('Observaciones orientativas generadas con IA a partir de fotogramas del video; el profesor tiene la última palabra.'),M,291);
doc.text(p+' / '+n,W-M,291,{align:'right'})}
return doc;
}
async function iaPdfCompartir(d){
const c=iaCtx;const w=wait('Preparando el PDF…');
try{
const J=await iaCargarPdf();
if(!c.fotos)c.fotos=await iaFotosVideo(c);
const nt=d.querySelector('#xia-n');const nota=nt?nt.value.trim():(c.ia.notaProfe||'');
const doc=iaPdfDoc(J,{titulo:iaTit,ia:c.ia,fotos:c.fotos,nota});
const blob=doc.output('blob');w.end();
const nombre=(iaHab||'Analisis').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'-')+'.pdf';
const file=new File([blob],nombre,{type:'application/pdf'});
if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:iaTit});return}catch(e){if(e&&e.name==='AbortError')return}}
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nombre;document.body.appendChild(a);a.click();
setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);toast('PDF descargado: envíalo desde tus archivos');
}catch(e){w.end();toast('No se pudo crear el PDF: '+String((e&&e.message)||e))}
}
async function iaCompartir(texto,titulo){
try{if(navigator.share){await navigator.share({title:titulo,text:texto});return}}catch(e){if(e&&e.name==='AbortError')return}
try{await navigator.clipboard.writeText(texto);toast('Texto copiado: pégalo en WhatsApp o donde quieras')}catch(_){window.open('https://wa.me/?text='+encodeURIComponent(texto),'_blank')}
}
function dialogIA(html,onSave,titulo){titulo=titulo||iaTit;
  const old=document.getElementById('xia');if(old)old.remove();
  const d=document.createElement('div');d.id='xia';d.style.cssText='position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)';
  d.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" style="max-height:88vh;overflow:auto"><h2>Análisis con IA</h2>${html}
  ${onSave?`<div class="field"><label for="xia-n">Mis comentarios (opcional)</label><textarea id="xia-n" rows="2" placeholder="Lo que tú agregarías o corregirías"></textarea></div>`:''}
  ${html.includes('class="xia"')?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0"><button type="button" class="btn ghost" data-ia="hablar">🔊 Escuchar</button><button type="button" class="btn ghost" data-ia="compartir">📄 Compartir PDF</button><button type="button" class="btn ghost" data-ia="voz">🎙 Cambiar voz</button></div>`:''}
  <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-ia="close">Cerrar</button>${onSave?'<button type="button" class="btn primary" data-ia="save">Guardar en el video</button>':''}</div></div></div>`;
  document.body.appendChild(d);
  d.onclick=async e=>{const b=e.target.closest('[data-ia]');if(e.target===d||(b&&b.dataset.ia==='close')){try{const hb=d.querySelector('[data-ia=hablar]');if(hb)hb._on=false;window.speechSynthesis.cancel()}catch(_){}d.remove();return}
    if(b&&b.dataset.ia==='voz'){try{const h0=d.querySelector('[data-ia=hablar]');if(h0)h0._on=false;window.speechSynthesis.cancel()}catch(_){}const v=iaCambiarVoz();if(v){toast('Voz: '+v.name);const hb=d.querySelector('[data-ia=hablar]');hb.textContent='🔊 Escuchar';setTimeout(()=>iaHablar(iaHablado(d,titulo),hb),150)}return}
    if(b&&b.dataset.ia==='hablar'){iaHablar(iaHablado(d,titulo),b);return}
    if(b&&b.dataset.ia==='compartir'&&iaCtx&&iaCtx.ia){b.disabled=true;await iaPdfCompartir(d);b.disabled=false;return}
    if(b&&b.dataset.ia==='compartir'){let t=iaTexto(d,titulo);const nt=document.getElementById('xia-n');const nn=d.querySelector('.note');if(nt&&nt.value.trim())t+='\n\nComentarios del profe:\n'+nt.value.trim();else if(nn)t+='\n\n'+nn.textContent;await iaCompartir(t,titulo||'Análisis de tu golpe');return}
    if(b&&b.dataset.ia==='save'){b.disabled=true;await onSave(document.getElementById('xia-n').value.trim());d.remove()}};
}
async function tomarFotogramas(v,dur,r,comp){
const mk=async(t,w)=>{await seek(v,t);const c=frameCanvas(v,w);return {t:Math.round(t*100)/100,img:c.toDataURL('image/jpeg',.7).split(',')[1],w:c.width,h:c.height}};
let ti=r.impacto||0,auto=false;
if(!ti){
const step=Math.max(.2,dur/50),mv=[];let last=null;
for(let t=.05;t<dur-.05;t+=step){await seek(v,t);const c=frameCanvas(v,48),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;if(last){let q=0;for(let i=0;i<d.length;i+=16)q+=Math.abs(d[i]-last[i]);mv.push({t,q})}last=d}
const k=Math.max(1,Math.round(1/step));let best=-1,bt=dur/2;
for(let i=0;i<mv.length;i++){let q=0;for(let j=i;j<Math.min(mv.length,i+k);j++)q+=mv[j].q;if(q>best){best=q;bt=mv[Math.min(mv.length-1,i+(k>>1))].t}}
ti=Math.round(bt*100)/100;auto=true;
}
const ts=[];const ng=comp?4:8,nd=comp?8:14;
for(let k=0;k<ng;k++)ts.push({t:.05+(dur-.1)*k/(ng-1),w:480});
const a=Math.max(0,ti-1),b=Math.min(dur-.05,ti+.7);
for(let k=0;k<nd;k++)ts.push({t:a+(b-a)*k/(nd-1),w:640});
ts.sort((x,y)=>x.t-y.t);
const fr=[];let pt=-1;
for(const x of ts){if(x.t-pt<.06)continue;pt=x.t;fr.push(await mk(x.t,x.w))}
fr.auto=auto;fr.ti=ti;return fr;
}
async function analizar(recs,onSaved){
  if(A.sub().premium===false){window.TAP?window.TAP.sheetPlanes('premium'):toast('La IA está en los planes pagados');return}
  if(!sb()){toast('Inicia sesión para usar la IA');return}
  const w=wait('Analizando con IA…');
  try{
    const out=[];let i=0;
    for(const r of recs){
      w.set('Revisando todo el video '+(++i)+' de '+recs.length+'… puede tardar un poco');
      const url=(await signed([r.path]))[r.path];if(!url)throw new Error('No se pudo abrir el video');
      const v=await loadVideo(url,true);const dur=isFinite(v.duration)&&v.duration>0?v.duration:(r.dur||2);
      const fr=await tomarFotogramas(v,dur,r,recs.length>1);
      
      
      
      out.push({etiqueta:recs.length>1?(i===1?'Video A (antes)':'Video B (ahora)'):'Video',fecha:r.fecha,golpe:GOLPES[r.golpe]||'',angulo:ANGULOS[r.angulo]||'',nota:r.nota||'',impacto_marcado:!!r.impacto,impacto_auto:fr.auto?fr.ti:null,frames:fr});
    }
    w.set('Esperando a la IA… puede tardar unos segundos');
    const a=A.alumno(recs[0].alumnoId)||{};
    const {data,error}=await sb().functions.invoke('analizar-video',{body:{alumno:{mano:a.mano||'',reves:a.reves||'',nivel:a.nivel||'',objetivo:a.objetivo||'',salud:a.salud||''},videos:out}});
    let msg='';
    if(error){try{const j=await error.context.json();msg=j.error||''}catch(_){}msg=msg||'No se pudo conectar con el análisis. Intenta de nuevo en un rato.'}
    else if(!data||data.error)msg=(data&&data.error)||'La IA no respondió.';
    w.end();
    if(msg){dialogIA(`<div class="note">${esc(msg)}</div>`);return}
    const an=data.analisis;
    {const l=recs[recs.length-1],al=A.alumno&&A.alumno(l.alumnoId);iaTit='Análisis de '+(GOLPES[l.golpe]||'golpe').toLowerCase()+(al?' · '+al.nombre:'')+' · '+A.today();iaHab='Análisis de '+(GOLPES[l.golpe]||'golpe').toLowerCase()+(al?' de '+String(al.nombre).split(' ')[0]:'')}
    iaCtx={ia:an,rec:recs[recs.length-1],fotos:iaElegir(out[out.length-1].frames),ts:null};iaCtx.ts=iaCtx.fotos.map(f=>f.t);
    dialogIA(iaHtml(an),async nota=>{
      const last=recs[recs.length-1];
      const ia={...an,fecha:A.today(),notaProfe:nota,vs:recs.length>1?recs[0].id:null,momentos:(iaCtx&&iaCtx.ts)||[]};
      await A.save('videos',{...(S.videos.find(x=>x.id===last.id)||last),ia});toast('Análisis guardado en el video');onSaved&&onSaved(ia);
    });
  }catch(e){w.end();dialogIA(`<div class="note">No se pudo preparar el análisis (${esc(String((e&&e.message)||e))}). Revisa tu internet e intenta de nuevo.</div>`)}
}

/* ---------- reproductor y comparador ---------- */
async function openViewer(arg){
  const ids=Array.isArray(arg)?arg:[arg];
  let recs=ids.map(id=>S.videos.find(v=>v.id===id)).filter(Boolean);if(!recs.length)return;
  const N=recs.length;
  const w=wait('Cargando video…');
  const urls=await signed(recs.map(r=>r.path));w.end();
  if(recs.some(r=>!urls[r.path])){toast('No se pudo cargar el video. Revisa tu internet');return}
  const ov=mkOv('xov');
  const col=window.innerHeight>window.innerWidth;
  const r0=recs[0];
  const title=N>1?'Comparar golpes':`${GOLPES[r0.golpe]||'Golpe'} · ${fmtF(r0.fecha)}`;
  ov.innerHTML=`<div class="xbar"><button class="xb" data-v="close" aria-label="Cerrar">✕</button><b>${esc(title)}</b>${N>1?'<button class="xb" data-v="layout">Girar vista</button>':''}</div>
  <div class="xpanes ${col?'col':''}" id="xpanes">${recs.map((r,i)=>`<div class="xpane" data-i="${i}"><video playsinline muted preload="auto" crossorigin="anonymous" src="${esc(urls[r.path])}"></video><canvas></canvas><span class="lab">${N>1?(i?'B · ':'A · ')+esc(fmtF(r.fecha)):esc(ANGULOS[r.angulo]||'')}</span></div>`).join('')}</div>
  <div class="xctl">
   <div class="r"><button class="xb pri" data-v="play" id="xv-play">▶ Play</button><button class="xb" data-v="step" data-d="-1">◀ Cuadro</button><button class="xb" data-v="step" data-d="1">Cuadro ▶</button><span style="flex:1"></span><span class="t" id="xv-t"></span></div>
   <div class="r"><input type="range" id="xv-sc" min="0" max="1000" step="1" value="0" aria-label="Posición del video"></div>
   <div class="r"><span style="font-size:12px;color:#9fb0bf">Velocidad</span>${[.25,.5,1].map(x=>`<button class="xb ${x===1?'on':''}" data-v="rate" data-x="${x}">${x===1?'Normal':x+'x'}</button>`).join('')}</div>
   <div class="r"><span style="font-size:12px;color:#9fb0bf">Dibujar</span><button class="xb" data-v="tool" data-t="line">Línea</button><button class="xb" data-v="tool" data-t="angle">Ángulo</button><button class="xb" data-v="clear">Borrar</button></div>
   ${recs.map((r,i)=>`<div class="r"><span style="font-size:12.5px;min-width:70px">${N>1?(i?'Video B':'Video A'):'Impacto'}</span><button class="xb" data-v="pf" data-i="${i}" data-d="-1" aria-label="Retroceder un cuadro">◀</button><button class="xb" data-v="pf" data-i="${i}" data-d="1" aria-label="Avanzar un cuadro">▶</button><button class="xb" data-v="mark" data-i="${i}">Marcar impacto</button><span class="t" id="xv-i${i}" style="text-align:left"></span></div>`).join('')}
   <div class="xinfo" id="xv-info"></div>
  </div>`;
  const Vs=[...ov.querySelectorAll('video')];
  const imp=recs.map(r=>r.impacto||0);
  const dur=recs.map(r=>r.dur||0);
  let t=0,playing=false,rate=1,raf=0,tool='',disposed=false;
  const fps=()=>recs[0].fps||30;
  const sc=ov.querySelector('#xv-sc'),tt=ov.querySelector('#xv-t'),bp=ov.querySelector('#xv-play');
  const range=()=>[-Math.min(...imp),Math.min(...Vs.map((v,i)=>dur[i]-imp[i]))];
  const clampT=x=>{const [lo,hi]=range();return Math.min(hi,Math.max(lo,x))};
  function updUI(){
    const [lo,hi]=range();sc.value=hi>lo?Math.round((t-lo)/(hi-lo)*1000):0;
    const marked=imp.some(x=>x>0);tt.textContent=marked?(t>=0?'+':'')+t.toFixed(2)+' s del impacto':(t+(imp[0]||0)).toFixed(2)+' s';
    recs.forEach((r,i)=>{const e=ov.querySelector('#xv-i'+i);if(e)e.textContent=imp[i]>0?'✓ '+imp[i].toFixed(2)+' s':'sin marcar'});
  }
  function setT(x){t=clampT(x);Vs.forEach((v,i)=>{v.currentTime=Math.max(0,imp[i]+t)});updUI()}
  function pause(){playing=false;cancelAnimationFrame(raf);Vs.forEach(v=>v.pause());bp.textContent='▶ Play'}
  function play(){
    const [lo,hi]=range();if(t>=hi-0.04)setT(lo);
    Vs.forEach(v=>{v.playbackRate=rate;v.play().catch(()=>{})});playing=true;bp.textContent='❚❚ Pausa';
    const step=()=>{
      if(!playing||disposed)return;
      t=Vs[0].currentTime-imp[0];const [lo2,hi2]=range();
      if(Vs.length>1){const exp=Math.max(0,imp[1]+t);if(Math.abs(Vs[1].currentTime-exp)>0.12)Vs[1].currentTime=exp}
      if(t>=hi2-0.03){pause();t=hi2;updUI();return}
      updUI();raf=requestAnimationFrame(step);
    };raf=requestAnimationFrame(step);
  }
  // duraciones reales (los .webm de la cámara a veces no las traen)
  await Promise.all(Vs.map((v,i)=>new Promise(res=>{
    const ok=async()=>{if(!isFinite(v.duration)||v.duration<=0)await fixInf(v);if(isFinite(v.duration)&&v.duration>0)dur[i]=v.duration;else if(!dur[i])dur[i]=5;res()};
    if(v.readyState>=1)ok();else{v.addEventListener('loadedmetadata',ok,{once:true});v.addEventListener('error',()=>res(),{once:true});setTimeout(res,12000)}
  })));
  setT(imp.some(x=>x>0)?Math.max(range()[0],-0.6):0);
  /* dibujo */
  const panes=[...ov.querySelectorAll('.xpane')].map(p=>({el:p,cv:p.querySelector('canvas'),shapes:[],cur:null}));
  function draw(P){
    const cv=P.cv,r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;
    if(cv.width!==Math.round(r.width*d)||cv.height!==Math.round(r.height*d)){cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d)}
    const g=cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);g.scale(d,d);
    g.lineWidth=3;g.lineCap='round';g.font='bold 15px system-ui,sans-serif';g.shadowColor='rgba(0,0,0,.85)';g.shadowBlur=4;g.strokeStyle='#ffd400';g.fillStyle='#ffd400';
    const px=p=>[p[0]*r.width,p[1]*r.height];
    const all=[...P.shapes];if(P.cur)all.push(P.cur);
    for(const s of all){
      if(s.k==='l'){const a=px(s.a),b=px(s.b);g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke()}
      else{
        const pts=s.pts.map(px);g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();
        pts.forEach(p=>{g.beginPath();g.arc(p[0],p[1],4,0,7);g.fill()});
        if(pts.length===3){
          const [a,b,c]=pts;const v1=[a[0]-b[0],a[1]-b[1]],v2=[c[0]-b[0],c[1]-b[1]];
          const ang=Math.abs(Math.atan2(v1[0]*v2[1]-v1[1]*v2[0],v1[0]*v2[0]+v1[1]*v2[1]))*180/Math.PI;
          g.fillText(Math.round(ang)+'°',b[0]+10,b[1]-10);
        }
      }
    }
  }
  const redrawAll=()=>panes.forEach(draw);
  panes.forEach(P=>{
    const pt=e=>{const r=P.cv.getBoundingClientRect();return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))]};
    P.cv.addEventListener('pointerdown',e=>{
      if(!tool)return;e.preventDefault();const p=pt(e);
      if(tool==='line'){P.cur={k:'l',a:p,b:p};P.drag=true;P.cv.setPointerCapture(e.pointerId)}
      else{if(!P.cur||P.cur.k!=='a')P.cur={k:'a',pts:[]};P.cur.pts.push(p);if(P.cur.pts.length===3){P.shapes.push(P.cur);P.cur=null}}
      draw(P);
    });
    P.cv.addEventListener('pointermove',e=>{if(tool==='line'&&P.drag&&P.cur){P.cur.b=pt(e);draw(P)}});
    P.cv.addEventListener('pointerup',()=>{if(P.drag&&P.cur){P.drag=false;if(Math.hypot(P.cur.b[0]-P.cur.a[0],P.cur.b[1]-P.cur.a[1])>.01)P.shapes.push(P.cur);P.cur=null;draw(P)}});
  });
  const ro=window.ResizeObserver?new ResizeObserver(redrawAll):null;if(ro)panes.forEach(P=>ro.observe(P.el));
  window.addEventListener('resize',redrawAll);
  /* info (solo un video) o IA (comparación) */
  const info=ov.querySelector('#xv-info');
  function drawInfo(){
    const r=recs[recs.length-1];
    if(N>1){info.innerHTML=`<button class="xb pri" data-v="ia">Analizar la comparación con IA</button>${r.ia&&r.ia.vs?'<button class="xb" data-v="ia-ver">Ver análisis guardado</button>':''}<span style="font-size:12px;color:#9fb0bf">Marca el impacto en los dos videos para que la IA mire el momento justo.</span>`;return}
    info.innerHTML=`<div style="font-size:12.5px;color:#9fb0bf">${esc(GOLPES[r.golpe]||'')} · ${esc(fmtF(r.fecha))}${r.angulo&&ANGULOS[r.angulo]?' · '+esc(ANGULOS[r.angulo]):''}${r.size?' · '+mb(r.size):''}</div>
    <textarea id="xv-nota" rows="2" placeholder="Nota sobre este video">${esc(r.nota||'')}</textarea>
    <button class="xb${r.compartido?' on':''}" data-v="share" style="align-self:flex-start">${r.compartido?'✓ Compartido con el alumno · dejar de compartir':'Compartir con el alumno'}</button>
    ${r.compartido?`<span style="font-size:12px;color:#9fb0bf">Lo ve en su app junto a tu nota${r.ia?' y el análisis IA':''}.</span>`:''}
    <div class="r" style="display:flex;gap:6px;flex-wrap:wrap"><button class="xb pri" data-v="ia">Analizar con IA</button>${r.ia?'<button class="xb" data-v="ia-ver">Ver análisis guardado</button>':''}<button class="xb" data-v="cmp">Comparar con otro</button><button class="xb bad" data-v="del">Borrar</button></div>
    <span style="font-size:12px;color:#9fb0bf">Tip: pausa en el instante del impacto y toca “Marcar impacto”. Mejora la IA y alinea la comparación.</span>`;
  }
  drawInfo();updUI();
  const dispose=()=>{disposed=true;pause();window.removeEventListener('resize',redrawAll);if(ro)ro.disconnect();ov.remove();A.render()};
  async function patch(i,p){const cur=S.videos.find(x=>x.id===recs[i].id)||recs[i];recs[i]={...cur,...p};await A.save('videos',recs[i])}
  ov.addEventListener('input',e=>{if(e.target.id==='xv-sc'){pause();const [lo,hi]=range();setT(lo+(hi-lo)*(+sc.value)/1000)}});
  ov.addEventListener('change',async e=>{if(e.target.id==='xv-nota')await patch(0,{nota:e.target.value.trim()})});
  ov.addEventListener('click',async e=>{
    const b=e.target.closest('[data-v]');if(!b)return;const a=b.dataset.v;
    switch(a){
      case 'close':dispose();break;
      case 'layout':ov.querySelector('#xpanes').classList.toggle('col');setTimeout(redrawAll,50);break;
      case 'play':playing?pause():play();break;
      case 'step':pause();setT(t+(+b.dataset.d)/fps());break;
      case 'pf':{pause();const i=+b.dataset.i;Vs[i].currentTime=Math.max(0,Math.min(dur[i],Vs[i].currentTime+(+b.dataset.d)/fps()));t=Vs[0].currentTime-imp[0];setTimeout(updUI,80);break}
      case 'rate':rate=+b.dataset.x;Vs.forEach(v=>v.playbackRate=rate);ov.querySelectorAll('[data-v=rate]').forEach(x=>x.classList.toggle('on',x===b));break;
      case 'tool':{const nt=b.dataset.t;tool=tool===nt?'':nt;ov.querySelectorAll('[data-v=tool]').forEach(x=>x.classList.toggle('on',x.dataset.t===tool));panes.forEach(P=>{P.cv.classList.toggle('on',!!tool);P.cv.style.pointerEvents=tool?'auto':'none';P.cur=null});redrawAll();if(tool)pause();break}
      case 'clear':panes.forEach(P=>{P.shapes=[];P.cur=null});redrawAll();break;
      case 'mark':{pause();const i=+b.dataset.i;imp[i]=Vs[i].currentTime;await patch(i,{impacto:Math.round(imp[i]*100)/100});t=Vs[0].currentTime-imp[0];setT(t);break}
      case 'ia':analizar(recs,ia=>{recs[recs.length-1]={...recs[recs.length-1],ia};drawInfo()});break;
      case 'ia-ver':{const r=recs[recs.length-1];if(r.ia){const al=A.alumno&&A.alumno(r.alumnoId);iaTit='Análisis de '+(GOLPES[r.golpe]||'golpe').toLowerCase()+(al?' · '+al.nombre:'')+' · '+(r.ia.fecha||A.today());iaHab='Análisis de '+(GOLPES[r.golpe]||'golpe').toLowerCase()+(al?' de '+String(al.nombre).split(' ')[0]:'');iaCtx={ia:r.ia,rec:r,fotos:null,ts:r.ia.momentos&&r.ia.momentos.length?r.ia.momentos:null}}if(r.ia)dialogIA(iaHtml(r.ia)+(r.ia.notaProfe?`<div class="note"><b>Mis comentarios:</b> ${esc(r.ia.notaProfe)}</div>`:''));break}
      case 'share':{const on=!recs[0].compartido;await patch(0,{compartido:on});drawInfo();toast(on?'Video compartido: el alumno lo verá en su app':'El alumno ya no verá este video');break}
      case 'cmp':{const al=recs[0].alumnoId,id=recs[0].id;dispose();sheetComparar(al,id);break}
      case 'del':{
        if(ui.armed!=='vdel'){ui.armed='vdel';b.textContent='Toca otra vez para borrar';return}
        ui.armed=null;const r=recs[0];dispose();
        try{await sb().storage.from(BUCKET).remove([r.path,r.path+'.jpg'])}catch(_){}
        await A.removeDoc('videos',r.id);toast('Video borrado');break}
    }
  });
  setTimeout(redrawAll,60);
}

window.TAX={vPerfil,after,onDeleteAlumno,_test:{signed,pickMime,transcode,frameCanvas,loadVideo}};
if(ui.perfil)A.render();
})();
