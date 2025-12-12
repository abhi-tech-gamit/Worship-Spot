// app.js final corrected
const BATCH = 20;
const FILTER_LANG_KEY = 'worship_filter_lang';
const THEME_KEY = 'worship_theme';

async function fetchJSON(path){
  try {
    const res = await fetch(path);
    if(res.ok) return await res.json();
    throw new Error('fetch failed');
  } catch(e){
    return new Promise((resolve,reject)=>{
      try{
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/json');
        xhr.open('GET', path, true);
        xhr.onreadystatechange = ()=> {
          if(xhr.readyState===4){
            if(xhr.status===200||xhr.status===0) {
              resolve(JSON.parse(xhr.responseText));
            } else reject(xhr.status);
          }
        };
        xhr.send();
      } catch(err){ reject(err); }
    });
  }
}

/* theme */
function applyThemeFromPref(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'light') document.documentElement.classList.remove('dark');
  else if(saved === 'dark') document.documentElement.classList.add('dark');
  else {
    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
  updateThemeButton();
}
function toggleTheme(){
  if(document.documentElement.classList.contains('dark')){
    document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_KEY,'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem(THEME_KEY,'dark');
  }
  updateThemeButton();
}
function updateThemeButton(){
  const btn = document.getElementById('theme-toggle');
  if(!btn) return;
  const isDark = document.documentElement.classList.contains('dark');
  btn.textContent = isDark ? '🌙' : '☀️';
}

