import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deletePerson, getPeople } from '../api';

function initialsFromName(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'NA';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function Avatar({ name, imageUrl }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-10 w-10 rounded-full object-cover border border-zinc-700"
        loading="lazy"
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-100 grid place-items-center text-xs font-bold tracking-wide">
      {initialsFromName(name)}
    </div>
  );
}

export default function PeopleList() {
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadPeople() {
    setLoading(true);
    try {
      const data = await getPeople();
      setPeople(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load people');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPeople();
  }, []);

  const filteredPeople = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return people;

    return people.filter((person) => {
      const text = [person?.name, person?.id].join(' ').toLowerCase();
      return text.includes(search);
    });
  }, [people, query]);

  async function handleDelete(id) {
    const ok = window.confirm('Delete this person and remove linked credits?');
    if (!ok) return;

    setError('');
    setMessage('');

    try {
      await deletePerson(id);
      setPeople((prev) => prev.filter((item) => item.id !== id));
      setMessage('Person deleted.');
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete person');
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">People Inventory</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-50">Global cast and crew roster</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">Manage global people records. Roles remain contextual to title credits.</p>
          </div>

          <Link
            to="/admin/people/new"
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300"
          >
            New Person
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people by name or id"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none ring-cyan-400/50 focus:ring"
          />
          <button
            type="button"
            onClick={loadPeople}
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
                <th className="px-4 py-3">Avatar</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950/70">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">Loading people...</td>
                </tr>
              ) : filteredPeople.length ? (
                filteredPeople.map((person) => (
                  <tr key={person.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <Avatar name={person.name} imageUrl={person.image_url ?? person.imageUrl ?? person.image} />
                    </td>
                    <td className="px-4 py-3 text-zinc-100 font-medium">{person.name}</td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{person.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/admin/people/${encodeURIComponent(person.id)}`}
                          className="rounded-md border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(person.id)}
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
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">No people match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
