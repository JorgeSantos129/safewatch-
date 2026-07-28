import React from 'react';
import { Cloud, CloudOff, HardDriveDownload } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useOnline } from '../lib/useOnline.js';

/** Subtle offline-first indicator. All data is local; this reflects connectivity. */
export default function SyncStatus({ saving = false }) {
  const { t } = useI18n();
  const online = useOnline();
  const Icon = saving ? HardDriveDownload : online ? Cloud : CloudOff;
  const label = saving ? t('sync.saving') : online ? t('sync.local') : t('sync.offline');
  const color = saving ? 'text-sky-400' : online ? 'text-emerald-400' : 'text-amber-400';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${color}`}>
      <Icon size={14} className={saving ? 'animate-pulse' : ''} />
      <span className="hidden xs:inline sm:inline">{label}</span>
    </span>
  );
}
