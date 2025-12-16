// combiner.js — Lyrics Combiner (STEP 3)

async function fetchJSON(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error('Failed to load');
  return res.json();
}

const selectEl = document.querySelector('.combiner-select');
const sectionsEl = document.querySelector('.combiner-sections');
const editorEl = document.querySelector('.combiner-editor');
const previewEl = document.querySelector('.combiner-preview .song-view');

let currentSong = null;

/* =========================
   INIT
========================= */
(async function init(){
  const songs = await fetchJSON('songs.json');

  songs.forEach(song=>{
    const opt = document.createElement('option');
    opt.value = song.filename;
    opt.textContent = song.title;
    selectEl.appendChild(opt);
  });

  selectEl.addEventListener('change', loadSong);
})();

/* =========================
   LOAD SONG
========================= */
async function loadSong(){
  const file = selectEl.value;
  if(!file) return;

  currentSong = await fetchJSON(file);
  renderSections();
  renderEditor();
  renderPreview();
}

/* =========================
   LEFT: SECTIONS
========================= */
function renderSections(){
  sectionsEl.innerHTML = '';

  currentSong.lines.forEach((line, idx)=>{
    if(!line.section) return;

    const btn = document.createElement('button');
    btn.textContent = line.section;
    btn.className = 'small-btn';
    btn.style.marginBottom = '6px';

    btn.onclick = ()=>{
      document
        .querySelector(`[data-line="${idx}"]`)
        ?.scrollIntoView({behavior:'smooth'});
    };

    sectionsEl.appendChild(btn);
  });
}

/* =========================
   CENTER: EDITOR
========================= */
function renderEditor(){
  editorEl.innerHTML = '<h3>Editor</h3>';

  currentSong.lines.forEach((line, idx)=>{
    const block = document.createElement('div');
    block.dataset.line = idx;
    block.style.marginBottom = '16px';

    if(line.section){
      const label = document.createElement('div');
      label.className = 'section-label';
      label.textContent = line.section;
      block.appendChild(label);
    }

    line.lyrics.forEach((word, wIdx)=>{
      const input = document.createElement('input');
      input.type = 'text';
      input.value = word;
      input.style.width = '100%';
      input.style.marginBottom = '6px';

      input.oninput = ()=>{
        line.lyrics[wIdx] = input.value;
        renderPreview();
      };

      block.appendChild(input);
    });

    editorEl.appendChild(block);
  });
}

/* =========================
   RIGHT: PREVIEW
========================= */
function renderPreview(){
  previewEl.innerHTML = '';

  currentSong.lines.forEach(line=>{
    if(line.section){
      const s = document.createElement('div');
      s.className = 'section-label';
      s.textContent = line.section;
      previewEl.appendChild(s);
    }

    const row = document.createElement('div');
    row.className = 'lyric-line';

    const wrap = document.createElement('div');
    wrap.className = 'lyric-pairs';

    line.lyrics.forEach((word,i)=>{
      const pair = document.createElement('div');
      pair.className = 'lyric-pair';

      const w = document.createElement('div');
      w.className = 'word';
      w.textContent = word;

      pair.appendChild(w);
      wrap.appendChild(pair);
    });

    row.appendChild(wrap);
    previewEl.appendChild(row);
  });
}
