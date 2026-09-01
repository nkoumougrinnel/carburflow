import React, { useCallback, useEffect, useState } from 'react'
import {
  LayoutDashboard,
  MapPinned,
  Zap,
  Upload,
  Home,
  LogOut,
  LogIn,
  Menu,
  X,
  Sun,
  Moon,
  UserRound,
  Bell,
} from 'lucide-react'
import BrandLogo from './BrandLogo.jsx'
import NavLink from './NavLink.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { useTheme } from '@/context/ThemeContext.jsx'
import { listAlertes, notificationsUnreadCount } from '@/auth.js'
import { BADGES_REFRESH_EVENT } from '@/utils/badges.js'
import { isIndeterminateAutonomyAlert, normalizePersistedAlert } from '@/utils/alerts.js'
import { getDisplayFullName } from '@/utils/userDisplay.js'

const BADGES_POLL_MS = 10000
const ACTIVE_ALERT_ETATS = new Set(['nouvelle', 'en_cours'])

function countActiveAlertsForBadge(rows) {
  if (!Array.isArray(rows)) return 0
  return rows
    .map(normalizePersistedAlert)
    .filter((alert) => {
      if (!alert) return false
      // Historique (traitées / ignorées) exclus du badge topbar
      if (alert.traitee || alert.etat === 'traitee' || alert.etat === 'ignoree') return false
      if (alert.etat && !ACTIVE_ALERT_ETATS.has(alert.etat)) return false
      if (isIndeterminateAutonomyAlert(alert)) return false
      return true
    })
    .length
}

function roleLabel(isAdmin, isOperator) {
  if (isAdmin) return 'Responsable'
  if (isOperator) return 'Opérateur'
  return 'Consultation'
}

function roleChipClass(isAdmin, isOperator) {
  if (isAdmin) return 'admin'
  if (isOperator) return 'operateur'
  return 'user'
}

function Topbar({ activeView, onNavigate }) {
  const { isAuthenticated, isAdmin, isOperator, logout, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeAlertsCount, setActiveAlertsCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => { setMenuOpen(false) }, [activeView])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const refreshBadges = useCallback(async ({ preferUnread } = {}) => {
    if (!isAuthenticated) {
      setActiveAlertsCount(0)
      setUnreadMessages(0)
      return
    }

    if (typeof preferUnread === 'number' && Number.isFinite(preferUnread)) {
      setUnreadMessages(Math.max(0, preferUnread))
    }

    const tasks = [
      notificationsUnreadCount()
        .then((data) => setUnreadMessages(Number(data?.unread) || 0))
        .catch(() => {
          if (typeof preferUnread !== 'number') setUnreadMessages(0)
        }),
    ]

    if (isAdmin) {
      tasks.push(
        listAlertes({ etat: 'actives' })
          .then((rows) => setActiveAlertsCount(countActiveAlertsForBadge(rows)))
          .catch(() => setActiveAlertsCount(0)),
      )
    } else {
      setActiveAlertsCount(0)
    }

    await Promise.all(tasks)
  }, [isAuthenticated, isAdmin])

  useEffect(() => {
    let cancelled = false
    const run = (opts) => {
      if (!cancelled) refreshBadges(opts)
    }
    run()
    const pollId = window.setInterval(() => run(), BADGES_POLL_MS)
    const onRefresh = (event) => {
      const unread = event?.detail?.unread
      run(typeof unread === 'number' ? { preferUnread: unread } : undefined)
    }
    const onFocus = () => run()
    window.addEventListener(BADGES_REFRESH_EVENT, onRefresh)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(pollId)
      window.removeEventListener(BADGES_REFRESH_EVENT, onRefresh)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refreshBadges, activeView])

  const go = (view) => {
    setMenuOpen(false)
    onNavigate(view)
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    onNavigate('home')
  }

  const adminLinks = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alertes', icon: Bell },
    { id: 'sites', label: 'Sites', icon: MapPinned },
    { id: 'groups', label: 'Groupes', icon: Zap },
    { id: 'reports', label: 'Relevés', icon: Upload },
    { id: 'profile', label: 'Comptes', icon: UserRound },
  ]

  // La messagerie reste accessible depuis la cloche des notifications
  // et le bouton flottant (badge unread). On évite un onglet de plus dans
  // la barre pour rester lisible sur mobile.
  const operatorLinks = [
    { id: 'operator', label: 'Accueil', icon: Home },
    { id: 'sites', label: 'Sites', icon: MapPinned },
    { id: 'reports', label: 'Relevés', icon: Upload },
    { id: 'profile', label: 'Profil', icon: UserRound },
  ]

  const viewerLinks = [
    { id: 'viewer', label: 'Accueil', icon: Home },
    { id: 'sites', label: 'Sites', icon: MapPinned },
    { id: 'profile', label: 'Profil', icon: UserRound },
  ]

  const links = !isAuthenticated
    ? [
        { id: 'home', label: 'Accueil', icon: Home },
        { id: 'login', label: 'Connexion', icon: LogIn },
      ]
    : isAdmin
      ? adminLinks
      : isOperator
        ? operatorLinks
        : viewerLinks

  const isDark = theme === 'dark'
  const homeView = isAuthenticated
    ? (isAdmin ? 'dashboard' : isOperator ? 'operator' : 'viewer')
    : 'home'
  const subtitle = !isAuthenticated
    ? 'Suivi carburant'
    : isAdmin
      ? 'Pilotage carburant'
      : isOperator
        ? 'Espace opérateur'
        : 'Espace consultation'

  return (
    <header className={`topbar${scrolled ? ' is-scrolled' : ''}`}>
      <NavLink
        view={homeView}
        onNavigate={go}
        className="brand-wrap brand-wrap--btn"
        aria-label="CarburFlow — accueil"
      >
        <BrandLogo variant="icon" className="brand-logo" />
        <div className="brand-text">
          <span className="brand-name">CarburFlow</span>
          <span className="brand-subtitle">{subtitle}</span>
        </div>
      </NavLink>

      <nav className={`topbar-actions ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation principale">
        {links.map(({ id, label, icon: Icon }) => (
          <NavLink
            key={id}
            view={id}
            onNavigate={go}
            className={`nav-link ${activeView === id ? 'active' : ''}`}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
            {id === 'alerts' && activeAlertsCount > 0 && (
              <span className="nav-link-badge" aria-label={`${activeAlertsCount} alertes non traitées`}>
                {activeAlertsCount}
              </span>
            )}
          </NavLink>
        ))}
        {unreadMessages > 0 && (
          <span className="nav-link-badge nav-link-badge--floater" aria-label={`${unreadMessages} messages non lus`}>
            {unreadMessages}
          </span>
        )}

        {isAuthenticated && (
          <div className="topbar-user">
            <div className="topbar-user-meta">
              <span className="topbar-user-name">{getDisplayFullName(user)}</span>
              <span className={`role-chip ${roleChipClass(isAdmin, isOperator)}`}>
                {roleLabel(isAdmin, isOperator)}
              </span>
            </div>
            <button type="button" className="nav-link nav-link-logout" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          </div>
        )}
      </nav>

      <div className="topbar-right">
        <button
          type="button"
          className="theme-toggle"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTheme() }}
          aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>

        <button
          type="button"
          className="topbar-burger"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
          {!menuOpen && isAdmin && activeAlertsCount > 0 && (
            <span className="nav-link-badge topbar-burger-badge" aria-label={`${activeAlertsCount} alertes non traitées`}>
              {activeAlertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

export default Topbar
