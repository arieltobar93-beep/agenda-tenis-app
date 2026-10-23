#!/usr/bin/env python3
"""Setly · arma la copia de PRUEBAS en la carpeta pruebas/.

La app de pruebas es la misma app, pero conectada al Supabase "setly-pruebas"
(datos separados de los profes reales). Flujo de trabajo:
  1. Hacer el cambio en los archivos de la raíz.
  2. Correr:  python3 herramientas/armar-pruebas.py
  3. Subir solo la carpeta pruebas/ y probar en .../agenda-tenis-app/pruebas/
  4. Si todo está bien, subir los archivos de la raíz (la app real).
Los cambios de base de datos (sql/) se corren primero en setly-pruebas y después en la real.
"""
import os, re, shutil

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(RAIZ, 'pruebas')
ARCHIVOS = ['index.html', 'admin.html', 'manifest.webmanifest', 'sw.js'] + sorted(
    f for f in os.listdir(RAIZ) if f.endswith('.js') and f not in ('config.js', 'sw.js'))

CONFIG = """// Setly · configuración de la app de PRUEBAS (no toca los datos reales).
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
"""

def main():
    os.makedirs(os.path.join(DEST, 'icons'), exist_ok=True)
    for f in ARCHIVOS:
        txt = open(os.path.join(RAIZ, f), encoding='utf-8').read()
        if f == 'sw.js':
            txt = re.sub(r"const CACHE='setly-v(\d+)';", r"const CACHE='setly-pruebas-v\1';", txt)
            assert "setly-pruebas-v" in txt
        if f == 'manifest.webmanifest':
            txt = txt.replace('"name": "Setly"', '"name": "Setly Pruebas"').replace('"short_name": "Setly"', '"short_name": "Setly P"')
        if f in ('index.html', 'admin.html'):
            txt = txt.replace('<title>Setly</title>', '<title>Setly · Pruebas</title>', 1)
        open(os.path.join(DEST, f), 'w', encoding='utf-8').write(txt)
    for f in os.listdir(os.path.join(RAIZ, 'icons')):
        shutil.copy2(os.path.join(RAIZ, 'icons', f), os.path.join(DEST, 'icons', f))
    open(os.path.join(DEST, 'config.js'), 'w', encoding='utf-8').write(CONFIG)
    print('Listo: pruebas/ con', len(ARCHIVOS) + 1, 'archivos y', len(os.listdir(os.path.join(DEST, 'icons'))), 'íconos')

if __name__ == '__main__':
    main()
