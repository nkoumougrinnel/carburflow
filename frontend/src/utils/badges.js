/** Bus léger pour rafraîchir les badges topbar (alertes / notifications). */

export const BADGES_REFRESH_EVENT = 'carburflow:badges-refresh'

export function requestBadgesRefresh(detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(BADGES_REFRESH_EVENT, { detail }))
}
