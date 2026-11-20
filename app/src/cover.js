// Neon Bay Cover Studio — render engine.
// Draws a multi-panel poster cover onto a canvas: white-guttered photo panels,
// a Vice City-style sunset / neon colour grade, a synthwave sun drawn as
// vector shapes, and a big bold caption band along the
// foot. Everything is drawn with the canvas 2D API; no image, font or network
// resource is needed beyond the photos the user loads. Deterministic: the same
// state always paints the same pixels.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const LAYOUTS = {
  trio: { label: 'Hero trio', panels: 3 },
  quad: { label: 'Four square', panels: 4 },
  hero5: { label: 'Hero + four', panels: 5 },
  single: { label: 'Single hero', panels: 1 },
};

// One grade: how the photo is filtered, which warm/cool wash is laid over it,
// and the palette of the caption band and sun. Values are plain colours so the
// grade is a look, not a filter preset copied from anywhere.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.02)',
    washTop: 'rgba(255, 154, 61, 0.28)', washBottom: 'rgba(255, 46, 136, 0.42)',
    bandTop: 'rgba(43, 16, 66, 0)', bandBottom: 'rgba(43, 16, 66, 0.92)',
    sunTop: '#ffd76a', sunBottom: '#ff2e88', accent: '#ffb347',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.12) brightness(1.0)',
    washTop: 'rgba(0, 229, 255, 0.26)', washBottom: 'rgba(255, 0, 170, 0.40)',
    bandTop: 'rgba(10, 8, 42, 0)', bandBottom: 'rgba(10, 8, 42, 0.94)',
    sunTop: '#7df9ff', sunBottom: '#ff00aa', accent: '#00e5ff',
  },
  noir: {
    label: 'Palm Noir',
    filter: 'saturate(0.45) contrast(1.28) brightness(0.94)',
    washTop: 'rgba(20, 90, 110, 0.30)', washBottom: 'rgba(8, 8, 20, 0.50)',
    bandTop: 'rgba(5, 5, 12, 0)', bandBottom: 'rgba(5, 5, 12, 0.94)',
    sunTop: '#e8e4d8', sunBottom: '#8a94a6', accent: '#c8d2d8',
  },
  pastel: {
    label: 'Pastel Vice',
    filter: 'saturate(1.12) contrast(1.02) brightness(1.09)',
    washTop: 'rgba(255, 183, 213, 0.30)', washBottom: 'rgba(120, 220, 200, 0.34)',
    bandTop: 'rgba(64, 32, 64, 0)', bandBottom: 'rgba(64, 32, 64, 0.88)',
    sunTop: '#ffe9a8', sunBottom: '#ff9ecf', accent: '#ffb7d5',
  },
  chrome: {
    label: 'Chrome Dusk',
    filter: 'saturate(0.85) contrast(1.32) brightness(1.0)',
    washTop: 'rgba(140, 180, 255, 0.26)', washBottom: 'rgba(255, 90, 60, 0.30)',
    bandTop: 'rgba(12, 18, 34, 0)', bandBottom: 'rgba(12, 18, 34, 0.93)',
    sunTop: '#fff3c4', sunBottom: '#ff5a3c', accent: '#8cb4ff',
  },
};

export const CAPTION_STYLES = {
  block: { label: 'Block', fill: '#ffffff', stroke: '#14061f', strokeWidth: 0.16, glow: null },
  outline: { label: 'Outline', fill: 'rgba(255,255,255,0)', stroke: '#ffffff', strokeWidth: 0.10, glow: null },
  neon: { label: 'Neon glow', fill: '#ffffff', stroke: '#00e5ff', strokeWidth: 0.05, glow: '#ff00aa' },
  sunset: { label: 'Sunset fill', fill: null, stroke: '#ffffff', strokeWidth: 0.06, glow: null },
};

