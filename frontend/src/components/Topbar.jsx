import React, { useEffect, useState } from 'react'
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
  History,
  UserRound,
} from 'lucide-react'
import BrandLogo from './BrandLogo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { getDisplayFullName } from '../utils/userDisplay.js'

function roleLabel(isAdmin, isOperator) {
  if (isAdmin) return 'Responsable'
  if (isOperator) return 'Opérateur'
  return 'Utilisateur'
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

  useEffect(() => { setMenuOpen(false) }, [activeView])

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
    { id: 'sites', label: 'Sites', icon: MapPinned },
    { id: 'groups', label: 'Groupes', icon: Zap },
    { id: 'reports', label: 'Relevés', icon: Upload },
    { id: 'profile', label: 'Profil', icon: UserRound },
  ]

  const operatorLinks = [
    { id: 'operator', label: 'Accueil', icon: Home },
    { id: 'sites', label: 'Sites', icon: MapPinned },
    { id: 'reports', label: 'Relevé', icon: Upload },
    { id: 'history', label: 'Historique', icon: History },
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
    <header className="topbar">
      <button type="button" className="brand-wrap brand-wrap--btn" onClick={() => go(homeView)} aria-label="CarburFlow — accueil">
        <BrandLogo variant="icon" className="brand-logo" />
        <div className="brand-text">
          <span className="brand-name">CarburFlow</span>
          <span className="brand-subtitle">{subtitle}</span>
        </div>
      </button>

      <div className="topbar-right">
        <nav className={`topbar-actions ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation principale">
          {links.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-link ${activeView === id ? 'active' : ''}`}
              onClick={() => go(id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}

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
        </button>
      </div>
    </header>
  )
}

export default Topbar
