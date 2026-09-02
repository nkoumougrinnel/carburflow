import React, { useCallback, useEffect, useState, useRef } from 'react'
import { LayoutDashboard, MapPinned, Zap, Upload, Home, LogOut, LogIn, Bell, AlertCircle } from 'lucide-react'
import BrandLogo from './BrandLogo.jsx'
import NavLink from './NavLink.jsx'
import AnimatedBadge from './navigation/AnimatedBadge.jsx'
import MobileMenu from './navigation/MobileMenu.jsx'
import { DropdownMenu, DropdownItem, UserMenu, ThemeToggle } from './navigation/DropdownMenu.jsx'
import NotificationPanel from './navigation/NotificationPanel.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { useTheme } from '@/context/ThemeContext.jsx'
import { listAlertes, notificationsUnreadCount } from '@/auth.js'
import { BADGES_REFRESH_EVENT } from '@/utils/badges.js'
import { isIndeterminateAutonomyAlert, normalizePersistedAlert } from '@/utils/alerts.js'
import { getDisplayFullName } from '@/utils/userDisplay.js'

const BADGES_POLL_MS = 10000
const ACTIVE_ALERT_ETATS = new Set(['nouvelle', 'en_cours'])

const links = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'sites', label: 'Sites', icon: MapPinned },
  { id: 'groups', label: 'Groupes', icon: Zap },
  { id: 'rapports', label: 'Rapports', icon: AlertCircle },
]

function countActiveAlertsForBadge(rows) {
  if (!Array.isArray(rows)) return 0
  return rows.map(normalizePersistedAlert).filter((alert) => {
    if (!alert) return false
    if (alert.traitee || alert.etat === 'traitee' || alert.etat === 'ignoree') return false
    if (alert.etat && !ACTIVE_ALERT_ETATS.has(alert.etat)) return false
    if (isIndeterminateAutonomyAlert(alert)) return false
    return true
  }).length
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeAlertsCount, setActiveAlertsCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [notificationPanelTriggerOpen, setNotificationPanelTriggerOpen] = useState(false)
  const notificationTriggerRef = useRef(null)

  useEffect(() => { setMenuOpen(false); setMobileMenuOpen(false); }, [activeView])

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
      notificationsUnreadCount().then((data) => setUnreadMessages(Number(data?.unread) || 0)).catch(() => { if (typeof preferUnread !== 'number') setUnreadMessages(0) }),
    ]

    if (isAdmin) {
      tasks.push(listAlertes({ etat: 'actives' }).then((rows) => setActiveAlertsCount(countActiveAlertsForBadge(rows))).catch(() => setActiveAlertsCount(0)))
    } else {
      setActiveAlertsCount(0)
    }

    await Promise.all(tasks)
  }, [isAuthenticated, isAdmin])

  useEffect(() => {
    let cancelled = false
    const run = (opts) => { if (!cancelled) refreshBadges(opts) }
    run()
    const pollId = window.setInterval(() => run(), BADGES_POLL_MS)
    return () => { window.clearInterval(pollId); cancelled = true }
  }, [refreshBadges])

  const homeView = isAuthenticated ? (isAdmin ? 'dashboard' : isOperator ? 'operator' : 'viewer') : 'home'
  const subtitle = !isAuthenticated ? 'Suivi carburant' : isAdmin ? 'Pilotage carburant' : isOperator ? 'Espace opérateur' : 'Espace consultation'

  const handleLogout = useCallback(() => {
    logout()
    setMenuOpen(false)
    setMobileMenuOpen(false)
    setNotificationPanelOpen(false)
  }, [logout])

  return (
    <>
      <header className={`topbar${scrolled ? ' is-scrolled' : ''}`}>
        <NavLink view={homeView} onClick={() => { setMenuOpen(false); setMobileMenuOpen(false); }} className="brand-wrap brand-wrap--btn" aria-label="CarburFlow — accueil">
          <BrandLogo variant="icon" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-name">CarburFlow</span>
            <span className="brand-subtitle">{subtitle}</span>
          </div>
        </NavLink>

        <nav className={`topbar-actions ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation principale">
          {links.map(({ id, label, icon: Icon }) => (
            <NavLink key={id} view={id} onClick={() => { setMenuOpen(false); setMobileMenuOpen(false); }} className={`nav-link ${activeView === id ? 'active' : ''}`} aria-current={activeView === id ? 'page' : undefined}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              {id === 'alerts' && activeAlertsCount > 0 && <AnimatedBadge count={activeAlertsCount} variant="danger" animationType="pulse" />}
            </NavLink>
          ))}
          {unreadMessages > 0 && <AnimatedBadge count={unreadMessages} variant="primary" animationType="pulse" />}

          {isAuthenticated && (
            <div className="topbar-user">
              <div className="topbar-user-meta">
                <span className="topbar-user-name">{getDisplayFullName(user)}</span>
                <span className={`role-chip ${roleChipClass(isAdmin, isOperator)}`}>{roleLabel(isAdmin, isOperator)}</span>
              </div>
              <button type="button" className="nav-link nav-link-logout" onClick={handleLogout}><LogOut size={16} aria-hidden="true" /><span>Déconnexion</span></button>
            </div>
          )}
        </nav>

        <div className="topbar-right">
          <ThemeToggle />
          <button type="button" className="topbar-burger" aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((v) => !v)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            {!mobileMenuOpen && isAdmin && activeAlertsCount > 0 && <AnimatedBadge count={activeAlertsCount} variant="danger" animationType="bounce" />}
          </button>
        </div>
      </header>

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} activeView={activeView} />

      <div ref={notificationTriggerRef}>
        <button type="button" className="topbar-burger" style={{ position: 'relative' }} onClick={() => setNotificationPanelTriggerOpen((v) => !v)} aria-label="Notifications" aria-expanded={notificationPanelTriggerOpen}>
          <Bell size={22} aria-hidden="true" />
          {unreadMessages > 0 && <AnimatedBadge count={unreadMessages} variant="primary" animationType="pulse" />}
        </button>
      </div>

      <NotificationPanel isOpen={notificationPanelTriggerOpen} onClose={() => setNotificationPanelTriggerOpen(false)} unreadCount={unreadMessages} />
    </>
  )
}

export default Topbar
