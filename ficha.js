/* Setly · ficha técnica del alumno (etapa 2, parte 1).
   Foco actual, errores frecuentes, fortalezas, físico, mental y notas privadas.
   Se guarda dentro del alumno (a.ficha). Cada parte tiene "visible para el alumno"
   (vis), que usará la app del jugador; las notas privadas nunca se comparten. */
(function(){
'use strict';
const A=window.TA;if(!A)return;
const {esc,toast}=A;
const ERRORES=['Derecha: golpea tarde','Derecha: no termina el movimiento','Revés: muñeca suelta','Revés: no gira los hombros',
  'Saque: lanzamiento irregular','Saque: no flexiona las piernas','Volea: hace swing','Pies: no hace split-step',
  'Pies: se queda plantado','Empuñadura incorrecta','No mira la pelota al impacto','Poca altura sobre la red'];
const FORTALEZAS=['Buena derecha','Buen revés','Saque potente','Consistencia','Velocidad','Buena volea','Actitud y garra','Lectura de juego','Concentración'];
const PARTES=[['foco','Foco actual'],['errores','Errores frecuentes'],['fortalezas','Fortalezas'],['fisico','Físico'],['mental','Mental']];

const st=document.createElement('style');st.textContent=`
.fch .lista{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px}
.fch .tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.fch .priv{font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;border:1px solid var(--line);border-radius:99px;padding:1px 7px}
.fch .foco{border-left:4px solid var(--ball)}
.fchk{display:flex;flex-wrap:wrap;gap:6px}
.fchk label{border:1px solid var(--line);border-radius:99px;padding:6px 11px;font-size:13px;cursor:pointer;user-select:none;background:var(--bg)}
.fchk input{position:absolute;opacity:0;pointer-events:none}
.fchk label:has(input:checked){background:var(--court);color:#fff;border-color:var(--court)}
.fvis{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0}
.fvis input{width:auto;margin:0}
`;document.head.appendChild(st);

const lista=v=>Array.isArray(v)?v.filter(Boolean):[];
function ficha(a){const f=a&&a.ficha||{};return {foco:lista(f.foco),errores:lista(f.errores),fortalezas:lista(f.fortalezas),
  fisico:f.fisico||'',mental:f.mental||'',privado:f.privado||'',vis:Object.assign({foco:true,errores:true,fortalezas:true,fisico:true,mental:true},f.vis||{}),upd:f.upd||''}}
const vacia=f=>!f.foco.length&&!f.errores.length&&!f.fortalezas.length&&!f.fisico&&!f.mental&&!f.privado;
const etiqueta=(f,k,nom)=>`<span class="tag">${esc(nom)}${f.vis[k]?'':' <span class="priv">🔒 Solo tú</span>'}</span>`;

function seccion(id){
  const a=A.alumno(id);if(!a)return '';
  const f=ficha(a);
  let h=`<section class="xp fch"><div class="sec-h"><h3>Ficha técnica</h3><button class="btn small${vacia(f)?' primary':''}" data-fact="editar" data-id="${esc(id)}">${vacia(f)?'+ Completar':'Editar'}</button></div>`;
  if(vacia(f))return h+`<div class="note">Anota en qué está trabajando, sus errores frecuentes y sus fortalezas. Tú decides qué podrá ver el alumno en su app.</div></section>`;
  if(f.foco.length)h+=`<div class="box foco">${etiqueta(f,'foco','Foco actual')}<ol class="lista">${f.foco.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>`;
  const chips=xs=>`<div class="chips">${xs.map(x=>`<span class="xc">${esc(x)}</span>`).join('')}</div>`;
  if(f.errores.length)h+=`<div class="box">${etiqueta(f,'errores','Errores frecuentes')}${chips(f.errores)}</div>`;
  if(f.fortalezas.length)h+=`<div class="box">${etiqueta(f,'fortalezas','Fortalezas')}${chips(f.fortalezas)}</div>`;
  if(f.fisico)h+=`<div class="box">${etiqueta(f,'fisico','Físico')}<div>${esc(f.fisico)}</div></div>`;
  if(f.mental)h+=`<div class="box">${etiqueta(f,'mental','Mental')}<div>${esc(f.mental)}</div></div>`;
  if(f.privado)h+=`<div class="note"><b>🔒 Nota privada:</b> ${esc(f.privado)}</div>`;
  if(f.upd)h+=`<span class="muted" style="font-size:12px">Actualizada ${esc(fmt(f.upd))}</span>`;
  return h+`</section>`;
}
function fmt(d){try{return A.dayName(d)}catch(_){return d}}

const vis=(k,f)=>`<label class="fvis"><input type="checkbox" name="vis-${k}" ${f.vis[k]?'checked':''}> Visible para el alumno</label>`;
const marcar=(nombre,opciones,elegidos)=>{
  const todos=[...opciones,...elegidos.filter(x=>!opciones.includes(x))];
  return `<div class="fchk">${todos.map(o=>`<label><input type="checkbox" name="${nombre}" value="${esc(o)}" ${elegidos.includes(o)?'checked':''}>${esc(o)}</label>`).join('')}</div>`};

function editar(id){
  const a=A.alumno(id);if(!a)return;const f=ficha(a);
  const nombre=String(a.nombre).replace(/^Ejemplo:\s*/,'');
  A.sheet(`<h2>Ficha técnica</h2><p class="muted" style="margin:0">${esc(nombre)}. Lo que marques como visible lo verá en su app cuando esté conectado contigo.</p>
  <form id="f-ficha" data-id="${esc(id)}"><div style="display:flex;flex-direction:column;gap:16px">
  <div class="field"><span>Foco actual (2 o 3 cosas a mejorar)</span>${vis('foco',f)}
    ${[0,1,2].map(i=>`<input name="foco" maxlength="80" value="${esc(f.foco[i]||'')}" placeholder="${['Ej: muñeca firme en el revés','Ej: split-step antes de cada golpe','Opcional'][i]}">`).join('')}</div>
  <div class="field"><span>Errores frecuentes</span>${vis('errores',f)}${marcar('err',ERRORES,f.errores)}
    <input id="fi-err" maxlength="120" placeholder="Otro error (separa varios con coma)"></div>
  <div class="field"><span>Fortalezas</span>${vis('fortalezas',f)}${marcar('fue',FORTALEZAS,f.fortalezas)}
    <input id="fi-fue" maxlength="120" placeholder="Otra fortaleza (separa varias con coma)"></div>
  <div class="field"><label for="fi-fis">Físico</label>${vis('fisico',f)}<textarea id="fi-fis" rows="2" maxlength="300" placeholder="Desplazamiento, resistencia, lesiones a cuidar…">${esc(f.fisico)}</textarea></div>
  <div class="field"><label for="fi-men">Mental</label>${vis('mental',f)}<textarea id="fi-men" rows="2" maxlength="300" placeholder="Manejo de la frustración, concentración, actitud en partido…">${esc(f.mental)}</textarea></div>
  <div class="field"><label for="fi-pri">🔒 Nota privada (nunca la ve el alumno)</label><textarea id="fi-pri" rows="2" maxlength="500" placeholder="Solo para ti">${esc(f.privado)}</textarea></div>
  <div class="sheet-actions"><div class="end"><button type="button" class="btn ghost" data-act="close">Cerrar</button><button class="btn primary" type="submit">Guardar</button></div></div>
  </div></form>`);
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-fact]');if(!b)return;
  if(b.dataset.fact==='editar')editar(b.dataset.id);
});
document.addEventListener('submit',async e=>{
  const fm=e.target;if(fm.id!=='f-ficha')return;
  e.preventDefault();
  const a=A.alumno(fm.dataset.id);if(!a)return;
  const extra=id=>document.getElementById(id).value.split(',').map(s=>s.trim()).filter(Boolean);
  const marcados=n=>[...fm.querySelectorAll(`input[name=${n}]:checked`)].map(x=>x.value);
  const unico=xs=>[...new Set(xs)];
  const f={
    foco:[...fm.querySelectorAll('input[name=foco]')].map(x=>x.value.trim()).filter(Boolean),
    errores:unico([...marcados('err'),...extra('fi-err')]),
    fortalezas:unico([...marcados('fue'),...extra('fi-fue')]),
    fisico:document.getElementById('fi-fis').value.trim(),
    mental:document.getElementById('fi-men').value.trim(),
    privado:document.getElementById('fi-pri').value.trim(),
    vis:Object.fromEntries(PARTES.map(([k])=>[k,!!fm.querySelector(`input[name=vis-${k}]`).checked])),
    upd:A.today()
  };
  A.closeSheet();
  try{await A.save('alumnos',{...a,ficha:f});toast('Ficha guardada')}catch(_){}
});

window.TAF={seccion,ficha};
})();
