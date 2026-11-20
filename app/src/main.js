// Neon Bay Cover Studio — page wiring.
// Owns the editor state, the controls, drag-to-position on the preview, and
// PNG export at the three post sizes. Photos are read on this machine with
// FileReader / object URLs and never leave it. A `?shot=` query sets up a
// fixed scene for a screenshot instead (see shots.js).
import { drawCover, defaultState, SIZES, LAYOUTS, GRADES, CAPTION_STYLES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = defaultState();

// Photos: the two bundled samples first, uploads appended after them.
const photos = [];
let selectedPanel = 0;

function el(id) { return document.getElementById(id); }

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function photoLabel(i) {
  return photos[i] ? photos[i].label : `Photo ${i + 1}`;
}

/** Repaints the preview canvas at the chosen export size and updates the UI. */
export function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state, photos.map((p) => p.img));
  syncPanelControls();
  el('sizeLabel').textContent = `${size.label} px`;
}

function setStatus(text) { statusEl.textContent = text; }

/** Builds the layout / grade / caption-style buttons from the engine tables. */
function buildOptionButtons(containerId, entries, current, onPick) {
  const box = el(containerId);
  box.innerHTML = '';
  for (const [key, value] of Object.entries(entries)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt' + (key === current ? ' active' : '');
    b.textContent = value.label;
    b.dataset.key = key;
    if (key === state.grade && containerId === 'gradeRow') {
      b.style.setProperty('--swatch', value.accent);
    }
    b.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('.opt').forEach((x) => x.classList.toggle('active', x.dataset.key === key));
      redraw();
    });
    box.appendChild(b);
  }
}

function buildLayoutButtons() {
  buildOptionButtons('layoutRow', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    selectedPanel = 0;
    setStatus(`Layout: ${LAYOUTS[key].label}.`);
  });
}

function buildGradeButtons() {
  const box = el('gradeRow');
  box.innerHTML = '';
  for (const [key, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt swatch' + (key === state.grade ? ' active' : '');
    b.dataset.key = key;
    b.title = grade.label;
    b.innerHTML = `<span class="dot" style="background:linear-gradient(135deg, ${grade.sunTop}, ${grade.sunBottom})"></span>${grade.label}`;
    b.addEventListener('click', () => {
      state.grade = key;
      box.querySelectorAll('.opt').forEach((x) => x.classList.toggle('active', x.dataset.key === key));
      setStatus(`Colour grade: ${grade.label}.`);
      redraw();
    });
    box.appendChild(b);
  }
}

function buildCaptionStyleButtons() {
  buildOptionButtons('captionStyleRow', CAPTION_STYLES, state.captionStyle, (key) => {
    state.captionStyle = key;
    setStatus(`Caption style: ${CAPTION_STYLES[key].label}.`);
  });
}

function buildSizeButtons() {
  buildOptionButtons('sizeRow', SIZES, state.size, (key) => {
    state.size = key;
    setStatus(`Export size: ${SIZES[key].label}.`);
  });
}

/** Refreshes the photo list and the per-panel controls from the state. */
function syncPanelControls() {
  const count = LAYOUTS[state.layout].panels;
  if (selectedPanel >= count) selectedPanel = 0;
  const panel = state.panels[selectedPanel];
  el('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${count}`;
  const photoSelect = el('panelPhoto');
  photoSelect.innerHTML = '';
  photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.label;
    photoSelect.appendChild(o);
  });
  photoSelect.value = String(panel.photo);
  el('zoom').value = String(panel.zoom || 1);
  el('zoomVal').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
  el('panX').value = String(panel.px || 0);
  el('panY').value = String(panel.py || 0);
  // Panel picker dots under the preview.
  const dots = el('panelDots');
  dots.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot-btn' + (i === selectedPanel ? ' active' : '');
    d.textContent = String(i + 1);
    d.setAttribute('aria-label', `Select panel ${i + 1}`);
    d.addEventListener('click', () => { selectedPanel = i; redraw(); });
    dots.appendChild(d);
  }
}

function refreshPhotoList() {
  const list = el('photoList');
  list.innerHTML = '';
  photos.forEach((p, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = p.label;
    chip.title = `Use ${p.label} in every panel`;
    chip.addEventListener('click', () => {
      state.panels.forEach((panel) => { panel.photo = i; });
      setStatus(`${p.label} is now in every panel.`);
      redraw();
    });
    list.appendChild(chip);
  });
  syncPanelControls();
}

