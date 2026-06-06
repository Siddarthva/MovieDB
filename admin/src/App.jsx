import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import InventoryList from './components/InventoryList';
import TitleEditor from './components/TitleEditor';
import PeopleList from './components/PeopleList';
import PersonEditor from './components/PersonEditor';

function navClass(isActive) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-cyan-400 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`;
}

function AdminShell({ children }) {
  const location = useLocation();
  const isPeopleRoute = location.pathname.startsWith('/admin/people');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">Montage Admin</p>
            <h1 className="mt-1 text-lg font-semibold text-zinc-50">Control Room</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 p-1">
            <Link to="/admin" className={navClass(!isPeopleRoute)}>Titles Inventory</Link>
            <Link to="/admin/people" className={navClass(isPeopleRoute)}>People Inventory</Link>
          </div>
          <div className="text-xs text-zinc-400">Dedicated workspaces for titles and global people roster.</div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route
          path="/admin"
          element={(
            <AdminShell>
              <InventoryList />
            </AdminShell>
          )}
        />
        <Route
          path="/admin/titles/:id"
          element={(
            <AdminShell>
              <TitleEditor />
            </AdminShell>
          )}
        />
        <Route
          path="/admin/people"
          element={(
            <AdminShell>
              <PeopleList />
            </AdminShell>
          )}
        />
        <Route
          path="/admin/people/:id"
          element={(
            <AdminShell>
              <PersonEditor />
            </AdminShell>
          )}
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
