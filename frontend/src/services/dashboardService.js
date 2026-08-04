import api from './api';

export const dashboardService = {
  // Récupère l'overview (/api/dashboard/overview)
  getOverview: async () => {
    const response = await api.get('/dashboard/overview');
    return response.data;
  },

  // Récupère les données des sites (/api/dashboard/sites)
  getSites: async () => {
    const response = await api.get('/dashboard/sites');
    return response.data;
  },

  // Récupère les groupes électrogènes (/api/dashboard/groupes)
  getGroupes: async () => {
    const response = await api.get('/dashboard/groupes');
    return response.data;
  },

  // Récupère les cuves (/api/dashboard/cuves)
  getCuves: async () => {
    const response = await api.get('/dashboard/cuves');
    return response.data;
  },
};