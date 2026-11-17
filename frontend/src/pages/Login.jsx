import { useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { api } from '../lib/api.js';
import { isEmail, withPeriod } from '../lib/format.js';
import { Alert, Field } from '../components/ui.jsx';
import logo from '../assets/logo.webp';

const SCREENS = {
  login: ['Iniciar sesión', 'Accede a tus controles contables.'],
  forgot: ['Recuperar contraseña', 'Te enviaremos un enlace para restablecer tu acceso.'],
  reset: ['Crear nueva contraseña', 'Elige una nueva contraseña para tu cuenta.'],
  expired: ['Enlace vencido', 'El enlace temporal ya no es válido. Solicita uno nuevo con tu correo registrado.'],
  done: ['Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.'],
};

const checkEmail = (v) => (!v.trim() ? 'Ingresa tu correo electrónico.' : !isEmail(v) ? 'Ingresa un correo electrónico válido.' : '');

// HU-01 (inicio de sesión) y HU-06 (recuperación de contraseña).
export default function Login({ onLogin, onBack, notice = '' }) {
  const resetToken = new URLSearchParams(window.location.search).get('resetToken') || '';
  const [screen, setScreen] = useState(resetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [info, setInfo] = useState(notice);
  const [busy, setBusy] = useState(false);

  function goTo(next) {
    setScreen(next);
    setErrors({});
    setError('');
    setMessage('');
    setInfo('');
  }

  function validate() {
    const v = {};
    if (screen === 'login') {
      const m = checkEmail(email);
      if (m) v.email = m;
      if (!password) v.password = 'Ingresa tu contraseña.';
    }
    if (screen === 'forgot') {
      const m = checkEmail(email);
      if (m) v.email = m;
    }
    if (screen === 'reset') {
      if (newPassword.length < 8) v.newPassword = 'La contraseña debe tener al menos 8 caracteres.';
      if (!confirm) v.confirm = 'Confirma tu nueva contraseña.';
      else if (confirm !== newPassword) v.confirm = 'Las contraseñas no coinciden.';
    }
    setErrors(v);
    return !Object.keys(v).length;
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!validate()) return;
    setBusy(true);
    try {
      if (screen === 'login') {
        const r = await api.post('/auth/login', { email, password });
        onLogin(r.user);
      } else if (screen === 'forgot') {
        const r = await api.post('/auth/forgot-password', { email });
        setMessage(r.message);
      } else {
        await api.post('/auth/reset-password', { token: resetToken, password: newPassword });
        history.replaceState(null, '', window.location.pathname);
        goTo('done');
      }
    } catch (err) {
      if (screen === 'reset' && err.status === 400 && /venci|utiliz|inv[aá]lido/i.test(err.message)) goTo('expired');
      else setError(withPeriod(err.message));
    } finally {
      setBusy(false);
    }
  }

  const [title, subtitle] = SCREENS[screen];
  const isFinal = screen === 'expired' || screen === 'done';
  const backToHome = screen === 'login' || isFinal;
  const clearError = (key) => setErrors((v) => ({ ...v, [key]: '' }));

  return (
    <main className="auth-layout">
      <section className="auth-box">
        <button type="button" className="link-button auth-back" onClick={backToHome ? onBack : () => goTo('login')}>
          <ArrowLeft size={16} /> {backToHome ? 'Volver al inicio' : 'Volver al inicio de sesión'}
        </button>
        <img className="auth-logo" src={logo} alt="ContaImp" width="150" height="64" />
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>

        {isFinal ? (
          <>
            {screen === 'expired'
              ? <Alert tone="error">El enlace para crear una nueva contraseña venció.</Alert>
              : <Alert tone="success">Tu contraseña se actualizó correctamente.</Alert>}
            {screen === 'expired' && (
              <button type="button" className="button button-primary button-block button-large" onClick={() => goTo('forgot')}>Solicitar un enlace nuevo <ArrowRight size={17} /></button>
            )}
            <button type="button" className={`button button-block button-large ${screen === 'expired' ? 'button-secondary' : 'button-primary'}`} onClick={() => goTo('login')}>
              Ir a iniciar sesión {screen === 'done' && <ArrowRight size={17} />}
            </button>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            {info && <Alert tone="warning" icon={Clock3}>{info}</Alert>}

            {(screen === 'login' || screen === 'forgot') && (
              <Field label="Correo electrónico" error={errors.email}>
                <div className="input-icon">
                  <Mail size={17} />
                  <input
                    type="email"
                    autoComplete={screen === 'login' ? 'username' : 'email'}
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(errors.email)}
                    placeholder="correo@empresa.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                  />
                </div>
              </Field>
            )}

            {screen === 'login' && (
              <>
                <Field label="Contraseña" error={errors.password}>
                  <div className="input-icon">
                    <LockKeyhole size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      aria-invalid={Boolean(errors.password)}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                    />
                    <button type="button" className="input-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>
                <button type="button" className="link-button forgot-link" onClick={() => goTo('forgot')}>¿Olvidaste tu contraseña?</button>
              </>
            )}

            {screen === 'reset' && (
              <>
                <Field label="Nueva contraseña" error={errors.newPassword} hint="Mínimo 8 caracteres.">
                  <input type="password" maxLength={128} autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); clearError('newPassword'); }} />
                </Field>
                <Field label="Confirmar contraseña" error={errors.confirm}>
                  <input type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} value={confirm} onChange={(e) => { setConfirm(e.target.value); clearError('confirm'); }} />
                </Field>
              </>
            )}

            {error && <Alert tone="error">{error}</Alert>}
            {message && <Alert tone="success">{message}</Alert>}

            <button type="submit" className="button button-primary button-block button-large" disabled={busy}>
              {busy ? 'Procesando…' : screen === 'login' ? 'Ingresar' : screen === 'forgot' ? 'Enviar enlace' : 'Actualizar contraseña'}
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
