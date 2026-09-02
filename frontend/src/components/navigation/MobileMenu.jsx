import React from 'react'
import { 
  LayoutDashboard, 
  MapPinned, 
  Zap, 
  LogOut, 
  Bell,
  AlertCircle,
  Users,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import { useAppNavigate } from '@/hooks/useAppNavigate.js'

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
 * - Animations fluides
 * - Navigation par rôle
 * - Accessibilité améliorée
 */
function MobileMenu({ isOpen, onClose, activeView, activeAlertsCount = 0 }) {
  const { isAuthenticated, isAdmin, isOperator, logout } = useAuth()
  const onNavigate = useAppNavigate()

  // Items autorisés selon le rôle
  const roleItems = isAdmin
    ? menuItems
    : isOperator
    ? [
        { id: 'rapports', label: 'Rapports', icon: BarChart3 },
        { id: 'sites', label: 'Sites', icon: MapPinned },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ]
    : [
        { id: 'sites', label: 'Sites', icon: MapPinned },
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

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="topbar-mobile-menu-overlay is-open"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <nav 
        className="topbar-mobile-menu is-open"
        aria-label="Navigation principale"
      >
        <div className="mobile-menu-list">
          {roleItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            const badge = item.id === 'alertes' && activeAlertsCount > 0 ? activeAlertsCount : null

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
                {badge && <span className="mobile-menu-item-badge" aria-label={`${badge} alertes`}>{badge}</span>}
              </button>
            )
          })}

          {isAuthenticated && (
            <>
              <div className="mobile-menu-divider" role="separator" />
              <button
                type="button"
                className="mobile-menu-item"
                onClick={handleLogout}
                aria-label="Se déconnecter"
              >
                <LogOut size={20} className="mobile-menu-item-icon" aria-hidden="true" />
                <span>Déconnexion</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  )
}

export default MobileMenu