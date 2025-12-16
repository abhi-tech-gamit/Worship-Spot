const combined = [];

const sectionType = document.getElementById('sectionType');
const lyricsInput = document.getElementById('lyricsInput');
const combinedOutput = document.getElementById('combinedOutput');

document.getElementById('addSection').onclick = () => {
  const text = lyricsInput.value.trim();
  if (!text) return;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  combined.push({
    section: sectionType.value,
    lyrics: lines
  });

  lyricsInput.value = '';
  renderCombined();
};

function renderCombined() {
  combinedOutput.innerHTML = '';

  combined.forEach((block, index) => {
    const div = document.createElement('div');
    div.className = 'combined-section';
    div.dataset.section = index;

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

/* EXPORT IMAGE */
document.getElementById('exportImage').onclick = () => {
  html2canvas(combinedOutput, { scale: 2 }).then(canvas => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'combined-song.png';
    a.click();
  });
};
