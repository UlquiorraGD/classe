'use strict';
/* Classe: schede dei bambini, numeri dei genitori, compleanni, messaggi in privato. Dipende da dati.js e app.js. */

function sottotitoloBambino(b) {
  const parti = [`N° ${b.numero}`];
  if (b.compleanno) parti.push('🎂 ' + new Date(b.compleanno + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }));
  const n = genitoriDi(b).length;
  if (n) parti.push(n === 1 ? '1 numero' : n + ' numeri');
  return parti.length > 1 ? parti.join(' · ') : parti[0] + ' · tocca per compleanno e numeri';
}

function vClasse() {
  const prossimi = S.bambini.filter(b => b.compleanno)
    .map(b => ({ b, p: prossimoCompleanno(b.compleanno) }))
    .sort((x, y) => x.p.giorni - y.p.giorni).slice(0, 3);
  const bambini = S.bambini.length
    ? `<div class="glass lista">${S.bambini.map(b => `<button class="voce" onclick="A.scheda('${b.id}')">${avatar(b.nome)}
        <span class="corpo"><span class="tit">${esc(b.nome)}</span><span class="sub">${esc(sottotitoloBambino(b))}</span></span>${ic('dx')}</button>`).join('')}</div>`
    : `<div class="glass card"><p class="muted" style="margin:0">Ancora nessun bambino. Tocca "Elenco" e incolla i nomi, uno per riga.</p></div>`;
  const compleanni = prossimi.length ? titoloSez('Prossimi compleanni') + `<div class="glass lista">${prossimi.map(({ b, p }) => `
      <div class="voce" onclick="A.scheda('${b.id}')">${tile('torta', 'c-coral')}<span class="corpo"><span class="tit">${esc(b.nome)}${p.anni ? ` · ${p.anni} anni` : ''}</span>
      <span class="sub">${p.giorni === 0 ? 'oggi! 🎉' : p.giorni === 1 ? 'domani' : `fra ${p.giorni} giorni`}</span></span>
      <button class="btn mini vetro" onclick="event.stopPropagation();A.msg('auguri','${b.id}')">Auguri</button></div>`).join('')}</div>` : '';
  return `<div class="glass card"><form onsubmit="return A.salvaInfo(this)">
      <div class="due"><div><label for="kc" style="margin-top:0">Classe</label><input id="kc" name="classe" value="${esc(S.classe)}" placeholder="3ª B"></div>
      <div><label for="ks" style="margin-top:0">Scuola</label><input id="ks" name="scuola" value="${esc(S.scuola)}" placeholder="Primaria Rodari"></div></div>
      <div class="fila"><button class="btn vetro">${ic('ok', 'sm')}Salva</button></div></form></div>
    ${titoloSez(`Bambini · ${S.bambini.length}`, `<button class="btn mini vetro" onclick="A.formElenco()">${ic('matita', 'sm')}Elenco</button>`)}
    ${bambini}
    ${compleanni}
    ${titoloSez('I tuoi dati')}
    <div class="glass card privacy">${tile('scudo', 'c-aqua')}<div><h3>Resta tutto qui</h3>
      <p class="muted" style="margin:0">Nomi, numeri e pagamenti stanno solo su questo telefono, non vanno su internet. Ogni tanto salva una copia (mandatela su WhatsApp o in mail): se cambi telefono, la ricarichi da qui.</p></div></div>
    <div class="fila"><button class="btn vetro" onclick="A.esporta()">${ic('giu', 'sm')}Salva una copia</button>
      <label class="btn vetro" style="margin:0">${ic('su', 'sm')}Carica una copia<input class="nascosto" type="file" accept=".json,application/json" onchange="A.importa(this)"></label></div>
    <div class="fila"><button class="btn rosso" onclick="A.azzera()">${ic('cestino', 'sm')}Cancella tutto</button></div>`;
}

/** Sezione "Oppure in privato" sotto ai solleciti: un messaggio WhatsApp personale per ogni genitore. */
function inPrivato(tipo, x) {
  const mancanti = tipo === 'sollecito' ? mancantiRaccolta(x) : mancantiAdesione(x);
  if (!mancanti.length) return '';
  const conNumero = mancanti.filter(b => genitoriDi(b).length);
  const testo = (b, g) => tipo === 'sollecito' ? TESTI.sollecitoPrivato(x, b, g) : TESTI.adesionePrivata(x, b, g);
  const righe = conNumero.map(b => `<div class="voce" style="cursor:default">${avatar(b.nome)}<span class="corpo"><span class="tit">${esc(b.nome)}</span></span>
      <span class="wa-fila">${genitoriDi(b).map(g => `<a class="btn mini wa" target="_blank" rel="noopener" href="${esc(linkWa(g.tel, testo(b, g)))}">${ic('fumetto', 'sm')}${esc(g.nome || 'Scrivi')}</a>`).join('')}</span></div>`).join('');
  const senza = mancanti.length - conNumero.length;
  const nota = senza === mancanti.length
    ? 'Aggiungi i numeri dei genitori in Classe e potrai scrivere a ognuno con un tocco.'
    : senza ? `${senza} senza numero: puoi aggiungerlo in Classe.` : '';
  return `${titoloSez('Oppure in privato')}<p class="aiuto" style="margin:-4px 2px 10px">Un messaggio personale a ogni genitore: nessuno viene nominato davanti a tutti.</p>
    ${righe ? `<div class="glass lista">${righe}</div>` : ''}${nota ? `<p class="aiuto">${nota}</p>` : ''}`;
}

