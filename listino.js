'use strict';
/* Raccolte con listino: ognuno ordina una o più cose con il loro prezzo (es. fiori del mercatino).
   Qui ci sono anche la modifica di una raccolta già creata e il cambio di tipo senza perdere i pagamenti. */

/* ---------- come si paga: interruttori + listino (nuova raccolta e modifica) ---------- */
const rigaArticolo = (a = { id: '', nome: '', prezzo: '' }) => `<div class="riga-art" data-id="${esc(a.id)}">
  <input class="art-nome" aria-label="Articolo" placeholder="Stella piccola" value="${esc(a.nome)}">
  <input class="art-prezzo" aria-label="Prezzo" inputmode="decimal" placeholder="3,50 €" value="${a.prezzo ? String(a.prezzo).replace('.', ',') : ''}">
  <button type="button" class="icona-btn" aria-label="Togli articolo" onclick="this.parentElement.remove()">${ic('x', 'sm')}</button></div>`;

function campiPagamento(r) {
  const modo = !r ? 'uguale' : conListino(r) ? 'listino' : r.libera ? 'libera' : 'uguale';
  const articoli = r && conListino(r) ? r.listino : [{ id: '', nome: '', prezzo: '' }, { id: '', nome: '', prezzo: '' }];
  return `<label class="interruttore" for="ru"><span><b>Stessa cifra per tutti</b><span class="aiuto">Spegnilo se ognuno paga una cifra diversa</span></span>
      <input id="ru" name="uguale" type="checkbox" role="switch" ${modo === 'uguale' ? 'checked' : ''} onchange="A.aggiornaModo()"></label>
    <label class="interruttore" for="rl" id="rl-box" ${modo === 'uguale' ? 'hidden' : ''}><span><b>Con listino</b><span class="aiuto">Ognuno sceglie da un elenco con i prezzi (es. stella piccola 3,50 €)</span></span>
      <input id="rl" name="listino" type="checkbox" role="switch" ${modo === 'listino' ? 'checked' : ''} onchange="A.aggiornaModo()"></label>
    <div id="editor-listino" ${modo === 'listino' ? '' : 'hidden'}>
      <label>Listino: cosa si può ordinare e quanto costa</label>
      <div id="righe-listino" class="righe">${articoli.map(rigaArticolo).join('')}</div>
      <button type="button" class="btn mini vetro" style="margin-top:8px" onclick="A.aggiungiArticolo()">${ic('piu', 'sm')}Aggiungi articolo</button></div>
    <div id="blocco-quota" ${modo === 'listino' ? 'hidden' : ''}>
      <label for="rq" id="rq-et">${modo === 'uguale' ? 'Quota a bambino' : 'Cifra indicativa (se vuoi)'}</label>
      <input id="rq" name="quota" inputmode="decimal" ${modo === 'uguale' ? 'required' : ''} placeholder="${modo === 'uguale' ? '5 €' : 'facoltativa'}"
        value="${r && r.quota && modo !== 'listino' ? String(r.quota).replace('.', ',') : ''}"></div>`;
}

/** Legge gli interruttori e il listino dal modulo: { libera, quota, listino } oppure { errore }. */
function leggiPagamento(f) {
  const uguale = f.uguale.checked;
  if (!uguale && f.listino.checked) {
    const listino = [...f.querySelectorAll('.riga-art')].map(el => ({
      id: el.dataset.id || uid(),
      nome: el.querySelector('.art-nome').value.trim(),
      prezzo: numero(el.querySelector('.art-prezzo').value)
    })).filter(a => a.nome);
    if (!listino.length) return { errore: 'Scrivi almeno un articolo con il suo prezzo' };
    const senzaPrezzo = listino.find(a => a.prezzo <= 0);
    if (senzaPrezzo) return { errore: `Manca il prezzo di "${senzaPrezzo.nome}"` };
    return { libera: true, quota: 0, listino };
  }
  const quota = numero(f.quota.value);
  if (uguale && quota <= 0) return { errore: 'Scrivi una quota valida, es. 5' };
  return { libera: !uguale, quota: Math.max(0, quota), listino: [] };
}

/* ---------- scheda ordine di un bambino ---------- */
const rigaOrdine = (r, o) => `<div class="riga-ord">
  <select class="ord-art" aria-label="Cosa" onchange="A.ricalcola('${r.id}')">${r.listino.map(a =>
    `<option value="${a.id}" ${a.id === o.articolo ? 'selected' : ''}>${esc(a.nome)} · ${euro(a.prezzo)}</option>`).join('')}</select>
  <span class="contatore"><button type="button" aria-label="Uno in meno" onclick="A.qta(this,-1,'${r.id}')">−</button>
    <b class="ord-qta">${o.qta}</b><button type="button" aria-label="Uno in più" onclick="A.qta(this,1,'${r.id}')">+</button></span>
  <button type="button" class="icona-btn" aria-label="Togli riga" onclick="this.parentElement.remove();A.ricalcola('${r.id}')">${ic('x', 'sm')}</button></div>`;

