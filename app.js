// Consolidated app.js - single implementation
// Placeholders for inline onclick handlers (prevents ReferenceError if user clicks before script finishes)
//if(!window.handleCompleteClick) window.handleCompleteClick = function(){ console.debug('handleCompleteClick: app not initialized yet') }
if(!window.handleBackClick) window.handleBackClick = function(){ console.debug('handleBackClick: app not initialized yet'); document.getElementById('lesson-area') && (document.getElementById('lesson-area').hidden = true); document.getElementById('lessons') && (document.getElementById('lessons').hidden = false) }
if(!window.handleReadLesson) window.handleReadLesson = function(){ console.debug('handleReadLesson: app not initialized yet') }
if(!window.handleDownloadCert) window.handleDownloadCert = function(){ console.debug('handleDownloadCert: app not initialized yet') }
const lessonsUrl = 'lessons.json';
const stateKey = 'dpa:state';
const langKey = 'dpa:lang';
let state = JSON.parse(localStorage.getItem(stateKey) || '{}');
if(!state.completed) state.completed = {};
let __dragging = null;
let currentLang = localStorage.getItem(langKey) || 'en';

// Minimal translations. Keys used in UI and some labels.
const i18n = {
  en: {
    'app.tagline': 'Micro-lessons that teach computing without code',
    'lessons.title': 'Lessons',
    'progress.title': 'Your Progress',
    'controls.mark_complete': 'Mark Complete',
    'controls.completed': 'Completed',
  'toast.confirm': 'Confirm completion?',
  'toast.confirm_btn': 'Confirm',
  'toast.cancel_btn': 'Cancel',
    'download.cert': 'Download Certificate'
  },
  af: {
    'app.tagline': 'Micro-lesse wat rekenaarideeë sonder kode leer',
    'lessons.title': 'Lesse',
    'progress.title': 'Jou vordering',
    'controls.mark_complete': 'Merk as voltooi',
    'controls.completed': 'Voltooi',
  'toast.confirm': 'Bevestig voltooiing?',
  'toast.confirm_btn': 'Bevestig',
  'toast.cancel_btn': 'Kanselleer',
    'download.cert': 'Laai Sertifikaat af'
  },
  xh: {
    'app.tagline': 'Izifundo ezimfutshane ezifundisa iinkqubo ngaphandle kwekhowudi',
    'lessons.title': 'Izifundo',
    'progress.title': 'Inkqubela yakho',
    'controls.mark_complete': 'Marka Ugqibile',
    'controls.completed': 'Igqityiweyo',
  'toast.confirm': 'Qinisekisa ukuqeda?',
  'toast.confirm_btn': 'Qinisekisa',
  'toast.cancel_btn': 'Khansela',
    'download.cert': 'Khuphela Isatifikethi'
  }
};

function t(key){ return (i18n[currentLang] && i18n[currentLang][key]) || (i18n['en'][key] || key) }

function $(sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }

async function loadLessons(){ const res = await fetch(lessonsUrl); return res.json() }

function renderLessons(lessons){
  // set localized header
  const lessonsHeading = document.querySelector('#lessons h2'); if(lessonsHeading) lessonsHeading.textContent = t('lessons.title');
  const list = $('#lesson-list'); list.innerHTML = '';
  const tpl = document.getElementById('lesson-card-template');
  for(const lesson of lessons){
    const node = tpl.content.cloneNode(true);
    const img = node.querySelector('.lesson-thumb')
    if(img && lesson.image){ img.src = lesson.image; img.alt = lesson.title + ' icon'; img.style.display = '' } else if(img) { img.style.display = 'none' }
    // lesson title/summary may have language variants: title_en, title_af, title_xh
    const lt = lesson['title_'+currentLang] || lesson.title;
    const ls = lesson['summary_'+currentLang] || lesson.summary || '';
    node.querySelector('.title').textContent = lt;
    node.querySelector('.summary').textContent = ls;
    const btn = node.querySelector('.start'); btn.addEventListener('click', ()=> openLesson(lesson));
    list.appendChild(node);
  }
}

