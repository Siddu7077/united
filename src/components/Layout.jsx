import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const NAV = {
  admin: [
    { to: '/admin/roster', label: 'Roster employees' },
    { to: '/admin/published', label: 'Published roster' },
    { to: '/admin/employees', label: 'Employees' },
  ],
  employee: [
    { to: '/availability', label: 'My availability' },
    { to: '/my-roster', label: 'My roster' },
  ],
};

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="text-base font-bold tracking-tight text-slate-900">Shift Roster</div>
          <nav className="flex flex-1 gap-1 overflow-x-auto" aria-label="Main">
            {NAV[user.role].map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {user.name}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                {user.role}
              </span>
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
