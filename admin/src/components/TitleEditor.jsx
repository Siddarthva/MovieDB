import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addTitleCredit,
  addTitleGenre,
  createTitle,
  getGenres,
  getPeople,
  getTitle,
  getTitleCredits,
  getTitleGenres,
  removeTitleCredit,
  removeTitleGenre,
  updateTitle,
} from '../api';

const CREDIT_ROLE_OPTIONS = ['Actor', 'Director', 'Writer', 'Composer', 'Producer', 'Editor', 'Cinematographer'];
const CENSOR_RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA'];

const INITIAL_FORM = {
  id: '',
  title: '',
  type: 'movie',
  year: String(new Date().getFullYear()),
  releaseDate: '',
  poster: '',
  backdrop: '',
  trailer: '',
  synopsis: '',
  runtime: '',
  censor_rating: '',
  audience_score: '',
  cine_score: '',
  dna_intensity: '',
  dna_emotion: '',
  dna_complexity: '',
  dna_pace: '',
  dna_darkness: '',
  dna_spectacle: '',
};

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

function toForm(title) {
  return {
    id: title?.id ?? '',
    title: title?.title ?? '',
    type: title?.type ?? 'movie',
    year: String(title?.year ?? new Date().getFullYear()),
    releaseDate: title?.releaseDate ?? title?.release_date ?? '',
    poster: title?.media?.poster ?? title?.poster ?? '',
    backdrop: title?.media?.backdrop ?? title?.backdrop ?? '',
    trailer: title?.media?.trailer ?? title?.trailer ?? '',
    synopsis: title?.details?.synopsis ?? title?.synopsis ?? '',
    runtime: title?.details?.runtime ?? title?.runtime ?? '',
    censor_rating: title?.censor_rating ?? title?.classification?.rating ?? '',
    audience_score: title?.audience_score ?? '',
    cine_score: title?.cine_score ?? '',
    dna_intensity: title?.dna_intensity ?? '',
    dna_emotion: title?.dna_emotion ?? '',
    dna_complexity: title?.dna_complexity ?? '',
    dna_pace: title?.dna_pace ?? '',
    dna_darkness: title?.dna_darkness ?? '',
    dna_spectacle: title?.dna_spectacle ?? '',
  };
}

