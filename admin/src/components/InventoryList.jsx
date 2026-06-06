import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteTitle, getTitles } from '../api';

function formatGenres(title) {
  const genres = title?.classification?.genres;
  if (Array.isArray(genres) && genres.length) {
    return genres.join(', ');
  }

  return title?.genre ?? '—';
}

export default function InventoryList() {
  const [titles, setTitles] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadTitles() {
    setLoading(true);
    try {
      const data = await getTitles();
      setTitles(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load titles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTitles();
  }, []);

  const filteredTitles = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return titles;

    return titles.filter((item) => {
      const text = [
        item?.title,
        item?.id,
        item?.type,
        String(item?.year ?? ''),
        item?.censor_rating,
        formatGenres(item),
      ].join(' ').toLowerCase();

      return text.includes(search);
    });
  }, [query, titles]);

  async function handleDelete(id) {
    const ok = window.confirm('Delete this title and all relational rows?');
    if (!ok) return;

    setError('');
    setMessage('');

    try {
      await deleteTitle(id);
      setTitles((prev) => prev.filter((item) => item.id !== id));
      setMessage('Title deleted.');
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete title');
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Titles Inventory</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-50">Catalog table</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">Click Edit to open a dedicated title workspace for relational updates.</p>
          </div>

          <Link
            to="/admin/titles/new"
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300"
          >
            New Title
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, genres, rating, or year"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none ring-cyan-400/50 focus:ring"
          />
          <button
            type="button"
            onClick={loadTitles}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>

        {(error || message) && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
            {error || message}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Genres</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950/70">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Loading titles...</td>
                </tr>
              ) : filteredTitles.length ? (
                filteredTitles.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">{item.title}</div>
                      <div className="mt-1 text-xs text-zinc-500 font-mono">{item.id}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-300">{item.type}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.year ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.censor_rating ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatGenres(item)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/admin/titles/${encodeURIComponent(item.id)}`}
                          className="rounded-md border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-md border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">No titles match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}