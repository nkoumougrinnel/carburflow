export function pathForView(view) {
  return ({
    home: '/',
    operator: '/operateur/',
    viewer: '/espace/',
    profile: '/profil/',
    dashboard: '/dashboard/',
    sites: '/sites/',
    cuves: '/cuves/',
    groups: '/groupes/',
    reports: '/rapports/',
    alerts: '/alertes/',
    notifications: '/notifications/',
    login: '/login/',
    register: '/register/',
  })[view] || '/'
}

export function isModifiedNavigation(event) {
  return Boolean(
    event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || event.button !== 0,
  )
}