/** Default state for a fresh cover. Panel photos are indexes into the photo list. */
export function defaultState() {
  return {
    layout: 'trio',
    grade: 'sunset',
    caption: 'Sunset Heist',
    subcaption: 'NEON BAY',
    captionStyle: 'block',
    size: 'square',
    panels: [
      { photo: 0, zoom: 1.0, px: 0, py: 0 },
      { photo: 1, zoom: 1.0, px: 0, py: 0 },
      { photo: 0, zoom: 1.25, px: 0.08, py: -0.05 },
      { photo: 1, zoom: 1.15, px: -0.06, py: 0.04 },
      { photo: 0, zoom: 1.4, px: 0, py: 0.1 },
    ],
  };
}

/** Panel rectangles for a layout, as fractions of the canvas (x, y, w, h). */
export function layoutRects(layout, w, h) {
  const g = 0.014 * Math.min(w, h); // white gutter between panels
  const band = 0.185 * h; // caption band reserved at the foot
  const top = 0;
  const bottom = h - band;
  const full = { x: g, y: top + g, w: w - 2 * g, h: bottom - top - g };
  const halfW = (w - 3 * g) / 2;
  const halfH = (bottom - top - 3 * g) / 2;
  if (layout === 'single') return [full];
  if (layout === 'quad') {
    return [
      { x: g, y: g, w: halfW, h: halfH },
      { x: 2 * g + halfW, y: g, w: halfW, h: halfH },
      { x: g, y: 2 * g + halfH, w: halfW, h: halfH },
      { x: 2 * g + halfW, y: 2 * g + halfH, w: halfW, h: halfH },
    ];
  }
  if (layout === 'hero5') {
    const heroW = w * 0.56 - 1.5 * g;
    const smallW = (w - heroW - 3 * g) / 2;
    const smallH = (bottom - top - 3 * g) / 2;
    const sx = heroW + 2 * g;
    return [
      { x: g, y: g, w: heroW, h: bottom - top - g },
      { x: sx, y: g, w: smallW, h: smallH },
      { x: sx + smallW + g, y: g, w: smallW, h: smallH },
      { x: sx, y: 2 * g + smallH, w: smallW, h: smallH },
      { x: sx + smallW + g, y: 2 * g + smallH, w: smallW, h: smallH },
    ];
  }
  // trio: one tall hero panel left, two stacked panels right.
  const heroW = w * 0.60 - 1.5 * g;
  const sideW = w - heroW - 3 * g;
  const sideH = (bottom - top - 3 * g) / 2;
  return [
    { x: g, y: g, w: heroW, h: bottom - top - g },
    { x: heroW + 2 * g, y: g, w: sideW, h: sideH },
    { x: heroW + 2 * g, y: 2 * g + sideH, w: sideW, h: sideH },
  ];
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan offsets. */
function drawPanelPhoto(ctx, img, rect, panel, grade) {
  if (!img) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const cx = rect.x + rect.w / 2 + (panel.px || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (panel.py || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.filter = 'none';
  // Warm-to-cool wash over the photo, stronger at the foot of the panel.
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** A synthwave sun: a gradient disc cut by horizontal slats, tucked into the
 *  top corner of the panel so it never covers the subject's face. */
function drawSun(ctx, rect, grade) {
  const r = Math.min(rect.w, rect.h) * 0.20;
  const cx = rect.x + rect.w * 0.88;
  const cy = rect.y + rect.h * 0.17;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, grade.sunTop);
  grad.addColorStop(1, grade.sunBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  let y = cy + r * 0.08;
  let gap = r * 0.07;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap * 2.4;
    gap *= 1.5;
  }
  ctx.restore();
}

/** Fits the caption to the width and paints it in the chosen style. */
function drawCaption(ctx, state, grade, w, h) {
  const text = (state.caption || '').trim().toUpperCase();
  const bandTop = h * (1 - 0.185);
  // Band: dark gradient rising from the foot so the lettering always reads.
  const band = ctx.createLinearGradient(0, bandTop - h * 0.06, 0, h);
  band.addColorStop(0, grade.bandTop);
  band.addColorStop(1, grade.bandBottom);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandTop - h * 0.06, w, h * 0.185 + h * 0.06);

  const style = CAPTION_STYLES[state.captionStyle] || CAPTION_STYLES.block;
  const sub = (state.subcaption || '').trim().toUpperCase();
  if (sub) {
    const subSize = Math.max(14, h * 0.024);
    ctx.save();
    ctx.font = `700 ${subSize}px "Arial Narrow", Arial, sans-serif`;
    try { ctx.letterSpacing = `${subSize * 0.42}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = grade.accent;
    const sy = bandTop + h * 0.03;
    ctx.fillText(sub, w / 2, sy);
    // Thin rules either side of the subcaption.
    const sw = ctx.measureText(sub).width;
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(1.5, h * 0.002);
    ctx.beginPath();
    ctx.moveTo(w / 2 - sw / 2 - w * 0.06, sy - subSize * 0.32);
    ctx.lineTo(w / 2 - sw / 2 - w * 0.015, sy - subSize * 0.32);
    ctx.moveTo(w / 2 + sw / 2 + w * 0.015, sy - subSize * 0.32);
    ctx.lineTo(w / 2 + sw / 2 + w * 0.06, sy - subSize * 0.32);
    ctx.stroke();
    ctx.restore();
  }
  if (!text) return;

  const family = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';
  const maxWidth = w * 0.92;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Slight forward slant, the poster-lettering lean.
  const slant = -0.06;
  const measure = (s) => {
    ctx.font = `900 ${s}px ${family}`;
    return ctx.measureText(text).width + Math.abs(slant) * s;
  };
  // Start at a tenth of the height and shrink only until the caption fits.
  let size = Math.round(h * 0.105);
  while (size > 16 && measure(size) > maxWidth) size -= 2;
  ctx.font = `900 ${size}px ${family}`;
  const baseline = h - h * 0.035;
  ctx.setTransform(1, 0, slant, 1, 0, 0);
  const cx = (w / 2 - slant * baseline) | 0;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * (style.strokeWidth || 0.1);
  if (style.fill === null) {
    const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline);
    grad.addColorStop(0, '#ffe9a8');
    grad.addColorStop(0.55, grade.sunBottom);
    grad.addColorStop(1, '#7df9ff');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = style.fill;
  }
  if (style.glow) {
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = size * 0.35;
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.strokeText(text, cx, baseline);
  }
  ctx.fillText(text, cx, baseline);
  ctx.restore();
}

/**
 * Paints the whole cover for `state` onto `canvas` (its own pixel size).
 * `photos` is the list of loaded images; a panel with no photo paints a
 * gradient placeholder with its panel number.
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutRects(state.layout, w, h);
  const count = LAYOUTS[state.layout].panels;

  // Paper-white gutters, the poster-board look.
  ctx.fillStyle = '#f7f1e8';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < count; i += 1) {
    const rect = rects[i];
    const panel = state.panels[i] || { photo: 0, zoom: 1, px: 0, py: 0 };
    const img = photos[panel.photo] || null;
    if (img) {
      drawPanelPhoto(ctx, img, rect, panel, grade);
    } else {
      const g2 = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g2.addColorStop(0, '#3a2350');
      g2.addColorStop(1, '#12081d');
      ctx.fillStyle = g2;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `700 ${Math.round(rect.h * 0.05)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`PANEL ${i + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    // Thin dark keyline around each panel.
    ctx.strokeStyle = 'rgba(20, 6, 31, 0.85)';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Sun in the hero panel, tucked in its top corner.
  const hero = rects[0];
  ctx.save();
  ctx.beginPath();
  ctx.rect(hero.x, hero.y, hero.w, hero.h);
  ctx.clip();
  drawSun(ctx, hero, grade);
  ctx.restore();

  drawCaption(ctx, state, grade, w, h);
  return rects;
}
