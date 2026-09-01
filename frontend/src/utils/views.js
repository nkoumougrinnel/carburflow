export const ADMIN_VIEWS = new Set(['home', 'dashboard', 'sites', 'groups', 'reports', 'profile', 'alerts', 'notifications'])
export const OPERATOR_VIEWS = new Set(['operator', 'sites', 'reports', 'profile', 'notifications'])
export const VIEWER_VIEWS = new Set(['viewer', 'sites', 'profile', 'notifications'])
export const PUBLIC_VIEWS = new Set(['home', 'login', 'register'])

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

export function resolveViewFromPath(pathname) {
  if (pathname.startsWith('/groupes')) return 'groups'
  if (pathname.startsWith('/sites')) return 'sites'
  if (pathname.startsWith('/cuves')) return 'cuves'
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/alertes')) return 'alerts'
  if (pathname.startsWith('/notifications')) return 'notifications'
  if (pathname.startsWith('/historique')) return 'reports'
  if (pathname.startsWith('/operateur')) return 'operator'
  if (pathname.startsWith('/espace')) return 'viewer'
  if (pathname.startsWith('/profil')) return 'profile'
  if (pathname.startsWith('/rapports')) return 'reports'
  if (pathname.startsWith('/register')) return 'register'
  if (pathname.startsWith('/login')) return 'login'
  return 'home'
}

export function allowedViews({ isAdmin, isOperator, isViewer }) {
  if (isAdmin) return ADMIN_VIEWS
  if (isOperator) return OPERATOR_VIEWS
  if (isViewer) return VIEWER_VIEWS
  return new Set()
}

export function defaultView({ isAdmin, isOperator, isViewer }) {
  if (isAdmin) return 'dashboard'
  if (isOperator) return 'operator'
  if (isViewer) return 'viewer'
  return 'login'
}

export function searchForView(view, options = {}) {
  const params = new URLSearchParams()
  if (view === 'sites') {
    if (options.siteId != null && options.siteId !== '') params.set('siteId', options.siteId)
    if (options.siteName != null && options.siteName !== '') params.set('siteName', options.siteName)
    if (options.mode != null && options.mode !== '') params.set('mode', options.mode)
  }
  if (view === 'groups') {
    if (options.groupId != null && options.groupId !== '') params.set('groupId', options.groupId)
    if (options.groupLabel != null && options.groupLabel !== '') params.set('groupLabel', options.groupLabel)
    if (options.mode != null && options.mode !== '') params.set('mode', options.mode)
  }
  if (view === 'alerts') {
    if (options.priority != null && options.priority !== '' && options.priority !== 'all') {
      params.set('priority', options.priority)
    }
    if (options.alertId != null && options.alertId !== '') params.set('alertId', options.alertId)
  }
  if (view === 'reports' && options.pane != null && options.pane !== '') {
    params.set('pane', options.pane)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
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
