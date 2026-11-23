'use strict';
/* Viste e azioni. Dipende da dati.js. */

const TABS = ['oggi', 'cassa', 'avvisi', 'adesioni', 'riunioni', 'classe'];
let vista = { tab: 'oggi', id: null };
let filtroPag = 'tutti';
let ultimoPop = null;

const $ = sel => document.querySelector(sel);
const ic = (nome, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${nome}"/></svg>`;
const vibra = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* non supportato */ } };

/* ---------- componenti ---------- */
function anello(fatto, tot, colore, grande = false) {
  const r = grande ? 54 : 22, c = +(2 * Math.PI * r).toFixed(1);
  const off = tot ? c * (1 - fatto / tot) : c;
  const etichetta = grande ? `${fatto}<small>su ${tot}</small>` : `${fatto}`;
  const box = grande ? 128 : 54;
  return `<div class="anello${grande ? ' grande' : ''}" style="--c:${colore}" role="img" aria-label="${fatto} su ${tot}">
    <svg viewBox="0 0 ${box} ${box}"><circle class="fondo" cx="${box / 2}" cy="${box / 2}" r="${r}"/>
    <circle class="pieno" cx="${box / 2}" cy="${box / 2}" r="${r}" style="stroke-dasharray:${c};stroke-dashoffset:${off};--tot:${c}"/></svg>
    <span>${etichetta}</span></div>`;
}
const avatar = nome => `<span class="avatar" style="--h:${tinta(nome)}" aria-hidden="true">${esc(iniziali(nome))}</span>`;
const tile = (icona, colore) => `<span class="tile ${colore}">${ic(icona)}</span>`;
const pillData = d => { const q = quandoEtichetta(d); return q ? `<span class="pill${q.startsWith('scad') || q === 'oggi' ? ' urg' : ''}">${ic('calendario', 'sm')}${q}</span>` : ''; };
const indietro = tab => `<button class="indietro" onclick="A.vai('${tab}')">${ic('sx', 'sm')}Indietro</button>`;
const titoloSez = (t, extra = '') => `<div class="sez-t"><h2>${t}</h2>${extra}</div>`;
const vuoto = (icona, colore, titolo, testo, cta, azione) => `<div class="glass card vuoto">${tile(icona, colore)}<h3>${titolo}</h3><p>${testo}</p>
  ${cta ? `<button class="btn ${colore}" onclick="${azione}">${ic('piu', 'sm')}${cta}</button>` : ''}</div>`;

