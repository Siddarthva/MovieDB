import { api } from '../api';

export const getTitle = async (id) => api.getTitle(id);
export const getPerson = async (id) => api.getPerson(id);
export const getFilmography = async (personId) => api.getFilmography(personId);
