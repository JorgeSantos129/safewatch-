import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ChevronLeft, Camera, Check, Trash2, Pencil, Info } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useNav } from '../App.jsx';
import { useFormula } from '../lib/useFormula.js';
import { getFormula } from '../lib/formulas.js';
import { getJob, getHazard, saveHazard, deleteHazard, saveImage, getImage } from '../lib/db.js';
import { classifyNR } from '../lib/riskModel.js';
import { Button, Field, Input, Textarea, Card, Sheet } from '../components/ui.jsx';
import FactorInput from '../components/FactorInput.jsx';
import PhotoAnnotator from '../components/PhotoAnnotator.jsx';
import RiskBadge from '../components/RiskBadge.jsx';

/** Screen 3 — capture a photo, annotate it, and log a hazard whose input
 * fields adapt to the job's active risk formula, with a live risk read-out. */
export default function HazardForm({ jobId, hazardId }) {
  const { t } = useI18n();
  const { back } = useNav();
  const [job, setJob] = useState(null);
  const [existing, setExisting] = useState(null);
  const [title, setTitle] = useState('');
  const [subarea, setSubarea] = useState('');
  const [description, setDescription] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [inputs, setInputs] = useState({});
  const [image, setImage] = useState(null);
  const [imageDirty, setImageDirty] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [ready, setReady] = useState(false);

  const formulaId = job?.formulaId || 'std_matrix';
  const F = useFormula(formulaId);

  // seed default values (sliders -> min so the score is live immediately)
  const seedInputs = useCallback((f) => {
    const seed = {};
    for (const fac of f.factors) if (fac.kind === 'slider') seed[fac.id] = fac.min ?? 0;
    return seed;
  }, []);

  useEffect(() => {
    (async () => {
      const j = await getJob(jobId);
      setJob(j);
      if (hazardId) {
        const h = await getHazard(hazardId);
        if (h) {
          setExisting(h);
          setTitle(h.title || ''); setSubarea(h.subarea || '');
          setDescription(h.description || ''); setRecommendations(h.recommendations || '');
          setInputs(h.inputs || {});
          if (h.imageId) setImage(await getImage(h.imageId));
        }
      } else {
        setInputs(seedInputs(getFormula(j?.formulaId)));
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, hazardId]);

  const result = useMemo(() => F.evaluate(inputs), [F, inputs]);
  const maratLevel = formulaId === 'marat' && result ? classifyNR(result.raw) : null;

  const setFactor = (id) => (val) => setInputs((s) => ({ ...s, [id]: val }));

  const canSave = title.trim() && result;
  const submit = async () => {
    let imageId = existing?.imageId || null;
    if (imageDirty && image) imageId = await saveImage(image);
    await saveHazard({
      id: existing?.id, jobId, formulaId,
      title: title.trim(), subarea: subarea.trim(), description: description.trim(),
      recommendations: recommendations.trim(), inputs, imageId,
    });
    back();
  };

  if (!ready) return <div className="p-8 text-center text-slate-500">{t('common.loading')}</div>;

  return (
    <div className="min-h-full pb-40">
      {/* header */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/5 bg-slate-950/90 px-2 py-2 pt-safe backdrop-blur">
        <button onClick={back} className="flex h-touch w-touch items-center justify-center rounded-full text-slate-300 hover:bg-white/5"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 truncate text-base font-bold text-white">{existing ? t('hazard.edit') : t('hazard.new')}</h1>
        {existing && <button onClick={() => setConfirmDel(true)} className="flex h-touch w-touch items-center justify-center rounded-full text-slate-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={20} /></button>}
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-4">
        {/* photo */}
        <div>
          <div className="mb-1.5 text-sm font-semibold text-slate-200">{t('hazard.photo')}</div>
          {image ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              <img src={image} alt="" className="w-full" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button onClick={() => setPhotoOpen(true)} className="flex items-center gap-1 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><Pencil size={14} />{t('hazard.annotate')}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setPhotoOpen(true)} className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-slate-800/40 text-slate-500 active:scale-[.99]">
              <Camera size={34} /><span className="text-sm font-semibold">{t('hazard.takePhoto')}</span>
            </button>
          )}
        </div>

        {/* basics */}
        <Field label={t('hazard.title')}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('hazard.titlePh')} /></Field>
        <Field label={t('hazard.subarea')} hint={t('common.optional')}><Input value={subarea} onChange={(e) => setSubarea(e.target.value)} placeholder={t('hazard.subareaPh')} /></Field>
        <Field label={t('hazard.description')} hint={t('common.optional')}><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('hazard.descriptionPh')} /></Field>

        {/* assessment */}
        <Card className="p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-white">{t('hazard.assessment')}</h3>
              <p className="mt-0.5 text-xs text-slate-400">{F.name}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 font-mono text-[10px] text-sky-300">{F.equation}</span>
          </div>
          <div className="space-y-4">
            {F.factors.map((fac) => (
              <FactorInput key={fac.id} factor={fac} value={inputs[fac.id]} onChange={setFactor(fac.id)} />
            ))}
          </div>
        </Card>

        {/* recommendations */}
        <Field label={t('hazard.recommendations')} hint={t('common.optional')}><Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder={t('hazard.recommendationsPh')} /></Field>
      </div>

      {/* sticky live score + save */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-4 py-3 pb-safe backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{t('hazard.liveScore')}</div>
            {result ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tabular-nums text-white">{result.display}</span>
                <RiskBadge tier={result.tier} roman={maratLevel?.roman} label={result.tierLabel} size="sm" />
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-slate-500"><Info size={13} />{t('hazard.tapToRate')}</div>
            )}
          </div>
          <Button size="lg" onClick={submit} disabled={!canSave}><Check size={18} />{t('common.save')}</Button>
        </div>
      </div>

      {/* photo sheet */}
      <Sheet open={photoOpen} onClose={() => setPhotoOpen(false)} title={t('hazard.photo')}>
        <PhotoAnnotator
          initialImage={image}
          onSave={(url) => { setImage(url); setImageDirty(true); setPhotoOpen(false); }}
          onCancel={() => setPhotoOpen(false)}
        />
      </Sheet>

      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title={t('hazard.edit')}
        footer={<div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmDel(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" className="flex-1" onClick={async () => { await deleteHazard(existing.id); back(); }}>{t('common.delete')}</Button>
        </div>}>
        <p className="text-sm text-slate-300">{t('hazard.deleteConfirm')}</p>
      </Sheet>
    </div>
  );
}

