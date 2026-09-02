import React from 'react'
import { 
  LayoutDashboard, 
  MapPinned, 
  Zap, 
  Upload, 
  Home, 
  LogOut, 
  LogIn,
  Bell,
  AlertCircle,
  Users,
  ShieldCheck,
  ClipboardCheck,
  BarChart3,
  Layers3,
  CircleAlert,
  TrendingUp,
  TimerReset,
  Building2,
  Cpu,
  ShieldEllipsis,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import { useTheme } from '@/context/ThemeContext.jsx'
import { useAppNavigate } from '@/hooks/useAppNavigate.js'
import { allowedViews, defaultView, pathForView } from '@/utils/views.js'

const menuItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'sites', label: 'Sites', icon: MapPinned },
  { id: 'groups', label: 'Groupes', icon: Zap },
  { id: 'rapports', label: 'Rapports', icon: BarChart3 },
  { id: 'alertes', label: 'Alertes', icon: AlertCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profil', label: 'Profil', icon: Users },
]

/**
 * Mobile Navigation Menu Component
 * 
 * Un menu de navigation optimisé pour mobile avec:
 * - Animations fluides GSAP
 * - Badges de notification animés
 * - Navigation par rôle
 * - Accessibilité améliorée
 */
function MobileMenu({ isOpen, onClose, activeView }) {
  const { isAuthenticated, isAdmin, isOperator, logout, user } = useAuth()
  const { isDark } = useTheme()
  const onNavigate = useAppNavigate()

  const roleItems = isAdmin 
    ? [
        ...menuItems.slice(0, 5),
        { id: 'groupes', label: 'Groupes', icon: Zap },
      ]
    : isOperator
    ? [
        { id: 'rapports', label: 'Rapports', icon: BarChart3 },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ]
    : [
        { id: 'rapports', label: 'Rapports', icon: BarChart3 },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'profil', label: 'Profil', icon: Users },
      ]

  const handleNavigate = (view) => {
    onNavigate({ view })
    onClose()
  }

  const handleLogout = () => {
    logout()
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="topbar-mobile-menu-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <nav 
        className="topbar-mobile-menu"
        aria-label="Navigation principale"
      >
        <div className="mobile-menu-list">
          {roleItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            const isActiveView = isActiveViewForUser(item.id)
            
            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <Icon size={20} className="mobile-menu-item-icon" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}

          {isAuthenticated && (
            <div className="mobile-menu-divider" />
          )}

          {isAuthenticated && (
            <button
              type="button"
              className="mobile-menu-item"
              onClick={handleLogout}
              aria-label="Se déconnecter"
            >
              <LogOut size={20} className="mobile-menu-item-icon" aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

// Helper function to check if a view is accessible for the current user
function isActiveViewForUser(view) {
  const { isAdmin, isOperator } = useAuth()
  
  if (view === 'dashboard') return isAdmin
  if (view === 'sites') return isAdmin || isOperator
  if (view === 'groups') return isAdmin
  if (view === 'rapports') return isAdmin || isOperator
  if (view === 'alertes') return isAdmin
  if (view === 'notifications') return isAdmin || isOperator || true
  if (view === 'profil') return isAdmin || isOperator || true
  
  return false
}

export default MobileMenu