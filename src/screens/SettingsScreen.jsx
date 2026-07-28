import React, { useState } from 'react';
import { Globe, Database, Trash2, Download, Info, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { clearAll, exportAll } from '../lib/db.js';
import { Card, Button, Sheet, PageTitle } from '../components/ui.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';

export default function SettingsScreen() {
  const { t } = useI18n();
  const [confirmClear, setConfirmClear] = useState(false);

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `safewatch-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fadein">
      <PageTitle title={t('settings.title')} />
      <div className="space-y-4">
        <Section icon={Globe} title={t('settings.language')}>
          <p className="mb-3 text-xs text-slate-400">{t('settings.languageHelp')}</p>
          <LanguageToggle variant="segmented" />
        </Section>

        <Section icon={ShieldCheck} title={t('settings.method')}>
          <p className="text-sm text-slate-300">{t('settings.methodValue')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('report.method')}</p>
        </Section>

        <Section icon={Database} title={t('settings.data')}>
          <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-400"><Info size={13} />{t('settings.storageHelp')}</p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={doExport}><Download size={18} />{t('settings.exportData')}</Button>
            <Button variant="danger" onClick={() => setConfirmClear(true)}><Trash2 size={18} />{t('settings.clearData')}</Button>
          </div>
        </Section>

        <div className="pt-2 text-center text-xs text-slate-600">
          {t('app.name')} · {t('settings.version')} 1.0.0
        </div>
      </div>

      <Sheet open={confirmClear} onClose={() => setConfirmClear(false)} title={t('settings.clearData')}
        footer={<div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmClear(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" className="flex-1" onClick={async () => { await clearAll(); setConfirmClear(false); location.reload(); }}>{t('common.delete')}</Button>
        </div>}>
        <p className="text-sm text-slate-300">{t('settings.clearConfirm')}</p>
      </Sheet>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-white"><Icon size={18} className="text-sky-400" />{title}</h3>
      {children}
    </Card>
  );
}
