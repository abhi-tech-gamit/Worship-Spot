// app.js — Worship SPOT (FULL FIXED VERSION)

/* =========================
   CONSTANTS
========================= */
const BATCH = 20;
const FILTER_LANG_KEY = 'worship_filter_lang';
const THEME_KEY = 'worship_theme';

/* =========================
   ROBUST JSON FETCH
========================= */
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

/* =========================
   THEME
========================= */
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

/* =========================
   TRANSPOSE HELPERS
========================= */
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

/* =========================
   SEARCH
========================= */
function setupSearch() {
  const searchInput = document.querySelector('.search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    filterSongs(q);
  });
}

function filterSongs(query) {
  if (!window.__ALL_SONGS) return;

  const filtered = window.__ALL_SONGS.filter(song => {
    if (!query) return true;
    return (
      song.title?.toLowerCase().includes(query) ||
      song.artist?.toLowerCase().includes(query) ||
      song.key?.toLowerCase().includes(query)
    );
  });

  initList(filtered);
}

/* =========================
   INIT (RUNS ON ALL PAGES)
========================= */
document.addEventListener('DOMContentLoaded', async () => {
  applyThemeFromPref();

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.onclick = toggleTheme;

  // SONG LIST PAGE
  if (document.getElementById('song-list')) {
    const songs = await fetchJSON('songs.json').catch(() => []);
    window.__ALL_SONGS = Array.isArray(songs) ? songs : [];
    setupSearch();
    initList(window.__ALL_SONGS);
  }

  // VIEWER PAGE
  if (location.pathname.endsWith('viewer.html')) {
    initViewer();
  }

  // MOBILE MENU
  initMobileMenu();
});

/* =========================
   SONG LIST
========================= */
let indexList = [];
let offset = 0;

function initList(allSongs) {
  indexList = allSongs.slice();
  offset = 0;
  const songList = document.getElementById('song-list');
  if (!songList) return;
  songList.innerHTML = '';
  loadNextBatch();
}

function loadNextBatch() {
  const list = document.getElementById('song-list');
  if (!list) return;

  const batch = indexList.slice(offset, offset + BATCH);

  batch.forEach(song => {
    const li = document.createElement('li');
    li.className = 'card';

    li.innerHTML = `
      <div class="card-head">
        <div class="title">${song.title}</div>
        <div class="meta">${song.artist || ''}</div>
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

/* =========================
   VIEWER
========================= */
async function initViewer() {
  const params = new URLSearchParams(location.search);
  const file = params.get('file');
  const view = document.getElementById('song-view');
  const titleEl = document.getElementById('song-title');

  if (!file || !view) return;

  const song = await fetchJSON(file).catch(() => null);
  if (!song) {
    view.textContent = 'Failed to load song';
    return;
  }

  let transpose = 0;

  function render() {
    view.innerHTML = '';

    song.lines.forEach(line => {

      if (line.section) {
        const section = document.createElement('div');
        section.className = 'section-label';
        section.textContent = line.section;
        view.appendChild(section);
      }

      const row = document.createElement('div');
      row.className = 'lyric-line';

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
      view.appendChild(row);
    });

    titleEl.textContent = song.title + (song.key ? ` [${song.key}]` : '');
  }

  render();

  document.getElementById('transpose-up')?.addEventListener('click', () => {
    transpose++;
    render();
  });

  document.getElementById('transpose-down')?.addEventListener('click', () => {
    transpose--;
    render();
  });
}

/* =========================
   MOBILE MENU
========================= */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobilePanel = document.getElementById('mobile-panel');
  if (!hamburger || !mobilePanel) return;

  function open() {
    hamburger.setAttribute('aria-expanded', 'true');
    mobilePanel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
  }

  function close() {
    hamburger.setAttribute('aria-expanded', 'false');
    mobilePanel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  }

  hamburger.addEventListener('click', e => {
    e.stopPropagation();
    hamburger.getAttribute('aria-expanded') === 'true' ? close() : open();
  });

  document.addEventListener('click', e => {
    if (!mobilePanel.contains(e.target) && !hamburger.contains(e.target)) {
      close();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
}
