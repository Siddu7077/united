import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Employees from './pages/admin/Employees.jsx';
import RosterBuilder from './pages/admin/RosterBuilder.jsx';
import PublishedRoster from './pages/admin/PublishedRoster.jsx';
import Availability from './pages/employee/Availability.jsx';
import MyRoster from './pages/employee/MyRoster.jsx';

function Loading() {
  return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
}

/** Redirects to /login when signed out, and home when the role does not match. */
function Protected({ role, children }) {
  const { user } = useAuth();
  if (user === undefined) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (user === undefined) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/roster' : '/availability'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/admin/roster" element={<Protected role="admin"><RosterBuilder /></Protected>} />
        <Route path="/admin/published" element={<Protected role="admin"><PublishedRoster /></Protected>} />
        <Route path="/admin/employees" element={<Protected role="admin"><Employees /></Protected>} />
        <Route path="/availability" element={<Protected role="employee"><Availability /></Protected>} />
        <Route path="/my-roster" element={<Protected role="employee"><MyRoster /></Protected>} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
