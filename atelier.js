'use strict';
const el=id=>document.getElementById(id);
const controls=[...document.querySelectorAll('[data-stored]')];
const value=id=>el(id)?.value.trim()||'';
const CATEGORIES=[['Aufgaben und Arbeitsproben',35],['Kenntnisse und Voraussetzungen',25],['Arbeitsort und Arbeitsweg',15],['Arbeitszeit und Start',15],['Einstieg und Entwicklung',10]];
let notificationTimer, importedVersion=0, aiVersion=0, activeHelp=null, tipTimer, dirty=false;
const prompts=window.Bewerbungsmappe;
function say(message){clearTimeout(notificationTimer);el('status').textContent=message;notificationTimer=setTimeout(()=>{el('status').textContent=''},6500)}
function today(date=new Date()){return new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Berlin'}).format(date)}
function number(n){return n.toLocaleString('de-DE',{maximumFractionDigits:1})}
function safeChat(){try{const u=new URL(value('projectURL'));if(u.protocol==='https:'&&u.hostname==='chatgpt.com'&&!u.username&&!u.password&&!u.port)return u.href}catch{}return 'https://chatgpt.com/'}
function assess(){
 const job=Boolean(value('company')&&value('jobTitle'));let min=0,open=0,count=0;
 const lines=CATEGORIES.map(([title,weight],i)=>{const option=value('s'+i),why=value('b'+i);if(!why||!['1','0.5','0'].includes(option)){open+=weight;return title+': offen, bis zu '+weight+' Punkte'}const n=Number(option)*weight;min+=n;count++;return title+': '+number(n)+' von '+weight+' · '+why});
 const score=count&&job?(open?number(min)+' bis '+number(min+open):number(min))+' von 100 Punkten':'Bewertung offen';
 const v=today(), orig=value('original'), end=value('deadline');
 let note='Trage Stellentitel und Arbeitgeber ein.';
 if(job){if(end&&end<v)note='Auslassen. Die Frist ist abgelaufen.';
 else if(value('gate')==='stop'&&value('gateWhy'))note='Auslassen. '+value('gateWhy');
 else if(orig&&(Date.parse(v)-Date.parse(orig))/86400000>5)note='Für die Suche nach neuen Stellen zu alt. Erstveröffentlichung vor mehr als fünf Tagen.';
 else if(value('gate')!=='ok'||!value('gateWhy'))note='Erst klären. Prüfe die Pflichtanforderungen und ergänze deinen Beleg.';
 else if(!orig||orig>v||!/^https?:\/\/\S+$/i.test(value('url')))note='Erst klären. Prüfe Datum und Link der Originalanzeige.';
 else if(open)note='Erst klären. Zu mindestens einem Bereich fehlt ein Beleg.';
 else if(min>=75)note='Bewerbung vorbereiten. Schau vorher in die Stellenliste, ob es schon einen Eintrag gibt.';
 else if(min>=50)note='Erst klären. Frage nach dem Punkt, der für deine Entscheidung zählt.';
 else note='Auslassen. Die belegten Aufgaben überschneiden sich nur wenig.'}
 return {score,note,lines};
}
function collect(){const d=Object.fromEntries(controls.filter(c=>c.type!=='checkbox').map(c=>[c.id,c.value.trim()]));
 d.evidence=[d.evidence,d.projectNotes].filter(Boolean).join('\n');
 if(d.cv&&!el('confirmed').checked)d.cv='Ungeprüfte Abschrift. Bitte vor der Übernahme mit mir abgleichen.\n'+d.cv;
 if(d.ref)d.ad=(d.ad?d.ad+'\n\n':'')+'Kennnummer: '+d.ref;
 if(d.original)d.ad+='\nErstveröffentlichung: '+d.original;
 if(d.deadline)d.ad+='\nBewerbungsfrist: '+d.deadline;
 const a=assess();if(CATEGORIES.some((_,i)=>value('b'+i))||d.gateWhy)d.ad+='\n\nMeine bisherige Einschätzung\n'+[a.score,a.note,...a.lines].join('\n');
 d.model='Schnelles Standardmodell im eigenen ChatGPT Pro Konto';d.formAnswers=d.out_formular;return d;
}
function refresh(){
 const has=[el('confirmed').checked&&!!value('cv'),!!value('role'),!!value('evidence'),!!(value('company')&&value('jobTitle')&&(value('url')||value('ad')))];
 const n=has.filter(Boolean).length;el('progress').style.width=n*25+'%';el('progressText').textContent=n+' von 4 Grundlagen bereit';
 el('next').textContent=['Lebenslauf einfügen und mit der Originaldatei vergleichen.','Welche Rolle möchtest du übernehmen?','Nenne eine Aufgabe, die du selbst umgesetzt hast.','Trage die nächste konkrete Stellenanzeige ein.'][has.indexOf(false)]||'Deine Grundlagen sind bereit. Du kannst den Bewerbungsauftrag kopieren.';
 const a=assess();el('score').textContent=a.score;el('verdict').textContent=a.note;
 el('chatLink').href=safeChat();el('chatLink').firstChild.textContent=value('projectURL')&&safeChat()!=='https://chatgpt.com/'?'Mein Projekt öffnen ':'ChatGPT öffnen ';
}
function showText(text,scroll=false){el('preview').value=text;if(scroll)el('preview').scrollIntoView({block:'center'})}
async function copyText(text,label){if(!text.trim()){say('Füge zuerst den gewünschten Text ein.');return false}
 try{if(!navigator.clipboard||!window.isSecureContext)throw Error();await navigator.clipboard.writeText(text);say(label||'Kopiert. Du kannst den Text jetzt einfügen.');return true}catch{
 showText(text,true);el('preview').focus();el('preview').select();
 try{if(document.execCommand('copy')){say(label||'Text kopiert.');return true}}catch{}
 say('Der Text ist markiert. Wähle Kopieren oder drücke Strg + C.');return false}
}
function saveFile(data,name,mime='text/plain;charset=utf-8'){const blob=data instanceof Blob?data:new Blob([data],{type:mime});const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);say('Download vorbereitet: '+name)}
const planTimes='07:00, 09:00, 11:00, 13:00, 15:00, 17:00 und 19:00 Uhr';
function makePrompt(k){
 const d=collect(), a=assess();
 const search='Richte eine wiederkehrende Stellensuche täglich um '+planTimes+' in Europe/Berlin ein. Bestätige nur tatsächlich gespeicherte Laufzeiten. Wenn mehrere Uhrzeiten separat gespeichert werden müssen, führe mich durch die Einrichtung. Rolle: '+(d.role||'[Wunschrolle ergänzen]')+'. Region: '+(d.region||'[Region ergänzen]')+'. Rahmen: '+(d.constraints||'[Arbeitsweg, Pensum und Start ergänzen]')+'. Meine fachlichen Belege: '+(d.evidence||'[eigenes Beispiel eintragen]')+'. Geplante Aufgaben können hochgeladene Projektdateien nicht lesen. Frage nach fehlenden Kriterien. Suche bei Arbeitsagentur, Indeed, LinkedIn und den Originalarbeitgebern. Nenne nur erreichbare Quellen. Bevorzuge passende Inhouse Stellen und bestätigte Erstpublikationen der letzten fünf Tage. Sortiere neue Treffer nach Datum. Prüfe Reposts, Dubletten und Kennnummer. Gib Originaladresse, Aufgaben, eigenen Beleg, Lücke, Match als begründete Spanne, Arbeitsort, Arbeitsweg, Homeoffice, Stunden und Empfehlung an. Prüfe auch Frist und gelistete Gehaltsspanne. Melde fehlenden Zugriff. Schreibe nur bei neuem passendem Treffer oder einer zeitkritischen Rückmeldung. Die Bewerbung bereite ich nach meiner Entscheidung vor. Ich versende selbst.';
 switch(k){
 case 'projekt':return prompts.projekt(d);
 case 'regel':return prompts.projektregel();
 case 'bewerbung':return prompts.bewerbung(d)+'\n\nArbeite in Kopien von Lebenslauf.docx und Anschreiben.docx aus dem Bewerbungskit. Falls sie fehlen, bitte um beide Dateien. Behalte Textfelder, Spalten, Farben, Schriften, Fotoausschnitt und Abstände bei. Nutze nur meine belegten Angaben. Prüfe nach dem PDF Export zwei Seiten Lebenslauf und eine Seite Anschreiben.';
 case 'work':return prompts.work(d)+(d.out_formular?'\n\nMeine zur Übernahme vorgesehenen Formularantworten. Zeige sie mir vor Versand.\n'+d.out_formular:'');
 case 'cvauftrag':return 'Arbeite in Kopien von Lebenslauf.docx und Anschreiben.docx aus dem Bewerbungskit. Falls sie fehlen, bitte um beide Dateien. Behalte Textfelder, Spalten, Farben, Schriften, Fotoausschnitt und Abstände bei. Nutze nur meine belegten Angaben. Prüfe nach dem PDF Export zwei Seiten Lebenslauf und eine Seite Anschreiben. Überarbeite meinen Lebenslauf für die Zielrolle. Nutze das schnelle Standardmodell. Frage zuerst nach fehlenden Daten. Erhalte meine belegten Aufgaben und Zeiträume. Lege Eigenprojekte als solche offen. Gib mir danach den vollständigen Lebenslauf als Word Datei, wenn verfügbar, sonst als kopierbaren Text.\n\n'+prompts.profil(d)+'\n\n'+prompts.stelle(d);
 case 'brief':return 'Arbeite in Kopien von Lebenslauf.docx und Anschreiben.docx aus dem Bewerbungskit. Falls sie fehlen, bitte um beide Dateien. Behalte Textfelder, Spalten, Farben, Schriften, Fotoausschnitt und Abstände bei. Nutze nur meine belegten Angaben. Prüfe nach dem PDF Export zwei Seiten Lebenslauf und eine Seite Anschreiben. Entwirf ein einseitiges Anschreiben in meiner Sprache. Nimm eine konkrete Aufgabe aus der Anzeige und erkläre mit genau einem belegten Beispiel meinen Beitrag. Keine erfundenen Erfolge. Prüfe Arbeitgeber, Datum und Anrede. Liefere nach Möglichkeit Word, sonst den vollständigen Text.\n\n'+prompts.profil(d)+'\n\n'+prompts.stelle(d);
 case 'interview':return 'Übe mit mir das Gespräch für diese konkrete Stelle. Stelle jeweils eine Frage und warte auf meine Antwort. Beginne bei meiner Arbeitsprobe. Frage nach meinem Beitrag, einer Entscheidung und der Rückmeldung. Schlage dann eine Formulierung vor, die zu meinen belegten Erfahrungen passt.\n\n'+prompts.profil(d)+'\n\n'+prompts.stelle(d);
 case 'fit':return 'Vergleiche die Stelle mit meinem Profil. Verwende Aufgaben 35, Kenntnisse 25, Arbeitsweg 15, Arbeitszeit und Start 15, Entwicklung 10 Punkte. Für jeden belegten Bereich 0, halbe oder volle Punkte. Bei fehlendem Wissen zeige eine Spanne. Prüfe Pflichtanforderungen, Frist und frühere Bewerbung. Nenne zwei Stärken, eine Lücke, die Originalquelle und eine Entscheidung.\\n'.replace('\\n','\n')+prompts.profil(d)+'\n\n'+prompts.stelle(d)+'\n\nMeine Bewertung:\n'+[a.score,a.note,...a.lines].join('\n');
 case 'qa':return 'Prüfe meine fertige Bewerbung mit der Anzeige und meinem Profil. Markiere jede unklare Aussage mit Fundstelle. Prüfe Arbeitgeber, Daten, Anrede, Anhänge, Formularantworten und belegte Zahlen. Liste offene Punkte getrennt auf. Den Versand übernehme ich selbst.\n\n'+prompts.profil(d)+'\n\n'+prompts.stelle(d)+'\n\nEntwürfe\n'+[d.out_cv,d.out_brief,d.out_formular].filter(Boolean).join('\n\n');
 case 'pilot':return 'Hallo [Name], wer soll mit eurem nächsten [Anlass] erreicht werden? Ich würde gern einen kurzen Einladungstext dafür entwerfen. Für diesen ersten Entwurf und eine Korrekturrunde berechne ich nichts. Hättest du zehn Minuten, um mir von der Zielgruppe zu erzählen? Nach deinem Feedback entscheide ich mit dir, ob und was ich als Arbeitsprobe zeigen darf.';
 case 'case':return 'Hilf mir, eine Arbeitsprobe für '+(d.role||'meinen Einstieg ins Marketing')+' zu gestalten. Frage mich nach Zielgruppe, Ausgangslage, meinem Beitrag, Entwurf, Feedback und Erlaubnis zum Zeigen. Nutze Projektlandschaft.docx als Gestaltungsvorlage. Ersetze jedes Musterprojekt durch meine eigenen freigegebenen Inhalte und Bilder. Fehlt die Datei, bitte darum. Gib mir dann eine Projektseite für Word plus einen kurzen öffentlichen Webtext. Kennzeichne Übungen. Fehlt ein Projekt, schlage einen kleinen Probeauftrag für einen Verein in '+(d.region||'meiner Region')+' vor.\n\nMeine Notizen\n'+(d.evidence||'Noch offen.');
 case 'plan':return search;
 case 'end':return 'Richte täglich um 20:00 Uhr Europe/Berlin einen Tagesabschluss ein. Bestätige die gespeicherte Uhrzeit. Fasse neue verifizierte Stellen, Entscheidungen, offene Fristen, versandte Bewerbungen mit Beleg, Absagen und Einladungen zusammen. Nutze nur tatsächlich zugängliche Informationen. Fehlen die früheren Suchläufe, bitte um einen Auszug aus meiner Stellenliste. Ich entscheide über jede Bewerbung und sende selbst.';
 default:throw new Error('Dieser Auftrag ist nicht verfügbar.')}
}
function calendar(){
 const now=new Date(),day=today(now),parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now).split(':').map(Number);
 const next=new Date(Date.parse(day)+86400000).toISOString().slice(0,10), stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bewerbungsatelier//Suchplan//DE','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VTIMEZONE','TZID:Europe/Berlin','BEGIN:DAYLIGHT','DTSTART:19960331T020000','TZOFFSETFROM:+0100','TZOFFSETTO:+0200','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','END:DAYLIGHT','BEGIN:STANDARD','DTSTART:19961027T030000','TZOFFSETFROM:+0200','TZOFFSETTO:+0100','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','END:STANDARD','END:VTIMEZONE'];
 for(const hour of [7,9,11,13,15,17,19,20]){const hh=String(hour).padStart(2,'0'),dt=(hour*60<parts[0]*60+parts[1]?next:day).replace(/-/g,'');const title=hour===20?'Bewerbungen: Tagesabschluss':'Neue Stellen prüfen';lines.push('BEGIN:VEVENT','UID:stellenwerkstatt-'+hh+'@bewerbung.invalid','DTSTAMP:'+stamp,'DTSTART;TZID=Europe/Berlin:'+dt+'T'+hh+'0000','DURATION:PT10M','RRULE:FREQ=DAILY','SUMMARY:'+title,'TRANSP:TRANSPARENT','BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:'+title,'END:VALARM','END:VEVENT')}
 return lines.concat('END:VCALENDAR','').join('\r\n');
}
function backup(){
 const data=Object.fromEntries(controls.map(c=>[c.id,c.type==='checkbox'?c.checked:c.value]));saveFile(JSON.stringify({format:'bewerbungsatelier.v3',data},null,2),'Mein_Arbeitsstand.json','application/json');dirty=false;
}
function restoreItems(data){
 for(const c of controls){if(c.type==='checkbox')c.checked=data[c.id]===true;else{const v=typeof data[c.id]==='string'?data[c.id]:c.defaultValue||'';if(c.tagName==='SELECT')c.value=[...c.options].some(o=>o.value===v)?v:c.options[0].value;else c.value=v}}
 if(el('direct-result'))el('direct-result').value='';
 importedVersion++;aiVersion++;el('preview').value='';el('aiMode').textContent='Dein Browser prüft die Verfügbarkeit beim Start.';refresh();
}
function oldData(d){return {...d,role:d.role,region:d.area||'',jobTitle:d.job||'',constraints:[d.travel,d.hours,d.must,d.pref].filter(Boolean).join('\n'),evidence:[d.qual,d.proof,d.mine].filter(Boolean).join('\n'),projectNotes:[d.project,d.kind,d.need,d.sample,d.result,d.rights].filter(Boolean).join('\n')}}
async function restoreFile(file){
 if(!file)return;
 try{if(file.size>8*1024*1024)throw Error();const doc=JSON.parse(await file.text());if(!doc.data||typeof doc.data!=='object'||Array.isArray(doc.data)||!['bewerbungswerkstatt.v1','bewerbungsatelier.v3'].includes(doc.format))throw Error();
 if(dirty&&!confirm('Den aktuellen Arbeitsstand durch die gewählte Sicherung ersetzen?'))return;
 restoreItems(doc.format==='bewerbungswerkstatt.v1'?oldData(doc.data):doc.data);dirty=false;el('importStatus').textContent='Gesicherten Arbeitsstand geladen.';say('Arbeitsstand geladen.')}
 catch{say('Bitte wähle eine JSON Sicherung aus „Stand sichern“. Deine bisherigen Eingaben bleiben erhalten.')}
 finally{el('restoreFile').value=''}
}
async function readCV(file){
 if(!file)return;if(value('cv')&&!confirm('Den aktuellen Lebenslauftext durch diese Datei ersetzen?'))return;
 const rev=++importedVersion;el('importStatus').textContent='Datei wird auf deinem Gerät gelesen …';
 try{const result=await window.CVImport.read(file);if(rev!==importedVersion)return;el('cv').value=result.text;el('confirmed').checked=false;dirty=true;aiVersion++;el('aiText').value='';el('importStatus').textContent=[file.name+' eingelesen.',...(result.warnings||[])].join(' ');refresh();say('Lebenslauf eingelesen. Bitte prüfe den Text am Original.')}
 catch(err){if(rev===importedVersion)el('importStatus').textContent=err.message||'Datei konnte nicht gelesen werden. Füge den Text direkt ein.'}
 finally{el('cvFile').value=''}
}
function example(){
 if(dirty&&!confirm('Die aktuellen Eingaben durch das fiktive Beispiel ersetzen?'))return;
 restoreItems({name:'Lea Beispiel',role:'Marketingassistenz',region:'Hersbruck und Nürnberg',constraints:'30 bis 40 Stunden pro Woche',cv:'Fiktives Übungsprofil\nLea Beispiel\n2023 bis 2025 · Mitarbeit im Verkauf\nKundenfragen beantwortet und Informationen zu Veranstaltungen erklärt.',confirmed:true,evidence:'Fiktives Eigenprojekt: Einladung zu einem Lesekreis entworfen. Nach einer Rückfrage erklärt der erste Satz, dass auch Gäste ohne Vorbereitung willkommen sind.',company:'Musterverein (fiktiv)',jobTitle:'Marketingassistenz',ad:'Fiktive Übungsanzeige: Veranstaltungen ankündigen, Texte für Gäste schreiben und Termine mit dem Team abstimmen.',questions:'Welche eigene Arbeitsprobe passt zu dieser Aufgabe?'});
 dirty=true;el('importStatus').textContent='Fiktives Übungsprofil geladen. Ersetze die Beispiele durch deine eigenen Angaben.';say('Beispieldaten geladen. Du kannst alle Funktionen ausprobieren.');
}
async function run(action){
 const [cmd,arg]=action.split(':');
 if(cmd==='copy'||cmd==='file'){const text=makePrompt(arg);showText(text);if(cmd==='copy')return copyText(text);return saveFile(text,'Auftrag_'+({cvauftrag:'Lebenslauf',brief:'Anschreiben',bewerbung:'Bewerbung',fit:'Stellencheck',work:'Work_Formular',plan:'Suchplan',projekt:'Mein_Projekt',qa:'Schlusskontrolle',case:'Arbeitsprobe',interview:'Gespraech'}[arg]||arg)+'.txt')}
 if(cmd==='doc'){if(!value('out_'+arg))return say('Füge zuerst deinen geprüften Text in das zugehörige Feld ein.');const name=await window.AtelierWord.save(arg,value('out_'+arg),value('name'),value('jobTitle'),value('company'));return say('Word Datei vorbereitet: '+name)}
 if(cmd==='result')return copyText(value('out_'+arg));
 switch(cmd){
 case 'pick':return el('cvFile').click();
 case 'restore':return el('restoreFile').click();
 case 'backup':return backup();
 case 'demo':return example();
 case 'clear':if(confirm('Alle Eingaben in dieser Ansicht leeren? Heruntergeladene Dateien behältst du.')){restoreItems({});dirty=false;el('importStatus').textContent='Eingaben geleert.';say('Eingaben geleert.')}return;
 case 'calendar':return saveFile(calendar(),'Mein_Suchplan.ics','text/calendar;charset=utf-8');
 case 'privatzip':saveFile(prompts.paket(collect()),prompts.dateiname(collect()),'application/zip');return;
 case 'preview':showText(makePrompt('bewerbung'),true);return;
 case 'handoff':{const copied=await copyText(makePrompt('bewerbung'),'Inhalt kopiert. Füge ihn in deinem Chat ein.');if(copied){const a=document.createElement('a');a.href=safeChat();a.target='_blank';a.rel='noopener';a.click()}else{say('Kopiere den markierten Auftrag und öffne ChatGPT über den Link oben.')}return}
 case 'localai':{if(!value('cv')){el('cv').focus();return say('Füge zuerst deinen Lebenslauf ein. Für den direkten Weg ohne Formular nutze „In ChatGPT starten“.')}const rev=++aiVersion;const d=collect();el('aiMode').textContent='Profilhilfe prüft die lokale Verfügbarkeit …';try{const result=await window.Profilhilfe.entwurf(d);if(rev!==aiVersion)return;el('aiText').value=result.text;el('aiMode').textContent=result.mode==='lokal'?'Vorschlag aus der KI auf deinem Gerät. Vergleiche die Sätze mit dem Original.':'Persönlicher Auftrag für deinen Chat. Auf diesem Gerät liegt kein nutzbarer lokaler Vorschlag vor.';dirty=true}catch{if(rev===aiVersion){el('aiText').value=makePrompt('cvauftrag');el('aiMode').textContent='Auftrag für deinen Chat. Kopiere ihn und füge ihn im Projekt ein.'}}return}
 case 'copyAI':return copyText(value('aiText'));
 case 'fileAI':if(!value('aiText'))return say('Erstelle zuerst deinen Profilvorschlag.');return saveFile(value('aiText'),'Mein_Profilvorschlag.txt');
 }}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;try{await run(b.dataset.act)}catch(err){say(err.message||'Das hat nicht geklappt. Prüfe deine Eingaben und versuche es erneut.')}});