function openLesson(lesson){
  $('#lessons').hidden = true; $('#lesson-area').hidden = false;
  const title = lesson['title_'+currentLang] || lesson.title;
  const body = lesson['body_'+currentLang] || lesson.body || '';
  $('#lesson-title').textContent = title; $('#lesson-body').innerHTML = '<p>'+body.replace(/\n/g,'<br>')+'</p>';
  renderChallenge(lesson.challenge);
  const completeBtn = $('#complete-lesson');
  if(state.completed[lesson.id]){ showBadge(`Completed: ${title}`); if(completeBtn) completeBtn.textContent = t('controls.completed') }
  else { if(completeBtn) completeBtn.textContent = t('controls.mark_complete') }
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
    const target = document.createElement('div'); target.className = 'target'; target.dataset.expect = t.expect; const lbl = t['label_'+currentLang] || t.label; target.innerHTML = '<strong>'+lbl+'</strong>';
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

function createDraggable(value){ const d = document.createElement('div'); d.className = 'draggable'; d.draggable = true; d.textContent = value; d.dataset.value = value; d.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', value); e.dataTransfer.effectAllowed='move'; __dragging = d }); d.addEventListener('dragend', e=>{ __dragging = null });
  // touch support
  try{ addTouchDrag(d) }catch(e){}
  return d }

function createPlaced(value){
  const wrap = document.createElement('div'); wrap.className = 'placed-item'; wrap.dataset.value = value;
  const span = document.createElement('div'); span.textContent = value;
  const btn = document.createElement('button'); btn.className = 'remove'; btn.title = 'Remove'; btn.setAttribute('aria-label','Remove item'); btn.innerHTML = '✕';
  btn.addEventListener('click', ()=>{ document.querySelector('.pane').appendChild(createSourceWrapper(value)); wrap.remove(); checkChallenge() });
  wrap.appendChild(span); wrap.appendChild(btn);
  wrap.draggable = true; wrap.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', value); e.dataTransfer.effectAllowed='move'; __dragging = wrap }); wrap.addEventListener('dragend', e=>{ __dragging = null });
  // touch support for placed items
  try{ addTouchDrag(wrap) }catch(e){}
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
    // set localized button labels
    confirm.textContent = t('toast.confirm_btn'); cancel.textContent = t('toast.cancel_btn');
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
  const completedIds = Object.keys(state.completed || {});
  const completedTitles = (window.lessons||[]).filter(l=>completedIds.includes(l.id)).map(l=>l.title);
  // Require jsPDF to generate a PDF. If it's missing, show a toast explaining the problem.
  if(typeof window.jspdf === 'undefined' && !(window.jspdf && (window.jspdf.jsPDF || window.jspdf.default))){
    showToast('PDF generation is not available. Please reload the page or ensure the jsPDF script is reachable.', null);
    console.error('jsPDF not available - cannot generate certificate PDF');
    return;
  }
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
  }catch(err){ console.error('pdf generation failed', err); showToast('Failed to generate PDF. See console for details.', null) }
}

function init(){
  loadLessons().then(lessons=>{ window.lessons = lessons; renderLessons(lessons);
    // apply initial localized UI text
    document.documentElement.lang = currentLang;
    const tag = document.querySelector('.brand p'); if(tag) tag.textContent = t('app.tagline');
    const progressH = document.querySelector('#progress h2'); if(progressH) progressH.textContent = t('progress.title');
    const downloadBtn = document.getElementById('download-cert'); if(downloadBtn) downloadBtn.textContent = t('download.cert');
    const lessonsHeading = document.querySelector('#lessons h2'); if(lessonsHeading) lessonsHeading.textContent = t('lessons.title');
  })

  // language selector wiring
  const langSelect = document.getElementById('lang'); if(langSelect){ langSelect.value = currentLang; langSelect.addEventListener('change', (e)=>{ currentLang = e.target.value; localStorage.setItem(langKey, currentLang); // re-render UI
    // update tagline
    const tag = document.querySelector('.brand p'); if(tag) tag.textContent = t('app.tagline');
    // update other headings/buttons
    const progressH = document.querySelector('#progress h2'); if(progressH) progressH.textContent = t('progress.title');
    const downloadBtn = document.getElementById('download-cert'); if(downloadBtn) downloadBtn.textContent = t('download.cert');
    const completeBtn = document.getElementById('complete-lesson'); if(completeBtn) completeBtn.textContent = t('controls.mark_complete');
    renderLessons(window.lessons || []);
  }) }

  const back = $('#back'); if(back) back.addEventListener('click', ()=>{ $('#lesson-area').hidden = true; $('#lessons').hidden = false })
  const readBtn = $('#read-lesson'); if(readBtn) readBtn.addEventListener('click', ()=>{ const title = $('#lesson-title').textContent || ''; const body = $('#lesson-body').textContent || ''; if(title) speak(title + '. ' + body) })

  const completeBtn = $('#complete-lesson'); if(completeBtn){ const handler = ()=>{ try{ console.debug('completeBtn clicked'); const ok = validateChallenge(); if(ok){ const lid = $('#lesson-title').textContent && (window.lessons||[]).find(l=>l.title===$('#lesson-title').textContent); if(lid) showToast(`Mark "${lid.title}" as complete?`, ()=> markLessonComplete(lid)) } else { speak('Some items are incorrect. Please try again.'); const firstBad = document.querySelector('.target.bad'); if(firstBad) firstBad.scrollIntoView({behavior:'smooth',block:'center'}) } }catch(err){ console.error('complete handler failed', err) } }; completeBtn.addEventListener('click', handler); window.handleCompleteClick = handler; completeBtn.onclick = window.handleCompleteClick }

  const download = $('#download-cert'); if(download) download.addEventListener('click', ()=>{ window.handleDownloadCert() })
}

