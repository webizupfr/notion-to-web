/**
 * Script inline anti-flash : s'exécute AVANT que React hydrate, lit la préférence
 * user en localStorage et applique `data-theme` sur <html>.
 *
 * Sans ça, l'user en mode light verrait un flash dark (ou l'inverse) au premier
 * chargement. À coller dans <head> via layout.tsx.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
