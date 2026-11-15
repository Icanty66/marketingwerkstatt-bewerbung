/* Wordexport für freigegebene Texte. Die Dokumente werden auf dem Gerät aufgebaut. */
(() => {
  'use strict';
  const descriptions = {
    cv: 'Lebenslauf',
    brief: 'Anschreiben',
    formular: 'Formularantworten',
    projekt: 'Projektmappe'
  };
  const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const packageRels = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const officeRels = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  function escape(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  }

  function usableFilename(text) {
    return String(text || '').normalize('NFC')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
  }

  function filename(kind, name, job, company) {
    const parts = [descriptions[kind], name, company, job]
      .map(usableFilename).filter(Boolean);
    return [...new Set(parts)].join(' · ').slice(0, 144).trim() + '.docx';
  }

  function paragraphStyle(kind, line, name, job) {
    const content = line.trim();
    if (!content) return 'Gap';
    const simple = content.replace(/:$/, '').toLocaleLowerCase('de');
    if (kind === 'brief') {
      return /^(bewerbung\s+(als|um|auf|für)|betreff\s*:|initiativbewerbung\b)/i.test(content) && content.length < 165 ? 'Subject' : 'Normal';
    }
    if (kind === 'cv' && (simple === 'lebenslauf' || (name && simple === name.trim().toLocaleLowerCase('de')))) return 'Title';
    if (kind === 'projekt' && /^(projektmappe|projektportfolio|arbeitsproben|mein portfolio)$/i.test(content)) return 'Title';
    if (kind === 'formular' && /^(formularantworten|antworten zum bewerbungsformular)$/i.test(content)) return 'Title';
    if (kind === 'formular' && (content.endsWith('?') || /^frage\s+\d+/i.test(content)) && content.length < 180) return 'Section';
    if (/^(kurzprofil|profil|persönliches profil|berufsprofil|berufserfahrung|beruflicher werdegang|berufspraxis|berufliche stationen|praktische erfahrung|ausbildung|bildung|bildungsweg|weiterbildung|weiterbildungen|studium|kenntnisse|kenntnisse und fähigkeiten|kompetenzen|sprachen|sprachkenntnisse|projekte|ausgewählte projekte|projektarbeit|ehrenamt|engagement|werkzeuge|software|kontakt|arbeitsproben|ausgangslage|aufgabe|ziel|mein beitrag|vorgehen|umsetzung|ergebnis|erkenntnis|nächster schritt)$/i.test(simple)) return 'Section';
    if (kind === 'cv' && job && simple === job.trim().toLocaleLowerCase('de')) return 'Role';
    return 'Normal';
  }

  function runs(line) {
    // Tabs and explicit breaks use their native Word elements, leaving
    // every regular text segment, including leading spaces, unmodified.
    return line.split(/([\t\v\f])/u).filter(part => part !== '').map(part => {
      if (part === '\t') return '<w:r><w:tab/></w:r>';
      if (part === '\v') return '<w:r><w:br/></w:r>';
      if (part === '\f') return '<w:r><w:br w:type="page"/></w:r>';
      return '<w:r><w:t xml:space="preserve">' + escape(part) + '</w:t></w:r>';
    }).join('');
  }

  function paragraphs(kind, text, name, job) {
    return text.replace(/\r\n?/g, '\n').split('\n').map(line => {
      const style = paragraphStyle(kind, line, name, job);
      return '<w:p><w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' + runs(line) + '</w:p>';
    }).join('');
  }

  const styles = declaration + `<w:styles xmlns:w="${wordNamespace}">
    <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:cs="Arial"/><w:color w:val="293440"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="de-DE"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="30" w:line="272" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
    <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="0" w:after="110"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="202933"/><w:sz w:val="42"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Section"><w:name w:val="Abschnitt"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="120" w:after="40"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="007C85"/><w:sz w:val="25"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Role"><w:name w:val="Position"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="60"/></w:pPr><w:rPr><w:color w:val="007C85"/><w:sz w:val="25"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Subject"><w:name w:val="Betreff"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:shd w:fill="ECF5F5"/><w:spacing w:before="120" w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="202933"/><w:sz w:val="28"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Gap"><w:name w:val="Leerzeile"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="0" w:line="140" w:lineRule="exact"/></w:pPr><w:rPr><w:sz w:val="14"/></w:rPr></w:style>
  </w:styles>`;

  async function save(kind, text, name = '', jobTitle = '', company = '') {
    if (!Object.hasOwn(descriptions, kind)) throw new Error('Bitte wähle eine unterstützte Dokumentart.');
    if (typeof text !== 'string' || !text.trim()) throw new Error('Füge zuerst den geprüften Text für dieses Dokument ein.');
    if (/[\x00-\x08\x0E-\x1F\uFFFE\uFFFF]/u.test(text)) throw new Error('Der Text enthält ein unsichtbares Steuerzeichen. Kopiere ihn erneut als Klartext und prüfe ihn vor dem Speichern.');
    if (!window.JSZip) throw new Error('Der Wordexport konnte nicht geladen werden. Öffne das vollständig entpackte Kit oder die Onlineversion.');

    const zip = new window.JSZip();
    const rel = (id, type, target) => '<Relationship Id="' + id + '" Type="' + type + '" Target="' + target + '"/>';
    const title = [descriptions[kind], usableFilename(name), usableFilename(company), usableFilename(jobTitle)].filter(Boolean).join(' · ');
    const doc = `<w:document xmlns:w="${wordNamespace}"><w:body>${paragraphs(kind, text, String(name || ''), String(jobTitle || ''))}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1304" w:right="1361" w:bottom="1191" w:left="1417" w:header="650" w:footer="650" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    zip.file('[Content_Types].xml', declaration + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
    zip.file('_rels/.rels', declaration + '<Relationships xmlns="' + packageRels + '">' + rel('rId1', officeRels + '/officeDocument', 'word/document.xml') + rel('rId2', packageRels + '/metadata/core-properties','docProps/core.xml') + '</Relationships>');
    zip.file('word/_rels/document.xml.rels', declaration + '<Relationships xmlns="' + packageRels + '">' + rel('rId1', officeRels + '/styles', 'styles.xml') + '</Relationships>');
    zip.file('word/document.xml', declaration + doc);
    zip.file('word/styles.xml', styles);
    zip.file('docProps/core.xml', declaration + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>' + escape(title) + '</dc:title><dc:language>de</dc:language></cp:coreProperties>');

    const file = await zip.generateAsync({type: 'blob', compression: 'DEFLATE', mimeType: mime});
    const downloadName = filename(kind, name, jobTitle, company);
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url; link.download = downloadName;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return downloadName;
  }

  window.AtelierWord = Object.freeze({save});
})();

