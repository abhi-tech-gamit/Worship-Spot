// app.js — Worship SPOT (FULLY FIXED, COPY-PASTE READY)

const BATCH = 20;
const FILTER_LANG_KEY = 'worship_filter_lang';
const THEME_KEY = 'worship_theme';

/* ---------------------------
   Robust JSON fetch
--------------------------- */
async function fetchJSON(path) {
  try {
    const res = await fetch(path);
    if (res.ok) return await res.json();
    throw new Error('fetch failed');
  } catch {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.overrideMimeType('application/json');
      xhr.open('GET', path, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 0) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch (e) { reject(e); }
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
function applyThemeFromPref() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem(
    THEME_KEY,
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
}

/* ---------------------------
   Transpose helpers
--------------------------- */
const CHORDS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_MAP = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };

function transposeChord(chord, steps) {
  if (!chord) return '';
  if (chord.includes('/')) {
    const [a, b] = chord.split('/');
    return `${transposeChord(a, steps)}/${transposeChord(b, steps)}`;
  }
  const m = chord.match(/^([A-G])([b#]?)(.*)$/);
  if (!m) return chord;
  let root = m[1] + (m[2] || '');
  let suffix = m[3] || '';
  if (FLAT_MAP[root]) root = FLAT_MAP[root];
  let idx = CHORDS.indexOf(root);
  if (idx === -1) return chord;
  idx = (idx + steps + 12) % 12;
  return CHORDS[idx] + suffix;
}

/* ---------------------------
   Init
--------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  applyThemeFromPref();

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.onclick = toggleTheme;

  const songs = await fetchJSON('songs.json').catch(() => []);
  window.__ALL_SONGS = Array.isArray(songs) ? songs : [];
  initList(window.__ALL_SONGS);
});

/* ---------------------------
   Song List
--------------------------- */
let indexList = [];
let offset = 0;

function initList(allSongs) {
  indexList = allSongs.slice();
  offset = 0;
  document.getElementById('song-list').innerHTML = '';
  loadNextBatch();
}

function loadNextBatch() {
  const list = document.getElementById('song-list');
  const batch = indexList.slice(offset, offset + BATCH);

  batch.forEach(song => {
    const li = document.createElement('li');
    li.className = 'card';

    li.innerHTML = `
      <div class="card-head">
        <div class="title">${song.title}</div>
        <div class="meta">${song.artist || ''}</div>
        <div class="lang-badge">${(song.language || 'en').toUpperCase()}</div>
      </div>
      <div class="badges">
        ${song.key ? `<div class="key-pill">Key: ${song.key}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="view-btn">View</button>
      </div>
    `;

    li.querySelector('.view-btn').onclick = () => {
      window.location.href = `viewer.html?file=${encodeURIComponent(song.filename)}`;
    };

    list.appendChild(li);
  });

  offset += batch.length;
}

/* ---------------------------
   Viewer
--------------------------- */
if (location.pathname.endsWith('viewer.html')) {
  (async () => {
    const params = new URLSearchParams(location.search);
    const file = params.get('file');
    const view = document.getElementById('song-view');
    const titleEl = document.getElementById('song-title');

    if (!file) return;

    const song = await fetchJSON(file).catch(() => null);
    if (!song) {
      view.textContent = 'Failed to load song';
      return;
    }

    let transpose = 0;

    function render() {
      view.innerHTML = '';
      song.lines.forEach(line => {
        const row = document.createElement('div');
        row.className = 'lyric-line';

        if (Array.isArray(line.chords) && Array.isArray(line.lyrics)) {
          const wrap = document.createElement('div');
          wrap.className = 'lyric-pairs';

          line.lyrics.forEach((word, i) => {
            const pair = document.createElement('div');
            pair.className = 'lyric-pair';

            const c = document.createElement('div');
            c.className = 'chord';
            c.textContent = line.chords[i]
              ? transposeChord(line.chords[i], transpose)
              : '';

            const w = document.createElement('div');
            w.className = 'word';
            w.textContent = word;

            pair.appendChild(c);
            pair.appendChild(w);
            wrap.appendChild(pair);
          });

          row.appendChild(wrap);
        }

        view.appendChild(row);
      });

      titleEl.textContent = song.title + (song.key ? ` [${song.key}]` : '');
    }

    render();

    document.getElementById('transpose-up')?.addEventListener('click', () => {
      transpose++; render();
    });
    document.getElementById('transpose-down')?.addEventListener('click', () => {
      transpose--; render();
    });
  })();
}
