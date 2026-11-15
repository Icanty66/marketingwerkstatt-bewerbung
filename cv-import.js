/* Privater Dokumentenimport für die Bewerbungswerkstatt.
   Auswahl, Analyse und Textausgabe erfolgen auf dem Gerät. */
(() => {
  'use strict';
  const moduleURL = new URL(document.currentScript.src, document.baseURI);
  const scripts = new Map();
  const MB = 1024 * 1024;

  function library(filename, ready) {
    if (ready()) return Promise.resolve();
    if (scripts.has(filename)) return scripts.get(filename);
    const pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('cv-vendor/' + filename, moduleURL).href;
      script.async = true;
      script.onload = () => ready() ? resolve() : fail();
      script.onerror = fail;
      function fail() {
        scripts.delete(filename);
        script.remove();
        reject(new Error('Der lokale Dateileser fehlt. Entpacke das gesamte Kit zusammen oder öffne die Onlineversion. Du kannst deinen Text auch direkt einfügen.'));
      }
      document.head.append(script);
    });
    scripts.set(filename, pending);
    return pending;
  }

  function clean(value) {
    return value.replace(/\r\n?/g, '\n').replace(/\u00ad/g, '')
      .replace(/\u0000/g, '').replace(/[\u200b\ufeff]/g, '')
      .replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  function txt(buffer) {
    const bytes = new Uint8Array(buffer);
    const sample = bytes.subarray(0, 256);
    const zeros = sample.reduce((sum, value) => sum + (value === 0 ? 1 : 0), 0);
    const warnings = [];
    let result;
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      result = new TextDecoder('utf-16le').decode(bytes);
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      result = new TextDecoder('utf-16be').decode(bytes);
    } else if (sample.length > 3 && zeros > sample.length / 4) {
      const oddZeros = sample.reduce((n, value, index) => n + (index % 2 === 1 && value === 0 ? 1 : 0), 0);
      if (Math.max(oddZeros, zeros - oddZeros) < zeros * .85) {
        throw new Error('Diese Datei enthält keinen lesbaren Klartext. Wähle eine Textdatei mit der Endung .txt oder füge deinen Text ein.');
      }
      result = new TextDecoder(oddZeros > zeros / 2 ? 'utf-16le' : 'utf-16be').decode(bytes);
    } else {
      try {
        result = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
      } catch {
        result = new TextDecoder('windows-1252').decode(bytes);
        warnings.push('Die Datei verwendet eine ältere Zeichencodierung. Prüfe besonders die Umlaute und Sonderzeichen.');
      }
    }
    if (/[\x00-\x08\x0E-\x1F]/.test(result)) {
      throw new Error('Die Datei enthält Zeichen eines anderen Dateiformats. Speichere den Lebenslauf erneut als TXT oder verwende das Original als DOCX oder PDF.');
    }
    return {text: clean(result), warnings};
  }

  // Word speichert jede formatierte Textstelle einzeln. Leerzeichen zwischen
  // diesen Teilen werden nur dort ergänzt, wo ein Tab oder Absatz vorliegt.
  function wordText(xml) {
    if (/<!DOCTYPE/i.test(xml)) throw new Error('Diese Worddatei enthält eine nicht unterstützte XML Definition.');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Ein Teil der Worddatei ist beschädigt. Speichere eine neue Kopie als DOCX.');
    const parts = [];
    const wordNamespaces = new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main']);
    function visit(node) {
      const name = node.localName;
      if (name === 'AlternateContent') {
        const branch = [...node.children].find(x => x.localName === 'Choice') || node.firstElementChild;
        if (branch) visit(branch);
        return;
      }
      if (wordNamespaces.has(node.namespaceURI)) {
        if (['del', 'moveFrom', 'instrText', 'delText'].includes(name)) return;
        if (name === 't') { parts.push(node.textContent); return; }
        if (name === 'tab') { parts.push('\t'); return; }
        if (name === 'br' || name === 'cr') { parts.push('\n'); return; }
        if (name === 'p') parts.push('\n');
      }
      for (const child of node.children) visit(child);
    }
    visit(doc.documentElement);
    return clean(parts.join(''));
  }

  async function docx(buffer) {
    await library('jszip.min.js', () => window.JSZip);
    let archive;
    try { archive = await window.JSZip.loadAsync(buffer); }
    catch { throw new Error('Die Worddatei lässt sich nicht öffnen. Prüfe, ob sie passwortgeschützt ist. Speichere in Word eine ungeschützte Kopie als DOCX oder füge den Text direkt ein.'); }
    const main = archive.file('word/document.xml');
    if (!main) throw new Error('Diese Datei enthält kein Worddokument. Öffne das Original in Word und speichere es als DOCX.');
    const extra = Object.keys(archive.files).filter(name => /^word\/(header|footer)\d*\.xml$/.test(name)).sort();
    const entries = [main, ...extra.map(name => archive.file(name)).filter(Boolean)];
    const expanded = entries.reduce((total, entry) => total + (entry._data?.uncompressedSize || 0), 0);
    if (expanded > 25 * MB) throw new Error('Der Textteil dieser Worddatei ist sehr gross. Kopiere die relevanten Seiten als Text oder speichere den Lebenslauf als eigene Datei.');
    const segments = [];
    for (const entry of entries) {
      const content = wordText(await entry.async('string'));
      if (content && !segments.includes(content)) segments.push(content);
    }
    if (!segments.length) throw new Error('In dieser Worddatei ist kein Text lesbar. Falls sie nur Bilder enthält, nutze zuerst eine Texterkennung oder füge den Text selbst ein.');
    return {text: segments.join('\n\n'), warnings: ['Prüfe die Reihenfolge deiner Stationen. Text aus Kopfzeilen und Fusszeilen steht gegebenenfalls am Ende.']};
  }

  function pageText(items) {
    const lines = [];
    let line = '', last;
    for (const item of items) {
      if (typeof item.str !== 'string') continue;
      const baseline = item.transform[5];
      const fontHeight = Math.max(1, item.height || Math.abs(item.transform[3]) || 10);
      if (last && Math.abs(last.baseline - baseline) > Math.max(fontHeight, last.height) * .55) {
        if (line.trim()) lines.push(line.trimEnd());
        line = '';
        last = undefined;
      }
      const x = item.transform[4];
      if (line && last && item.str && !/\s$/.test(line) && !/^\s/.test(item.str)) {
        const distance = x - last.right;
        if (distance > Math.min(fontHeight, last.height) * .09) line += distance > fontHeight * 2 ? '\t' : ' ';
      }
      line += item.str;
      last = {baseline, height: fontHeight, right: x + (item.width || 0)};
      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trimEnd());
        line = '';
        last = undefined;
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
    return clean(lines.join('\n'));
  }

  async function pdf(buffer) {
    await library('pdf-local.js', () => window.CVLocalPdfParser);
    let parser;
    try { parser = await window.CVLocalPdfParser(); }
    catch { throw new Error('Der PDF Leser konnte in diesem Browser nicht starten. Öffne die Seite in einer aktuellen Chrome oder Edge Version oder füge den Text ein.'); }
    const task = parser.getDocument({data: new Uint8Array(buffer), isEvalSupported: false, useWorkerFetch: false, useSystemFonts: false, disableFontFace: true, useWasm: false, enableXfa: false, verbosity: 0});
    try {
      const document = await task.promise;
      const pages = document.numPages;
      const collected = [], sparse = [];
      for (let n = 1; n <= pages; n++) {
        const page = await document.getPage(n);
        const {items} = await page.getTextContent();
        const text = pageText(items);
        if ((text.match(/\p{L}/gu) || []).length < 15) sparse.push(n);
        if (text) collected.push(text);
        page.cleanup();
      }
      const text = clean(collected.join('\n\n'));
      if (!/\p{L}{2}/u.test(text)) throw new Error('Dieses PDF enthält keinen erkennbaren Text. Bei einem Scan: Verwende die ursprüngliche Worddatei, speichere das PDF mit Texterkennung oder füge den Text selbst ein.');
      const warnings = ['Vergleiche Namen, Daten und die Reihenfolge mit dem Original. Bei mehreren Spalten kann der Text anders angeordnet sein.'];
      if (sparse.length) warnings.push('Sehr wenig Text auf Seite ' + sparse.join(', ') + '. Prüfe im Original, ob du Angaben aus einem Bild ergänzen möchtest.');
      return {text, warnings, pages};
    } catch (e) {
      if (e.name === 'PasswordException') throw new Error('Das PDF ist passwortgeschützt. Verwende eine entsperrte Kopie oder füge den Text aus dem geöffneten Dokument ein.');
      if (e instanceof Error && e.message.startsWith('Dieses PDF')) throw e;
      throw new Error('Dieses PDF konnte nicht gelesen werden. Öffne das Original, speichere es erneut als PDF oder füge den kopierten Text ein.');
    } finally {
      try { await task.destroy(); } catch {}
    }
  }

  async function read(file) {
    if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Bitte wähle eine PDF, DOCX oder TXT Datei.');
    if (file.size === 0) throw new Error('Die ausgewählte Datei ist leer.');
    if (file.size > 32 * MB) throw new Error('Die Datei ist grösser als 32 MB. Speichere den Lebenslauf als kleinere Kopie oder füge den Text ein.');
    const format = String(file.name || '').split('.').pop().toUpperCase();
    if (!['PDF', 'DOCX', 'TXT'].includes(format)) throw new Error('Wähle PDF, DOCX oder TXT. Eine ältere DOC Datei kannst du in Word als DOCX speichern.');
    let buffer;
    try { buffer = await file.arrayBuffer(); }
    catch { throw new Error('Dein Browser kann die Datei nicht öffnen. Wähle sie erneut von deinem Gerät aus.'); }
    const result = format === 'TXT' ? txt(buffer) : await (format === 'PDF' ? pdf(buffer) : docx(buffer));
    if (!result.text) throw new Error('Die Datei enthält keinen lesbaren Text. Wähle ein anderes Dokument oder füge deinen Text ein.');
    return {...result, name: String(file.name), format};
  }
  window.CVImport = Object.freeze({read});
})();
