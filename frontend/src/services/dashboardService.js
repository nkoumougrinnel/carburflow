import api from './api';

export const dashboardService = {
  // Récupère l'overview (/api/v1/dashboard/overview)
  getOverview: async () => {
    const response = await api.get('/dashboard/overview');
    return response.data;
  },

  // Récupère les données des sites (/api/v1/dashboard/sites)
  getSites: async () => {
    const response = await api.get('/dashboard/sites');
    return response.data;
  },

  // Récupère les groupes électrogènes (/api/v1/dashboard/groupes)
  getGroupes: async () => {
    const response = await api.get('/dashboard/groupes');
    return response.data;
  },

  // Récupère les cuves (/api/v1/dashboard/cuves)
  getCuves: async () => {
    const response = await api.get('/dashboard/cuves');
    return response.data;
  },
};