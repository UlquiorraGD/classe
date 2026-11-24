'use strict';
/* Esportazione delle singole cose: PDF (stampa → "Salva come PDF") ed Excel (CSV con il punto e virgola). */

/** Condivide un file (menu del telefono) oppure lo scarica. */
async function condividiFile(contenuto, nome, tipo, avvisoScaricato = 'File salvato nei download') {
  const file = new File([contenuto], nome, { type: tipo });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = nome;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(avvisoScaricato);
}

const nomeFile = t => (t || 'classe').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'classe';
const cifra = n => (Number(n) || 0).toFixed(2).replace('.', ',');

/** CSV leggibile da Excel italiano: BOM, punto e virgola, virgola decimale. */
function creaCsv(righe) {
  const cella = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + righe.map(r => r.map(cella).join(';')).join('\r\n');
}

/* ---------- contenuto dei report ---------- */
function reportRaccolta(r) {
  if (conListino(r)) return reportListino(r);
  const p = pagatiDi(r).length, inc = incassato(r), sp = speseTot(r);
  const righe = S.bambini.map(b => {
    const v = r.pagati[b.id];
    return [b.nome, v ? 'Pagato' : 'Da pagare', v ? dataBreve(dataPagamento(v)) : '', v ? euro(quotaPagata(r, b.id)) : ''];
  });
  return {
    titolo: r.titolo,
    sotto: descrizioneQuota(r) + (r.scadenza ? ' · ' + codaScadenza(r) : ''),
    numeri: [['Pagati', `${p} su ${S.bambini.length}`], ['Raccolti', euro(inc)], ['Spesi', euro(sp)], ['In cassa', euro(inc - sp)]],
    tabelle: [
      { titolo: 'Pagamenti', intest: ['Bambino', 'Stato', 'Data', 'Importo'], righe },
      ...(r.spese.length ? [{ titolo: 'Spese', intest: ['Cosa', 'Importo'], righe: [...r.spese.map(s => [s.desc, euro(s.importo)]), ['Totale', euro(sp)]] }] : [])
    ],
    csv: () => creaCsv([
      ['Raccolta', r.titolo], ['Quota', r.libera ? 'libera' : cifra(r.quota)], ['Scadenza', r.scadenza || ''], [],
      ['Bambino', 'Pagato', 'Data', 'Importo €'],
      ...S.bambini.map(b => { const v = r.pagati[b.id]; return [b.nome, v ? 'sì' : 'no', v ? dataPagamento(v) : '', v ? cifra(quotaPagata(r, b.id)) : '']; }),
      [], ['Spesa', 'Importo €'], ...r.spese.map(s => [s.desc, cifra(s.importo)]),
      [], ['Raccolti €', cifra(inc)], ['Spesi €', cifra(sp)], ['In cassa €', cifra(inc - sp)]
    ])
  };
}

function reportAdesione(a) {
  const risposta = b => a.risposte[b.id] || '—';
  return {
    titolo: a.domanda,
    sotto: a.scadenza ? 'Risposte entro ' + dataIt(a.scadenza) : 'Adesioni',
    numeri: [...a.opzioni.map(o => [o, String(S.bambini.filter(b => a.risposte[b.id] === o).length)]), ['Mancano', String(mancantiAdesione(a).length)]],
    tabelle: [{ titolo: 'Risposte', intest: ['Bambino', 'Risposta'], righe: S.bambini.map(b => [b.nome, risposta(b)]) }],
    csv: () => creaCsv([['Domanda', a.domanda], [], ['Bambino', 'Risposta'], ...S.bambini.map(b => [b.nome, a.risposte[b.id] || ''])])
  };
}

const reportAvviso = v => ({ titolo: v.titolo, sotto: v.scadenza ? dataIt(v.scadenza) : 'Avviso', testo: v.testo });
const reportRiunione = c => ({
  titolo: c.tipo, sotto: dataIt(c.data),
  elenco: c.appunti.split('\n').map(s => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean)
});
const reportEvento = e => ({
  titolo: e.titolo,
  sotto: (TIPI_EVENTO[e.tipo] || TIPI_EVENTO.altro)[0] + ' · ' + dataIt(e.data) + (e.fine ? ' – ' + dataIt(e.fine) : '') + (e.ora ? ', ore ' + e.ora : ''),
  testo: e.note || ''
});

const REPORT = { raccolte: reportRaccolta, adesioni: reportAdesione, avvisi: reportAvviso, consigli: reportRiunione, eventi: reportEvento };

/* ---------- pagina da stampare ---------- */
function htmlStampa(rep) {
  const testa = [S.classe ? 'Classe ' + S.classe : '', S.scuola].filter(Boolean).join(' · ');
  const tab = t => `<h2>${esc(t.titolo)}</h2><table><thead><tr>${t.intest.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${t.righe.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<header><span>${esc(testa)}</span><span>${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span></header>
    <h1>${esc(rep.titolo)}</h1><p class="sotto">${esc(rep.sotto || '')}</p>
    ${rep.numeri ? `<div class="numeri">${rep.numeri.map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>` : ''}
    ${rep.testo ? `<p class="testo">${esc(rep.testo)}</p>` : ''}
    ${rep.elenco ? `<ul>${rep.elenco.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${(rep.tabelle || []).map(tab).join('')}`;
}

function stampa(rep) {
  let box = document.getElementById('stampa');
  if (!box) { box = document.createElement('div'); box.id = 'stampa'; document.body.appendChild(box); }
  box.innerHTML = htmlStampa(rep);
  const titoloPrima = document.title;
  document.title = nomeFile(rep.titolo); // diventa il nome del PDF
  document.body.classList.add('in-stampa');
  const fine = () => { document.body.classList.remove('in-stampa'); document.title = titoloPrima; window.removeEventListener('afterprint', fine); };
  window.addEventListener('afterprint', fine);
  setTimeout(() => window.print(), 50);
}

Object.assign(A, {
  /** Foglio con le scelte di esportazione per un elemento. */
  esportaVoce(coll, id) {
    const x = trova(coll, id); if (!x) return;
    const rep = REPORT[coll](x);
    apriFoglio(testaFoglio('giu', 'c-sky', 'Esporta') + `<p class="muted" style="margin:8px 2px 14px">${esc(rep.titolo)}</p>
      <div class="lista">
        <button class="voce" onclick="A.esportaPdf('${coll}','${id}')">${tile('riunione', 'c-coral')}<span class="corpo"><span class="tit">PDF</span>
          <span class="sub">da stampare o mandare: scegli "Salva come PDF"</span></span>${ic('dx')}</button>
        ${rep.csv ? `<button class="voce" onclick="A.esportaCsv('${coll}','${id}')">${tile('scontrino', 'c-aqua')}<span class="corpo"><span class="tit">Excel</span>
          <span class="sub">tabella da aprire con Excel o Fogli Google</span></span>${ic('dx')}</button>` : ''}
      </div>`);
  },
  esportaPdf(coll, id) {
    const x = trova(coll, id); if (!x) return;
    chiudiFoglio();
    stampa(REPORT[coll](x));
  },
  esportaCsv(coll, id) {
    const x = trova(coll, id); if (!x) return;
    const rep = REPORT[coll](x);
    condividiFile(rep.csv(), nomeFile(rep.titolo) + '.csv', 'text/csv', 'File Excel salvato nei download');
  }
});
