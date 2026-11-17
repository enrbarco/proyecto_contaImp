import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppContext } from './AppContext.jsx';
import { api, setSessionExpiredHandler } from './lib/api.js';
import { currentMonth } from './lib/format.js';
import { go, useHashRoute } from './lib/router.js';
import { IDLE_MINUTES, useIdleLogout } from './hooks/useIdleLogout.js';
import { Spinner, Toast } from './components/ui.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import { pagesFor } from './pages/index.js';
import Landing from './pages/landing/Landing.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('resetToken') || params.get('login') === '1';
  });
  const [loginNotice, setLoginNotice] = useState('');

  // Datos compartidos por las páginas.
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState('');
  const [period, setPeriod] = useState(currentMonth);
  const [templates, setTemplates] = useState([]);
  const [toast, setToast] = useState(null);

  const route = useHashRoute();

  const notify = useCallback((message, tone = 'success') => setToast({ message, tone, id: Date.now() }), []);
  const fail = useCallback((error) => notify(error?.message || String(error), 'error'), [notify]);
  const closeToast = useCallback(() => setToast(null), []);

  const logout = useCallback(async (reason) => {
    await api.post('/auth/logout').catch(() => {});
    const notices = {
      idle: `Tu sesión se cerró tras ${IDLE_MINUTES} minutos sin actividad. Inicia sesión nuevamente.`,
      expired: 'Tu sesión venció. Inicia sesión nuevamente.',
    };
    setLoginNotice(notices[reason] || '');
    setUser(null);
    setCompanies([]);
    setToast(null);
    setShowLogin(true);
    history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => setSessionExpiredHandler(() => logout('expired')), [logout]);
  useIdleLogout(Boolean(user), () => logout('idle'));

  // Comprueba si ya hay una sesión abierta y limpia ?login=1 de la URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('login')) {
      url.searchParams.delete('login');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    api('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const reloadCompanies = useCallback(async () => {
    const r = await api('/companies');
    setCompanies(r.companies);
    setCompany((old) => (r.companies.some((c) => String(c.id) === String(old)) ? old : String(r.companies[0]?.id || '')));
    return r.companies;
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([reloadCompanies(), api('/templates')])
      .then(([, t]) => setTemplates(t.templates))
      .catch(fail);
  }, [user, reloadCompanies, fail]);

  const value = useMemo(() => {
    if (!user) return null;
    return {
      user,
      isAdmin: user.role === 'administrador',
      isAccountant: user.role === 'contador',
      isClient: user.role === 'cliente',
      companies,
      reloadCompanies,
      company,
      setCompany,
      companyName: companies.find((c) => String(c.id) === String(company))?.name || '',
      hasCompany: (id) => user.role === 'administrador' || companies.some((c) => String(c.id) === String(id)),
      period,
      setPeriod,
      templates,
      notify,
      fail,
      logout,
      navigate: go,
    };
  }, [user, companies, reloadCompanies, company, period, templates, notify, fail, logout]);

  if (checking) {
    return <div className="startup"><Spinner label="Cargando ContaImp…" /></div>;
  }

  if (!user) {
    return showLogin ? (
      <Login
        notice={loginNotice}
        onBack={() => setShowLogin(false)}
        onLogin={(u) => {
          setUser(u);
          setLoginNotice('');
          setShowLogin(false);
          go('tablero');
        }}
      />
    ) : (
      <Landing onLogin={() => setShowLogin(true)} />
    );
  }

  const pages = pagesFor(user.role);
  const current = pages[route.page] ? route.page : 'tablero';
  const page = pages[current];
  const Page = page.component;

  return (
    <AppContext.Provider value={value}>
      <AppLayout pages={pages} current={current}>
        <Page id={route.id} />
      </AppLayout>
      <Toast toast={toast} onClose={closeToast} />
    </AppContext.Provider>
  );
}