/* ---------- OGGI ---------- */
function vOggi() {
  if (!S.bambini.length) {
    return vuoto('scintilla', 'c-violet', 'Partiamo da qui', "Serve solo l'elenco dei bambini della classe. Bastano i nomi, ci vuole un minuto.", "Inserisci l'elenco", "A.vai('classe')");
  }
  const cose = [];
  S.raccolte.filter(r => !r.chiusa).forEach(r => {
    const m = mancantiRaccolta(r).length;
    if (m) cose.push({ q: r.scadenza, apri: `A.vai('cassa','${r.id}')`, tile: tile('cassa', 'c-sun'), tit: r.titolo, sub: `mancano ${m} quote`, az: `A.msg('sollecito','${r.id}')`, azT: 'Sollecita' });
  });
  S.adesioni.filter(a => !a.chiusa).forEach(a => {
    const m = mancantiAdesione(a).length;
    if (m) cose.push({ q: a.scadenza, apri: `A.vai('adesioni','${a.id}')`, tile: tile('adesioni', 'c-aqua'), tit: a.domanda, sub: `${m} senza risposta`, az: `A.msg('sollecitoAdesione','${a.id}')`, azT: 'Sollecita' });
  });
  const oggi = oggiISO();
  S.avvisi.filter(v => v.scadenza && v.scadenza >= oggi).forEach(v => {
    cose.push({ q: v.scadenza, apri: `A.msg('avviso','${v.id}')`, tile: tile('campana', 'c-coral'), tit: v.titolo, sub: 'da ricordare', az: `A.msg('promemoria','${v.id}')`, azT: 'Ricorda' });
  });
  cose.sort((a, b) => (a.q || '9999').localeCompare(b.q || '9999'));
  const n = cose.length;
  const eroe = `<div class="glass eroe"><div class="num${n ? '' : ' zero'}">${n}</div>
    <div><strong>${n === 0 ? 'Niente da inseguire' : n === 1 ? 'cosa da fare' : 'cose da fare'}</strong>
    <span class="muted">${n === 0 ? 'Goditi il caffè. ☕' : "Le più urgenti sono in cima. Un tocco e il messaggio è pronto."}</span></div></div>`;
  const lista = n ? `${titoloSez('Da fare')}<div class="glass lista">${cose.map(c => `
      <div class="voce" onclick="${c.apri}">${c.tile}<span class="corpo"><span class="tit">${esc(c.tit)}</span>
      <span class="sub">${c.sub}</span> ${pillData(c.q)}</span>
      <button class="btn mini vetro" onclick="event.stopPropagation();${c.az}">${c.azT}</button></div>`).join('')}</div>` : '';
  const bento = `${titoloSez('Cosa devo fare?')}<div class="bento">
    <button class="glass" onclick="A.nuovo('cassa')">${tile('cassa', 'c-sun')}<b>Raccogliere<br>dei soldi</b></button>
    <button class="glass" onclick="A.nuovo('avvisi')">${tile('avviso', 'c-coral')}<b>Mandare un avviso</b></button>
    <button class="glass" onclick="A.nuovo('adesioni')">${tile('adesioni', 'c-aqua')}<b>Chiedere chi c'è</b></button>
    <button class="glass" style="grid-column:span 2;min-height:0;flex-direction:row;align-items:center;gap:14px" onclick="A.nuovo('riunioni')">${tile('riunione', 'c-violet')}<b>Riassumere una riunione</b></button>
  </div>`;
  return [eroe, lista, bento].join('');
}

/* ---------- CASSA ---------- */
function vCassa() {
  if (vista.id) { const r = trova('raccolte', vista.id); if (r) return vRaccolta(r); }
  if (!S.raccolte.length) return vuoto('cassa', 'c-sun', 'Nessuna raccolta', 'Regalo alle maestre, gita, fondo cassa: crei la raccolta e il messaggio per il gruppo è già scritto.', 'Nuova raccolta', "A.nuovo('cassa')");
  const tot = S.bambini.length;
  return titoloSez('Raccolte') + `<div class="lista">${[...S.raccolte].reverse().map(r => {
    const p = pagatiDi(r).length;
    return `<button class="glass voce" onclick="A.vai('cassa','${r.id}')">${anello(p, tot, 'var(--sun)')}
      <span class="corpo"><span class="tit">${esc(r.titolo)}</span><span class="sub">${euro(r.quota)} a testa · ${euro(p * r.quota)} raccolti</span>
      ${r.chiusa ? '<span class="pill ok">chiusa</span>' : pillData(r.scadenza)}</span>${ic('dx')}</button>`;
  }).join('')}</div>`;
}

