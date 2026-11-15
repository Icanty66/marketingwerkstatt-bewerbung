/* Direkteinstieg in das eigene ChatGPT Projekt. Die Adresse bleibt bei
   jedem Aufruf gleich. Alle Texte bleiben bis zum manuellen Einfügen hier. */
(() => {
  'use strict';
  const starter = [
    'Begleite mich Schritt für Schritt bei meinen Bewerbungen im Marketing rund um Hersbruck und Nürnberg. Frag zuerst, welche Rolle ich suche und welche Arbeit ich schon zeigen kann. Nutze Lebenslauf, Zeugnisse und Arbeitsproben in diesem Projekt als Quellen. Frage nach fehlenden Angaben und kennzeichne Übungen. Falls ich keinen fertigen Prompt habe, hilf mir, aus meinen Worten einen Auftrag zu schreiben.',
    'Wenn ich „Bewerbung vorbereiten“ schreibe, nutze die konkrete Stellenanzeige aus diesem Chat. Fehlt sie, bitte mich um die Anzeige. Zeige mir zuerst drei wichtige Anforderungen, meine Belege und offene Punkte. Erstelle dann einen angepassten Lebenslauf, ein einseitiges Anschreiben und Antworten zu den vorliegenden Formularfragen. Wähle eine passende Arbeitsprobe aus. Erfinde keine Erfahrungen oder Ergebnisse.',
    'Verwende die hochgeladenen Dateien Lebenslauf.docx und Anschreiben.docx als feste Layoutvorlagen. Ersetze die Musterdaten durch meine belegten Angaben. Erhalte Textfelder, Seitenaufteilung, Schrift, Farben und Fotoausschnitt. Vergleiche den PDF Export mit der Mustervorschau. Erstelle nach Möglichkeit bearbeitbare Word Dateien und eine PDF Fassung. Zeige mir Unterlagen, Formularantworten und offene Fragen zur Prüfung. Mit Work kann ich geprüfte Angaben in unterstützte Portalfelder übernehmen lassen. Den verbindlichen Versand erledige ich persönlich.',
    'Wenn ich „Suchplan einrichten“ sage, bereite eine tägliche Suche um 07, 09, 11, 13, 15, 17 und 19 Uhr sowie einen eigenen Abschluss um 20 Uhr in Europe/Berlin vor. Nutze aktuelle Originalanzeigen, prüfe Dubletten und kennzeichne unzugängliche Quellen. Bestätige nur gespeicherte Aufgaben.'
  ].join('\n\n');
  const examples = {
    cv: {what:'Lebenslauf', aim:'Den Lebenslauf auf meine Wunschstelle zuschneiden', context:'Meine Stationen und eine Aufgabe, für die ich selbst verantwortlich war', result:'Zwei belegte Zeilen für den Abschnitt Projekte',
      task:'Ordne mein Material für den Lebenslauf. Zeige, welche Zeile zur Zielstelle passt und welche Angabe ich noch ergänzen sollte.'},
    projekt: {what:'Arbeitsprobe', aim:'Meinen eigenen Beitrag an einem Projekt zeigen', context:'Ein Entwurf, meine Aufgabe und die tatsächliche Rückmeldung', result:'Eine Projektseite mit Aufgabe, Beitrag und Ergebnis',
      task:'Hilf mir, aus meinen Notizen eine Arbeitsprobe zu erstellen. Unterscheide meinen Beitrag von Teamarbeit und kennzeichne Übungen.'},
    stelle: {what:'Stellenvergleich', aim:'Entscheiden, ob ich mich auf eine Stelle bewerbe', context:'Die Anzeige im Wortlaut und meine belegten Beispiele', result:'Eine Tabelle mit Anforderung, Beleg und offener Frage',
      task:'Vergleiche mein Profil mit der Stellenanzeige. Trenne belegte Übereinstimmungen, offene Musskriterien und Lernfelder. Begründe deine Empfehlung.'},
    eigen: {what:'Eigene Aufgabe', aim:'Was möchtest du erreichen?', context:'Welche Angaben, Texte oder Dateien kann ich dafür verwenden?', result:'In welcher Form möchtest du die Antwort?',
      task:'Unterstütze mich bei meiner Aufgabe und nutze nur das Material, das ich tatsächlich bereitgestellt habe.'}
  };
  const id = value => document.getElementById(value);
  function status(target, text) {
    const element = id(target);
    if (element) element.textContent = text;
  }
  function reveal(box, output, value) {
    const area = id(output), container = id(box);
    if (!area || !container) return null;
    container.hidden = false;
    area.value = value;
    return area;
  }
  function manual(area) {
    if (!area) return;
    area.focus(); area.select();
  }
  function writeClipboard(value) {
    try {
      if (!navigator.clipboard?.writeText) return Promise.resolve(false);
      return navigator.clipboard.writeText(value).then(() => true, () => false);
    } catch { return Promise.resolve(false); }
  }
  async function kopierenUndOeffnen() {
    const copy = writeClipboard(starter);
    // Keep the call synchronous with the click for browsers that enforce
    // transient user activation. Neither content nor contact data enters the URL.
    window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
    const area = reveal('direct-starter-box', 'direct-starter', starter);
    if (await copy) {
      status('direct-start-status', 'Starttext kopiert. Füge ihn in die Anweisungen deines Projekts ein.');
    } else {
      manual(area);
      status('direct-start-status', 'Der Starttext steht im markierten Feld. Kopiere ihn selbst und füge ihn in dein ChatGPT Projekt ein.');
    }
  }
  function current() {
    return examples[id('direct-kind')?.value] || examples.cv;
  }
  function draft() {
    const preset = current(), get = key => id(key)?.value.trim() || '';
    const aim = get('direct-goal'), context = get('direct-context'), result = get('direct-outcome');
    return [
      'Meine Aufgabe: ' + preset.what + '. ' + preset.task,
      aim ? 'Mein Ziel\n' + aim : '',
      context ? 'Mein Kontext und meine Belege\n' + context : 'Bitte verwende die für diese Aufgabe bereitgestellten Projektdateien. Falls dir das Material fehlt, frage danach.',
      result ? 'Gewünschtes Ergebnis\n' + result : '',
      'Arbeite nur mit belegten Fakten. Gib mir einen Vorschlag zur Prüfung. Wenn eine wichtige Angabe fehlt, stelle eine kurze Rückfrage.'
    ].filter(Boolean).join('\n\n');
  }
  function updateHints() {
    const preset = current();
    id('direct-goal').placeholder = preset.aim;
    id('direct-context').placeholder = preset.context;
    id('direct-outcome').placeholder = preset.result;
  }
  function download(text, filename) {
    const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'Mein Auftrag · ' + current().what + '.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  document.addEventListener('change', event => {
    if (event.target.id === 'direct-kind') {
      updateHints();
      if (!id('direct-result-box').hidden) id('direct-result').value = draft();
    }
  });
  document.addEventListener('input', event => {
    if (['direct-goal','direct-context','direct-outcome'].includes(event.target.id) && !id('direct-result-box').hidden)
      id('direct-result').value = draft();
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('button[data-direct]');
    if (!button) return;
    const action = button.dataset.direct;
    if (action === 'start') return kopierenUndOeffnen();
    if (action === 'starterload') {download(starter, 'Start in meinem ChatGPT Projekt.txt');return status('direct-start-status','Starttext zum Herunterladen bereit.');}
    if (action === 'startercopy') {const ok=await writeClipboard(starter);if(!ok)manual(reveal('direct-starter-box','direct-starter',starter));return status('direct-start-status',ok?'Starttext kopiert. Füge ihn in deinem Projekt ein.':'Starttext markiert. Bitte kopiere ihn.');}
    if (action === 'coach') {
      const text='Hilf mir, meinen eigenen Prompt zu schreiben. Frage zuerst nach dem wichtigsten fehlenden Detail. Formuliere danach daraus einen kurzen Auftrag mit Ziel, Kontext, Aufgabe und gewünschtem Format. Erkläre mir in einem Satz, wie ich ihn nächstes Mal selbst anpasse.\n\n'+draft();
      const area=reveal('direct-result-box','direct-result',text);
      const ok=await writeClipboard(text);if(!ok)manual(area);
      return status('direct-status',ok?'Kopiert. Füge den Auftrag in deinem eigenen Chat ein.':'Text zum Kopieren markiert.');
    }
    if (action === 'inspect') {
      const area = reveal('direct-starter-box', 'direct-starter', starter);
      area?.focus();
      return;
    }
    if (!['show','copy','load'].includes(action)) return;
    const text = draft(), area = reveal('direct-result-box','direct-result',text);
    if (action === 'show') { area?.focus(); status('direct-status', 'Der Auftrag steht im Textfeld.'); }
    if (action === 'load') { download(text); status('direct-status', 'Dein Auftrag wird als Textdatei gespeichert.'); }
    if (action === 'copy') {
      const ok = await writeClipboard(text);
      if (!ok) manual(area);
      status('direct-status', ok ? 'Auftrag kopiert. Du kannst ihn in deinen Chat einfügen.' : 'Dein Auftrag ist markiert. Kopiere den Text mit der Kopierfunktion deines Geräts.');
    }
  });
  if(id('direct-starter'))id('direct-starter').value=starter;
  if(id('direct-kind'))updateHints();
  window.Direktstart = Object.freeze({kopierenUndOeffnen});
})();
