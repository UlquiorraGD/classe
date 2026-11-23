'use strict';
/* Dati, calcoli e testi dei messaggi. Tutto resta nel telefono (localStorage). */

const KEY = 'rappresentante-v1';
const VUOTO = Object.freeze({ classe: '', scuola: '', bambini: [], raccolte: [], avvisi: [], risposte: [], adesioni: [], consigli: [] });

let S = carica();
let precedente = null; // per "Annulla"

function carica() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...VUOTO, ...JSON.parse(raw) } : { ...VUOTO };
  } catch (e) {
    console.warn('Dati non leggibili, riparto da zero:', e);
    return { ...VUOTO };
  }
}

function scrivi(nuovo) {
  S = nuovo;
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { console.error('Salvataggio fallito:', e); return false; }
}

/* ---------- utilità ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = n => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const numero = s => parseFloat(String(s).replace(',', '.')) || 0;
const dataIt = d => d ? new Date(d + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
const dataBreve = d => d ? new Date(d + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
const oggiISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const trova = (coll, id) => S[coll].find(x => x.id === id);
const elenco = nomi => nomi.map(n => '• ' + n).join('\n');
const iniziali = nome => nome.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
const tinta = nome => [...nome].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function quandoEtichetta(d) {
  if (!d) return '';
  const oggi = oggiISO();
  const domani = new Date(Date.now() + 864e5);
  const domaniISO = `${domani.getFullYear()}-${String(domani.getMonth() + 1).padStart(2, '0')}-${String(domani.getDate()).padStart(2, '0')}`;
  if (d === oggi) return 'oggi';
  if (d === domaniISO) return 'domani';
  if (d < oggi) return 'scaduto il ' + dataBreve(d);
  return dataBreve(d);
}

/* ---------- calcoli ---------- */
const pagatiDi = r => S.bambini.filter(b => r.pagati[b.id]);
const mancantiRaccolta = r => S.bambini.filter(b => !r.pagati[b.id]);
const speseTot = r => r.spese.reduce((t, s) => t + s.importo, 0);
const mancantiAdesione = a => S.bambini.filter(b => !a.risposte[b.id]);
const COLORI_OPZIONI = ['var(--aqua)', 'var(--coral)', 'var(--sun)', 'var(--violet)', 'var(--sky)'];

/* ---------- testi dei messaggi ---------- */
const TESTI = {
  lancioRaccolta: r => `💶 ${r.titolo}\n\nQuota: ${euro(r.quota)} a bambino` +
    (r.scadenza ? `\nEntro: ${dataIt(r.scadenza)}` : '') +
    `\n\nMan mano segno io chi ha pagato, non serve scriverlo nel gruppo. Grazie! 🙏`,
  sollecito: r => {
    const m = mancantiRaccolta(r).map(b => b.nome);
    return `Ciao a tutti! Per "${r.titolo}" mi mancano ancora ${m.length === 1 ? 'la quota' : 'le quote'} di:\n${elenco(m)}\n\n` +
      `Quota: ${euro(r.quota)}` + (r.scadenza ? `, entro ${dataIt(r.scadenza)}` : '') + `. Grazie! 🙏`;
  },
  resoconto: r => {
    const p = pagatiDi(r).length, inc = p * r.quota, sp = speseTot(r);
    return `📊 Resoconto "${r.titolo}"\n\nRaccolti: ${euro(inc)} (${p} quote su ${S.bambini.length})\n` +
      `Spesi: ${euro(sp)}` + (r.spese.length ? '\n' + r.spese.map(s => `• ${s.desc}: ${euro(s.importo)}`).join('\n') : '') +
      `\nRimasti in cassa: ${euro(inc - sp)}\n\nGli scontrini sono a disposizione di chi vuole vederli.`;
  },
  avviso: v => `📌 ${v.titolo}\n\n${v.testo}` + (v.scadenza ? `\n\n📅 ${dataIt(v.scadenza)}` : ''),
  promemoria: v => `⏰ Promemoria\n\n` + TESTI.avviso(v),
  lancioAdesione: a => `✋ ${a.domanda}\n\nRispondetemi in privato (così il gruppo non si intasa 😉) con: ${a.opzioni.join(' / ')}` +
    (a.scadenza ? `\nEntro ${dataIt(a.scadenza)}` : '') + `\n\nGrazie!`,
  riepilogoAdesione: a => {
    const righe = a.opzioni.map(o => {
      const chi = S.bambini.filter(b => a.risposte[b.id] === o).map(b => b.nome);
      return `${o}: ${chi.length}` + (chi.length ? ` (${chi.join(', ')})` : '');
    });
    const m = mancantiAdesione(a).map(b => b.nome);
    return `📋 ${a.domanda}\n\n${righe.join('\n')}` + (m.length ? `\nNon hanno ancora risposto: ${m.join(', ')}` : '');
  },
  sollecitoAdesione: a => `Ciao! Per "${a.domanda}" mi manca ancora la risposta di:\n${elenco(mancantiAdesione(a).map(b => b.nome))}\n\n` +
    `Basta scrivermi in privato: ${a.opzioni.join(' / ')}. Grazie! 🙏`,
  consiglio: c => {
    const punti = c.appunti.split('\n').map(s => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
    return `📝 ${c.tipo} di ${dataIt(c.data)}\n\nCiao a tutti, ecco in breve cosa è stato detto:\n\n${elenco(punti)}\n\n` +
      `Per qualsiasi dubbio scrivetemi pure in privato. Buona serata!`;
  },
  risposta: x => x.risposta
};

const MSG_INFO = {
  lancioRaccolta: ['raccolte', 'Annuncio raccolta', 'c-sun'],
  sollecito: ['raccolte', 'Sollecito', 'c-sun'],
  resoconto: ['raccolte', 'Resoconto', 'c-sun'],
  avviso: ['avvisi', 'Avviso', 'c-coral'],
  promemoria: ['avvisi', 'Promemoria', 'c-coral'],
  risposta: ['risposte', 'Risposta pronta', 'c-coral'],
  lancioAdesione: ['adesioni', 'Richiesta', 'c-aqua'],
  riepilogoAdesione: ['adesioni', 'Riepilogo', 'c-aqua'],
  sollecitoAdesione: ['adesioni', 'Sollecito', 'c-aqua'],
  consiglio: ['consigli', 'Riassunto riunione', 'c-violet']
};