function vRaccolta(r) {
  const tot = S.bambini.length, p = pagatiDi(r).length, inc = p * r.quota, sp = speseTot(r);
  const visibili = S.bambini.filter(b => filtroPag === 'tutti' || (filtroPag === 'pagati') === !!r.pagati[b.id]);
  const filtro = (k, t) => `<button aria-pressed="${filtroPag === k}" onclick="A.filtro('${k}')">${t}</button>`;
  const righe = visibili.map(b => `<button class="voce ${r.pagati[b.id] ? 'si' : ''} ${ultimoPop === b.id ? 'pop' : ''}" onclick="A.paga('${r.id}','${b.id}')" aria-pressed="${!!r.pagati[b.id]}">
      ${avatar(b.nome)}<span class="corpo"><span class="tit">${esc(b.nome)}</span><span class="sub">${r.pagati[b.id] ? 'pagato il ' + dataBreve(r.pagati[b.id]) : 'da pagare'}</span></span>
      <span class="spunta">${ic('ok', 'sm')}</span></button>`).join('') || `<p class="muted" style="padding:14px">Nessuno in questa lista.</p>`;
  const spese = r.spese.map(s => `<tr><td>${esc(s.desc)}</td><td>${euro(s.importo)}<button class="x" aria-label="Togli ${esc(s.desc)}" onclick="A.togliSpesa('${r.id}','${s.id}')">${ic('x', 'sm')}</button></td></tr>`).join('');
  return `${indietro('cassa')}
    <div class="glass card"><div class="dettaglio-eroe">${anello(p, tot, 'var(--sun)', true)}
      <div><h3>${esc(r.titolo)}</h3><p class="muted">${euro(r.quota)} a bambino</p>${pillData(r.scadenza)}</div></div>
      <div class="stat-grid"><div class="stat"><b>${euro(inc)}</b><span>raccolti</span></div><div class="stat"><b>${euro(sp)}</b><span>spesi</span></div><div class="stat"><b>${euro(inc - sp)}</b><span>in cassa</span></div></div>
      <div class="fila"><button class="btn c-sun" onclick="A.msg('sollecito','${r.id}')" ${p === tot ? 'disabled' : ''}>${ic('campana', 'sm')}Sollecita</button>
      <button class="btn vetro" onclick="A.msg('lancioRaccolta','${r.id}')">${ic('manda', 'sm')}Annuncio</button></div></div>
    ${titoloSez('Chi ha pagato', `<span class="tenue">tocca per segnare</span>`)}
    <div class="filtri" role="group" aria-label="Filtra">${filtro('tutti', `Tutti ${tot}`)}${filtro('mancano', `Da pagare ${tot - p}`)}${filtro('pagati', `Pagati ${p}`)}</div>
    <div class="glass lista">${righe}</div>
    ${titoloSez('Spese')}
    <div class="glass card">${r.spese.length ? `<table class="tabella"><tbody>${spese}<tr class="tot"><td>Totale</td><td>${euro(sp)}</td></tr></tbody></table>` : '<p class="muted">Ancora nessuna spesa. Quando compri qualcosa, segnala qui: il resoconto si fa da solo.</p>'}
      <div class="fila"><button class="btn vetro" onclick="A.formSpesa('${r.id}')">${ic('scontrino', 'sm')}Aggiungi spesa</button>
      <button class="btn c-sun" onclick="A.msg('resoconto','${r.id}')">${ic('manda', 'sm')}Resoconto</button></div></div>
    <div class="fila"><button class="btn vetro" onclick="A.chiudi('raccolte','${r.id}')">${ic(r.chiusa ? 'su' : 'lucchetto', 'sm')}${r.chiusa ? 'Riapri' : 'Chiudi'} raccolta</button>
      <button class="btn rosso" onclick="A.elimina('raccolte','${r.id}','cassa')">${ic('cestino', 'sm')}Elimina</button></div>`;
}

/* ---------- AVVISI ---------- */
function vAvvisi() {
  const avvisi = [...S.avvisi].reverse().slice(0, 30);
  const lista = avvisi.length ? titoloSez('Avvisi') + `<div class="glass lista">${avvisi.map(v => `
      <div class="voce" onclick="A.msg('avviso','${v.id}')">${tile('avviso', 'c-coral')}<span class="corpo"><span class="tit">${esc(v.titolo)}</span>
      <span class="sub">${esc(v.testo.slice(0, 60))}${v.testo.length > 60 ? '…' : ''}</span> ${pillData(v.scadenza)}</span>
      <button class="icona-btn" aria-label="Elimina avviso" onclick="event.stopPropagation();A.elimina('avvisi','${v.id}','avvisi')">${ic('cestino', 'sm')}</button></div>`).join('')}</div>`
    : vuoto('avviso', 'c-coral', 'Nessun avviso', 'Scrivi titolo e testo, metti la data se c\'è: il giorno prima te lo ricordo io in "Oggi".', 'Nuovo avviso', "A.nuovo('avvisi')");
  const risposte = S.risposte.map(x => `<div class="voce" onclick="A.msg('risposta','${x.id}')">${tile('fumetto', 'c-sky')}
      <span class="corpo"><span class="tit">${esc(x.domanda)}</span><span class="sub">${esc(x.risposta.slice(0, 60))}${x.risposta.length > 60 ? '…' : ''}</span></span>
      <button class="icona-btn" aria-label="Elimina risposta" onclick="event.stopPropagation();A.elimina('risposte','${x.id}','avvisi')">${ic('cestino', 'sm')}</button></div>`).join('');
  return lista + titoloSez('Risposte pronte', `<button class="btn mini vetro" onclick="A.formRisposta()">${ic('piu', 'sm')}Nuova</button>`) +
    (risposte ? `<div class="glass lista">${risposte}</div>` : `<div class="glass card"><p class="muted" style="margin:0">Le domande che ti fanno sempre ("a che ora esce?", "cosa serve per la gita?"). Le scrivi una volta, poi le mandi con un tocco.</p></div>`);
}