/** Adds uploaded files as photos, then repaints. */
async function addUploads(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      photos.push({ img, label: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Upload' });
      added += 1;
    } catch { /* unreadable file: skip it */ }
  }
  if (added) {
    setStatus(`${added} photo${added > 1 ? 's' : ''} added — click one below to fill every panel.`);
    refreshPhotoList();
    redraw();
  }
}

/** Renders the current state at full export size and returns a PNG data URL. */
export function exportDataURL(sizeKey) {
  const size = SIZES[sizeKey || state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, { ...state, size: sizeKey || state.size }, photos.map((p) => p.img));
  return off.toDataURL('image/png');
}

function exportPNG() {
  const size = SIZES[state.size];
  const url = exportDataURL(state.size);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neon-bay-cover-${size.w}x${size.h}.png`;
  a.click();
  setStatus(`Exported ${a.download} — check your downloads.`);
}
window.__exportDataURL = exportDataURL;

/** Re-marks the option buttons to match the state (used after a shot scene). */
function syncOptionButtons() {
  const pairs = [
    ['layoutRow', state.layout],
    ['gradeRow', state.grade],
    ['captionStyleRow', state.captionStyle],
    ['sizeRow', state.size],
  ];
  for (const [id, current] of pairs) {
    el(id).querySelectorAll('.opt').forEach((x) => x.classList.toggle('active', x.dataset.key === current));
  }
}

function bindControls() {
  el('photoUpload').addEventListener('change', (e) => addUploads(e.target.files));
  el('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
  el('subcaption').addEventListener('input', (e) => { state.subcaption = e.target.value; redraw(); });
  el('panelPhoto').addEventListener('change', (e) => {
    state.panels[selectedPanel].photo = Number(e.target.value);
    redraw();
  });
  el('zoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    redraw();
  });
  el('panX').addEventListener('input', (e) => {
    state.panels[selectedPanel].px = Number(e.target.value);
    redraw();
  });
  el('panY').addEventListener('input', (e) => {
    state.panels[selectedPanel].py = Number(e.target.value);
    redraw();
  });
  el('fillAll').addEventListener('click', () => {
    const src = state.panels[selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = src; });
    setStatus(`Panel ${selectedPanel + 1}'s photo is now in every panel.`);
    redraw();
  });
  el('resetPanel').addEventListener('click', () => {
    state.panels[selectedPanel] = { photo: 0, zoom: 1, px: 0, py: 0 };
    setStatus(`Panel ${selectedPanel + 1} reset.`);
    redraw();
  });
  el('export').addEventListener('click', exportPNG);

  // Drag on the preview to position the selected panel's photo; wheel zooms it.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    // Pick the panel under the pointer, using the engine's own rects.
    import('./cover.js').then(({ layoutRects }) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * canvas.width;
      const y = (e.clientY - r.top) / r.height * canvas.height;
      const rects = layoutRects(state.layout, canvas.width, canvas.height);
      const hit = rects.findIndex((rc) => x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h);
      if (hit >= 0 && hit !== selectedPanel) {
        selectedPanel = hit;
        redraw();
      }
    });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = canvas.getBoundingClientRect();
    const panel = state.panels[selectedPanel];
    panel.px = Math.max(-0.5, Math.min(0.5, (panel.px || 0) + (e.clientX - lastX) / r.width));
    panel.py = Math.max(-0.5, Math.min(0.5, (panel.py || 0) + (e.clientY - lastY) / r.height));
    lastX = e.clientX;
    lastY = e.clientY;
    redraw();
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    panel.zoom = Math.max(0.5, Math.min(3, (panel.zoom || 1) * (e.deltaY < 0 ? 1.06 : 0.94)));
    redraw();
  }, { passive: false });
}

async function init() {
  buildLayoutButtons();
  buildGradeButtons();
  buildCaptionStyleButtons();
  buildSizeButtons();
  bindControls();
  // Bundled samples, free to use, so the app opens with photos already in.
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  photos.push({ img: pier, label: 'Pier sunset' });
  photos.push({ img: boulevard, label: 'Boulevard' });
  const shot = new URLSearchParams(location.search).get('shot');
  refreshPhotoList();
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), state, photos, redraw);
    syncOptionButtons();
    redraw();
  } else {
    redraw();
    setStatus('Ready — pick a layout, a grade and a caption, then export.');
  }
}

init();
