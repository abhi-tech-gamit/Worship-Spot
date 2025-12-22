const combined = [];

const sectionType = document.getElementById('sectionType');
const lyricsInput = document.getElementById('lyricsInput');
const combinedOutput = document.getElementById('combinedOutput');
const exportOnly = document.getElementById('exportOnly');

/* ADD SECTION */
document.getElementById('addSection').onclick = () => {
  const text = lyricsInput.value.trim();
  if (!text) return;

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  combined.push({
    section: sectionType.value,
    lyrics: lines
  });

  lyricsInput.value = '';
  renderCombined();
};

/* RENDER PREVIEW */
function renderCombined() {
  combinedOutput.innerHTML = '';

  combined.forEach((block, index) => {
    const div = document.createElement('div');
    div.className = 'combined-section';

    div.innerHTML = `
      <div class="section-label">${block.section}</div>
      <div class="lyrics">${block.lyrics.join('<br>')}</div>
      <button class="remove-btn">Remove</button>
    `;

    div.querySelector('.remove-btn').onclick = () => {
      combined.splice(index, 1);
      renderCombined();
    };

    combinedOutput.appendChild(div);
  });
}

/* EXPORT JSON */
document.getElementById('exportJson').onclick = () => {
  const output = {
    title: 'Combined Worship Song',
    lines: combined.map(b => ({
      section: b.section,
      lyrics: b.lyrics,
      chords: []
    }))
  };

  const blob = new Blob([JSON.stringify(output, null, 2)], {
    type: 'application/json'
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'combined-song.json';
  a.click();
};

/* BUILD EXPORT CONTENT (TEXT ONLY) */
function renderExportContent() {
  exportOnly.innerHTML = '';

  combined.forEach(block => {
    const section = document.createElement('div');
    section.style.marginBottom = '48px';

    section.innerHTML = `
      <div style="
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 1px;
        margin-bottom: 14px;
        text-transform: uppercase;
      ">
        ${block.section}
      </div>

      <div style="
        font-size: 20px;
        white-space: pre-line;
      ">
        ${block.lyrics.join('\n')}
      </div>
    `;

    exportOnly.appendChild(section);
  });
}

/* EXPORT IMAGE (WRITTEN CONTENT ONLY) */
document.getElementById('exportImage').onclick = () => {
  if (!combined.length) return;

  renderExportContent();

  html2canvas(exportOnly, {
    scale: 3,
    backgroundColor: '#ffffff'
  }).then(canvas => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'lyrics-only.png';
    a.click();
  });
};
