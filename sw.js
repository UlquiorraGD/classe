/* Rende l'app usabile anche senza rete. Cambiare VERSIONE a ogni aggiornamento. */
const VERSIONE = 'classe-v6';
const FILE = ['./', 'index.html', 'style.css', 'dati.js', 'app.js', 'classe.js', 'agenda.js', 'esporta.js', 'listino.js', 'manifest.webmanifest', 'icona.svg', 'icona-192.png', 'icona-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(chiavi => Promise.all(chiavi.filter(k => k !== VERSIONE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(risposta => {
        const copia = risposta.clone();
        caches.open(VERSIONE).then(c => c.put(e.request, copia)).catch(() => {});
        return risposta;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