function leggiOrdine(r) {
  const righe = [...document.querySelectorAll('#righe-ordine .riga-ord')].map(el => ({
    articolo: el.querySelector('.ord-art').value,
    qta: parseInt(el.querySelector('.ord-qta').textContent, 10) || 0
  })).filter(o => o.qta > 0 && articoloDi(r, o.articolo));
  // stessa cosa su due righe → una riga sola con la somma
  return Object.values(righe.reduce((acc, o) => ({ ...acc, [o.articolo]: { articolo: o.articolo, qta: (acc[o.articolo] ? acc[o.articolo].qta : 0) + o.qta } }), {}));
}

/* ---------- pagina della raccolta con listino ---------- */
function vRaccoltaListino(r) {
  const chi = ordinanti(r), n = chi.length, p = pagatiDi(r).length;
  const inc = incassato(r), ord = totaleOrdinato(r), sp = speseTot(r);
  const daPagare = mancantiRaccolta(r).length;
  const senza = S.bambini.length - n;
  const passa = b => filtroPag === 'tutti'
    || (filtroPag === 'pagati' && r.pagati[b.id])
    || (filtroPag === 'mancano' && haOrdinato(r, b.id) && !r.pagati[b.id])
    || (filtroPag === 'senza' && !haOrdinato(r, b.id) && !r.pagati[b.id]);
  const filtro = (k, t) => `<button aria-pressed="${filtroPag === k}" onclick="A.filtro('${k}')">${t}</button>`;
  const stato = b => {
    const v = r.pagati[b.id];
    if (haOrdinato(r, b.id)) return esc(descrizioneOrdine(r, b.id)) + (v ? '' : ' · da pagare');
    if (v && typeof v === 'object') return `pagato ${euro(v.importo)} · tocca e scegli cosa`;
    return v ? 'pagato · tocca e scegli cosa' : 'nessun ordine';
  };
  const righe = S.bambini.filter(passa).map(b => `<button class="voce ${r.pagati[b.id] ? 'si' : ''} ${ultimoPop === b.id ? 'pop' : ''}" onclick="A.formOrdine('${r.id}','${b.id}')">
      ${avatar(b.nome)}<span class="corpo"><span class="tit">${b.numero}. ${esc(b.nome)}</span><span class="sub">${stato(b)}</span></span>
      ${haOrdinato(r, b.id) ? `<span class="importo">${euro(totaleOrdine(r, b.id))}</span>` : ''}
      <span class="spunta">${ic('ok', 'sm')}</span></button>`).join('') || `<p class="muted" style="padding:14px">Nessuno in questa lista.</p>`;
  const riepilogo = riepilogoArticoli(r);
  const pezzi = riepilogo.reduce((t, a) => t + a.qta, 0);
  return `${indietro('cassa')}
    <div class="glass card"><div class="dettaglio-eroe">${anello(p, n, 'var(--sun)', true)}
      <div><h3>${esc(r.titolo)}</h3><p class="muted">${n} ${n === 1 ? 'ordine' : 'ordini'} · ${pezzi} pezzi</p>${pillData(r.scadenza)}</div></div>
      <div class="stat-grid"><div class="stat"><b>${euro(ord)}</b><span>ordinato</span></div><div class="stat"><b>${euro(inc)}</b><span>raccolti</span></div><div class="stat"><b>${euro(inc - sp)}</b><span>in cassa</span></div></div>
      <div class="fila"><button class="btn c-sun" onclick="A.msg('sollecito','${r.id}')" ${daPagare ? '' : 'disabled'}>${ic('campana', 'sm')}Sollecita</button>
      <button class="btn vetro" onclick="A.msg('lancioRaccolta','${r.id}')">${ic('manda', 'sm')}Annuncio</button></div></div>
    ${titoloSez('Ordini', `<span class="tenue">tocca per segnare</span>`)}
    <div class="filtri" role="group" aria-label="Filtra">${filtro('tutti', 'Tutti')}${filtro('mancano', `Da pagare ${daPagare}`)}${filtro('pagati', `Pagati ${p}`)}${filtro('senza', `Senza ${senza}`)}</div>
    <div class="glass lista">${righe}</div>
    ${titoloSez('Riepilogo per il fornitore')}
    <div class="glass card"><table class="tabella"><tbody>
      ${riepilogo.map(a => `<tr><td>${esc(a.nome)} <span class="tenue">· ${euro(a.prezzo)}</span></td><td>${a.qta} pz · ${euro(a.importo)}</td></tr>`).join('')}
      <tr class="tot"><td>Totale</td><td>${pezzi} pz · ${euro(ord)}</td></tr></tbody></table></div>
    ${sezSpese(r)}
    ${sezFondo(r)}`;
}

