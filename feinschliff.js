(()=>{
const role=document.getElementById('role');
if(role){const box=document.createElement('div');box.className='rolesuggestions';box.setAttribute('aria-label','Berufsvorschläge');role.after(box);const titles=['Marketingassistenz','Marketing Manager','Content Marketing','Social Media Manager','CRM Manager','Performance Marketing','Kommunikationsassistenz','Kauffrau für Büromanagement','Kaufmann für Büromanagement','Verkäuferin','Verkäufer','Mediengestalterin','Eventmanager','Projektassistenz','Personalassistenz','Redakteurin','Grafikdesignerin'];role.addEventListener('input',()=>{box.replaceChildren();const bits=role.value.split(/[,;]/),query=bits.at(-1).trim().toLowerCase();if(query.length<2)return;for(const title of titles.filter(t=>t.toLowerCase().includes(query)).slice(0,6)){const b=document.createElement('button');b.type='button';b.textContent=title;b.onclick=()=>{bits[bits.length-1]=title;role.value=bits.join(', ');role.dispatchEvent(new Event('input',{bubbles:true}));box.replaceChildren();role.focus()};box.append(b)}})}
document.querySelectorAll('#radar').forEach(svg=>{const recolor=()=>svg.querySelectorAll('[fill="#23528d"]').forEach(n=>n.setAttribute('fill','#123263'));new MutationObserver(recolor).observe(svg,{childList:true});recolor()});
const summary=document.getElementById('summaryRole');if(summary){const note=document.createElement('p');note.className='promptgoal';summary.after(note);function evidence(){const hints=[...document.querySelectorAll('#tasks small')];const count=hints.filter(n=>n.textContent.trim()).length;note.textContent=count+' von '+hints.length+' Aufgaben mit möglicher Textstelle im Lebenslauf. Die Treffer beruhen auf Suchwörtern. Prüfe sie mit dem Analyseprompt in ChatGPT. Die Punkte in der Grafik zeigen deine eigene Einschätzung.'}new MutationObserver(evidence).observe(document.getElementById('tasks'),{childList:true,subtree:true});evidence()}
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('reveal');observer.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('section').forEach(s=>observer.observe(s));
if(location.pathname.endsWith('anleitung.html'))document.querySelectorAll('article').forEach(a=>{const paragraphs=a.querySelectorAll('p');if(paragraphs[1]){paragraphs[1].classList.add('promptgoal');paragraphs[1].prepend('Das bekommst du · ')}});
})();

const roadSteps = document.querySelectorAll('[data-roadstep]');
if (roadSteps.length) {
 const roadObserver = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('currentstep', entry.isIntersecting);
 }, {rootMargin:'-12% 0px -45% 0px'});
 roadSteps.forEach(step => roadObserver.observe(step));
}
