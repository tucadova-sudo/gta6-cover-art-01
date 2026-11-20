// Fixed scenes for screenshots: ?shot=editor shows the editor with photos
// loaded; ?shot=cover shows the finished cover alone at the chosen size.
// window.__shotReady is set once the scene has painted.
import { SIZES } from './cover.js';

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/**
 * Applies a shot scene to the shared editor state, then repaints.
 * `query` carries layout, grade, caption, subcaption, style and size.
 */
export async function runShot(shot, query, state, photos, redraw) {
  const apply = () => {
    if (query.get('layout')) state.layout = query.get('layout');
    if (query.get('grade')) state.grade = query.get('grade');
    if (query.get('caption') !== null) state.caption = query.get('caption');
    if (query.get('subcaption') !== null) state.subcaption = query.get('subcaption');
    if (query.get('style')) state.captionStyle = query.get('style');
    if (query.get('size')) state.size = query.get('size');
    const panelPhotos = (query.get('panels') || '').split(',').filter(Boolean);
    panelPhotos.forEach((p, i) => {
      if (state.panels[i]) state.panels[i].photo = Number(p) % photos.length;
    });
    const zooms = (query.get('zooms') || '').split(',').filter(Boolean);
    zooms.forEach((z, i) => {
      if (state.panels[i]) state.panels[i].zoom = Number(z) || 1;
    });
    const panys = (query.get('panys') || '').split(',').filter(Boolean);
    panys.forEach((p, i) => {
      if (state.panels[i]) state.panels[i].py = Number(p) || 0;
    });
    // Keep the caption input in step with the scene.
    const captionInput = document.getElementById('caption');
    if (captionInput) captionInput.value = state.caption;
    const subInput = document.getElementById('subcaption');
    if (subInput) subInput.value = state.subcaption;
  };

  if (shot === 'cover' || shot === 'cover-wide' || shot === 'cover-portrait') {
    document.body.classList.add('shot-cover');
    if (shot === 'cover-wide') state.size = 'wide';
    if (shot === 'cover-portrait') state.size = 'portrait';
    apply();
    redraw();
    // Size the cover canvas to the viewport for a full-bleed screenshot.
    const canvas = document.getElementById('cover');
    const size = SIZES[state.size];
    canvas.style.aspectRatio = `${size.w} / ${size.h}`;
    ready();
    return;
  }

  // Default: the editor scene.
  apply();
  redraw();
  ready();
}