/* ---------- esportazione con le colonne del modulo cartaceo ---------- */
function reportListino(r) {
  const chi = ordinanti(r), sp = speseTot(r), inc = incassato(r), ord = totaleOrdinato(r);
  const qta = (b, a) => ordineDi(r, b.id).filter(o => o.articolo === a.id).reduce((t, o) => t + o.qta, 0);
  const classe = S.classe || '';
  const righe = chi.map(b => [String(b.numero), b.nome, classe, ...r.listino.map(a => qta(b, a) || ''), euro(totaleOrdine(r, b.id)), r.pagati[b.id] ? '✓' : '']);
  const riepilogo = riepilogoArticoli(r);
  return {
    titolo: r.titolo,
    sotto: `Raccolta con listino${r.scadenza ? ' · ' + codaScadenza(r) : ''}`,
    numeri: [['Ordini', String(chi.length)], ['Ordinato', euro(ord)], ['Raccolti', euro(inc)], ['In cassa', euro(inc - sp)]],
    tabelle: [
      { titolo: 'Ordini', intest: ['N°', 'Nome e cognome', 'Classe', ...r.listino.map(a => `${a.nome} ${euro(a.prezzo)}`), 'Totale', 'Pagato'], righe },
      { titolo: 'Riepilogo per il fornitore', intest: ['Articolo', 'Prezzo', 'Pezzi', 'Importo'], righe: [...riepilogo.map(a => [a.nome, euro(a.prezzo), String(a.qta), euro(a.importo)]), ['Totale', '', String(riepilogo.reduce((t, a) => t + a.qta, 0)), euro(ord)]] },
      ...(r.spese.length ? [{ titolo: 'Spese', intest: ['Cosa', 'Importo'], righe: [...r.spese.map(s => [s.desc, euro(s.importo)]), ['Totale', euro(sp)]] }] : [])
    ],
    csv: () => creaCsv([
      ['Raccolta', r.titolo], ['Scadenza', r.scadenza || ''], [],
      ['N°', 'Nome e cognome', 'Classe', ...r.listino.map(a => `${a.nome} (${cifra(a.prezzo)} €)`), 'Totale €', 'Pagato'],
      ...chi.map(b => [b.numero, b.nome, classe, ...r.listino.map(a => qta(b, a) || ''), cifra(totaleOrdine(r, b.id)), r.pagati[b.id] ? 'sì' : 'no']),
      [], ['Articolo', 'Prezzo €', 'Pezzi', 'Importo €'], ...riepilogo.map(a => [a.nome, cifra(a.prezzo), a.qta, cifra(a.importo)]),
      [], ['Ordinato €', cifra(ord)], ['Raccolti €', cifra(inc)], ['Spesi €', cifra(sp)], ['In cassa €', cifra(inc - sp)]
    ])
  };
}