// Touch drag helpers for touchscreen support
let touchState = { ghost: null, itemValue: null, origin: null };
function onTouchMove(e){
  if(!touchState.ghost) return; const t = e.touches[0]; e.preventDefault(); touchState.ghost.style.left = (t.clientX - 20) + 'px'; touchState.ghost.style.top = (t.clientY - 20) + 'px';
  // highlight possible target
  $all('.target').forEach(x=>x.classList.remove('touch-over'));
  const el = document.elementFromPoint(t.clientX, t.clientY);
  const over = el && el.closest && el.closest('.target'); if(over) over.classList.add('touch-over');
}
function onTouchEnd(e){
  const t = e.changedTouches[0]; document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('touchend', onTouchEnd);
  const el = document.elementFromPoint(t.clientX, t.clientY);
  const overTarget = el && el.closest && el.closest('.target'); const value = touchState.itemValue;
  if(value && overTarget){
    // remove duplicates
    const allPlaced = Array.from(document.querySelectorAll('.placed-item'));
    const already = allPlaced.find(el=>el.dataset.value===value); if(already) already.remove();
    const existing = overTarget.querySelector('.placed-item'); if(existing){ document.querySelector('.pane').appendChild(createSourceWrapper(existing.dataset.value)); existing.remove(); }
    const placedEl = createPlaced(value); placedEl.dataset.value = value; overTarget.appendChild(placedEl);
    const srcWrap = touchState.origin && touchState.origin.closest && touchState.origin.closest('.source-item'); if(srcWrap) srcWrap.remove();
    checkChallenge();
  } else if(value){
    // drop back to source pane
    const leftPane = document.querySelector('.pane'); if(leftPane) leftPane.appendChild(createSourceWrapper(value));
  }
  if(touchState.ghost){ try{ touchState.ghost.remove() }catch(e){} touchState.ghost = null }
  $all('.target').forEach(x=>x.classList.remove('touch-over'));
  touchState.itemValue = null; touchState.origin = null;
}
function addTouchDrag(el){
  el.addEventListener('touchstart', function(ev){ if(ev.touches.length !== 1) return; const t = ev.touches[0]; ev.preventDefault(); touchState.itemValue = (el.dataset && el.dataset.value) ? el.dataset.value : (el.textContent || '').trim(); touchState.origin = el;
    const g = el.cloneNode(true); g.classList.add('touch-ghost'); g.style.position = 'fixed'; g.style.left = (t.clientX - 20) + 'px'; g.style.top = (t.clientY - 20) + 'px'; g.style.pointerEvents = 'none'; g.style.opacity = '0.95'; g.style.zIndex = '9999'; document.body.appendChild(g); touchState.ghost = g; document.addEventListener('touchmove', onTouchMove, { passive: false }); document.addEventListener('touchend', onTouchEnd);
  })
}

init();

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{})
