// Juntada 9º GBM — © 2026 Matheus Henrique da Cruz Carvalho (mhcc.2026.jgbm9.7c41e0b9d2) — funciona sem internet depois da primeira abertura.
const VERSAO = "juntada-v39";
const APP = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Página: tenta a rede (para receber atualizações), cai no cache sem internet.
  if (req.mode === "navigate") {
    // Internet lenta (comum na guarda): espera a rede no máximo 4 s; depois abre a cópia guardada e a rede só atualiza o cache.
    const rede = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(x => x.put("index.html", c)); } return r; });
    const doCache = () => caches.match("index.html").then(h => h || caches.match("./"));
    e.respondWith(new Promise(res => {
      let feito = false;
      const fim = r => { if (!feito && r) { feito = true; res(r); } };
      const t = setTimeout(() => doCache().then(fim), 4000);
      rede.then(r => { clearTimeout(t); fim(r); })
        .catch(() => doCache().then(h => { clearTimeout(t); fim(h || Response.error()); }));
    }));
    return;
  }
  // Arquivos do app (ícones, manifesto): cache primeiro, atualiza em segundo plano.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
