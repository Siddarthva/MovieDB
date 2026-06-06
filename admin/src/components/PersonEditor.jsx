import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPerson, getPerson, getPersonCredits, updatePerson } from '../api';

const INITIAL_FORM = {
  id: '',
  name: '',
  image_url: '',
};

function initialsFromName(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'NA';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

function toForm(person) {
  return {
    id: person?.id ?? '',
    name: person?.name ?? '',
    image_url: person?.image_url ?? person?.imageUrl ?? person?.image ?? '',
  };
}

function AvatarPreview({ name, imageUrl }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || 'Avatar preview'}
        className="h-20 w-20 rounded-full object-cover border border-zinc-700"
      />
    );
  }

  return (
    <div className="h-20 w-20 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-100 grid place-items-center text-lg font-bold tracking-wide">
      {initialsFromName(name)}
    </div>
  );
}

export default function PersonEditor() {
  const navigate = useNavigate();
  const { id: personId } = useParams();
  const isNew = personId === 'new';

  const [form, setForm] = useState(INITIAL_FORM);
  const [filmography, setFilmography] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadEditorData() {
    setLoading(true);
    setError('');

    try {
      if (isNew) {
        setForm(INITIAL_FORM);
        setFilmography([]);
        return;
      }

      const [person, credits] = await Promise.all([
        getPerson(personId),
        getPersonCredits(personId),
      ]);

      setForm(toForm(person));
      setFilmography(Array.isArray(credits) ? credits : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load person workspace');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEditorData();
  }, [personId]);

  const sortedFilmography = useMemo(() => {
    return [...filmography].sort((a, b) => {
      const yearA = Number(a?.year ?? 0);
      const yearB = Number(b?.year ?? 0);
      return yearB - yearA;
    });
  }, [filmography]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const generatedId = form.id.trim() || slugify(form.name);
    const payload = {
      id: generatedId,
      name: form.name.trim(),
      image_url: form.image_url.trim() || null,
    };

    try {
      if (isNew) {
        const created = await createPerson(payload);
        setMessage('Person created.');
        navigate(`/admin/people/${encodeURIComponent(created?.id ?? generatedId)}`, { replace: true });
      } else {
        await updatePerson(personId, payload);
        setMessage('Person updated.');
        await loadEditorData();
      }
    } catch (saveError) {
      setError(saveError.message || 'Failed to save person');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/admin/people"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          ← Back to People Inventory
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Person Workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-50">{isNew ? 'Create person' : form.name || 'Edit person'}</h2>
            <p className="mt-2 text-sm text-zinc-400">Global profile data for cast and crew roster entries.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/people')}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>

        {(error || message) && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
            {error || message}
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="h-24 rounded-xl bg-zinc-800/70" />
            <div className="h-40 rounded-xl bg-zinc-800/70" />
          </div>
        ) : (
          <>
            <form onSubmit={handleSave} className="mt-6 grid gap-4 md:grid-cols-[1fr_200px]">
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-zinc-200">Name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-zinc-200">ID {isNew ? '(optional)' : ''}</span>
                  <input
                    value={form.id}
                    onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                    disabled={!isNew}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring disabled:opacity-60"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-zinc-200">Image URL</span>
                  <input
                    value={form.image_url}
                    onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 grid place-items-center gap-2">
                <AvatarPreview name={form.name} imageUrl={form.image_url} />
                <p className="text-xs text-zinc-500">Avatar preview</p>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/people')}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : isNew ? 'Create Person' : 'Save Changes'}
                </button>
              </div>
            </form>

            <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-zinc-50">Filmography / Known For</h3>
                <p className="text-sm text-zinc-400">Titles linked through title_credits with role and department context.</p>
              </div>

              {isNew ? (
                <p className="text-sm text-zinc-500">Save this person first to view filmography.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-800 text-sm">
                    <thead className="bg-zinc-900 text-left text-zinc-400">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Year</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-950/70">
                      {sortedFilmography.length ? (
                        sortedFilmography.map((entry, index) => (
                          <tr key={`${entry.titleId}-${entry.role}-${index}`} className="hover:bg-zinc-900/50">
                            <td className="px-4 py-3 text-zinc-100">{entry.title}</td>
                            <td className="px-4 py-3 text-zinc-300">{entry.year ?? '—'}</td>
                            <td className="px-4 py-3 text-zinc-300">{entry.role ?? '—'}</td>
                            <td className="px-4 py-3 text-zinc-300">{entry.department ?? '—'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">No linked titles yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
