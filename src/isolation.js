/**
 * Opt-in cross-origin isolation for GitHub Pages, where the host cannot set
 * COOP/COEP. The dev server sends those headers itself, so this stays idle.
 * Pattern documented in docs/MEASUREMENTS.md. Not loaded until the user asks.
 */
export async function enableCrossOriginIsolation() {
  if (window.crossOriginIsolated) return "already";
  if (!navigator.serviceWorker) return "unsupported";
  const workerUrl = new URL("../coi-serviceworker.js", import.meta.url);
  const scopeUrl = new URL("../", import.meta.url);
  sessionStorage.setItem("x17-coi", "1");
  await navigator.serviceWorker.register(workerUrl, { scope: scopeUrl.pathname });
  await navigator.serviceWorker.ready;
  location.reload();
  return "reloading";
}

export function isolationStatus() {
  const isolated = window.crossOriginIsolated === true;
  if (sessionStorage.getItem("x17-coi") === "1" && isolated) sessionStorage.removeItem("x17-coi");
  return {
    isolated,
    failed: sessionStorage.getItem("x17-coi") === "1" && !isolated,
  };
}