function toNumberOrNull(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function SectionCard({ id, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/75 p-5 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ScoreInput({ label, value, onChange, min = 0, max = 100, step = 1, hint }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
      />
    </Field>
  );
}

export default function TitleEditor() {
  const navigate = useNavigate();
  const { id: titleId } = useParams();
  const isNew = titleId === 'new';

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [people, setPeople] = useState([]);
  const [genres, setGenres] = useState([]);
  const [attachedGenres, setAttachedGenres] = useState([]);
  const [attachedCredits, setAttachedCredits] = useState([]);
  const [selectedGenreId, setSelectedGenreId] = useState('');
  const [creditQuery, setCreditQuery] = useState('');
  const [selectedCreditPersonId, setSelectedCreditPersonId] = useState('');
  const [selectedCreditRole, setSelectedCreditRole] = useState(CREDIT_ROLE_OPTIONS[0]);
  const [savingRelation, setSavingRelation] = useState(false);

  const filteredPeople = useMemo(() => {
    const search = creditQuery.trim().toLowerCase();
    if (!search) return people;

    return people.filter((person) => {
      const roles = Array.isArray(person?.roles) ? person.roles.join(' ') : '';
      const text = [person?.name, person?.id, roles].join(' ').toLowerCase();
      return text.includes(search);
    });
  }, [creditQuery, people]);

  async function loadEditorData() {
    setLoading(true);
    setError('');

    try {
      const requests = [getGenres(), getPeople()];

      if (isNew) {
        requests.push(Promise.resolve(null), Promise.resolve([]), Promise.resolve([]));
      } else {
        requests.push(getTitle(titleId), getTitleGenres(titleId), getTitleCredits(titleId));
      }

      const [genresData, peopleData, titleData, titleGenresData, titleCreditsData] = await Promise.all(requests);

      setGenres(Array.isArray(genresData) ? genresData : []);
      setPeople(Array.isArray(peopleData) ? peopleData : []);
      setForm(titleData ? toForm(titleData) : INITIAL_FORM);
      setAttachedGenres(Array.isArray(titleGenresData) ? titleGenresData : []);
      setAttachedCredits(Array.isArray(titleCreditsData) ? titleCreditsData : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load title editor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEditorData();
  }, [titleId]);

  async function refreshRelations() {
    if (isNew) return;

    const [nextGenres, nextCredits] = await Promise.all([
      getTitleGenres(titleId),
      getTitleCredits(titleId),
    ]);

    setAttachedGenres(Array.isArray(nextGenres) ? nextGenres : []);
    setAttachedCredits(Array.isArray(nextCredits) ? nextCredits : []);
  }

  function clearAlerts() {
    setError('');
    setMessage('');
  }

  async function handleSave(event) {
    event.preventDefault();
    clearAlerts();
    setSaving(true);

    const generatedId = form.id.trim() || `${slugify(form.title)}_${form.year}`;
    const payload = {
      id: generatedId,
      title: form.title.trim(),
      type: form.type,
      year: toNumberOrNull(form.year),
      releaseDate: form.releaseDate || null,
      poster: form.poster || null,
      backdrop: form.backdrop || null,
      trailer: form.trailer || null,
      synopsis: form.synopsis || null,
      runtime: form.runtime || null,
      censor_rating: form.censor_rating || null,
      audience_score: toNumberOrNull(form.audience_score),
      cine_score: toNumberOrNull(form.cine_score),
      dna_intensity: toNumberOrNull(form.dna_intensity),
      dna_emotion: toNumberOrNull(form.dna_emotion),
      dna_complexity: toNumberOrNull(form.dna_complexity),
      dna_pace: toNumberOrNull(form.dna_pace),
      dna_darkness: toNumberOrNull(form.dna_darkness),
      dna_spectacle: toNumberOrNull(form.dna_spectacle),
    };

    try {
      if (isNew) {
        const created = await createTitle(payload);
        setMessage('Title created.');
        navigate(`/admin/titles/${encodeURIComponent(created?.id ?? generatedId)}`, { replace: true });
      } else {
        await updateTitle(titleId, payload);
        setMessage('Title updated.');
        await loadEditorData();
      }
    } catch (saveError) {
      setError(saveError.message || 'Failed to save title');
    } finally {
      setSaving(false);
    }
  }

  async function handleAttachGenre() {
    if (isNew || !selectedGenreId) return;

    clearAlerts();
    setSavingRelation(true);

    try {
      await addTitleGenre(titleId, { genreId: selectedGenreId });
      await refreshRelations();
      setSelectedGenreId('');
      setMessage('Genre attached.');
    } catch (attachError) {
      setError(attachError.message || 'Failed to attach genre');
    } finally {
      setSavingRelation(false);
    }
  }

  async function handleRemoveGenre(genreId) {
    if (isNew || !genreId) return;

    clearAlerts();
    setSavingRelation(true);

    try {
      await removeTitleGenre(titleId, genreId);
      await refreshRelations();
      setMessage('Genre removed.');
    } catch (removeError) {
      setError(removeError.message || 'Failed to remove genre');
    } finally {
      setSavingRelation(false);
    }
  }

  async function handleAddCredit() {
    if (isNew || !selectedCreditPersonId || !selectedCreditRole) return;

    clearAlerts();
    setSavingRelation(true);

    try {
      await addTitleCredit(titleId, {
        personId: selectedCreditPersonId,
        role: selectedCreditRole,
      });
      await refreshRelations();
      setSelectedCreditPersonId('');
      setMessage('Credit attached.');
    } catch (attachError) {
      setError(attachError.message || 'Failed to attach credit');
    } finally {
      setSavingRelation(false);
    }
  }

  async function handleRemoveCredit(personId) {
    if (isNew || !personId) return;

    clearAlerts();
    setSavingRelation(true);

    try {
      await removeTitleCredit(titleId, personId);
      await refreshRelations();
      setMessage('Credit removed.');
    } catch (removeError) {
      setError(removeError.message || 'Failed to remove credit');
    } finally {
      setSavingRelation(false);
    }
  }

  const attachedGenreIds = new Set(attachedGenres.map((item) => item.genreId));
  const availableGenres = genres.filter((genre) => !attachedGenreIds.has(genre.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          ← Back to Inventory
        </Link>

        <div className="flex flex-wrap gap-2 text-sm">
          <a className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300 hover:bg-zinc-800" href="#core-metadata">Core Metadata</a>
          <a className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300 hover:bg-zinc-800" href="#dna-hype">DNA & Hype</a>
          <a className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300 hover:bg-zinc-800" href="#genres">Genres</a>
          <a className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300 hover:bg-zinc-800" href="#credits">Cast & Crew</a>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Title Workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-50">{isNew ? 'Create title' : form.title || 'Edit title'}</h2>
            <p className="mt-2 text-sm text-zinc-400">Relational edits are isolated here so the inventory stays read-first.</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin')}
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
            <div className="h-32 rounded-2xl bg-zinc-800/70" />
            <div className="h-40 rounded-2xl bg-zinc-800/70" />
            <div className="h-40 rounded-2xl bg-zinc-800/70" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-6">
            <SectionCard
              id="core-metadata"
              title="1. Core Metadata"
              description="Primary title fields and the descriptive media payload."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Title">
                  <input
                    required
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </Field>

                <Field label="ID" hint={isNew ? 'Optional; auto-generated if blank' : 'Read/write key'}>
                  <input
                    value={form.id}
                    onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </Field>

                <Field label="Type">
                  <select
                    value={form.type}
                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  >
                    <option value="movie">Movie</option>
                    <option value="show">Show</option>
                  </select>
                </Field>

                <Field label="Year">
                  <input
                    type="number"
                    value={form.year}
                    onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </Field>

                <Field label="Release Date">
                  <input
                    type="date"
                    value={form.releaseDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, releaseDate: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </Field>

                <Field label="Runtime">
                  <input
                    value={form.runtime}
                    onChange={(event) => setForm((prev) => ({ ...prev, runtime: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                    placeholder="e.g. 2h 12m"
                  />
                </Field>

                <Field label="Poster URL">
                  <input
                    value={form.poster}
                    onChange={(event) => setForm((prev) => ({ ...prev, poster: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </Field>

                <Field label="Backdrop URL">
                  <input
                    value={form.backdrop}
                    onChange={(event) => setForm((prev) => ({ ...prev, backdrop: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </Field>

                <Field label="Trailer URL">
                  <input
                    value={form.trailer}
                    onChange={(event) => setForm((prev) => ({ ...prev, trailer: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </Field>

                <Field label="Censor Rating">
                  <select
                    value={form.censor_rating}
                    onChange={(event) => setForm((prev) => ({ ...prev, censor_rating: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  >
                    <option value="">Select rating</option>
                    {CENSOR_RATINGS.map((rating) => (
                      <option key={rating} value={rating}>{rating}</option>
                    ))}
                  </select>
                </Field>

                <label className="block md:col-span-2 xl:col-span-3 space-y-1.5">
                  <span className="text-sm font-medium text-zinc-200">Synopsis</span>
                  <textarea
                    rows={5}
                    value={form.synopsis}
                    onChange={(event) => setForm((prev) => ({ ...prev, synopsis: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              id="dna-hype"
              title="2. DNA & Hype Scores"
              description="Populate the title scoring fields that drive recommendation and presentation layers."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ScoreInput
                  label="Cine Score"
                  hint="0-100"
                  value={form.cine_score}
                  onChange={(event) => setForm((prev) => ({ ...prev, cine_score: event.target.value }))}
                />
                <ScoreInput
                  label="Audience Score"
                  hint="0-100"
                  value={form.audience_score}
                  onChange={(event) => setForm((prev) => ({ ...prev, audience_score: event.target.value }))}
                />
                <ScoreInput
                  label="DNA Intensity"
                  hint="0-10"
                  max={10}
                  value={form.dna_intensity}
                  onChange={(event) => setForm((prev) => ({ ...prev, dna_intensity: event.target.value }))}
                />
                <ScoreInput
                  label="DNA Emotion"
                  hint="0-10"
                  max={10}
                  value={form.dna_emotion}
                  onChange={(event) => setForm((prev) => ({ ...prev, dna_emotion: event.target.value }))}
                />
                <ScoreInput
                  label="DNA Complexity"
                  hint="0-10"
                  max={10}
                  value={form.dna_complexity}
                  onChange={(event) => setForm((prev) => ({ ...prev, dna_complexity: event.target.value }))}
                />
                <ScoreInput
                  label="DNA Pace"
                  hint="0-10"
                  max={10}
                  value={form.dna_pace}
                  onChange={(event) => setForm((prev) => ({ ...prev, dna_pace: event.target.value }))}
                />
                <ScoreInput
                  label="DNA Darkness"
                  hint="0-10"
                  max={10}
                  value={form.dna_darkness}
                  onChange={(event) => setForm((prev) => ({ ...prev, dna_darkness: event.target.value }))}
                />
                <ScoreInput
                  label="DNA Spectacle"
                  hint="0-10"
                  max={10}
                  value={form.dna_spectacle}
                  onChange={(event) => setForm((prev) => ({ ...prev, dna_spectacle: event.target.value }))}
                />
              </div>
            </SectionCard>

            <SectionCard
              id="genres"
              title="3. Genres"
              description="Genres are stored through the title_genres junction table and mirrored here as attachable tags."
            >
              <div className="flex flex-wrap gap-2">
                {attachedGenres.length ? (
                  attachedGenres.map((genre) => (
                    <span key={genre.genreId} className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-100">
                      <span>{genre.name ?? genre.genreId}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGenre(genre.genreId)}
                        className="rounded-full px-1 text-cyan-100 hover:bg-cyan-500/20"
                        aria-label={`Remove ${genre.name ?? genre.genreId}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No genres attached yet.</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <select
                  value={selectedGenreId}
                  onChange={(event) => setSelectedGenreId(event.target.value)}
                  className="min-w-64 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                  disabled={isNew}
                >
                  <option value="">{isNew ? 'Save the title first to attach genres' : 'Select a genre'}</option>
                  {availableGenres.map((genre) => (
                    <option key={genre.id} value={genre.id}>{genre.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAttachGenre}
                  disabled={isNew || !selectedGenreId || savingRelation}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
                >
                  Attach Genre
                </button>
              </div>
            </SectionCard>

            <SectionCard
              id="credits"
              title="4. Cast & Crew"
              description="Credits are maintained through title_credits and refreshed immediately after each mutation."
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto]">
                <Field label="Search People">
                  <input
                    value={creditQuery}
                    onChange={(event) => setCreditQuery(event.target.value)}
                    placeholder="Search by name, id, or role"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                    disabled={isNew}
                  />
                </Field>

                <Field label="Person">
                  <select
                    value={selectedCreditPersonId}
                    onChange={(event) => setSelectedCreditPersonId(event.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                    disabled={isNew}
                  >
                    <option value="">{isNew ? 'Save the title first to attach credits' : 'Select a person'}</option>
                    {filteredPeople.slice(0, 40).map((person) => (
                      <option key={person.id} value={person.id}>{person.name} ({person.id})</option>
                    ))}
                  </select>
                </Field>

                <Field label="Role">
                  <div className="flex gap-2">
                    <select
                      value={selectedCreditRole}
                      onChange={(event) => setSelectedCreditRole(event.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
                      disabled={isNew}
                    >
                      {CREDIT_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddCredit}
                      disabled={isNew || !selectedCreditPersonId || savingRelation}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
                    >
                      Attach Credit
                    </button>
                  </div>
                </Field>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-800 text-sm">
                  <thead className="bg-zinc-900 text-left text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 bg-zinc-950/70">
                    {attachedCredits.length ? (
                      attachedCredits.map((credit) => (
                        <tr key={`${credit.personId}-${credit.role}`} className="hover:bg-zinc-900/50">
                          <td className="px-4 py-3 text-zinc-100">{credit.name}</td>
                          <td className="px-4 py-3 text-zinc-300">{credit.role}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveCredit(credit.personId)}
                              className="rounded-md border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">No credits attached yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Back to Inventory
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving ? 'Saving...' : isNew ? 'Create Title' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}