/* ---------- ADESIONI ---------- */
function vAdesioni() {
  if (vista.id) { const a = trova('adesioni', vista.id); if (a) return vAdesione(a); }
  if (!S.adesioni.length) return vuoto('adesioni', 'c-aqua', 'Nessuna richiesta', 'Festa, gita, regalo: chiedi chi partecipa, tu tocchi le risposte e io conto e preparo il riepilogo.', 'Nuova richiesta', "A.nuovo('adesioni')");
  const tot = S.bambini.length;
  return titoloSez('Richieste') + `<div class="lista">${[...S.adesioni].reverse().map(a => `
    <button class="glass voce" onclick="A.vai('adesioni','${a.id}')">${anello(tot - mancantiAdesione(a).length, tot, 'var(--aqua)')}
      <span class="corpo"><span class="tit">${esc(a.domanda)}</span><span class="sub">${a.opzioni.map(esc).join(' · ')}</span>
      ${a.chiusa ? '<span class="pill ok">chiusa</span>' : pillData(a.scadenza)}</span>${ic('dx')}</button>`).join('')}</div>`;
}

function vAdesione(a) {
  const tot = S.bambini.length, m = mancantiAdesione(a).length;
  const conti = a.opzioni.map((o, i) => ({ o, n: S.bambini.filter(b => a.risposte[b.id] === o).length, col: COLORI_OPZIONI[i % COLORI_OPZIONI.length] }));
  const barra = conti.filter(c => c.n).map(c => `<i style="flex:${c.n};background:${c.col}"></i>`).join('') + (m ? `<i style="flex:${m};background:transparent"></i>` : '');
  const legenda = conti.map(c => `<span><i style="background:${c.col}"></i>${esc(c.o)} ${c.n}</span>`).join('') + `<span><i style="background:var(--glass-2)"></i>mancano ${m}</span>`;
  const righe = S.bambini.map(b => `<div class="voce" style="cursor:default">${avatar(b.nome)}<span class="corpo"><span class="tit">${esc(b.nome)}</span></span>
      <span class="seg">${a.opzioni.map((o, i) => `<button class="${a.risposte[b.id] === o ? 'on' : ''}" style="--opt:${COLORI_OPZIONI[i % COLORI_OPZIONI.length]}" aria-pressed="${a.risposte[b.id] === o}" onclick="A.rispondi('${a.id}','${b.id}',${i})">${esc(o)}</button>`).join('')}</span></div>`).join('');
  return `${indietro('adesioni')}
    <div class="glass card"><h3>${esc(a.domanda)}</h3>${pillData(a.scadenza)}
      <div class="barra">${barra}</div><div class="legenda">${legenda}</div>
      <div class="fila"><button class="btn c-aqua" onclick="A.msg('riepilogoAdesione','${a.id}')">${ic('manda', 'sm')}Riepilogo</button>
      <button class="btn vetro" onclick="A.msg('sollecitoAdesione','${a.id}')" ${m ? '' : 'disabled'}>${ic('campana', 'sm')}Sollecita</button></div></div>
    ${titoloSez('Risposte', `<span class="tenue">${tot - m} su ${tot}</span>`)}
    <div class="glass lista">${righe}</div>
    <div class="fila"><button class="btn vetro" onclick="A.chiudi('adesioni','${a.id}')">${ic(a.chiusa ? 'su' : 'lucchetto', 'sm')}${a.chiusa ? 'Riapri' : 'Chiudi'}</button>
      <button class="btn rosso" onclick="A.elimina('adesioni','${a.id}','adesioni')">${ic('cestino', 'sm')}Elimina</button></div>`;
}