el('cvFile').addEventListener('change',e=>readCV(e.target.files[0]));el('restoreFile').addEventListener('change',e=>restoreFile(e.target.files[0]));
for(const name of ['dragenter','dragover','dragleave','drop'])el('drop').addEventListener(name,e=>{e.preventDefault();el('drop').classList.toggle('active',['dragenter','dragover'].includes(name));if(name==='drop')readCV(e.dataTransfer.files[0])});
for(const c of controls)c.addEventListener('input',()=>{dirty=true;if(c.id==='cv'){el('confirmed').checked=false;importedVersion++;aiVersion++}if(['role','evidence','region'].includes(c.id))aiVersion++;refresh()});
function dismissTip(){clearTimeout(tipTimer);if(activeHelp){activeHelp.setAttribute('aria-expanded','false');activeHelp.removeAttribute('aria-describedby')}activeHelp=null;el('helpTip').hidden=true}
function positionTip(){if(!activeHelp)return;const box=activeHelp.getBoundingClientRect(),tip=el('helpTip');tip.style.left=Math.max(7,Math.min(innerWidth-tip.offsetWidth-7,box.left-7))+'px';tip.style.top=(box.bottom+tip.offsetHeight+10>innerHeight?Math.max(8,box.top-tip.offsetHeight-6):box.bottom+6)+'px'}
function showTip(b){clearTimeout(tipTimer);if(activeHelp&&activeHelp!==b)dismissTip();activeHelp=b;b.setAttribute('aria-expanded','true');b.setAttribute('aria-describedby','helpTip');const t=el('helpTip');t.textContent=b.dataset.tip;t.hidden=false;positionTip()}
for(const b of document.querySelectorAll('button.help')){b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')showTip(b)});b.addEventListener('pointerleave',()=>{tipTimer=setTimeout(dismissTip,230)});b.addEventListener('focus',()=>showTip(b));b.addEventListener('blur',()=>{tipTimer=setTimeout(dismissTip,160)});b.addEventListener('click',()=>showTip(b))}
el('helpTip').addEventListener('pointerenter',()=>clearTimeout(tipTimer));el('helpTip').addEventListener('pointerleave',dismissTip);document.addEventListener('pointerdown',e=>{if(!e.target.closest('.help,#helpTip'))dismissTip()});document.addEventListener('keydown',e=>{if(e.key==='Escape')dismissTip()});window.addEventListener('resize',positionTip);window.addEventListener('scroll',positionTip,{passive:true});
if('IntersectionObserver' in window){const links=[...document.querySelectorAll('[data-nav]')];const obs=new IntersectionObserver(entries=>{const first=entries.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(first)for(const a of links){if(a.dataset.nav===first.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')}},{rootMargin:'-2% 0px -66% 0px'});links.forEach(a=>{const target=el(a.dataset.nav);if(target)obs.observe(target)})}
if(location.protocol==='file:')for(const a of document.querySelectorAll('[data-kit]')){a.href='#dateien';a.removeAttribute('download');a.lastChild.textContent=' Vorlagen ansehen'}
refresh();
