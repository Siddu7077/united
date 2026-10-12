import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { btnPrimary, btnSecondary, inputCls } from '../../ui.js';
import Modal from '../../components/Modal.jsx';
import Notice from '../../components/Notice.jsx';

export default function Employees() {
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, employee = edit
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    return api
      .get('/employees')
      .then((r) => setList(r.employees))
      .catch((e) => setNotice({ type: 'error', text: e.message }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setActive(emp, active) {
    setNotice(null);
    try {
      await api.put(`/employees/${emp.id}`, { name: emp.name, email: emp.email, active });
      await load();
      setNotice({
        type: 'success',
        text: active ? `${emp.name} reactivated.` : `${emp.name} deactivated. They can no longer sign in or be rostered.`,
      });
    } catch (e) {
      setNotice({ type: 'error', text: e.message });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">Add people, update their details, or reset a password.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setEditing({})}>
          Add employee
        </button>
      </div>

      {notice && <Notice type={notice.type}>{notice.text}</Notice>}

      {!list ? (
        !notice && <div className="py-10 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.map((emp) => (
                <tr key={emp.id} className={emp.active ? '' : 'bg-slate-50 text-slate-500'}>
                  <td className="p-3 font-medium">{emp.name}</td>
                  <td className="p-3">{emp.email}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        emp.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {emp.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="space-x-2 p-3 text-right">
                    <button type="button" className={btnSecondary} onClick={() => setEditing(emp)}>
                      Edit
                    </button>
                    <button type="button" className={btnSecondary} onClick={() => setActive(emp, !emp.active)}>
                      {emp.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    No employees yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EmployeeForm
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={async (text) => {
            setEditing(null);
            await load();
            setNotice({ type: 'success', text });
          }}
        />
      )}
    </div>
  );
}

function EmployeeForm({ employee, onClose, onSaved }) {
  const isNew = !employee.id;
  const [name, setName] = useState(employee.name || '');
  const [email, setEmail] = useState(employee.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isNew) {
        await api.post('/employees', { name, email, password });
        await onSaved(`${name} added. They can sign in with the email and password you set.`);
      } else {
        await api.put(`/employees/${employee.id}`, {
          name,
          email,
          active: employee.active,
          ...(password ? { password } : {}),
        });
        await onSaved(`${name} updated.${password ? ' Password changed.' : ''}`);
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add employee' : 'Edit employee'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Notice type="error">{error}</Notice>
        <div>
          <label htmlFor="emp-name" className="mb-1 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="emp-name"
            required
            maxLength={100}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="emp-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email (used to sign in)
          </label>
          <input
            id="emp-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="emp-password" className="mb-1 block text-sm font-medium text-slate-700">
            {isNew ? 'Password' : 'New password'}
          </label>
          <input
            id="emp-password"
            type="password"
            autoComplete="new-password"
            required={isNew}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isNew ? 'At least 8 characters' : 'Leave blank to keep the current password'}
            className={inputCls}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Add employee' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