/* ---------- RIUNIONI ---------- */
function vRiunioni() {
  if (!S.consigli.length) return vuoto('riunione', 'c-violet', 'Nessuna riunione', 'Dopo il consiglio scrivi gli appunti come ti vengono, anche abbreviati: il messaggio ordinato per i genitori lo preparo io.', 'Nuovo riassunto', "A.nuovo('riunioni')");
  return titoloSez('Riunioni') + `<div class="glass lista">${[...S.consigli].reverse().map(c => `
    <div class="voce" onclick="A.msg('consiglio','${c.id}')">${tile('riunione', 'c-violet')}<span class="corpo"><span class="tit">${esc(c.tipo)}</span><span class="sub">${dataIt(c.data)}</span></span>
    <button class="icona-btn" aria-label="Elimina riunione" onclick="event.stopPropagation();A.elimina('consigli','${c.id}','riunioni')">${ic('cestino', 'sm')}</button></div>`).join('')}</div>`;
}

/* ---------- CLASSE ---------- */
function vClasse() {
  return `<div class="glass card"><h3>La classe</h3>
    <form onsubmit="return A.salvaClasse(this)">
      <div class="due"><div><label for="kc">Classe</label><input id="kc" name="classe" value="${esc(S.classe)}" placeholder="3ª B"></div>
      <div><label for="ks">Scuola</label><input id="ks" name="scuola" value="${esc(S.scuola)}" placeholder="Primaria Rodari"></div></div>
      <label for="ke">Bambini, uno per riga</label>
      <textarea id="ke" name="elenco" rows="9" placeholder="Anna&#10;Luca&#10;Marco R.">${esc(S.bambini.map(b => b.nome).join('\n'))}</textarea>
      <p class="aiuto">Basta il nome. Se due si chiamano uguale, aggiungi l'iniziale del cognome.</p>
      <div class="fila"><button class="btn">${ic('ok', 'sm')}Salva</button></div>
    </form></div>
    <div class="glass card privacy">${tile('scudo', 'c-aqua')}<div><h3>Resta tutto qui</h3>
      <p class="muted" style="margin:0">Nomi e pagamenti stanno solo su questo telefono, non vanno su internet. Ogni tanto salva una copia (mandatela su WhatsApp o in mail): se cambi telefono, la ricarichi da qui.</p></div></div>
    <div class="fila"><button class="btn vetro" onclick="A.esporta()">${ic('giu', 'sm')}Salva una copia</button>
      <label class="btn vetro" style="margin:0">${ic('su', 'sm')}Carica una copia<input class="nascosto" type="file" accept=".json,application/json" onchange="A.importa(this)"></label></div>
    <div class="fila"><button class="btn rosso" onclick="A.azzera()">${ic('cestino', 'sm')}Cancella tutto</button></div>`;
}

const VISTE = { oggi: vOggi, cassa: vCassa, avvisi: vAvvisi, adesioni: vAdesioni, riunioni: vRiunioni, classe: vClasse };
const FAB = { cassa: 'c-sun', avvisi: 'c-coral', adesioni: 'c-aqua', riunioni: 'c-violet' };

function saluto() {
  const h = new Date().getHours();
  return h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
}

function render(anima = false) {
  const idx = TABS.indexOf(vista.tab);
  document.querySelector('nav').style.setProperty('--idx', idx);
  document.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === vista.tab ? 'page' : 'false'));
  $('#saluto').textContent = saluto();
  $('#titolo').textContent = S.classe ? 'Classe ' + S.classe : 'La mia classe';
  $('#chip').innerHTML = `${ic('classe', 'sm')}${S.bambini.length || '–'}`;
  $('#chip').setAttribute('aria-label', `${S.bambini.length} bambini, apri la classe`);
  const main = $('#main');
  main.classList.remove('entra');
  main.innerHTML = VISTE[vista.tab]();
  if (anima) {
    [...main.children].forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8)));
    void main.offsetWidth;
    main.classList.add('entra');
  }
  const fab = FAB[vista.tab] && !vista.id;
  $('#fab-posto').innerHTML = fab ? `<button class="fab ${FAB[vista.tab]}" aria-label="Nuovo" onclick="A.nuovo('${vista.tab}')">${ic('piu')}</button>` : '';
  ultimoPop = null;
}

