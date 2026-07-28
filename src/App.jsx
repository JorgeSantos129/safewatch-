import React, { createContext, useContext, useState, useCallback } from 'react';
import { ClipboardList, FileText, Settings as SettingsIcon } from 'lucide-react';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import LanguageToggle from './components/LanguageToggle.jsx';
import SyncStatus from './components/SyncStatus.jsx';
import Dashboard from './screens/Dashboard.jsx';
import JobDetail from './screens/JobDetail.jsx';
import HazardForm from './screens/HazardForm.jsx';
import ReportScreen from './screens/ReportScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';

/* ---------------- Navigation ---------------- */
const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);

const HOME = { screen: 'dashboard' };

function NavProvider({ children }) {
  const [stack, setStack] = useState([HOME]);
  const view = stack[stack.length - 1];

  const go = useCallback((screen, params = {}) => setStack((s) => [...s, { screen, ...params }]), []);
  const replace = useCallback((screen, params = {}) => setStack((s) => [...s.slice(0, -1), { screen, ...params }]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const reset = useCallback((screen, params = {}) => setStack([{ screen, ...params }]), []);
  const tab = useCallback((screen) => setStack([{ screen }]), []);

  return (
    <NavContext.Provider value={{ view, stack, go, replace, back, reset, tab, canBack: stack.length > 1 }}>
      {children}
    </NavContext.Provider>
  );
}

/* ---------------- Header ---------------- */
function Header({ saving }) {
  const { t } = useI18n();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-white/5 bg-slate-950/85 backdrop-blur pt-safe">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 font-black text-white shadow">S</div>
          <div className="leading-none">
            <div className="text-sm font-extrabold tracking-tight text-white">{t('app.name')}</div>
            <div className="text-[10px] font-medium text-slate-400">{t('app.tagline')}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <SyncStatus saving={saving} />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}

/* ---------------- Bottom nav ---------------- */
function BottomNav() {
  const { t } = useI18n();
  const { view, tab } = useNav();
  const items = [
    { screen: 'dashboard', icon: ClipboardList, label: t('nav.dashboard') },
    { screen: 'report', icon: FileText, label: t('nav.report') },
    { screen: 'settings', icon: SettingsIcon, label: t('nav.settings') },
  ];
  const active = ['dashboard', 'job', 'hazard'].includes(view.screen)
    ? 'dashboard'
    : view.screen;
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-slate-950/90 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2">
        {items.map(({ screen, icon: Icon, label }) => {
          const on = active === screen;
          return (
            <button
              key={screen}
              onClick={() => tab(screen)}
              className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 transition ${
                on ? 'text-sky-400' : 'text-slate-500'
              }`}
              aria-current={on ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={on ? 2.5 : 2} />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------------- Router ---------------- */
function Router({ setSaving }) {
  const { view } = useNav();
  const common = { setSaving };
  switch (view.screen) {
    case 'dashboard': return <Dashboard {...common} />;
    case 'job': return <JobDetail jobId={view.jobId} {...common} />;
    case 'hazard': return <HazardForm jobId={view.jobId} hazardId={view.hazardId} {...common} />;
    case 'report': return <ReportScreen jobId={view.jobId} {...common} />;
    case 'settings': return <SettingsScreen {...common} />;
    default: return <Dashboard {...common} />;
  }
}

function Shell() {
  const [saving, setSaving] = useState(false);
  const { view } = useNav();
  const fullscreen = view.screen === 'hazard'; // hazard form manages its own chrome
  return (
    <div className="min-h-full">
      {!fullscreen && <Header saving={saving} />}
      <main className={`mx-auto max-w-2xl ${fullscreen ? '' : 'px-4 pb-28 pt-4'}`}>
        <Router setSaving={setSaving} />
      </main>
      {!fullscreen && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </I18nProvider>
  );
}
