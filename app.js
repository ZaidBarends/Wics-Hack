// Consolidated app.js - single implementation
// Placeholders for inline onclick handlers (prevents ReferenceError if user clicks before script finishes)
//if(!window.handleCompleteClick) window.handleCompleteClick = function(){ console.debug('handleCompleteClick: app not initialized yet') }
if(!window.handleBackClick) window.handleBackClick = function(){ console.debug('handleBackClick: app not initialized yet'); document.getElementById('lesson-area') && (document.getElementById('lesson-area').hidden = true); document.getElementById('lessons') && (document.getElementById('lessons').hidden = false) }
if(!window.handleReadLesson) window.handleReadLesson = function(){ console.debug('handleReadLesson: app not initialized yet') }
if(!window.handleDownloadCert) window.handleDownloadCert = function(){ console.debug('handleDownloadCert: app not initialized yet') }
const lessonsUrl = 'lessons.json';
const stateKey = 'dpa:state';
let state = JSON.parse(localStorage.getItem(stateKey) || '{}');
if(!state.completed) state.completed = {};
let __dragging = null;

function $(sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }

async function loadLessons(){ const res = await fetch(lessonsUrl); return res.json() }

function renderLessons(lessons){
  const list = $('#lesson-list'); list.innerHTML = '';
  const tpl = document.getElementById('lesson-card-template');
  for(const lesson of lessons){
    const node = tpl.content.cloneNode(true);
  const img = node.querySelector('.lesson-thumb')
  if(img && lesson.image){ img.src = lesson.image; img.alt = lesson.title + ' icon'; img.style.display = '' } else if(img) { img.style.display = 'none' }
  node.querySelector('.title').textContent = lesson.title;
  node.querySelector('.summary').textContent = lesson.summary;
    const btn = node.querySelector('.start'); btn.addEventListener('click', ()=> openLesson(lesson));
    list.appendChild(node);
  }
}

function openLesson(lesson){
  $('#lessons').hidden = true; $('#lesson-area').hidden = false;
  $('#lesson-title').textContent = lesson.title; $('#lesson-body').innerHTML = '<p>'+lesson.body+'</p>';
  renderChallenge(lesson.challenge);
  const completeBtn = $('#complete-lesson');
  if(state.completed[lesson.id]){ showBadge(`Completed: ${lesson.title}`); if(completeBtn) completeBtn.textContent = 'Completed' }
  else { if(completeBtn) completeBtn.textContent = 'Mark Complete' }
}

function renderChallenge(challenge){
  const c = $('#challenge'); c.innerHTML = '';
  const left = document.createElement('div'); left.className = 'pane';
  left.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' });
  left.addEventListener('drop', e => {
    e.preventDefault(); const item = e.dataTransfer.getData('text/plain') || (__dragging && __dragging.dataset && __dragging.dataset.value); if(!item) return;
    const allPlaced = Array.from(document.querySelectorAll('.placed-item'));
    const already = allPlaced.find(el=>el.dataset.value===item); if(already) already.remove();
    const existingSource = Array.from(document.querySelectorAll('.source-item')).find(s=>s.querySelector && s.querySelector('.draggable') && s.querySelector('.draggable').dataset.value===item);
    if(!existingSource) left.appendChild(createSourceWrapper(item)); __dragging = null; checkChallenge();
  });

  const right = document.createElement('div'); right.className = 'pane targets';
  for(const item of challenge.items) left.appendChild(createSourceWrapper(item));
  for(const t of challenge.targets){
    const target = document.createElement('div'); target.className = 'target'; target.dataset.expect = t.expect; target.innerHTML = '<strong>'+t.label+'</strong>';
    target.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' });
    target.addEventListener('drop', e => {
      e.preventDefault(); const item = e.dataTransfer.getData('text/plain') || (__dragging && __dragging.dataset && __dragging.dataset.value); if(!item) return;
      const allPlaced = Array.from(document.querySelectorAll('.placed-item'));
      const already = allPlaced.find(el=>el.dataset.value===item); if(already && already !== __dragging) already.remove();
      const existing = target.querySelector('.placed-item'); if(existing){ document.querySelector('.pane').appendChild(createSourceWrapper(existing.dataset.value)); existing.remove() }
      let placedEl = null; if(__dragging && __dragging.classList && __dragging.classList.contains('placed-item')) placedEl = __dragging; else placedEl = createPlaced(item);
      placedEl.dataset.value = item; target.appendChild(placedEl);
      if(__dragging){ const srcWrap = __dragging.closest && __dragging.closest('.source-item'); if(srcWrap) srcWrap.remove() }
      checkChallenge();
    });
    right.appendChild(target);
  }
  c.appendChild(left); c.appendChild(right);
}

