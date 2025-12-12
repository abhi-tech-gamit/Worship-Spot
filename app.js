// app.js (ES module)
const BATCH = 20; // infinite scroll batch
const FILTER_LANG_KEY = 'worship_filter_lang';
const THEME_KEY = 'worship_theme';

// helper fetch with fallback
async function fetchJSON(path){
  const r = await fetch(path).catch(()=>null);
  if(r && r.ok) return r.json();
  // fallback for file:// via XHR
  return new Promise((resolve,reject)=>{
    try{
      const xhr=new XMLHttpRequest();
      xhr.overrideMimeType('application/json');
      xhr.open('GET', path, true);
      xhr.onreadystatechange = ()=> {
        if(xhr.readyState===4){
          if(xhr.status===200||xhr.status===0) resolve(JSON.parse(xhr.responseText));
          else reject(xhr.status);
        }
      };
      xhr.send(null);
    }catch(e){reject(e)}
  });
}

/* THEME */
function applyThemeFromPref(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'light') document.documentElement.classList.remove('dark');
  else if(saved === 'dark') document.documentElement.classList.add('dark');
  else {
    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
}
function toggleTheme(){
  if(document.documentElement.classList.contains('dark')){
    document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_KEY,'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem(THEME_KEY,'dark');
  }
}

/* UI wiring */
document.addEventListener('DOMContentLoaded', async ()=> {
  applyThemeFromPref();

  const themeBtn = document.getElementById('theme-toggle');
  if(themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // mobile hamburger
  const hamburger = document.getElementById('hamburger');
  const mobilePanel = document.getElementById('mobile-panel');
  if(hamburger && mobilePanel){
    hamburger.addEventListener('click', ()=>{
      const open = mobilePanel.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open?'true':'false');
      mobilePanel.setAttribute('aria-hidden', open?'false':'true');
    });
  }

  // load songs
  const songs = await fetchJSON('songs.json').catch(()=>[]);
  window.__ALL_SONGS = Array.isArray(songs)?songs:[];
  initList(window.__ALL_SONGS);

  // wire language filters after DOM ready
  wireLanguageFilters();
});

/* SEARCH / FILTER / INFINITE SCROLL */
let index = []; // filtered result
let offset = 0;
let isLoading = false;

function initList(allSongs){
  index = allSongs.slice();
  offset = 0;
  const listEl = document.getElementById('song-list');
  listEl.innerHTML = '';
  // wire search
  const search = document.getElementById('search-input');
  const mobileSearch = document.getElementById('mobile-search');
  [search, mobileSearch].forEach(inp=>{
    if(!inp) return;
    inp.addEventListener('input', debounce(()=>{
      applyFilters();
    }, 220));
  });

  // infinite scroll
  window.addEventListener('scroll', throttle(()=>{
    const bottom = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);
    if(bottom < 400 && !isLoading) loadNextBatch();
  }, 200));

  // keyboard '/' focus search
  document.addEventListener('keydown', (e)=>{
    const active = document.activeElement;
    if(e.key === '/' && active && active.tagName.toLowerCase() !== 'input' && active.tagName.toLowerCase() !== 'textarea'){
      e.preventDefault();
      const s = document.getElementById('search-input');
      if(s){ s.focus(); s.select(); }
    }
  });

  applyFilters();
}

function applyFilters(){
  // get selected language from storage (fallback to DOM)
  let selectedLang = localStorage.getItem(FILTER_LANG_KEY);
  if(!selectedLang){
    const activeBtn = document.querySelector('.lang-filter.active');
    selectedLang = activeBtn ? activeBtn.dataset.lang : 'all';
  }

  // base list from window.__ALL_SONGS
  let items = window.__ALL_SONGS.slice();

  // language filter
  if(selectedLang && selectedLang !== 'all') items = items.filter(s => (s.language||'en') === selectedLang);

  // search query
  const q = (document.getElementById('search-input')?.value || document.getElementById('mobile-search')?.value || '').trim().toLowerCase();
  if(q) items = items.filter(s => (s.title||'').toLowerCase().includes(q) || (s.artist||'').toLowerCase().includes(q) || (s.tags||[]).join(' ').toLowerCase().includes(q));

  index = items;
  // reset list and offset
  document.getElementById('song-list').innerHTML = '';
  offset = 0;
  loadNextBatch();
}

async function loadNextBatch(){
  const listEl = document.getElementById('song-list');
  const loadingEl = document.getElementById('loading');
  if(offset >= index.length){
    loadingEl.textContent = 'No more songs';
    return;
  }
  isLoading = true;
  loadingEl.style.display = 'block';
  // simulate small async fetch time for UX
  await new Promise(r=>setTimeout(r, 120));
  const batch = index.slice(offset, offset + BATCH);
  batch.forEach(item => {
    const li = renderCard(item);
    listEl.appendChild(li);
    // small stagger animation
    li.style.opacity = 0;
    li.style.transform = 'translateY(8px)';
    requestAnimationFrame(()=> {
      li.style.transition = 'opacity .36s ease, transform .36s ease';
      li.style.opacity = 1;
      li.style.transform = 'translateY(0)';
    });
  });
  offset += batch.length;
  if(offset >= index.length) loadingEl.textContent = 'End of list';
  else loadingEl.textContent = 'Scroll to load more';
  isLoading = false;
}

