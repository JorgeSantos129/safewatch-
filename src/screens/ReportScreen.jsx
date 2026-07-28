import React, { useEffect, useState } from 'react';
import { FileText, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useNav } from '../App.jsx';
import { listJobs, getJob, listHazards, getImage } from '../lib/db.js';
import { summarizeHazards, hazardScore, formatDate } from '../lib/summary.js';
import { getFormula, TIER_COLORS } from '../lib/formulas.js';
import { classifyNR } from '../lib/riskModel.js';
import { generateJobPdf } from '../lib/pdf.js';
import { Card, Button, EmptyState, PageTitle } from '../components/ui.jsx';
import RiskBadge from '../components/RiskBadge.jsx';

export default function ReportScreen({ jobId: initialJobId }) {
  const { t, lang } = useI18n();
  const { go } = useNav();
  const [jobs, setJobs] = useState(null);
  const [jobId, setJobId] = useState(initialJobId || null);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!jobId) listJobs().then(setJobs); }, [jobId]);

  useEffect(() => {
    if (!jobId) { setData(null); return; }
    (async () => {
      const [job, hazards] = await Promise.all([getJob(jobId), listHazards(jobId)]);
      const withPhotos = await Promise.all(hazards.map(async (h) => ({ ...h, _photo: h.imageId ? await getImage(h.imageId) : null })));
      setData({ job, hazards: withPhotos });
    })();
  }, [jobId]);

  const download = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const doc = await generateJobPdf({ job: data.job, hazards: data.hazards, t, lang });
      doc.save(`${(data.job.name || 'report').replace(/[^\w-]+/g, '_')}.pdf`);
    } finally { setBusy(false); }
  };

  // ---- Job picker ----
  if (!jobId) {
    return (
      <div className="animate-fadein">
        <PageTitle title={t('report.title')} />
        {jobs == null ? <p className="py-10 text-center text-slate-500">{t('common.loading')}</p>
          : jobs.length === 0 ? <EmptyState icon={FileText} title={t('report.noJob')} />
          : <ul className="space-y-2">
              {jobs.map((j) => (
                <li key={j.id}><button onClick={() => setJobId(j.id)} className="w-full text-left">
                  <Card className="flex items-center justify-between p-4 active:scale-[.99] transition">
                    <div><h3 className="font-bold text-white">{j.name}</h3><p className="text-xs text-slate-400">{formatDate(j.date || j.createdAt, lang)}</p></div>
                    <ChevronRight size={18} className="text-slate-600" />
                  </Card>
                </button></li>
              ))}
            </ul>}
      </div>
    );
  }

  if (!data) return <p className="py-10 text-center text-slate-500">{t('common.loading')}</p>;

  const { job, hazards } = data;
  const formulaId = job.formulaId || 'std_matrix';
  const F = getFormula(formulaId);
  const summary = summarizeHazards(hazards, formulaId);

  return (
    <div className="animate-fadein">
      <div className="no-print">
        <PageTitle
          back={<button onClick={() => (initialJobId ? go('job', { jobId }) : setJobId(null))} className="flex h-touch w-touch -ml-2 items-center justify-center rounded-full text-slate-300 hover:bg-white/5"><ChevronLeft size={24} /></button>}
          title={t('report.preview')}
          right={<Button onClick={download} disabled={busy}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{t('report.download')}</Button>}
        />
      </div>

      {/* Print-friendly document preview */}
      <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-xl print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 font-black text-white">S</div>
          <div><div className="text-lg font-extrabold">{t('app.name')}</div><div className="text-xs text-slate-500">{t('report.title')}</div></div>
        </div>

        <h1 className="text-xl font-extrabold">{job.name}</h1>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
          {job.client && <span><b className="text-slate-800">{t('common.client')}:</b> {job.client}</span>}
          {job.location && <span><b className="text-slate-800">{t('common.location')}:</b> {job.location}</span>}
          <span><b className="text-slate-800">{t('common.date')}:</b> {formatDate(job.date || job.createdAt, lang)}</span>
          {job.assessor && <span><b className="text-slate-800">{t('job.assessor')}:</b> {job.assessor}</span>}
        </div>
        <p className="mt-2 text-xs font-semibold text-sky-600">{t('formula.method')}: {t('formula.' + formulaId)} · {F.equation}</p>

        {/* summary */}
        <SectionTitle>{t('report.summary')}</SectionTitle>
        <p className="text-sm text-slate-700">{t('report.totalHazards')}: <b>{hazards.length}</b></p>
        <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-slate-100">
          {['critical', 'high', 'medium', 'low'].map((k) => {
            const n = summary.counts[k] || 0; if (!n) return null;
            return <div key={k} style={{ width: `${(n / Math.max(1, hazards.length)) * 100}%`, background: TIER_COLORS[k] }} />;
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {['critical', 'high', 'medium', 'low'].map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: TIER_COLORS[k] }} />{t('risk.tiers.' + k)}: <b>{summary.counts[k] || 0}</b></span>
          ))}
        </div>

        {/* hazards */}
        <SectionTitle>{t('report.hazardDetail')}</SectionTitle>
        {hazards.length === 0 ? <p className="text-sm text-slate-500">{t('job.noHazardsYet')}</p> : (
          <ol className="space-y-4">
            {hazards.map((h, i) => {
              const s = hazardScore(h, formulaId);
              const roman = formulaId === 'marat' && s ? classifyNR(s.raw).roman : undefined;
              return (
                <li key={h.id} className="break-inside-avoid border-b border-slate-100 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{i + 1}. {h.title}</h3>
                    {s && <RiskBadgeLight tier={s.tier} label={t('risk.tiers.' + s.tier)} roman={roman} score={s.display} />}
                  </div>
                  {h.subarea && <p className="text-xs text-slate-500">{h.subarea}</p>}
                  <div className="mt-2 flex flex-wrap gap-4">
                    {h._photo && <img src={h._photo} alt="" className="h-32 w-44 rounded-lg border border-slate-200 object-cover" />}
                    <div className="flex-1 text-sm">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
                        {F.factors.map((fac) => {
                          let label = t('factor.' + fac.id); if (label === 'factor.' + fac.id) label = t('risk.' + fac.id);
                          return <span key={fac.id}><b>{label}:</b> {h.inputs?.[fac.id] ?? '—'}</span>;
                        })}
                      </div>
                      {h.description && <p className="mt-2 text-slate-600">{h.description}</p>}
                      {h.recommendations && <p className="mt-2 text-slate-700"><b>{t('report.recommendedActions')}:</b> {h.recommendations}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-6 text-center text-[10px] text-slate-400">{t('app.name')} · {t('report.generatedOn')} {formatDate(Date.now(), lang)}</p>
      </div>

      <div className="no-print mt-4">
        <Button className="w-full" onClick={download} disabled={busy}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{t('report.download')}</Button>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-2 mt-5 flex items-center gap-2 border-l-4 border-slate-900 pl-2 text-sm font-extrabold uppercase tracking-wide text-slate-900">{children}</h2>;
}
function RiskBadgeLight({ tier, label, roman, score }) {
  return <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: TIER_COLORS[tier] }}>{roman && <span>{roman}</span>}{label} · {score}</span>;
}
