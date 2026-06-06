const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

function ensureApiUrl() {
  if (!BASE_URL) {
    throw new Error('VITE_API_URL is missing in admin/.env');
  }
}

async function request(path, options = {}) {
  ensureApiUrl();

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch (error) {
    throw new Error(`Failed to fetch ${BASE_URL}${path}. Ensure backend is running on port 5000 and CORS allows admin port 5175.`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function getTitles() {
  return request('/titles');
}

export function getTitle(id) {
  return request(`/titles/${encodeURIComponent(id)}`);
}

export function createTitle(payload) {
  return request('/titles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTitle(id, payload) {
  return request(`/titles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteTitle(id) {
  return request(`/titles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getPeople() {
  return request('/people');
}

export function getPerson(id) {
  return request(`/people/${encodeURIComponent(id)}`);
}

export function getPersonCredits(id) {
  return request(`/people/${encodeURIComponent(id)}/credits`);
}

export function getGenres() {
  return request('/genres');
}

export function createPerson(payload) {
  return request('/people', {
    method: 'POST',
    body: JSON.stringify({
      id: payload?.id,
      name: payload?.name,
      image_url: payload?.image_url ?? payload?.imageUrl,
    }),
  });
}

export function updatePerson(id, payload) {
  return request(`/people/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: payload?.name,
      image_url: payload?.image_url ?? payload?.imageUrl,
    }),
  });
}

export function deletePerson(id) {
  return request(`/people/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getTitleGenres(titleId) {
  return request(`/titles/${encodeURIComponent(titleId)}/genres`);
}

export const fetchTitleGenres = getTitleGenres;

export function addTitleGenre(titleId, payload) {
  return request(`/titles/${encodeURIComponent(titleId)}/genres`, {
    method: 'POST',
    body: JSON.stringify({
      genre_id: payload?.genre_id ?? payload?.genreId ?? payload?.id,
    }),
  });
}

export function removeTitleGenre(titleId, genreId) {
  return request(`/titles/${encodeURIComponent(titleId)}/genres/${encodeURIComponent(genreId)}`, {
    method: 'DELETE',
  });
}

export function fetchTitleCredits(titleId) {
  return request(`/titles/${encodeURIComponent(titleId)}/credits`);
}

export const getTitleCredits = fetchTitleCredits;

export function addTitleCredit(titleId, payload) {
  return request(`/titles/${encodeURIComponent(titleId)}/credits`, {
    method: 'POST',
    body: JSON.stringify({
      person_id: payload?.person_id ?? payload?.personId,
      role: payload?.role,
      department: payload?.department,
    }),
  });
}

export function removeTitleCredit(titleId, payloadOrPersonId) {
  const personId = typeof payloadOrPersonId === 'string'
    ? payloadOrPersonId
    : payloadOrPersonId?.person_id ?? payloadOrPersonId?.personId;

  return request(`/titles/${encodeURIComponent(titleId)}/credits/${encodeURIComponent(personId)}`, {
    method: 'DELETE',
  });
}
