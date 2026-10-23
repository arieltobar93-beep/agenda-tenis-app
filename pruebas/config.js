// Setly · configuración de la app de PRUEBAS (no toca los datos reales).
// La clave publishable es pública por diseño.
(function(){
  // Guarda todo lo del teléfono con el prefijo "pruebas:" para no mezclarlo con la app real (misma dirección web).
  var P='pruebas:',S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem;
  S.getItem=function(k){return g.call(this,P+k)};S.setItem=function(k,v){return s.call(this,P+k,v)};S.removeItem=function(k){return r.call(this,P+k)};
  // Cinta visible para no confundirse.
  document.addEventListener('DOMContentLoaded',function(){var d=document.createElement('div');d.textContent='MODO PRUEBAS';
    d.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;background:#d7e937;color:#0e2d4a;font:800 11px system-ui;letter-spacing:.08em;padding:4px 9px;border-radius:99px;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none';
    document.body.appendChild(d)});
})();
window.APP_CONFIG = {
  app: 'tenis',
  pruebas: true,
  supabaseUrl: 'https://uftxwktivqqysdxvmxan.supabase.co',
  supabaseKey: 'sb_publishable_Hz1u1NEc4QmXLEiMbLDhMg_sw-pjUiW',
  payUrl: 'https://mpago.la/1zXLALx',
  contacto: 'arieltobar93@gmail.com'
};
