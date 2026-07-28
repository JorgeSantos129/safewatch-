import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft, Plus, Trash2, MapPin, Building2, Calendar, User,
  ChevronRight, Filter, FileText, SlidersHorizontal, BarChart3,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '../i18n/index.jsx';
import { useNav } from '../App.jsx';
import { getJob, listHazards, deleteJob, getImage, saveJob } from '../lib/db.js';
import { summarizeHazards, hazardScore, formatDate } from '../lib/summary.js';
import { getFormula, TIER_COLORS } from '../lib/formulas.js';
import { classifyNR } from '../lib/riskModel.js';
import { Button, Card, EmptyState, Fab, PageTitle, Sheet } from '../components/ui.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import RiskMatrix from '../components/RiskMatrix.jsx';
import RiskGauge from '../components/RiskGauge.jsx';
import RiskBars from '../components/RiskBars.jsx';
import FormulaPicker from '../components/FormulaPicker.jsx';

const TIERS = ['critical', 'high', 'medium', 'low'];

export default function JobDetail({ jobId }) {
  const { t, lang } = useI18n();
  const { go, back, reset } = useNav();
  const [job, setJob] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [tab, setTab] = useState('overview');
  const [filter, setFilter] = useState('all');
  const [confirmDel, setConfirmDel] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    const [j, hz] = await Promise.all([getJob(jobId), listHazards(jobId)]);
    setJob(j); setHazards(hz);
  }, [jobId]);
  useEffect(() => { load(); }, [load]);

  if (!job) return <p className="py-10 text-center text-slate-500">{t('common.loading')}</p>;

  const formulaId = job.formulaId || 'std_matrix';
  const F = getFormula(formulaId);
  const summary = summarizeHazards(hazards, formulaId);
  const filtered = filter === 'all' ? hazards : hazards.filter((h) => hazardScore(h, formulaId)?.tier === filter);
  const pieData = TIERS.map((k) => ({ key: k, name: t('risk.tiers.' + k), value: summary.counts[k] || 0, color: TIER_COLORS[k] })).filter((d) => d.value > 0);

  const changeFormula = async (fid) => {
    const updated = await saveJob({ ...job, formulaId: fid, formulaOverride: true });
    setJob(updated); setFilter('all');
  };

  return (
    <div className="animate-fadein">
      <PageTitle
        back={<button onClick={back} className="flex h-touch w-touch -ml-2 items-center justify-center rounded-full text-slate-300 hover:bg-white/5"><ChevronLeft size={24} /></button>}
        title={job.name}
        right={<div className="flex">
          <button onClick={() => setSettingsOpen(true)} className="flex h-touch w-touch items-center justify-center rounded-full text-slate-400 hover:bg-white/5"><SlidersHorizontal size={19} /></button>
          <button onClick={() => setConfirmDel(true)} className="flex h-touch w-touch items-center justify-center rounded-full text-slate-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={20} /></button>
        </div>}
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          {job.client && <Meta icon={Building2} value={job.client} />}
          {job.location && <Meta icon={MapPin} value={job.location} />}
          <Meta icon={Calendar} value={formatDate(job.date || job.createdAt, lang)} />
          {job.assessor && <Meta icon={User} value={job.assessor} />}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          <span className="rounded-md bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-300">{t('formula.' + formulaId)}</span>
          <code className="font-mono text-[10px] text-slate-500">{F.equation}</code>
        </div>
        {job.description && <p className="mt-3 text-sm text-slate-400">{job.description}</p>}
      </Card>

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-800/60 p-1">
        {[['overview', t('job.overview')], ['hazards', t('job.hazardsTab') + ' (' + hazards.length + ')']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={'min-h-touch flex-1 rounded-lg text-sm font-semibold transition ' + (tab === k ? 'bg-slate-700 text-white shadow' : 'text-slate-400')}>{label}</button>
        ))}
      </div>

      {tab === 'overview' ? (
        hazards.length === 0 ? (
          <EmptyState icon={FileText} title={t('job.noHazardsYet')} action={<Button onClick={() => go('hazard', { jobId })}><Plus size={18} />{t('job.addHazard')}</Button>} />
        ) : (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="mb-1 font-bold text-white">{F.viz === 'matrix2d' ? t('matrix.title') : t('report.riskDistribution')}</h3>
              <p className="mb-3 text-xs text-slate-500">{F.viz === 'matrix2d' ? t('matrix.subtitle') : F.name}</p>
              {F.viz === 'matrix2d' && <RiskMatrix formulaId={formulaId} hazards={hazards} onCellClick={(items) => { setTab('hazards'); setFilter(hazardScore(items[0], formulaId).tier); }} />}
              {F.viz === 'bars' && <RiskBars formulaId={formulaId} hazards={hazards} />}
              {F.viz === 'gauge' && <GaugeSummary formulaId={formulaId} hazards={hazards} />}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 font-bold text-white">{t('report.breakdown')}</h3>
              <div className="flex items-center gap-4">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={2} stroke="none">
                        {pieData.map((d) => <Cell key={d.key} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-2">
                  {TIERS.map((k) => (
                    <li key={k} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-slate-300"><span className="h-3 w-3 rounded-sm" style={{ background: TIER_COLORS[k] }} />{t('risk.tiers.' + k)}</span>
                      <span className="font-bold tabular-nums text-white">{summary.counts[k] || 0}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Button variant="secondary" className="w-full" onClick={() => go('report', { jobId })}><FileText size={18} />{t('report.title')}</Button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={t('common.all') + ' (' + hazards.length + ')'} />
            {TIERS.map((k) => { const n = summary.counts[k] || 0; if (!n) return null; return <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)} label={t('risk.tiers.' + k) + ' (' + n + ')'} color={TIER_COLORS[k]} />; })}
          </div>
          {filtered.length === 0 ? <EmptyState icon={Filter} title={t('common.noData')} /> : (
            <ul className="space-y-2">{filtered.map((h) => <HazardRow key={h.id} hazard={h} formulaId={formulaId} onClick={() => go('hazard', { jobId, hazardId: h.id })} />)}</ul>
          )}
        </div>
      )}

      <Fab onClick={() => go('hazard', { jobId })} icon={Plus} label={t('job.addHazard')} />

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('formula.override')}>
        <p className="mb-4 text-xs text-slate-400">{t('formula.overrideHelp')}</p>
        <FormulaPicker value={formulaId} onChange={(fid) => { changeFormula(fid); setSettingsOpen(false); }} />
      </Sheet>

      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title={t('job.delete')}
        footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setConfirmDel(false)}>{t('common.cancel')}</Button><Button variant="danger" className="flex-1" onClick={async () => { await deleteJob(jobId); reset('dashboard'); }}>{t('common.delete')}</Button></div>}>
        <p className="text-sm text-slate-300">{t('job.deleteConfirm')}</p>
      </Sheet>
    </div>
  );
}