function moduloScheda(b) {
  const g = [0, 1].map(i => (b.genitori || [])[i] || { nome: '', tel: '' });
  const p = prossimoCompleanno(b.compleanno);
  const scrivi = genitoriDi(b).map(x => `<a class="btn mini wa" target="_blank" rel="noopener" href="${esc(linkWa(x.tel, `Ciao${x.nome ? ' ' + x.nome : ''}! `))}">${ic('fumetto', 'sm')}${esc(x.nome || 'Scrivi')}</a>`).join('');
  return `<div class="foglio-t">${avatar(b.nome)}<h3 id="foglio-titolo">${esc(b.nome)}</h3>
      <button class="icona-btn" aria-label="Chiudi" onclick="chiudiFoglio()">${ic('x', 'sm')}</button></div>
    ${scrivi ? `<div class="wa-fila" style="justify-content:flex-start;margin-top:10px">${scrivi}</div>` : ''}
    ${p ? `<div class="fila"><button class="btn vetro" onclick="A.msg('auguri','${b.id}')">${ic('torta', 'sm')}Auguri al gruppo</button>
      <button class="btn vetro" onclick="A.nuovo('cassa','Regalo per ${esc(b.nome)}')">${ic('cassa', 'sm')}Raccolta regalo</button></div>` : ''}
    <form onsubmit="return A.salvaScheda(this,'${b.id}')">
      <div class="due"><div><label for="bn">Nome</label><input id="bn" name="nome" required value="${esc(b.nome)}"></div>
      <div><label for="bk">N° registro</label><input id="bk" name="numero" type="number" inputmode="numeric" min="1" required value="${b.numero}"></div></div>
      <label for="bc">Compleanno</label><input id="bc" name="compleanno" type="date" value="${esc(b.compleanno || '')}">
      ${g.map((x, i) => `<div class="due"><div><label for="gn${i}">${i ? 'Altro genitore' : 'Genitore'}</label><input id="gn${i}" name="gn${i}" value="${esc(x.nome)}" placeholder="${i ? 'Papà Marco' : 'Mamma Giulia'}"></div>
        <div><label for="gt${i}">Cellulare</label><input id="gt${i}" name="gt${i}" type="tel" inputmode="tel" value="${esc(x.tel)}" placeholder="333 123 4567"></div></div>`).join('')}
      <p class="aiuto">I numeri servono solo per aprire la chat WhatsApp dal tuo telefono.</p>
      <div class="fila"><button class="btn pieno">${ic('ok', 'sm')}Salva</button></div>
    </form>
    <div class="fila"><button class="btn rosso" onclick="A.togliBambino('${b.id}')">${ic('cestino', 'sm')}Togli dalla classe</button></div>`;
}

Object.assign(A, {
  scheda(id) { const b = trova('bambini', id); if (b) apriFoglio(moduloScheda(b)); },
  salvaScheda(f, id) {
    const nome = f.nome.value.trim();
    if (S.bambini.some(b => b.id !== id && b.nome === nome)) { toast("C'è già un bambino con questo nome"); return false; }
    const genitori = [0, 1].map(i => ({ nome: f['gn' + i].value.trim(), tel: f['gt' + i].value.trim() })).filter(g => g.nome || g.tel);
    const errato = genitori.find(g => g.tel && !telefonoWa(g.tel));
    if (errato) { toast(`Il numero "${errato.tel}" non sembra giusto`); return false; }
    const numero = parseInt(f.numero.value, 10);
    if (!(numero > 0)) { toast('Scrivi un numero di registro valido'); return false; }
    const doppio = S.bambini.find(b => b.id !== id && b.numero === numero);
    if (doppio) { toast(`Il N° ${numero} è già di ${doppio.nome}`); return false; }
    const bambini = S.bambini.map(b => b.id === id ? { ...b, nome, numero, compleanno: f.compleanno.value, genitori } : b)
      .sort((a, b) => a.numero - b.numero);
    salva({ ...S, bambini });
    chiudiFoglio(); toast('Salvato');
    return false;
  },
  togliBambino(id) {
    precedente = S;
    scrivi({ ...S, bambini: S.bambini.filter(b => b.id !== id) });
    chiudiFoglio(); render(); toast('Tolto dalla classe', true);
  },
  salvaInfo(f) {
    salva({ ...S, classe: f.classe.value.trim(), scuola: f.scuola.value.trim() });
    toast('Salvato');
    return false;
  },
  formElenco() {
    apriFoglio(testaFoglio('classe', 'c-sky', 'Elenco della classe') + `<form onsubmit="return A.salvaElenco(this)">
      <label for="ke">Un nome per riga</label>
      <textarea id="ke" name="elenco" rows="12" placeholder="Anna&#10;Luca&#10;Marco R.">${esc(S.bambini.map(b => b.nome).join('\n'))}</textarea>
      <p class="aiuto">Nello stesso ordine del registro: la prima riga è il N° 1, la seconda il N° 2… Va bene nome e cognome. Compleanni e telefoni restano.</p>
      <div class="fila"><button class="btn pieno">${ic('ok', 'sm')}Salva elenco</button></div></form>`);
  },
  salvaElenco(f) {
    const nomi = [...new Set(f.elenco.value.split('\n').map(s => s.trim()).filter(Boolean))];
    const bambini = nomi.map((nome, i) => ({ ...(S.bambini.find(b => b.nome === nome) || { id: uid(), nome, compleanno: '', genitori: [] }), numero: i + 1 }));
    salva({ ...S, bambini });
    chiudiFoglio(); toast(`Salvato: ${bambini.length} bambini`);
    return false;
  }
});
