import { useState } from 'react';
import { Building2, KeyRound, Plus, Save, UserPlus } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { api } from '../../lib/api.js';
import { ROLE_NAMES, isEmail } from '../../lib/format.js';
import PageHeading from '../../components/layout/PageHeading.jsx';
import { Card, ConfirmDialog, CountBadge, DataTable, EmptyState, Field, Loadable, Modal, ModalActions, Tag } from '../../components/ui.jsx';

const MIN_PASSWORD = 12;
const EMPTY_USER = { name: '', email: '', password: '', role: 'contador', companyIds: [] };

function CompanyChecklist({ companies, value, onChange }) {
  if (!companies.length) return <p className="muted">Todavía no hay empresas registradas.</p>;
  return (
    <div className="checklist">
      {companies.map((c) => (
        <label key={c.id} className="check-row">
          <input
            type="checkbox"
            checked={value.includes(String(c.id))}
            onChange={(e) => onChange(e.target.checked ? [...value, String(c.id)] : value.filter((x) => x !== String(c.id)))}
          />
          {c.name}
        </label>
      ))}
    </div>
  );
}

// HU-07: alta de usuarios, roles, empresas asignadas y desactivación de cuentas.
export default function UsersPage() {
  const { user: me, companies, reloadCompanies, notify, fail } = useApp();
  const { data, loading, reload } = useApiData('/admin/users', { onError: fail });
  const users = data?.users || [];
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY_USER);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [companiesFor, setCompaniesFor] = useState(null);
  const [passwordFor, setPasswordFor] = useState(null);
  const [companyName, setCompanyName] = useState('');

  async function act(action, message) {
    setBusy(true);
    try {
      await action();
      notify(message);
      await reload();
      return true;
    } catch (err) {
      fail(err);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const patchUser = (u, changes, message = 'Usuario actualizado.') => act(() => api.patch(`/admin/users/${u.id}`, changes), message);

  async function createUser(e) {
    e.preventDefault();
    const v = {};
    if (!draft.name.trim()) v.name = 'Ingresa el nombre completo.';
    if (!isEmail(draft.email)) v.email = 'Escribe un correo válido, por ejemplo nombre@empresa.com.';
    if (draft.password.length < MIN_PASSWORD) v.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
    setErrors(v);
    if (Object.keys(v).length) return;
    const ok = await act(() => api.post('/admin/users', draft), 'Usuario creado correctamente.');
    if (ok) {
      setCreating(false);
      setDraft(EMPTY_USER);
    }
  }

  async function createCompany(e) {
    e.preventDefault();
    const ok = await act(() => api.post('/admin/companies', { name: companyName }), 'Empresa registrada.');
    if (ok) {
      setCompanyName('');
      await reloadCompanies(); // aparece al instante en todos los selectores
    }
  }

  function askRole(u, role) {
    if (role === u.role) return;
    setConfirm({
      title: 'Cambiar rol',
      message: `${u.name} pasará de ${ROLE_NAMES[u.role]} a ${ROLE_NAMES[role]}. Sus accesos cambian de inmediato y deberá iniciar sesión otra vez.`,
      confirmLabel: 'Cambiar rol',
      run: () => patchUser(u, { role }),
    });
  }

  function askActive(u) {
    setConfirm({
      title: u.active ? 'Desactivar cuenta' : 'Activar cuenta',
      message: u.active
        ? `${u.name} ya no podrá iniciar sesión y se cerrarán sus sesiones abiertas. El cambio queda en el historial.`
        : `${u.name} podrá iniciar sesión de nuevo. El cambio queda en el historial.`,
      confirmLabel: u.active ? 'Desactivar' : 'Activar',
      danger: u.active,
      run: () => patchUser(u, { active: !u.active }, u.active ? 'Cuenta desactivada.' : 'Cuenta activada.'),
    });
  }

  const closeCreate = () => { setCreating(false); setErrors({}); };

  return (
    <>
      <PageHeading
        title="Usuarios y empresas"
        description="Altas, roles, empresas asignadas y desactivación de cuentas."
        actions={<button type="button" className="button button-primary" onClick={() => setCreating(true)}><UserPlus size={17} /> Nuevo usuario</button>}
      />

      <Card title={<>Usuarios <CountBadge>{users.length}</CountBadge></>} description="Los cambios se aplican de inmediato y quedan en el historial.">
        <Loadable loading={loading && !data} empty={!users.length} emptyState={<EmptyState title="No hay usuarios" />}>
          <DataTable
            columns={['Nombre', 'Rol', 'Empresas', 'Estado', { label: 'Acción', role: 'action', align: 'right' }]}
            rows={users}
            renderRow={(u) => {
              const isMe = u.id === me.id;
              return [
                <><strong>{u.name}{isMe && <span className="you"> (tú)</span>}</strong><small>{u.email}</small></>,
                <select className="input-compact" disabled={busy || isMe} aria-label={`Rol de ${u.name}`} value={u.role} onChange={(e) => askRole(u, e.target.value)}>
                  {Object.entries(ROLE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>,
                u.role === 'administrador'
                  ? <span className="muted">Todas</span>
                  : <button type="button" className="link-button" onClick={() => setCompaniesFor(u)}>{u.company_ids?.length || 0} · Editar</button>,
                <Tag tone={u.active ? 'success' : 'neutral'}>{u.active ? 'Activo' : 'Inactivo'}</Tag>,
                <div className="row-actions">
                  <button type="button" className="icon-button" title="Restablecer contraseña" aria-label={`Restablecer contraseña de ${u.name}`} disabled={busy} onClick={() => setPasswordFor(u)}><KeyRound size={17} /></button>
                  {!isMe && <button type="button" className="button button-soft" disabled={busy} onClick={() => askActive(u)}>{u.active ? 'Desactivar' : 'Activar'}</button>}
                </div>,
              ];
            }}
          />
        </Loadable>
      </Card>

      <Card title={<>Empresas <CountBadge>{companies.length}</CountBadge></>} description="Registra las empresas que luego asignarás a contadores y clientes.">
        <form className="inline-form" onSubmit={createCompany}>
          <input required maxLength={150} placeholder="Nombre de la empresa" aria-label="Nombre de la empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <button type="submit" className="button button-secondary" disabled={busy || !companyName.trim()}><Plus size={16} /> Registrar empresa</button>
        </form>
        {companies.length > 0 && (
          <ul className="chip-list">
            {companies.map((c) => <li key={c.id}><Building2 size={14} /> {c.name}</li>)}
          </ul>
        )}
      </Card>

      {creating && (
        <Modal title="Nuevo usuario" onClose={closeCreate}>
          <form onSubmit={createUser} noValidate>
            <Field label="Nombre completo" error={errors.name}>
              <input maxLength={100} aria-invalid={Boolean(errors.name)} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Correo electrónico" error={errors.email}>
              <input type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </Field>
            <Field label="Contraseña inicial" error={errors.password} hint={`Mínimo ${MIN_PASSWORD} caracteres. Compártela con la persona por un medio seguro.`}>
              <input type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
            </Field>
            <Field label="Rol">
              <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                {Object.entries(ROLE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </Field>
            {draft.role !== 'administrador' && (
              <div className="field">
                <span className="field-label">Empresas asignadas</span>
                <CompanyChecklist companies={companies} value={draft.companyIds} onChange={(companyIds) => setDraft({ ...draft, companyIds })} />
              </div>
            )}
            <ModalActions>
              <button type="button" className="button button-secondary" onClick={closeCreate}>Cancelar</button>
              <button type="submit" className="button button-primary" disabled={busy}>Crear usuario</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {companiesFor && (
        <CompaniesDialog
          user={companiesFor}
          companies={companies}
          busy={busy}
          onCancel={() => setCompaniesFor(null)}
          onSave={async (ids) => { if (await patchUser(companiesFor, { companyIds: ids }, 'Empresas asignadas actualizadas.')) setCompaniesFor(null); }}
        />
      )}

      {passwordFor && (
        <PasswordDialog
          user={passwordFor}
          busy={busy}
          onCancel={() => setPasswordFor(null)}
          onSave={async (password) => { if (await patchUser(passwordFor, { password }, 'Contraseña restablecida.')) setPasswordFor(null); }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { const { run } = confirm; setConfirm(null); run(); }}
        />
      )}
    </>
  );
}

function CompaniesDialog({ user, companies, busy, onSave, onCancel }) {
  const [ids, setIds] = useState((user.company_ids || []).map(String));
  return (
    <Modal title="Empresas asignadas" onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(ids); }}>
        <p className="modal-text">Elige las empresas que {user.name} podrá consultar.</p>
        <CompanyChecklist companies={companies} value={ids} onChange={setIds} />
        <ModalActions>
          <button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button>
          <button type="submit" disabled={busy} className="button button-primary"><Save size={17} /> Guardar</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function PasswordDialog({ user, busy, onSave, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal title="Restablecer contraseña" onClose={onCancel}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (password.length < MIN_PASSWORD) { setError(`Mínimo ${MIN_PASSWORD} caracteres.`); return; }
          onSave(password);
        }}
      >
        <p className="modal-text">Define una nueva contraseña para {user.name}. Se cerrarán sus sesiones abiertas.</p>
        <Field label="Nueva contraseña" error={error}>
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
        </Field>
        <ModalActions>
          <button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button>
          <button type="submit" disabled={busy} className="button button-primary"><KeyRound size={17} /> Restablecer</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