/* ---------- foglio dal basso ---------- */
function apriFoglio(html) {
  const f = $('#foglio');
  if (f.open) f.close();
  f.innerHTML = `<div class="maniglia" aria-hidden="true"></div>${html}`;
  f.showModal();
  const primo = f.querySelector('input:not([type=file]),textarea');
  if (primo && !primo.classList.contains('messaggio')) setTimeout(() => primo.focus(), 350);
  else { f.setAttribute('tabindex', '-1'); f.focus(); }
}
const chiudiFoglio = () => $('#foglio').close();
const testaFoglio = (icona, colore, titolo) => `<div class="foglio-t">${tile(icona, colore)}<h3 id="foglio-titolo">${titolo}</h3>
  <button class="icona-btn" aria-label="Chiudi" onclick="chiudiFoglio()">${ic('x', 'sm')}</button></div>`;

function toast(msg, annulla = false) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${annulla ? '<button onclick="A.annulla()">Annulla</button>' : ''}`;
  t.classList.add('on');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('on'), annulla ? 5000 : 2600);
}

function salva(nuovo, anima = false) {
  if (!scrivi(nuovo)) toast('Attenzione: non riesco a salvare sul telefono');
  render(anima);
}
const aggiorna = (coll, id, fn) => salva({ ...S, [coll]: S[coll].map(x => x.id === id ? fn(x) : x) });

async function copia(testo) {
  try { await navigator.clipboard.writeText(testo); toast('Copiato: incollalo su WhatsApp'); }
  catch (e) { const ta = $('#foglio textarea'); if (ta) ta.select(); toast('Tieni premuto sul testo e copia'); }
}
async function manda(testo) {
  if (navigator.share) {
    try { await navigator.share({ text: testo }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  await copia(testo);
}

/* ---------- moduli ---------- */
const MODULI = {
  cassa: () => testaFoglio('cassa', 'c-sun', 'Nuova raccolta') + `<form onsubmit="return A.creaRaccolta(this)">
    <label for="rt">Per cosa?</label><input id="rt" name="titolo" required placeholder="Regalo di Natale maestre">
    <div class="due"><div><label for="rq">Quota a bambino</label><input id="rq" name="quota" inputmode="decimal" required placeholder="5 €"></div>
    <div><label for="rs">Entro il</label><input id="rs" name="scadenza" type="date"></div></div>
    <div class="fila"><button class="btn c-sun pieno">${ic('scintilla', 'sm')}Crea e prepara il messaggio</button></div></form>`,
  avvisi: () => testaFoglio('avviso', 'c-coral', 'Nuovo avviso') + `<form onsubmit="return A.creaAvviso(this)">
    <label for="at">Titolo</label><input id="at" name="titolo" required placeholder="Uscita al museo">
    <label for="ax">Cosa devono sapere</label><textarea id="ax" name="testo" rows="4" required placeholder="Partenza 8:30 da scuola, pranzo al sacco…"></textarea>
    <label for="as">Data, se c'è</label><input id="as" name="scadenza" type="date">
    <p class="aiuto">Con la data, il giorno prima te lo ritrovi in "Oggi" pronto da ricordare.</p>
    <div class="fila"><button class="btn c-coral pieno">${ic('scintilla', 'sm')}Prepara il messaggio</button></div></form>`,
  adesioni: () => testaFoglio('adesioni', 'c-aqua', 'Nuova richiesta') + `<form onsubmit="return A.creaAdesione(this)">
    <label for="dq">Cosa chiedi?</label><input id="dq" name="domanda" required placeholder="Chi viene alla festa di fine anno?">
    <label for="do">Risposte possibili, separate da virgola</label><input id="do" name="opzioni" value="Sì, No">
    <label for="ds">Entro il</label><input id="ds" name="scadenza" type="date">
    <div class="fila"><button class="btn c-aqua pieno">${ic('scintilla', 'sm')}Crea e prepara il messaggio</button></div></form>`,
  riunioni: () => testaFoglio('riunione', 'c-violet', 'Riassunto riunione') + `<form onsubmit="return A.creaRiunione(this)">
    <div class="due"><div><label for="ct">Riunione</label><select id="ct" name="tipo"><option>Consiglio di interclasse</option><option>Incontro con le maestre</option><option>Assemblea di classe</option><option>Consiglio di istituto</option></select></div>
    <div><label for="cd">Quando</label><input id="cd" name="data" type="date" value="${oggiISO()}" required></div></div>
    <label for="ca">Appunti, un punto per riga</label><textarea id="ca" name="appunti" rows="7" required placeholder="gita a maggio, meta da decidere&#10;compiti per le vacanze: pochi&#10;serve una mamma per la biblioteca"></textarea>
    <p class="aiuto">Scrivi come ti viene, anche abbreviato.</p>
    <div class="fila"><button class="btn c-violet pieno">${ic('scintilla', 'sm')}Prepara il messaggio</button></div></form>`
};

/* ---------- azioni ---------- */
const A = {
  vai(tab, id = null) {
    if (tab !== vista.tab || id !== vista.id) filtroPag = 'tutti';
    vista = { tab, id }; render(true); window.scrollTo({ top: 0 });
  },
  nuovo(tab) { if (!S.bambini.length) { toast("Prima inserisci l'elenco della classe"); A.vai('classe'); return; } apriFoglio(MODULI[tab]()); },
  msg(tipo, id) {
    const [coll, titolo, colore] = MSG_INFO[tipo];
    const x = trova(coll, id); if (!x) return;
    apriFoglio(testaFoglio('fumetto', colore, titolo) + `<p class="aiuto" style="margin:0 2px 10px">Puoi correggerlo prima di mandarlo.</p>
      <textarea class="messaggio" id="testo-msg" rows="11" aria-label="Testo del messaggio">${esc(TESTI[tipo](x))}</textarea>
      <div class="fila"><button class="btn ${colore}" onclick="manda($('#testo-msg').value)">${ic('manda', 'sm')}Manda</button>
      <button class="btn vetro" onclick="copia($('#testo-msg').value)">${ic('copia', 'sm')}Copia</button></div>`);
  },
  filtro(k) { filtroPag = k; render(); },

  creaRaccolta(f) {
    const quota = numero(f.quota.value);
    if (quota <= 0) { toast('Scrivi una quota valida, es. 5'); return false; }
    const r = { id: uid(), titolo: f.titolo.value.trim(), quota, scadenza: f.scadenza.value, pagati: {}, spese: [], chiusa: false };
    salva({ ...S, raccolte: [...S.raccolte, r] });
    A.vai('cassa', r.id); A.msg('lancioRaccolta', r.id);
    return false;
  },
  paga(rid, bid) {
    vibra(); ultimoPop = bid;
    aggiorna('raccolte', rid, r => {
      const { [bid]: gia, ...altri } = r.pagati;
      return { ...r, pagati: gia ? altri : { ...altri, [bid]: oggiISO() } };
    });
  },
  formSpesa(rid) {
    apriFoglio(testaFoglio('scontrino', 'c-sun', 'Nuova spesa') + `<form onsubmit="return A.creaSpesa(this,'${rid}')">
      <label for="sd">Cosa hai comprato</label><input id="sd" name="desc" required placeholder="Buono libreria">
      <label for="si">Quanto</label><input id="si" name="importo" inputmode="decimal" required placeholder="45 €">
      <div class="fila"><button class="btn c-sun pieno">${ic('ok', 'sm')}Aggiungi</button></div></form>`);
  },
  creaSpesa(f, rid) {
    const importo = numero(f.importo.value);
    if (importo <= 0) { toast('Scrivi un importo valido'); return false; }
    aggiorna('raccolte', rid, r => ({ ...r, spese: [...r.spese, { id: uid(), desc: f.desc.value.trim(), importo }] }));
    chiudiFoglio(); toast('Spesa aggiunta');
    return false;
  },
  togliSpesa(rid, sid) { precedente = S; aggiorna('raccolte', rid, r => ({ ...r, spese: r.spese.filter(s => s.id !== sid) })); toast('Spesa tolta', true); },
  chiudi(coll, id) { aggiorna(coll, id, x => ({ ...x, chiusa: !x.chiusa })); },
  elimina(coll, id, tab) {
    precedente = S;
    scrivi({ ...S, [coll]: S[coll].filter(x => x.id !== id) });
    A.vai(tab); toast('Eliminato', true);
  },
  annulla() { if (precedente) { salva(precedente); precedente = null; $('#toast').classList.remove('on'); } },

  creaAvviso(f) {
    const v = { id: uid(), titolo: f.titolo.value.trim(), testo: f.testo.value.trim(), scadenza: f.scadenza.value };
    salva({ ...S, avvisi: [...S.avvisi, v] });
    A.vai('avvisi'); A.msg('avviso', v.id);
    return false;
  },
  formRisposta() {
    apriFoglio(testaFoglio('fumetto', 'c-sky', 'Risposta pronta') + `<form onsubmit="return A.creaRisposta(this)">
      <label for="rd">La domanda che ti fanno</label><input id="rd" name="domanda" required placeholder="A che ora finisce il tempo pieno?">
      <label for="rr">La tua risposta</label><textarea id="rr" name="risposta" rows="4" required></textarea>
      <div class="fila"><button class="btn pieno">${ic('ok', 'sm')}Salva</button></div></form>`);
  },
  creaRisposta(f) {
    salva({ ...S, risposte: [...S.risposte, { id: uid(), domanda: f.domanda.value.trim(), risposta: f.risposta.value.trim() }] });
    chiudiFoglio(); toast('Risposta salvata');
    return false;
  },

  creaAdesione(f) {
    const opzioni = [...new Set(f.opzioni.value.split(',').map(s => s.trim()).filter(Boolean))];
    if (opzioni.length < 2) { toast('Servono almeno due risposte possibili'); return false; }
    const a = { id: uid(), domanda: f.domanda.value.trim(), opzioni, scadenza: f.scadenza.value, risposte: {}, chiusa: false };
    salva({ ...S, adesioni: [...S.adesioni, a] });
    A.vai('adesioni', a.id); A.msg('lancioAdesione', a.id);
    return false;
  },
  rispondi(aid, bid, i) {
    vibra();
    aggiorna('adesioni', aid, a => {
      const o = a.opzioni[i];
      const { [bid]: prima, ...altri } = a.risposte;
      return { ...a, risposte: prima === o ? altri : { ...altri, [bid]: o } };
    });
  },

  creaRiunione(f) {
    const c = { id: uid(), tipo: f.tipo.value, data: f.data.value, appunti: f.appunti.value };
    salva({ ...S, consigli: [...S.consigli, c] });
    A.vai('riunioni'); A.msg('consiglio', c.id);
    return false;
  },

  salvaClasse(f) {
    const nomi = [...new Set(f.elenco.value.split('\n').map(s => s.trim()).filter(Boolean))];
    const bambini = nomi.map(nome => S.bambini.find(b => b.nome === nome) || { id: uid(), nome })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    salva({ ...S, classe: f.classe.value.trim(), scuola: f.scuola.value.trim(), bambini });
    toast(`Salvato: ${bambini.length} bambini`);
    return false;
  },
  esporta() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `classe-copia-${oggiISO()}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  importa(input) {
    const file = input.files[0]; if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const dati = JSON.parse(fr.result);
        if (!Array.isArray(dati.bambini)) throw new Error('non è una copia di questa app');
        if (confirm('Sostituire i dati attuali con quelli della copia?')) { salva({ ...VUOTO, ...dati }, true); toast('Copia caricata'); }
      } catch (e) { toast('File non valido: ' + e.message); }
    };
    fr.onerror = () => toast('Non riesco a leggere il file');
    fr.readAsText(file);
  },
  azzera() {
    if (confirm('Cancellare TUTTI i dati da questo telefono?') && confirm('Sicura? Senza una copia non si recuperano.')) {
      salva({ ...VUOTO }); A.vai('oggi');
    }
  }
};

$('#foglio').addEventListener('click', e => {
  if (e.target.id !== 'foglio') return;
  const r = e.target.getBoundingClientRect();
  if (e.clientY < r.top) chiudiFoglio(); // tocco sul velo sopra il foglio
});
render(true);