function GaugeSummary({ formulaId, hazards }) {
  const scored = hazards.map((h) => hazardScore(h, formulaId)?.raw).filter((v) => v != null);
  const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0;
  const max = scored.length ? Math.max(...scored) : 0;
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-around gap-2">
      <div className="text-center"><RiskGauge formulaId={formulaId} value={max} size={150} /><div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">max</div></div>
      <div className="text-center"><RiskGauge formulaId={formulaId} value={avg} size={150} /><div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">avg</div></div>
    </div>
  );
}

function Meta({ icon: Icon, value }) {
  return <span className="inline-flex items-center gap-1.5 text-slate-300"><Icon size={14} className="text-slate-500" />{value}</span>;
}
function FilterChip({ active, onClick, label, color }) {
  return <button onClick={onClick} className={'inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ' + (active ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300')}>{color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}{label}</button>;
}
function HazardRow({ hazard, formulaId, onClick }) {
  const { t } = useI18n();
  const [thumb, setThumb] = useState(null);
  const s = hazardScore(hazard, formulaId);
  const roman = formulaId === 'marat' && s ? classifyNR(s.raw).roman : undefined;
  useEffect(() => { let on = true; getImage(hazard.imageId).then((d) => on && setThumb(d)); return () => { on = false; }; }, [hazard.imageId]);
  return (
    <li><button onClick={onClick} className="w-full text-left">
      <Card className="flex items-center gap-3 p-3 active:scale-[.99] transition">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">{thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-600"><FileText size={20} /></div>}</div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-semibold text-white">{hazard.title || t('hazard.new')}</h4>
          {hazard.subarea && <p className="truncate text-xs text-slate-400">{hazard.subarea}</p>}
          <div className="mt-1.5">{s && <RiskBadge tier={s.tier} roman={roman} label={t('risk.tiers.' + s.tier)} score={s.display} showScore size="sm" />}</div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-slate-600" />
      </Card>
    </button></li>
  );
}

