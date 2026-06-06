function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

export default function TitleForm({ form, setForm, onSubmit, onCancel, saving, editingTitleId }) {
  return (
    <form onSubmit={onSubmit} className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 md:grid-cols-2">
      <Field label="Title">
        <input
          required
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
        />
      </Field>

      <Field label="ID (optional on create)">
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
          min="1900"
          max="2100"
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

      <Field label="Poster URL">
        <input
          type="url"
          value={form.poster}
          onChange={(event) => setForm((prev) => ({ ...prev, poster: event.target.value }))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
        />
      </Field>

      <Field label="Backdrop URL">
        <input
          type="url"
          value={form.backdrop}
          onChange={(event) => setForm((prev) => ({ ...prev, backdrop: event.target.value }))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
        />
      </Field>

      <Field label="Trailer URL">
        <input
          type="url"
          value={form.trailer}
          onChange={(event) => setForm((prev) => ({ ...prev, trailer: event.target.value }))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
        />
      </Field>

      <label className="block md:col-span-2">
        <span className="mb-1 block text-sm text-zinc-300">Synopsis</span>
        <textarea
          rows={3}
          value={form.synopsis}
          onChange={(event) => setForm((prev) => ({ ...prev, synopsis: event.target.value }))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
        />
      </label>

      <div className="flex gap-2 md:col-span-2 md:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-cyan-300 disabled:opacity-70"
        >
          {saving ? 'Saving...' : editingTitleId ? 'Update Title' : 'Create Title'}
        </button>
      </div>
    </form>
  );
}
