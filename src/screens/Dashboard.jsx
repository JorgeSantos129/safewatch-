import React, { useEffect, useState, useCallback } from 'react';
import { Plus, ClipboardList, MapPin, Building2, ChevronRight, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useNav } from '../App.jsx';
import { listJobs, listHazards, saveJob } from '../lib/db.js';
import { summarizeHazards, formatDate } from '../lib/summary.js';
import { JOB_TYPES, formulaForJobType, getFormula } from '../lib/formulas.js';
import { Button, Field, Input, Textarea, Card, EmptyState, Fab, Sheet, PageTitle, Select } from '../components/ui.jsx';
import RiskBadge from '../components/RiskBadge.jsx';

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { go } = useNav();
  const [jobs, setJobs] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const js = await listJobs();
    setJobs(js);
    const entries = await Promise.all(
      js.map(async (j) => [j.id, summarizeHazards(await listHazards(j.id))])
    );
    setSummaries(Object.fromEntries(entries));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fadein">
      <PageTitle title={t('dashboard.title')} />

      {jobs == null ? (
        <p className="py-10 text-center text-slate-500">{t('common.loading')}</p>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('dashboard.empty')}
          action={<Button onClick={() => setCreating(true)}><Plus size={18} />{t('dashboard.newJob')}</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const s = summaries[job.id] || { counts: {}, total: 0, worst: null, highPlus: 0 };
            return (
              <li key={job.id}>
                <button onClick={() => go('job', { jobId: job.id })} className="w-full text-left">
                  <Card className="p-4 active:scale-[.99] transition hover:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-white">{job.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          {job.client && <span className="inline-flex items-center gap-1"><Building2 size={12} />{job.client}</span>}
                          {job.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{job.location}</span>}
                          <span>{formatDate(job.date || job.createdAt, lang)}</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="mt-0.5 shrink-0 text-slate-600" />
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">{t(`formula.${job.formulaId || 'std_matrix'}`)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-400">
                        {s.total} {s.total === 1 ? t('dashboard.hazard') : t('dashboard.hazards')}
                      </span>
                      {s.highPlus > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-400 ring-1 ring-orange-500/30">
                          <AlertTriangle size={13} />
                          {t('dashboard.highRisks', { count: s.highPlus })}
                        </span>
                      ) : s.worst ? (
                        <RiskBadge tier={s.worst} label={t(`risk.tiers.${s.worst}`)} size="sm" />
                      ) : (
                        <span className="text-xs text-slate-600">{t('dashboard.noHazards')}</span>
                      )}
                    </div>
                    {s.total > 0 && <TierBar counts={s.counts} total={s.total} />}
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {jobs && jobs.length > 0 && <Fab onClick={() => setCreating(true)} icon={Plus} label={t('dashboard.newJob')} />}

      <CreateJobSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={async (job) => { setCreating(false); await load(); go('job', { jobId: job.id }); }}
      />
    </div>
  );
}

function TierBar({ counts, total }) {
  const seg = [
    { k: 'critical', c: '#EF4444' }, { k: 'high', c: '#F97316' },
    { k: 'medium', c: '#EAB308' }, { k: 'low', c: '#22C55E' },
  ];
  return (
    <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-800">
      {seg.map(({ k, c }) => {
        const n = counts[k] || 0;
        if (!n) return null;
        return <div key={k} style={{ width: `${(n / total) * 100}%`, background: c }} />;
      })}
    </div>
  );
}

function CreateJobSheet({ open, onClose, onCreated }) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const initial = { name: '', client: '', location: '', date: today, assessor: '', description: '', jobType: 'general_workplace' };
  const [form, setForm] = useState(initial);
  useEffect(() => { if (open) setForm(initial); }, [open]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const formulaId = formulaForJobType(form.jobType);
  const submit = async () => {
    if (!form.name.trim()) return;
    const job = await saveJob({ ...form, date: new Date(form.date).getTime(), formulaId, formulaOverride: false });
    onCreated(job);
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('job.create')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="flex-1" onClick={submit} disabled={!form.name.trim()}>{t('common.create')}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label={t('job.name')}><Input value={form.name} onChange={set('name')} placeholder={t('job.namePh')} autoFocus /></Field>
        <Field label={t('jobType.label')} hint={t('jobType.help')}>
          <Select value={form.jobType} onChange={set('jobType')}>
            {JOB_TYPES.map((j) => <option key={j.id} value={j.id}>{t(`jobType.${j.id}`)}</option>)}
          </Select>
        </Field>
        <div className="rounded-xl bg-slate-800/50 px-3 py-2.5 text-xs">
          <span className="text-slate-400">{t('formula.method')}: </span>
          <span className="font-semibold text-sky-300">{t(`formula.${formulaId}`)}</span>
          <code className="mt-1 block font-mono text-[10px] text-slate-400">{getFormula(formulaId).equation}</code>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('job.client')}><Input value={form.client} onChange={set('client')} placeholder={t('job.clientPh')} /></Field>
          <Field label={t('job.date')}><Input type="date" value={form.date} onChange={set('date')} /></Field>
        </div>
        <Field label={t('job.location')}><Input value={form.location} onChange={set('location')} placeholder={t('job.locationPh')} /></Field>
        <Field label={t('job.assessor')} hint={t('common.optional')}><Input value={form.assessor} onChange={set('assessor')} placeholder={t('job.assessorPh')} /></Field>
        <Field label={t('job.description')} hint={t('common.optional')}><Textarea value={form.description} onChange={set('description')} placeholder={t('job.descriptionPh')} /></Field>
      </div>
    </Sheet>
  );
}
