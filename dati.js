'use strict';
/* Dati, calcoli e testi dei messaggi. Tutto resta nel telefono (localStorage). */

const KEY = 'rappresentante-v1';
const VUOTO = Object.freeze({ classe: '', scuola: '', bambini: [], raccolte: [], avvisi: [], risposte: [], adesioni: [], consigli: [], eventi: [] });

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
const isoDi = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const oggiISO = () => isoDi(new Date());
const piuGiorni = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return isoDi(d); };
const trova = (coll, id) => S[coll].find(x => x.id === id);
const elenco = nomi => nomi.map(n => '• ' + n).join('\n');
const iniziali = nome => nome.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
const tinta = nome => [...nome].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function quandoEtichetta(d) {
  if (!d) return '';
  const oggi = oggiISO();
  const domaniISO = piuGiorni(oggi, 1);
  if (d === oggi) return 'oggi';
  if (d === domaniISO) return 'domani';
  if (d < oggi) return 'scaduto il ' + dataBreve(d);
  return dataBreve(d);
}

/* ---------- bambini, genitori, compleanni ---------- */
const genitoriDi = b => (b.genitori || []).filter(g => telefonoWa(g.tel));
/** Numero per WhatsApp (solo cifre). Cellulari italiani senza prefisso → 39. */
function telefonoWa(tel) {
  let n = String(tel || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  else if (/^3\d{8,9}$/.test(n)) n = '39' + n;
  return n.length >= 8 ? n : '';
}
const linkWa = (tel, testo) => `https://wa.me/${telefonoWa(tel)}?text=${encodeURIComponent(testo)}`;

/** Prossimo compleanno da oggi: { data, giorni, anni } oppure null. */
function prossimoCompleanno(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const oggi = new Date(oggiISO() + 'T12:00');
  let n = new Date(oggi.getFullYear(), m - 1, d, 12);
  if (n < oggi) n = new Date(oggi.getFullYear() + 1, m - 1, d, 12);
  return { data: isoDi(n), giorni: Math.round((n - oggi) / 864e5), anni: y > 1900 ? n.getFullYear() - y : null };
}
const giornoSettimana = iso => new Date(iso + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long' });

/* ---------- calendario ---------- */
const TIPI_EVENTO = {
  vacanza: ['Vacanza', 'var(--sky)'],
  colloqui: ['Colloqui', 'var(--violet)'],
  riunione: ['Riunione', 'var(--violet)'],
  gita: ['Gita o uscita', 'var(--aqua)'],
  festa: ['Festa', 'var(--coral)'],
  altro: ['Altro', 'var(--sun)']
};

/** Tutti gli impegni fra due date (incluse), in ordine. */
function impegniTra(da, a) {
  const out = [];
  const dentro = d => d && d >= da && d <= a;
  (S.eventi || []).forEach(e => {
    const fine = e.fine && e.fine > e.data ? e.fine : e.data;
    const [nomeTipo, col] = TIPI_EVENTO[e.tipo] || TIPI_EVENTO.altro;
    for (let d = e.data; d <= fine; d = piuGiorni(d, 1)) {
      if (dentro(d)) out.push({ data: d, titolo: e.titolo, sub: nomeTipo + (e.ora ? ' · ore ' + e.ora : ''), colore: col, icona: 'calendario', apri: `A.evento('${e.id}')`, tipo: 'evento', ora: e.ora, vacanza: e.tipo === 'vacanza' });
    }
  });
  S.avvisi.filter(v => dentro(v.scadenza)).forEach(v => out.push({ data: v.scadenza, titolo: v.titolo, sub: 'Avviso', colore: 'var(--coral)', icona: 'avviso', apri: `A.msg('avviso','${v.id}')`, tipo: 'avviso' }));
  S.raccolte.filter(r => !r.chiusa && dentro(r.scadenza)).forEach(r => out.push({ data: r.scadenza, titolo: r.titolo, sub: 'Scadenza quota', colore: 'var(--sun)', icona: 'cassa', apri: `A.vai('cassa','${r.id}')`, tipo: 'scadenza' }));
  S.adesioni.filter(x => !x.chiusa && dentro(x.scadenza)).forEach(x => out.push({ data: x.scadenza, titolo: x.domanda, sub: 'Scadenza risposte', colore: 'var(--aqua)', icona: 'adesioni', apri: `A.vai('adesioni','${x.id}')`, tipo: 'scadenza' }));
  S.bambini.filter(b => b.compleanno).forEach(b => {
    const [, m, g] = b.compleanno.split('-');
    for (let y = +da.slice(0, 4); y <= +a.slice(0, 4); y++) {
      const d = `${y}-${m}-${g}`;
      if (dentro(d)) out.push({ data: d, titolo: 'Compleanno di ' + b.nome, sub: 'Compleanno', colore: 'var(--coral)', icona: 'torta', apri: `A.scheda('${b.id}')`, tipo: 'compleanno' });
    }
  });
  return out.sort((x, y) => (x.data + (x.ora || '')).localeCompare(y.data + (y.ora || '')));
}

/** File .ics per il calendario del telefono. */
function creaIcs(eventi) {
  const giorno = iso => iso.replace(/-/g, '');
  const testo = s => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const righe = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Classe//Rappresentante//IT', 'CALSCALE:GREGORIAN'];
  eventi.forEach(e => {
    righe.push('BEGIN:VEVENT', `UID:${e.id}@classe`, `DTSTAMP:${stamp}`, `SUMMARY:${testo(e.titolo)}`);
    if (e.ora) {
      const [h, mi] = e.ora.split(':');
      const fineH = String(Math.min(23, +h + 1)).padStart(2, '0');
      righe.push(`DTSTART:${giorno(e.data)}T${h}${mi}00`, `DTEND:${giorno(e.data)}T${fineH}${mi}00`);
    } else {
      righe.push(`DTSTART;VALUE=DATE:${giorno(e.data)}`, `DTEND;VALUE=DATE:${giorno(piuGiorni(e.fine && e.fine > e.data ? e.fine : e.data, 1))}`);
    }
    if (e.note) righe.push(`DESCRIPTION:${testo(e.note)}`);
    righe.push('END:VEVENT');
  });
  righe.push('END:VCALENDAR');
  return righe.join('\r\n');
}

/* ---------- calcoli ---------- */
const pagatiDi = r => S.bambini.filter(b => r.pagati[b.id]);
const mancantiRaccolta = r => S.bambini.filter(b => !r.pagati[b.id]);
const speseTot = r => r.spese.reduce((t, s) => t + s.importo, 0);
/* Un pagamento è la data (quota uguale per tutti) oppure { data, importo } (cifra libera). */
const dataPagamento = v => v && typeof v === 'object' ? v.data : v;
const quotaPagata = (r, bid) => { const v = r.pagati[bid]; return v && typeof v === 'object' ? v.importo : r.quota; };
const incassato = r => pagatiDi(r).reduce((t, b) => t + quotaPagata(r, b.id), 0);
const descrizioneQuota = r => r.libera ? (r.quota ? `cifra libera, circa ${euro(r.quota)}` : 'cifra libera') : `${euro(r.quota)} a bambino`;
const codaScadenza = r => r.scadenza ? `entro ${dataIt(r.scadenza)}` : '';
const mancantiAdesione = a => S.bambini.filter(b => !a.risposte[b.id]);
const COLORI_OPZIONI = ['var(--aqua)', 'var(--coral)', 'var(--sun)', 'var(--violet)', 'var(--sky)'];

/* ---------- testi dei messaggi ---------- */
const TESTI = {
  lancioRaccolta: r => `💶 ${r.titolo}\n\n` +
    (r.libera ? `Ognuno sceglie, quindi la cifra cambia da bambino a bambino${r.quota ? ` (più o meno ${euro(r.quota)})` : ''}.`
      : `Quota: ${euro(r.quota)} a bambino`) +
    (r.scadenza ? `\nEntro: ${dataIt(r.scadenza)}` : '') +
    `\n\nMan mano segno io chi ha pagato, non serve scriverlo nel gruppo. Grazie! 🙏`,
  sollecito: r => {
    const m = mancantiRaccolta(r).map(b => b.nome);
    const coda = r.libera ? (r.scadenza ? `La scadenza è ${dataIt(r.scadenza)}. ` : '') : `Quota: ${euro(r.quota)}${r.scadenza ? ', ' + codaScadenza(r) : ''}. `;
    return `Ciao a tutti! Per "${r.titolo}" mi mancano ancora ${m.length === 1 ? 'la quota' : 'le quote'} di:\n${elenco(m)}\n\n${coda}Grazie! 🙏`;
  },
  resoconto: r => {
    const p = pagatiDi(r).length, inc = incassato(r), sp = speseTot(r);
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
  risposta: x => x.risposta,
  sollecitoPrivato: (r, b, g) => `Ciao${g.nome ? ' ' + g.nome : ''}! Per "${r.titolo}" mi manca ancora la quota di ${b.nome}` +
    ([r.libera ? '' : euro(r.quota), codaScadenza(r)].filter(Boolean).map((t, i, a) => (i ? ', ' : ' (') + t + (i === a.length - 1 ? ')' : '')).join('')) +
    `. Quando riesci, grazie! 🙏`,
  adesionePrivata: (a, b, g) => `Ciao${g.nome ? ' ' + g.nome : ''}! Per "${a.domanda}" mi manca la risposta per ${b.nome}: ${a.opzioni.join(' / ')}? Grazie! 🙏`,
  auguri: b => {
    const p = prossimoCompleanno(b.compleanno);
    const quando = p.giorni === 0 ? 'Oggi' : p.giorni === 1 ? 'Domani' : giornoSettimana(p.data).replace(/^./, c => c.toUpperCase());
    return `🎂 ${quando} ${p.anni ? `${b.nome} compie ${p.anni} anni` : `è il compleanno di ${b.nome}`}!\n\nTanti auguri da tutta la classe${S.classe ? ' ' + S.classe : ''} 🎉🎈`;
  },
  evento: e => `📅 ${e.titolo}\n\n${dataIt(e.data)}` + (e.fine && e.fine > e.data ? ` – ${dataIt(e.fine)}` : '') +
    (e.ora ? `, ore ${e.ora}` : '') + (e.note ? `\n\n${e.note}` : ''),
  mese: ({ etichetta, voci }) => `📅 ${etichetta}${S.classe ? ' · classe ' + S.classe : ''}\n\n` +
    (voci.length ? voci.map(v => `• ${new Date(v.data + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}: ${v.titolo}${v.ora ? ' (ore ' + v.ora + ')' : ''}`).join('\n') : 'Nessun impegno segnato.') +
    `\n\nSalvatevi le date! 😉`
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
  consiglio: ['consigli', 'Riassunto riunione', 'c-violet'],
  evento: ['eventi', 'Evento', 'c-sky'],
  mese: ['eventi', 'Calendario del mese', 'c-sky'],
  auguri: ['bambini', 'Auguri', 'c-coral']
};