/* render card */
function renderCard(song){
  const li = document.createElement('li');
  li.className = 'card';

  // head
  const head = document.createElement('div'); head.className = 'card-head';
  const t = document.createElement('div');
  const title = document.createElement('div'); title.className='title underline-anim'; title.textContent = song.title;
  const meta = document.createElement('div'); meta.className='meta'; meta.textContent = song.artist || '';
  t.appendChild(title); t.appendChild(meta);
  head.appendChild(t);
  const langBadge = document.createElement('div'); langBadge.className='lang-badge'; langBadge.textContent = (song.language||'en').toUpperCase();
  head.appendChild(langBadge);

  // tags + key
  const badges = document.createElement('div'); badges.className = 'badges';
  (song.tags||[]).slice(0,3).forEach(tag=>{
    const tg = document.createElement('span'); tg.className='tag'; tg.textContent = tag; badges.appendChild(tg);
  });
  const keyP = document.createElement('div'); keyP.className='key-pill'; keyP.textContent = song.key?`Key: ${song.key}`:'';
  badges.appendChild(keyP);

  // actions
  const actions = document.createElement('div'); actions.className='card-actions';
  const viewBtn = document.createElement('button'); viewBtn.className='view-btn'; viewBtn.textContent='View';
  viewBtn.addEventListener('click', ()=> {
    window.location.href = `viewer.html?file=${encodeURIComponent(song.filename)}`;
  });
  actions.appendChild(viewBtn);

  li.appendChild(head);
  li.appendChild(badges);
  li.appendChild(actions);
  return li;
}

/* unified language filter wiring (works for desktop and mobile buttons) */
function wireLanguageFilters() {
  const langBtns = Array.from(document.querySelectorAll('.lang-filter'));
  if (!langBtns.length) return;

  let selectedLang = localStorage.getItem(FILTER_LANG_KEY) || 'all';

  function setActiveLang(lang) {
    selectedLang = lang;
    localStorage.setItem(FILTER_LANG_KEY, selectedLang);
    langBtns.forEach(btn => {
      if (btn.dataset && btn.dataset.lang === lang) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    applyFilters();
  }

  // initialize active state from storage
  let match = langBtns.find(b => b.dataset && b.dataset.lang === selectedLang);
  if (!match) {
    const first = langBtns[0];
    selectedLang = first && first.dataset && first.dataset.lang ? first.dataset.lang : 'all';
    localStorage.setItem(FILTER_LANG_KEY, selectedLang);
  }
  langBtns.forEach(btn => {
    if (btn.dataset && btn.dataset.lang === selectedLang) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  langBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lang = btn.dataset.lang || 'all';
      setActiveLang(lang);
      const mobilePanel = document.getElementById('mobile-panel');
      const hamburger = document.getElementById('hamburger');
      if (mobilePanel && mobilePanel.classList.contains('open')) {
        mobilePanel.classList.remove('open');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

/* small utils */
function debounce(fn, ms=200){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}
function throttle(fn, ms=100){
  let busy=false;
  return (...args)=>{
    if(busy) return;
    busy=true; fn(...args);
    setTimeout(()=>busy=false, ms);
  };
}

/* Viewer page logic (if on viewer.html) */
if(location.pathname.endsWith('viewer.html') || document.getElementById('song-view')){
  (async function(){
    const params = new URLSearchParams(location.search);
    const file = params.get('file');
    const viewEl = document.getElementById('song-view');
    const titleEl = document.getElementById('song-title');
    if(!file){ if(viewEl) viewEl.textContent = 'No song specified.'; return; }
    const song = await fetchJSON(`${file}`).catch(()=>null);
    if(!song){ if(viewEl) viewEl.textContent = 'Unable to load song'; return; }
    if(titleEl) titleEl.textContent = song.title + (song.key?` [${song.key}]`:'');
    // render lines
    viewEl.innerHTML = '';
    (song.lines||[]).forEach(line=>{
      const ln = document.createElement('div'); ln.className='lyric-line';
      if(line.chords && line.chords.length){
        const cr = document.createElement('div'); cr.className='chords-row'; cr.textContent = (line.chords||[]).join(' ');
        ln.appendChild(cr);
      }
      if(line.chordLine){
        const cr = document.createElement('div'); cr.className='chords-row'; cr.textContent = line.chordLine;
        ln.appendChild(cr);
      }
      if(line.lyrics && line.lyrics.length){
        const lr = document.createElement('div'); lr.className='lyrics-row'; lr.textContent = (line.lyrics||[]).join(' ');
        ln.appendChild(lr);
      }
      viewEl.appendChild(ln);
    });

    // transpose
    let transpose = 0;
    const up = document.getElementById('transpose-up');
    const down = document.getElementById('transpose-down');
    function renderTranspose(){ /* placeholder: transpose not implemented in this build */ }
    if(up) up.addEventListener('click', ()=>{ transpose++; renderTranspose(); });
    if(down) down.addEventListener('click', ()=>{ transpose--; renderTranspose(); });
  })();
}
