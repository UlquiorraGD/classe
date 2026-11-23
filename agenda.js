'use strict';
/* Agenda: calendario del mese, eventi, esportazione nel calendario del telefono, riassunti riunioni. */

let meseVisto = oggiISO().slice(0, 7);
let giornoScelto = null;
const GIORNI_SETT = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

function limitiMese(mese) {
  const [y, m] = mese.split('-').map(Number);
  return { y, m, primo: `${mese}-01`, ultimo: isoDi(new Date(y, m, 0, 12)) };
}
const etichettaMese = mese => { const { y, m } = limitiMese(mese); const t = new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1); };

function vAgenda() {
  const { y, m, primo, ultimo } = limitiMese(meseVisto);
  const perGiorno = impegniTra(primo, ultimo).reduce((acc, v) => ({ ...acc, [v.data]: [...(acc[v.data] || []), v] }), {});
  const vuote = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunedì = 0
  const oggi = oggiISO();
  const celle = Array.from({ length: +ultimo.slice(8) }, (_, i) => {
    const d = `${meseVisto}-${String(i + 1).padStart(2, '0')}`;
    const v = perGiorno[d] || [];
    const cls = ['giorno', d === oggi && 'oggi', d === giornoScelto && 'scelto', v.some(x => x.vacanza) && 'vacanza', d < oggi && 'passato'].filter(Boolean).join(' ');
    return `<button class="${cls}" onclick="A.giorno('${d}')" aria-label="${dataIt(d)}${v.length ? ', ' + v.length + ' impegni' : ''}" aria-pressed="${d === giornoScelto}">
      <b>${i + 1}</b><span class="punti">${v.slice(0, 3).map(x => `<i style="background:${x.colore}"></i>`).join('')}</span></button>`;
  });
  const griglia = `<div class="cal-griglia">${GIORNI_SETT.map(g => `<span class="cal-sett">${g}</span>`).join('')}${'<span></span>'.repeat(vuote)}${celle.join('')}</div>`;
  const voci = giornoScelto ? (perGiorno[giornoScelto] || []) : impegniTra(oggi, piuGiorni(oggi, 30));
  const titoloLista = giornoScelto ? dataIt(giornoScelto).replace(/^./, c => c.toUpperCase()) : 'Prossimi 30 giorni';
  const lista = voci.length ? `<div class="glass lista">${voci.map(v => `<div class="voce" onclick="${v.apri}">
      <span class="tile" style="--c:${v.colore}">${ic(v.icona)}</span><span class="corpo"><span class="tit">${esc(v.titolo)}</span>
      <span class="sub">${esc(v.sub)}</span> ${giornoScelto ? '' : pillData(v.data)}</span>${ic('dx')}</div>`).join('')}</div>`
    : `<div class="glass card"><p class="muted" style="margin:0">${giornoScelto ? 'Niente in questo giorno.' : 'Niente nei prossimi 30 giorni.'}
      <button class="link" onclick="A.nuovo('evento','${giornoScelto || oggi}')">Aggiungi un evento</button></p></div>`;
  return `<div class="glass card">
      <div class="cal-testa"><button class="icona-btn" aria-label="Mese prima" onclick="A.mese(-1)">${ic('sx', 'sm')}</button>
      <h3>${etichettaMese(meseVisto)}</h3><button class="icona-btn" aria-label="Mese dopo" onclick="A.mese(1)">${ic('dx', 'sm')}</button></div>
      ${griglia}
      <div class="fila impilata"><button class="btn c-sky" onclick="A.mandaMese()">${ic('manda', 'sm')}Manda il mese ai genitori</button>
      <button class="btn vetro" onclick="A.icsTutto()">${ic('calendario', 'sm')}Aggiungi al mio calendario</button></div></div>
    ${titoloSez(titoloLista, giornoScelto ? `<button class="link" onclick="A.giorno(null)">Tutti</button>` : '')}
    ${lista}
    ${vRiunioni()}`;
}

function moduloEvento(data) {
  return testaFoglio('calendario', 'c-sky', 'Nuovo evento') + `<form onsubmit="return A.creaEvento(this)">
    <label for="et">Cosa</label><input id="et" name="titolo" required placeholder="Colloqui con le maestre">
    <div class="due"><div><label for="ey">Tipo</label><select id="ey" name="tipo">${Object.entries(TIPI_EVENTO).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
    <div><label for="eo">Ora (se c'è)</label><input id="eo" name="ora" type="time"></div></div>
    <div class="due"><div><label for="ed">Il giorno</label><input id="ed" name="data" type="date" required value="${esc(data || oggiISO())}"></div>
    <div><label for="ef">Fino al (se dura)</label><input id="ef" name="fine" type="date"></div></div>
    <label for="en">Note</label><textarea id="en" name="note" rows="3" placeholder="Portare il diario, entrata dal cancello laterale…"></textarea>
    <div class="fila"><button class="btn c-sky pieno">${ic('ok', 'sm')}Salva</button></div></form>`;
}

