import { jsPDF } from 'jspdf';
import { getFormula, TIER_COLORS, formatScore } from './formulas.js';
import { getImage } from './db.js';
import { hazardScore } from './summary.js';
import { classifyNR } from './riskModel.js';

const M = 40;               // page margin
const LINE = '#e2e8f0';

/**
 * Build an executive PDF report for a job using jsPDF's vector API (no
 * html2canvas dependency). Renders metadata, a risk-distribution bar, and a
 * per-hazard breakdown with annotated photo, scores and recommendations.
 */
export async function generateJobPdf({ job, hazards, t, lang }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const formulaId = job.formulaId || 'std_matrix';
  const F = getFormula(formulaId);
  let y = M;

  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const setFill = (h) => doc.setFillColor(...hex(h));
  const setText = (h) => doc.setTextColor(...hex(h));
  const ensure = (need) => { if (y + need > H - M) { doc.addPage(); y = M; } };

  // ---- Header band ----
  setFill('#0f172a'); doc.rect(0, 0, W, 84, 'F');
  setFill('#38bdf8'); doc.roundedRect(M, 26, 30, 30, 6, 6, 'F');
  setText('#ffffff'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('S', M + 15, 46, { align: 'center' });
  doc.setFontSize(18); doc.text(t('app.name'), M + 42, 40);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); setText('#94a3b8');
  doc.text(t('report.title'), M + 42, 56);
  y = 108;

  // ---- Title + meta ----
  setText('#0f172a'); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(job.name || '', M, y); y += 22;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); setText('#475569');
  const meta = [
    job.client && `${t('common.client')}: ${job.client}`,
    job.location && `${t('common.location')}: ${job.location}`,
    `${t('common.date')}: ${fmtDate(job.date || job.createdAt, lang)}`,
    job.assessor && `${t('job.assessor')}: ${job.assessor}`,
  ].filter(Boolean);
  meta.forEach((line) => { doc.text(line, M, y); y += 15; });
  y += 4;
  setText('#0ea5e9'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(`${t('formula.method')}: ${t('formula.' + formulaId)}  ·  ${F.equation}`, M, y); y += 20;

  // ---- Executive summary ----
  const summary = tally(hazards, formulaId);
  drawSectionTitle(doc, t('report.summary'), M, y, W); y += 22;
  setText('#334155'); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`${t('report.totalHazards')}: ${hazards.length}`, M, y); y += 16;

  // distribution bar
  const barW = W - 2 * M, barH = 16;
  let x = M;
  ['critical', 'high', 'medium', 'low'].forEach((k) => {
    const n = summary[k]; if (!n) return;
    const w = (n / Math.max(1, hazards.length)) * barW;
    setFill(TIER_COLORS[k]); doc.rect(x, y, w, barH, 'F'); x += w;
  });
  y += barH + 10;
  ['critical', 'high', 'medium', 'low'].forEach((k) => {
    setFill(TIER_COLORS[k]); doc.rect(M, y - 8, 9, 9, 'F');
    setText('#334155'); doc.setFontSize(9);
    doc.text(`${t('risk.tiers.' + k)}: ${summary[k]}`, M + 14, y); y += 14;
  });
  y += 8;

  // ---- Hazards ----
  drawSectionTitle(doc, t('report.hazardDetail'), M, y, W); y += 20;

  for (let i = 0; i < hazards.length; i++) {
    const h = hazards[i];
    const s = hazardScore(h, formulaId);
    const tier = s?.tier || 'low';
    ensure(150);
    // card frame
    const cardY = y;
    setFill('#f8fafc'); doc.setDrawColor(...hex('#e2e8f0'));
    // number + title
    setText('#0f172a'); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(`${i + 1}. ${h.title || ''}`, M, y + 4); y += 18;
    if (h.subarea) { setText('#64748b'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(h.subarea, M, y); y += 14; }

    const photo = h.imageId ? await getImage(h.imageId) : null;
    const colX = M;
    const imgW = 150, imgH = 110;
    let rowTop = y;
    if (photo) {
      try {
        const fmt = photo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(photo, fmt, colX, y, imgW, imgH, undefined, 'FAST');
      } catch (e) { /* ignore bad image */ }
    }
    // scores column
    const sx = photo ? colX + imgW + 16 : colX;
    let sy = rowTop + 4;
    // risk badge
    setFill(TIER_COLORS[tier]); doc.roundedRect(sx, sy - 10, 130, 20, 4, 4, 'F');
    setText('#ffffff'); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    const roman = formulaId === 'marat' && s ? classifyNR(s.raw).roman + ' · ' : '';
    doc.text(`${roman}${t('risk.tiers.' + tier)}  ${s ? s.display : '—'}`, sx + 8, sy + 3);
    sy += 26;
    setText('#334155'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    F.factors.forEach((fac) => {
      const label = tr(t, 'factor.' + fac.id, 'risk.' + fac.id);
      const val = h.inputs?.[fac.id];
      doc.text(`${label}: ${val ?? '—'}`, sx, sy); sy += 13;
    });
    y = Math.max(photo ? rowTop + imgH : rowTop, sy) + 8;

    if (h.description) { ensure(30); setText('#475569'); doc.setFontSize(9); y = wrap(doc, h.description, M, y, W - 2 * M) + 4; }
    if (h.recommendations) {
      ensure(34);
      setText('#0f172a'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(t('report.recommendedActions') + ':', M, y); y += 13;
      setText('#475569'); doc.setFont('helvetica', 'normal');
      y = wrap(doc, h.recommendations, M, y, W - 2 * M) + 6;
    }
    setDraw(doc, '#e2e8f0'); doc.line(M, y, W - M, y); y += 14;
  }

  // ---- Footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setText('#94a3b8'); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`${t('app.name')} · ${t('report.generatedOn')} ${fmtDate(Date.now(), lang)}`, M, H - 20);
    doc.text(`${t('report.page')} ${p}/${pages}`, W - M, H - 20, { align: 'right' });
  }

  return doc;
}

function tally(hazards, formulaId) {
  const c = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const h of hazards) { const s = hazardScore(h, formulaId); if (s) c[s.tier]++; }
  return c;
}
function drawSectionTitle(doc, text, x, y, W) {
  doc.setFillColor(15, 23, 42); doc.rect(x, y - 12, 4, 16, 'F');
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(text, x + 12, y);
}
function setDraw(doc, h) { const n = parseInt(h.slice(1), 16); doc.setDrawColor((n >> 16) & 255, (n >> 8) & 255, n & 255); }
function wrap(doc, text, x, y, maxW) {
  const lines = doc.splitTextToSize(text, maxW);
  lines.forEach((ln) => { doc.text(ln, x, y); y += 12; });
  return y;
}
function tr(t, primary, fallback) { const v = t(primary); return v === primary ? t(fallback) : v; }
function fmtDate(ts, lang) {
  try { return new Date(ts).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}