/* transpose */
const CHORDS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_MAP = {'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};
function transposeChordSingle(chordText, steps){
  if(!chordText) return '';
  if(chordText.includes('/')){
    const parts = chordText.split('/');
    return transposeChordSingle(parts[0], steps) + '/' + transposeChordSingle(parts[1], steps);
  }
  const m = chordText.match(/^([A-G])([b#]?)(.*)$/);
  if(!m) return chordText;
  let [, root, accidental, suffix] = m;
  let full = root + (accidental || '');
  if(FLAT_MAP[full]) full = FLAT_MAP[full];
  let idx = CHORDS.indexOf(full);
  if(idx === -1) return chordText;
  let newIdx = (idx + steps) % 12;
  if(newIdx < 0) newIdx += 12;
  let newRoot = CHORDS[newIdx];
  return newRoot + (suffix || '');
}

/* init */
document.addEventListener('DOMContentLoaded', async ()=>{
  applyThemeFromPref();
  const themeBtn = document.getElementById('theme-toggle');
  if(themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const hamburger = document.getElementById('hamburger');
  const mobilePanel = document.getElementById('mobile-panel');
  if(hamburger && mobilePanel){
    hamburger.addEventListener('click', ()=>{
      const open = mobilePanel.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open?'true':'false');
      mobilePanel.setAttribute('aria-hidden', open?'false':'true');
    });
  }

  const songs = await fetchJSON('songs.json').catch(()=>[]);
  window.__ALL_SONGS = Array.isArray(songs)?songs:[];

  initList(window.__ALL_SONGS);
  wireLanguageFilters();
});

/* list + filters */
let indexList = [];
let offset = 0;
let isLoading = false;

function initList(allSongs){
  indexList = allSongs.slice();
  offset = 0;
  const listEl = document.getElementById('song-list');
  if(listEl) listEl.innerHTML = '';
  const search = document.getElementById('search-input');
  const mobileSearch = document.getElementById('mobile-search');
  [search,mobileSearch].forEach(inp=>{
    if(!inp) return;
    inp.addEventListener('input', debounce(()=>{ applyFilters(); }, 180));
  });
  window.addEventListener('scroll', throttle(()=>{ 
    const bottom = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);
    if(bottom < 360 && !isLoading) loadNextBatch();
  }, 150));
  applyFilters();
}

function applyFilters(){
  let selectedLang = localStorage.getItem(FILTER_LANG_KEY);
  if(!selectedLang){
    const active = document.querySelector('.lang-filter.active');
    selectedLang = active ? active.dataset.lang : 'all';
  }
  let items = window.__ALL_SONGS.slice();
  if(selectedLang && selectedLang !== 'all') items = items.filter(s => (s.language||'en') === selectedLang);
  const q = (document.getElementById('search-input')?.value || document.getElementById('mobile-search')?.value || '').trim().toLowerCase();
  if(q) items = items.filter(s => (s.title||'').toLowerCase().includes(q) || (s.artist||'').toLowerCase().includes(q) || (s.tags||[]).join(' ').toLowerCase().includes(q));
  indexList = items;
  const listEl = document.getElementById('song-list');
  if(listEl) listEl.innerHTML = '';
  offset = 0;
  loadNextBatch();
}

async function loadNextBatch(){
  const listEl = document.getElementById('song-list');
  const loadingEl = document.getElementById('loading');
  if(!listEl || !loadingEl) return;
  if(offset >= indexList.length){
    loadingEl.textContent = 'No more songs';
    return;
  }
  isLoading = true;
  loadingEl.style.display = 'block';
  await new Promise(r=>setTimeout(r, 80));
  const batch = indexList.slice(offset, offset + BATCH);
  batch.forEach(item => {
    const li = renderCard(item);
    listEl.appendChild(li);
    li.style.opacity = 0; li.style.transform = 'translateY(8px)';
    requestAnimationFrame(()=>{ li.style.transition='opacity .32s ease, transform .32s ease'; li.style.opacity=1; li.style.transform='translateY(0)'; });
  });
  offset += batch.length;
  loadingEl.textContent = offset >= indexList.length ? 'End of list' : 'Scroll to load more';
  isLoading = false;
}

function renderCard(song){
  const li = document.createElement('li'); li.className='card';
  const head = document.createElement('div'); head.className='card-head';
  const t = document.createElement('div');
  const title = document.createElement('div'); title.className='title underline-anim'; title.textContent = song.title;
  const meta = document.createElement('div'); meta.className='meta'; meta.textContent = song.artist || '';
  t.appendChild(title); t.appendChild(meta);
  head.appendChild(t);
  const langBadge = document.createElement('div'); langBadge.className='lang-badge'; langBadge.textContent = (song.language||'en').toUpperCase();
  head.appendChild(langBadge);
  const badges = document.createElement('div'); badges.className='badges';
  (song.tags||[]).slice(0,3).forEach(tag=>{ const tg=document.createElement('span'); tg.className='tag'; tg.textContent=tag; badges.appendChild(tg); });
  const keyP = document.createElement('div'); keyP.className='key-pill'; keyP.textContent = song.key?`Key: ${song.key}`:'';
  badges.appendChild(keyP);
  const actions = document.createElement('div'); actions.className='card-actions';
  const viewBtn = document.createElement('button'); viewBtn.className='view-btn'; viewBtn.textContent='View';
  viewBtn.addEventListener('click', ()=>{ window.location.href = `viewer.html?file=${encodeURIComponent(song.filename)}`; });
  actions.appendChild(viewBtn);
  li.appendChild(head); li.appendChild(badges); li.appendChild(actions);
  return li;
}

/* language filters */
function wireLanguageFilters(){
  const langBtns = Array.from(document.querySelectorAll('.lang-filter'));
  if(!langBtns.length) return;
  let selectedLang = localStorage.getItem(FILTER_LANG_KEY) || 'all';
  function setActive(lang){
    selectedLang = lang; localStorage.setItem(FILTER_LANG_KEY, selectedLang);
    langBtns.forEach(b=> b.dataset.lang === lang ? b.classList.add('active') : b.classList.remove('active'));
    applyFilters();
  }
  let match = langBtns.find(b=> b.dataset.lang === selectedLang);
  if(!match){ selectedLang = 'all'; localStorage.setItem(FILTER_LANG_KEY, 'all'); }
  langBtns.forEach(b=> b.dataset.lang === selectedLang ? b.classList.add('active') : b.classList.remove('active'));
  langBtns.forEach(b=> b.addEventListener('click', ()=>{ setActive(b.dataset.lang || 'all'); const mobilePanel = document.getElementById('mobile-panel'); const hamburger = document.getElementById('hamburger'); if(mobilePanel && mobilePanel.classList.contains('open')){ mobilePanel.classList.remove('open'); if(hamburger) hamburger.setAttribute('aria-expanded','false'); } }));
}

/* utils */
function debounce(fn, ms=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function throttle(fn, ms=100){ let busy=false; return (...a)=>{ if(busy) return; busy=true; fn(...a); setTimeout(()=>busy=false, ms); }; }

/* viewer */
if(location.pathname.endsWith('viewer.html') || document.getElementById('song-view')){
  (async function(){
    const params = new URLSearchParams(location.search);
    const file = params.get('file');
    const viewEl = document.getElementById('song-view');
    const titleEl = document.getElementById('song-title');
    if(!file){ if(viewEl) viewEl.textContent='No song specified.'; return; }
    let song = await fetchJSON(file).catch(()=>null);
    if(!song) song = await fetchJSON('songs/' + file).catch(()=>null);
    if(!song){ if(viewEl) viewEl.textContent='Unable to load song'; return; }
    let transpose = 0;
    function renderSong(){
      if(!viewEl) return;
      viewEl.innerHTML = '';
      (song.lines||[]).forEach(line=>{
        const ln = document.createElement('div'); ln.className='lyric-line';
        if(line.chords && line.chords.length){
          const cr = document.createElement('div'); cr.className='chords-row';
          const transposed = (line.chords||[]).map(c=>transposeChordSingle(c, transpose)).join(' ');
          cr.textContent = transposed; ln.appendChild(cr);
        }
        if(line.chordLine){
          const cr = document.createElement('div'); cr.className='chords-row'; cr.textContent = line.chordLine; ln.appendChild(cr);
        }
        if(line.lyrics && line.lyrics.length){
          const lr = document.createElement('div'); lr.className='lyrics-row'; lr.textContent = (line.lyrics||[]).join(' '); ln.appendChild(lr);
        }
        viewEl.appendChild(ln);
      });
      if(titleEl) titleEl.textContent = song.title + (song.key?` [${song.key}]`:'');
    }
    renderSong();
    const up = document.getElementById('transpose-up');
    const down = document.getElementById('transpose-down');
    if(up) up.addEventListener('click', ()=>{ transpose++; renderSong(); });
    if(down) down.addEventListener('click', ()=>{ transpose--; renderSong(); });
    document.addEventListener('keydown', (e)=>{
      if(e.key === '+' || e.key === '='){ transpose++; renderSong(); }
      if(e.key === '-' || e.key === '_'){ transpose--; renderSong(); }
    });
  })();
}