Object.assign(A, {
  aggiornaModo() {
    const uguale = $('#ru').checked, listino = !uguale && $('#rl').checked;
    $('#rl-box').hidden = uguale;
    $('#editor-listino').hidden = !listino;
    $('#blocco-quota').hidden = listino;
    $('#rq-et').textContent = uguale ? 'Quota a bambino' : 'Cifra indicativa (se vuoi)';
    $('#rq').required = uguale;
    $('#rq').placeholder = uguale ? '5 €' : 'facoltativa';
  },
  aggiungiArticolo() {
    $('#righe-listino').insertAdjacentHTML('beforeend', rigaArticolo());
    const campi = document.querySelectorAll('#righe-listino .art-nome');
    campi[campi.length - 1].focus();
  },

  modificaRaccolta(rid) {
    const r = trova('raccolte', rid); if (!r) return;
    apriFoglio(testaFoglio('matita', 'c-sun', 'Modifica raccolta') + `<form onsubmit="return A.salvaModifica(this,'${rid}')">
      <label for="mt">Per cosa?</label><input id="mt" name="titolo" required value="${esc(r.titolo)}">
      ${campiPagamento(r)}
      <label for="ms">Entro il</label><input id="ms" name="scadenza" type="date" value="${esc(r.scadenza || '')}">
      <p class="aiuto">Chi ha già pagato resta segnato, anche se cambi tipo di raccolta.</p>
      <div class="fila"><button class="btn c-sun pieno">${ic('ok', 'sm')}Salva</button></div></form>`);
  },
  salvaModifica(f, rid) {
    const r = trova('raccolte', rid); if (!r) return false;
    const pag = leggiPagamento(f);
    if (pag.errore) { toast(pag.errore); return false; }
    const ids = new Set(pag.listino.map(a => a.id));
    const tolti = (r.listino || []).filter(a => !ids.has(a.id) && S.bambini.some(b => ordineDi(r, b.id).some(o => o.articolo === a.id)));
    if (tolti.length && !confirm(`${tolti.map(a => a.nome).join(', ')} ha già degli ordini: toglierlo li cancella. Continuare?`)) return false;
    precedente = S;
    aggiorna('raccolte', rid, x => ({ ...x, titolo: f.titolo.value.trim(), scadenza: f.scadenza.value, ...pag, ordini: x.ordini || {} }));
    chiudiFoglio(); toast('Raccolta aggiornata', true);
    return false;
  },

  formOrdine(rid, bid) {
    const r = trova('raccolte', rid), b = trova('bambini', bid);
    if (!r || !b) return;
    const ordine = ordineDi(r, bid);
    const v = r.pagati[bid];
    const prima = v && typeof v === 'object' && !haOrdinato(r, bid)
      ? `<p class="aiuto" style="margin-top:10px">Prima avevi segnato ${euro(v.importo)} pagati: scegli cosa ha ordinato.</p>` : '';
    apriFoglio(`<div class="foglio-t">${avatar(b.nome)}<h3 id="foglio-titolo">${b.numero}. ${esc(b.nome)}</h3>
        <button class="icona-btn" aria-label="Chiudi" onclick="chiudiFoglio()">${ic('x', 'sm')}</button></div>${prima}
      <form onsubmit="return A.salvaOrdine(this,'${rid}','${bid}')">
        <label>Cosa ha ordinato</label>
        <div id="righe-ordine" class="righe">${(ordine.length ? ordine : [{ articolo: r.listino[0].id, qta: 1 }]).map(o => rigaOrdine(r, o)).join('')}</div>
        <button type="button" class="btn mini vetro" style="margin-top:8px" onclick="A.rigaOrdine('${rid}')">${ic('piu', 'sm')}Aggiungi riga</button>
        <div class="totale-ordine"><span>Totale</span><b id="tot-ordine">${euro(totaleOrdine(r, bid) || r.listino[0].prezzo)}</b></div>
        <label class="interruttore" for="op"><span><b>Ha pagato</b><span class="aiuto">${v ? 'pagato il ' + dataBreve(dataPagamento(v)) : 'accendilo quando ti dà i soldi'}</span></span>
          <input id="op" name="pagato" type="checkbox" role="switch" ${v ? 'checked' : ''}></label>
        <div class="fila"><button class="btn c-sun pieno">${ic('ok', 'sm')}Salva</button></div>
      </form>`);
    A.ricalcola(rid);
  },
  rigaOrdine(rid) {
    const r = trova('raccolte', rid); if (!r) return;
    const usati = new Set([...document.querySelectorAll('#righe-ordine .ord-art')].map(s => s.value));
    const libero = r.listino.find(a => !usati.has(a.id)) || r.listino[0];
    $('#righe-ordine').insertAdjacentHTML('beforeend', rigaOrdine(r, { articolo: libero.id, qta: 1 }));
    A.ricalcola(rid);
  },
  qta(btn, delta, rid) {
    const el = btn.parentElement.querySelector('.ord-qta');
    el.textContent = Math.max(1, (parseInt(el.textContent, 10) || 1) + delta);
    vibra(); A.ricalcola(rid);
  },
  ricalcola(rid) {
    const r = trova('raccolte', rid), tot = $('#tot-ordine');
    if (!r || !tot) return;
    tot.textContent = euro(leggiOrdine(r).reduce((t, o) => t + articoloDi(r, o.articolo).prezzo * o.qta, 0));
  },
  salvaOrdine(f, rid, bid) {
    const r = trova('raccolte', rid); if (!r) return false;
    const righe = leggiOrdine(r);
    const pagato = f.pagato.checked;
    if (!righe.length && pagato && !r.pagati[bid]) { toast('Scegli prima cosa ha ordinato'); return false; }
    vibra(); ultimoPop = bid;
    aggiorna('raccolte', rid, x => {
      const { [bid]: _o, ...altriOrdini } = x.ordini || {};
      const { [bid]: giaPagato, ...altriPagati } = x.pagati;
      return {
        ...x,
        ordini: righe.length ? { ...altriOrdini, [bid]: righe } : altriOrdini,
        pagati: pagato ? { ...altriPagati, [bid]: giaPagato || oggiISO() } : altriPagati
      };
    });
    chiudiFoglio();
    return false;
  }
});
