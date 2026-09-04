import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Settings, HelpCircle, Moon, Sun, LogOut, User, Bell, Shield, AlertTriangle, FileText } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext.jsx'

/**
 * Dropdown Menu Component
 * 
 * Un menu déroulant pour les actions utilisateur.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenu du menu
 * @param {boolean} props.isOpen - État d'ouverture du menu
 * @param {Function} props.onClose - Fonction de fermeture
 * @param {string} props.align - Alignement du menu ('left' | 'right')
 */
function DropdownMenu({ children, isOpen, onClose, align = 'right' }) {
  const menuRef = useRef(null)
  const [isClosing, setIsClosing] = useState(false)

  // Fermer le menu lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Fermer le menu lors de la touche Échap
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose?.()
    }, 200)
  }

  const handleItemClick = () => {
    handleClose()
  }

  return (
    <div 
      ref={menuRef}
      className={`dropdown-menu ${isOpen ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''}`}
      style={{ 
        right: align === 'right' ? '0' : 'auto', 
        left: align === 'left' ? '0' : 'auto' 
      }}
      role="menu"
      aria-orientation="vertical"
      aria-hidden={!isOpen}
    >
      {children}
    </div>
  )
}

/**
 * Dropdown Item Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icône
 * @param {string} props.label - Texte du menu
 * @param {React.ReactNode} props.badge - Badge
 * @param {Function} props.onClick - Fonction de clic
 * @param {Function} props.onHover - Fonction de hover
 * @param {boolean} props.isDivider - Séparateur
 */
function DropdownItem({ icon, label, badge, onClick, onHover, isDivider = false }) {
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onClick?.(e)
  }

  if (isDivider) {
    return <div className="dropdown-divider" role="separator" />
  }

  return (
    <button
      type="button"
      className={`dropdown-item ${isHovered ? 'is-hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="menuitem"
    >
      {icon && <span className="dropdown-item-icon">{icon}</span>}
      <span>{label}</span>
      {badge && <span className="dropdown-item-badge">{badge}</span>}
    </button>
  )
}

/**
 * User Menu Component
 * 
 * Menu utilisateur avec avatar, nom, rôle et actions.
 */
function UserMenu({ user, isAdmin, isOperator, onLogout, onNavigate }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <DropdownMenu isOpen={false} onClose={() => {}} align="right">
      <div className="dropdown-item-header">
        <div className="dropdown-item-avatar">
          <User size={24} aria-hidden="true" />
        </div>
        <div className="dropdown-item-user-info">
          <div className="dropdown-item-user-name">{user?.username || 'Utilisateur'}</div>
          <div className={`dropdown-item-user-role role-chip ${isAdmin ? 'admin' : isOperator ? 'operateur' : 'user'}`}>
            {isAdmin ? 'Responsable' : isOperator ? 'Opérateur' : 'Consultation'}
          </div>
        </div>
      </div>

      <DropdownItem 
        icon={<Bell size={18} />}
        label="Notifications"
        badge={0}
        onClick={() => onNavigate?.({ view: 'notifications' })}
      />

      <DropdownItem 
        icon={<Settings size={18} />}
        label="Paramètres"
        onClick={() => onNavigate?.({ view: 'profil' })}
      />

      <DropdownItem 
        icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        onClick={(e) => { e.preventDefault(); toggleTheme(); }}
      />

      <DropdownItem 
        icon={<HelpCircle size={18} />}
        label="Aide"
        onClick={() => onNavigate?.({ view: 'home' })}
      />

      <DropdownItem isDivider />

      <DropdownItem 
        icon={<LogOut size={18} />}
        label="Se déconnecter"
        onClick={onLogout}
      />
    </DropdownMenu>
  )
}

/**
 * Theme Toggle Button Component
 * 
 * Bouton pour basculer entre le mode clair et sombre.
 */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTheme(); }}
      aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}

export { DropdownMenu, DropdownItem, UserMenu, ThemeToggle }
export default DropdownMenu