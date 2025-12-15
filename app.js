// app.js — Worship SPOT (FINAL)
// Model B (word-level chords) — alignment FIXED

const BATCH = 20;
const FILTER_LANG_KEY = 'worship_filter_lang';
const THEME_KEY = 'worship_theme';

/* ---------------------------
   Utility: robust fetchJSON
   --------------------------- */
async function fetchJSON(path){
  try {
    const res = await fetch(path);
    if(res.ok) return await res.json();
    throw new Error('fetch failed');
  } catch(e){
    return new Promise((resolve,reject)=>{
      const xhr = new XMLHttpRequest();
      xhr.overrideMimeType('application/json');
      xhr.open('GET', path, true);
      xhr.onreadystatechange = ()=> {
        if(xhr.readyState===4){
          if(xhr.status===200||xhr.status===0){
            try { resolve(JSON.parse(xhr.responseText)); }
            catch(err){ reject(err); }
          } else reject(xhr.status);
        }
      };
      xhr.send();
    });
  }
}

/* ---------------------------
   Theme
   --------------------------- */
function applyThemeFromPref(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}
function toggleTheme(){
  document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY,
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
}

/* ---------------------------
   Transpose helpers
   --------------------------- */
const CHORDS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_MAP = {Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};

function transposeChordSingle(chord, steps){
  if(!chord) return '';
  if(chord.includes('/')){
    const [a,b] = chord.split('/');
    return transposeChordSingle(a,steps)+'/'+transposeChordSingle(b,steps);
  }
  const m = chord.match(/^([A-G])([b#]?)(.*)$/);
  if(!m) return chord;
  let [,r,a,s] = m;
  let full = r+(a||'');
  if(FLAT_MAP[full]) full = FLAT_MAP[full];
  let i = CHORDS.indexOf(full);
  if(i<0) return chord;
  let n = (i+steps)%12; if(n<0)n+=12;
  return CHORDS[n]+(s||'');
}

/* ---------------------------
   Viewer
   --------------------------- */
if (location.pathname.endsWith('viewer.html')) {
(async ()=>{
  const params = new URLSearchParams(location.search);
  const file = params.get('file');
  const viewEl = document.getElementById('song-view');
  const titleEl = document.getElementById('song-title');

  if(!file){ viewEl.textContent='No song specified'; return; }

  let song = await fetchJSON(file).catch(()=>null);
  if(!song) song = await fetchJSON('songs/'+file).catch(()=>null);
  if(!song){ viewEl.textContent='Failed to load song'; return; }

  let transpose = 0;

  function renderSong(){
    viewEl.innerHTML='';

    song.lines.forEach(line=>{
      const row = document.createElement('div');
      row.className='lyric-line';

      if(Array.isArray(line.lyrics) && Array.isArray(line.chords)){
        const pairs = document.createElement('div');
        pairs.className='lyric-pairs';

        const len = Math.max(line.lyrics.length, line.chords.length);

        for(let i=0;i<len;i++){
          const pair = document.createElement('div');
          pair.className='lyric-pair';

          const chordEl = document.createElement('div');
          chordEl.className='chord';

          const c = line.chords[i] || '';
          chordEl.innerHTML = c
            ? transposeChordSingle(c, transpose)
            : '&nbsp;';     // 🔑 FIX — reserve space

          const wordEl = document.createElement('div');
          wordEl.className='word';
          wordEl.textContent = line.lyrics[i] || '';

          pair.appendChild(chordEl);
          pair.appendChild(wordEl);
          pairs.appendChild(pair);
        }

        row.appendChild(pairs);
      }

      viewEl.appendChild(row);
    });

    titleEl.textContent = song.title + (song.key ? ` [${song.key}]` : '');
  }

  renderSong();

  document.getElementById('transpose-up')?.addEventListener('click',()=>{transpose++;renderSong();});
  document.getElementById('transpose-down')?.addEventListener('click',()=>{transpose--;renderSong();});
})();
}