function speak(text){ if(!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const utter = new SpeechSynthesisUtterance(text); utter.rate = 0.95; window.speechSynthesis.speak(utter) }

function createDraggable(value){ const d = document.createElement('div'); d.className = 'draggable'; d.draggable = true; d.textContent = value; d.dataset.value = value; d.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', value); e.dataTransfer.effectAllowed='move'; __dragging = d }); d.addEventListener('dragend', e=>{ __dragging = null }); return d }

function createPlaced(value){
  const wrap = document.createElement('div'); wrap.className = 'placed-item'; wrap.dataset.value = value;
  const span = document.createElement('div'); span.textContent = value;
  const btn = document.createElement('button'); btn.className = 'remove'; btn.title = 'Remove'; btn.setAttribute('aria-label','Remove item'); btn.innerHTML = '✕';
  btn.addEventListener('click', ()=>{ document.querySelector('.pane').appendChild(createSourceWrapper(value)); wrap.remove(); checkChallenge() });
  wrap.appendChild(span); wrap.appendChild(btn);
  wrap.draggable = true; wrap.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', value); e.dataTransfer.effectAllowed='move'; __dragging = wrap }); wrap.addEventListener('dragend', e=>{ __dragging = null });
  return wrap;
}

function createSourceWrapper(value){ const wrapper = document.createElement('div'); wrapper.className = 'source-item'; const d = createDraggable(value); const read = document.createElement('button'); read.className = 'read-item'; read.textContent = '🔊'; read.title = 'Read item'; read.setAttribute('aria-label','Read item aloud'); read.addEventListener('click', ()=> speak(value)); wrapper.style.display = 'flex'; wrapper.style.justifyContent = 'space-between'; wrapper.appendChild(d); wrapper.appendChild(read); return wrapper }

function checkChallenge(){
  const targets = $all('.target'); let allCorrect = true;
  for(const t of targets){ const placed = t.querySelector('.placed-item'); if(!placed){ allCorrect = false; break } if((placed.dataset.value||'').trim() !== t.dataset.expect){ allCorrect = false; break } }
  const completeBtn = $('#complete-lesson'); if(allCorrect){ if(completeBtn) completeBtn.textContent = 'Mark Complete' }
}

function validateChallenge(){
  const targets = $all('.target'); let allCorrect = true;
  for(const t of targets){ const placed = t.querySelector('.placed-item'); if(!placed || (placed.dataset.value||'').trim() !== t.dataset.expect){ allCorrect = false; t.classList.add('bad'); t.classList.remove('ok') } else { t.classList.remove('bad'); t.classList.add('ok') } }
  return allCorrect;
}

function showBadge(text){ const existing = Array.from(document.querySelectorAll('.badge')).find(x=>x.textContent===text); if(existing) return; const b = document.createElement('div'); b.className = 'badge'; b.textContent = text; $('#badges').appendChild(b); try{ animateBadge(b) }catch(e){} }

function saveState(){ localStorage.setItem(stateKey, JSON.stringify(state)) }

function markLessonComplete(lesson){
  console.debug('markLessonComplete', lesson && lesson.id)
  state.completed[lesson.id] = true
  saveState()
  showBadge(`Completed: ${lesson.title}`)
  const completeBtn = $('#complete-lesson')
  if(completeBtn) completeBtn.textContent = 'Completed'
  // Refresh lesson list and re-open current lesson to show updated UI immediately
  if(window.lessons){ renderLessons(window.lessons); const current = (window.lessons||[]).find(l=>l.id===lesson.id); if(current) openLesson(current) }
}

function showToast(message, onConfirm){
  const wrapper = document.querySelector('.toast-wrapper'); const t = $('#toast'); const msg = $('#toast-msg'); const confirm = $('#toast-confirm'); const cancel = $('#toast-cancel'); if(!t || !msg || !confirm || !cancel) return;
  try{
  msg.textContent = message; if(wrapper){ wrapper.hidden = false; wrapper.style.display = 'flex' } t.hidden = false; confirm.disabled = false;
    const AUTO_HIDE_MS = 5000; let timeout = setTimeout(()=>{ cleanup() }, AUTO_HIDE_MS);
  const cleanup = ()=>{ clearTimeout(timeout); t.hidden = true; confirm.onclick = null; cancel.onclick = null; const closeBtn = document.getElementById('toast-close'); if(closeBtn) closeBtn.onclick = null; if(wrapper){ wrapper.style.display = 'none'; wrapper.hidden = true } window.removeEventListener('keydown', keyHandler) };
  confirm.onclick = ()=>{ try{ console.debug('toast confirm clicked'); onConfirm && onConfirm(); } finally { cleanup() } };
    cancel.onclick = ()=>{ cleanup() };
    const closeBtn = document.getElementById('toast-close'); if(closeBtn){ closeBtn.onclick = ()=>{ cleanup() } }
    const keyHandler = (ev)=>{ if(ev.key === 'Escape'){ cleanup() } };
    window.addEventListener('keydown', keyHandler);
  }catch(err){ console.error('toast failed', err); try{ onConfirm && onConfirm() }catch(e){} }
}

function animateBadge(node){ if(!node) return; if(node.animate && typeof node.animate === 'function'){ node.animate([{ transform: 'scale(0.8)', opacity: 0 },{ transform: 'scale(1.05)', opacity: 1 },{ transform: 'scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)' }) } else { node.style.transform = 'scale(0.98)'; node.style.opacity = '0'; setTimeout(()=>{ node.style.transition = 'transform .28s ease, opacity .28s ease'; node.style.transform = 'scale(1)'; node.style.opacity = '1' }, 10) } }

// Global handlers for inline onclick attributes
window.handleBackClick = function(){ $('#lesson-area').hidden = true; $('#lessons').hidden = false }
window.handleReadLesson = function(){ const title = $('#lesson-title').textContent || ''; const body = $('#lesson-body').textContent || ''; if(title) speak(title + '. ' + body) }
window.handleCompleteClick = function(){ try{ const ok = validateChallenge(); if(ok){ const lid = $('#lesson-title').textContent && (window.lessons||[]).find(l=>l.title===$('#lesson-title').textContent); if(lid) showToast(`Mark "${lid.title}" as complete?`, ()=> markLessonComplete(lid)) } else { speak('Some items are incorrect. Please try again.'); const firstBad = document.querySelector('.target.bad'); if(firstBad) firstBad.scrollIntoView({behavior:'smooth',block:'center'}) } }catch(err){ console.error('handleCompleteClick failed', err) } }
window.handleDownloadCert = function(){
  const completedIds = Object.keys(state.completed);
  const completedTitles = (window.lessons||[]).filter(l=>completedIds.includes(l.id)).map(l=>l.title);
  if(typeof window.jspdf !== 'undefined' || (window.jspdf && window.jspdf.jsPDF) || (window.jspdf && window.jspdf.default)){
    try{
      const { jsPDF } = window.jspdf || window.jspdf || window.jspdf;
      const pdf = new jsPDF({unit:'pt', format:'a4'});
      const title = 'Certificate of Completion';
      pdf.setFillColor(255,209,220);
      pdf.rect(0,0,595,842,'F');
      pdf.setTextColor(43,43,58);
      pdf.setFontSize(28);
      pdf.text(title, 50, 120);
      pdf.setFontSize(14);
      pdf.text('This certificate is awarded for completing lessons in the Digital Problem-Solving Academy.', 50, 160, {maxWidth:495});
      pdf.setFontSize(16);
      pdf.text('Completed lessons:', 50, 210);
      pdf.setFontSize(12);
      let y = 240;
      for(const t of completedTitles){ pdf.text('- ' + t, 60, y); y += 20 }
      if(completedTitles.length === 0){ pdf.text('- (none yet)', 60, y); }
      pdf.setFontSize(10);
      pdf.text('Date: ' + new Date().toLocaleDateString(), 50, 780);
      pdf.save('certificate.pdf');
      return;
    }catch(err){ console.error('pdf generation failed', err) }
  }
  // fallback to text file
//   const content = ['Certificate of completion', '', 'Completed lessons:', ...completedTitles].join('\n');
//   const doc = document.createElement('a');
//   const blob = new Blob([content],{type:'text/plain'});
//   doc.href = URL.createObjectURL(blob);
//   doc.download = 'certificate.txt';
//   doc.click();
}

function init(){
  loadLessons().then(lessons=>{ window.lessons = lessons; renderLessons(lessons) })

  const back = $('#back'); if(back) back.addEventListener('click', ()=>{ $('#lesson-area').hidden = true; $('#lessons').hidden = false })
  const readBtn = $('#read-lesson'); if(readBtn) readBtn.addEventListener('click', ()=>{ const title = $('#lesson-title').textContent || ''; const body = $('#lesson-body').textContent || ''; if(title) speak(title + '. ' + body) })

  const completeBtn = $('#complete-lesson'); if(completeBtn){ const handler = ()=>{ try{ console.debug('completeBtn clicked'); const ok = validateChallenge(); if(ok){ const lid = $('#lesson-title').textContent && (window.lessons||[]).find(l=>l.title===$('#lesson-title').textContent); if(lid) showToast(`Mark "${lid.title}" as complete?`, ()=> markLessonComplete(lid)) } else { speak('Some items are incorrect. Please try again.'); const firstBad = document.querySelector('.target.bad'); if(firstBad) firstBad.scrollIntoView({behavior:'smooth',block:'center'}) } }catch(err){ console.error('complete handler failed', err) } }; completeBtn.addEventListener('click', handler); window.handleCompleteClick = handler; completeBtn.onclick = window.handleCompleteClick }

  const download = $('#download-cert'); if(download) download.addEventListener('click', ()=>{ const completedIds = Object.keys(state.completed); const completedTitles = (window.lessons||[]).filter(l=>completedIds.includes(l.id)).map(l=>l.title); const content = [`Certificate of completion`, ``, `Completed lessons:`, ...completedTitles].join('\n'); const doc = document.createElement('a'); const blob = new Blob([content],{type:'text/plain'}); doc.href = URL.createObjectURL(blob); doc.download = 'certificate.txt'; doc.click() })
}

init();

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{})
