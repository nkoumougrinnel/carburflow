import React, { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle, AlertTriangle, Info, X, Archive } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import { apiFetch, listAlertes } from '@/auth.js'
import { normalizePersistedAlert } from '@/utils/alerts.js'

/**
 * Notification Panel Component
 * 
 * Un panneau de notifications avec liste des alertes et messages.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - État d'ouverture du panneau
 * @param {Function} props.onClose - Fonction de fermeture
 * @param {number} props.unreadCount - Nombre de notifications non lues
 */
function NotificationPanel({ isOpen, onClose, unreadCount = 0 }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const panelRef = useRef(null)

  // Charger les notifications
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  // Fermer lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Fermer lors de la touche Échap
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const [alerts, messages] = await Promise.all([
        listAlertes({ etat: 'actives' }).catch(() => []),
        Promise.resolve([]), // À implémenter si nécessaire
      ])
      
      const normalizedAlerts = (Array.isArray(alerts) ? alerts : [])
        .map(normalizePersistedAlert)
        .filter(Boolean)
        .slice(0, 10)
      
      setNotifications(normalizedAlerts)
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (notification) => {
    const { type, etat } = notification
    
    if (type === 'alerte') {
      return <AlertTriangle size={18} />
    }
    
    if (etat === 'traitee' || etat === 'ignoree') {
      return <CheckCircle size={18} />
    }
    
    return <Info size={18} />
  }

  const getNotificationVariant = (notification) => {
    const { type, etat } = notification
    
    if (type === 'alerte' || etat === 'nouvelle') {
      return 'alert'
    }
    
    return 'info'
  }

  const getNotificationTitle = (notification) => {
    const { titre, message } = notification
    
    if (titre) return titre
    if (message) return message
    return 'Notification'
  }

  const getNotificationTime = (notification) => {
    const { date_creation } = notification
    
    if (!date_creation) return ''
    
    const now = new Date()
    const created = new Date(date_creation)
    const diffMs = now - created
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`
    
    return `Il y a ${Math.floor(diffMins / 1440)} j`
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true
    if (filter === 'alerts') return notification.type === 'alerte'
    if (filter === 'messages') return notification.type === 'message'
    return true
  })

  return (
    <div 
      ref={panelRef}
      className={`notification-panel ${isOpen ? 'is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
    >
      <div className="notification-panel-header">
        <h3 className="notification-panel-title">Notifications</h3>
        <div className="notification-panel-actions">
          <button
            type="button"
            className="notification-panel-action-btn"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="notification-panel-filter">
        <button
          type="button"
          className={`notification-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Toutes
        </button>
        <button
          type="button"
          className={`notification-filter-btn ${filter === 'alerts' ? 'active' : ''}`}
          onClick={() => setFilter('alerts')}
        >
          Alertes
        </button>
        <button
          type="button"
          className={`notification-filter-btn ${filter === 'messages' ? 'active' : ''}`}
          onClick={() => setFilter('messages')}
        >
          Messages
        </button>
      </div>

      {loading ? (
        <div className="notification-panel-loading">
          <div className="notification-panel-spinner" />
          <p>Chargement...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="notification-panel-empty">
          <Bell size={48} className="notification-panel-empty-icon" />
          <p>Aucune notification</p>
        </div>
      ) : (
        <div className="notification-panel-content">
          {filteredNotifications.map((notification, index) => (
            <div
              key={notification.id || index}
              className={`notification-item ${getNotificationVariant(notification)}`}
              role="button"
              tabIndex={0}
            >
              <div className="notification-item-icon">
                {getNotificationIcon(notification)}
              </div>
              <div className="notification-item-content">
                <h4 className="notification-item-title">
                  {getNotificationTitle(notification)}
                </h4>
                <p className="notification-item-time">
                  {getNotificationTime(notification)}
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="notification-item-unread" />
              )}
            </div>
          ))}
        </div>
      )}

      {filteredNotifications.length > 0 && (
        <div className="notification-panel-footer">
          <button
            type="button"
            className="notification-panel-footer-btn"
            onClick={() => {
              // TODO: Implémenter la vue complète des notifications
              console.log('Voir toutes les notifications')
            }}
          >
            Voir tout
            <Archive size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default NotificationPanel