MODULI.evento = data => moduloEvento(data);
MODULI.agenda = () => testaFoglio('scintilla', 'c-sky', 'Cosa vuoi aggiungere?') + `<div class="lista" style="margin-top:14px">
    <button class="voce" onclick="apriFoglio(moduloEvento(giornoScelto))">${tile('calendario', 'c-sky')}<span class="corpo"><span class="tit">Un evento in calendario</span><span class="sub">colloqui, vacanze, gite, feste</span></span>${ic('dx')}</button>
    <button class="voce" onclick="apriFoglio(MODULI.riunioni())">${tile('riunione', 'c-violet')}<span class="corpo"><span class="tit">Il riassunto di una riunione</span><span class="sub">da mandare ai genitori</span></span>${ic('dx')}</button></div>`;

const condividiIcs = (testo, nome) => condividiFile(testo, nome, 'text/calendar', 'File scaricato: aprilo per aggiungere al calendario');

Object.assign(A, {
  mese(delta) {
    const { y, m } = limitiMese(meseVisto);
    meseVisto = isoDi(new Date(y, m - 1 + delta, 1, 12)).slice(0, 7);
    giornoScelto = null; render();
  },
  giorno(d) { giornoScelto = d === giornoScelto ? null : d; render(); },
  creaEvento(f) {
    const e = { id: uid(), titolo: f.titolo.value.trim(), tipo: f.tipo.value, data: f.data.value, fine: f.fine.value > f.data.value ? f.fine.value : '', ora: f.ora.value, note: f.note.value.trim() };
    salva({ ...S, eventi: [...(S.eventi || []), e] });
    meseVisto = e.data.slice(0, 7); giornoScelto = e.data;
    chiudiFoglio(); A.vai('agenda'); toast('Evento salvato');
    return false;
  },
  evento(id) {
    const e = trova('eventi', id); if (!e) return;
    const [tipo, col] = TIPI_EVENTO[e.tipo] || TIPI_EVENTO.altro;
    apriFoglio(`<div class="foglio-t"><span class="tile" style="--c:${col}">${ic('calendario')}</span><h3 id="foglio-titolo">${esc(e.titolo)}</h3>
        <button class="icona-btn" aria-label="Chiudi" onclick="chiudiFoglio()">${ic('x', 'sm')}</button></div>
      <p class="muted" style="margin-top:12px">${tipo} · ${dataIt(e.data)}${e.fine ? ' – ' + dataIt(e.fine) : ''}${e.ora ? ', ore ' + e.ora : ''}</p>
      ${e.note ? `<p>${esc(e.note)}</p>` : ''}
      <div class="fila"><button class="btn c-sky" onclick="A.msg('evento','${e.id}')">${ic('manda', 'sm')}Manda ai genitori</button>
      <button class="btn vetro" onclick="A.icsEvento('${e.id}')">${ic('calendario', 'sm')}Nel mio calendario</button></div>
      <div class="fila"><button class="btn vetro" onclick="A.esportaVoce('eventi','${e.id}')">${ic('giu', 'sm')}Esporta</button>
      <button class="btn rosso" onclick="chiudiFoglio();A.elimina('eventi','${e.id}','agenda')">${ic('cestino', 'sm')}Elimina</button></div>`);
  },
  icsEvento(id) { const e = trova('eventi', id); if (e) condividiIcs(creaIcs([e]), 'evento-classe.ics'); },
  icsTutto() {
    const oggi = oggiISO();
    const eventi = (S.eventi || []).filter(e => (e.fine || e.data) >= oggi);
    const avvisi = S.avvisi.filter(v => v.scadenza && v.scadenza >= oggi).map(v => ({ id: v.id, titolo: v.titolo, data: v.scadenza, note: v.testo }));
    const tutti = [...eventi, ...avvisi];
    if (!tutti.length) { toast('Non ci sono eventi futuri da aggiungere'); return; }
    condividiIcs(creaIcs(tutti), 'calendario-classe.ics');
  },
  mandaMese() {
    const { primo, ultimo } = limitiMese(meseVisto);
    const visti = new Set();
    const voci = impegniTra(primo, ultimo)
      .filter(v => v.tipo !== 'compleanno')
      .filter(v => !visti.has(v.apri) && visti.add(v.apri))
      .map(v => {
        const e = v.tipo === 'evento' ? S.eventi.find(x => v.apri.includes(x.id)) : null;
        return e && e.fine ? { ...v, titolo: `${v.titolo} (fino a ${dataBreve(e.fine)})` } : v;
      });
    A.msg('mese', null, TESTI.mese({ etichetta: etichettaMese(meseVisto), voci }));
  }
});
