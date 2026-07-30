import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MailOpen, Plus, Send, X } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import { LoadingButton } from '../components/reports/ReportsUi.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { requestBadgesRefresh } from '../utils/badges.js'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  sendNotificationMessage,
} from '../auth.js'

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function ComposeMessageModal({ onClose, onSent }) {
  const [compose, setCompose] = useState({ email: '', sujet: '', contenu: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await sendNotificationMessage({
        email: compose.email.trim(),
        sujet: compose.sujet.trim() || 'Message',
        contenu: compose.contenu.trim(),
      })
      onSent?.(result?.detail || 'Message envoyé.')
      onClose()
    } catch (err) {
      setError(err.message || 'Envoi impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rapport-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="rapport-modal notif-compose-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-compose-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rapport-modal-head">
          <div>
            <p className="rapport-modal-kicker">Messagerie</p>
            <h2 id="notif-compose-title">Nouveau message</h2>
            <p>Envoyez un message à un utilisateur via son e-mail.</p>
          </div>
          <button type="button" className="rapport-modal-close" onClick={onClose} aria-label="Fermer">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="rapport-modal-form notif-compose" onSubmit={handleSend}>
          {error && <div className="reports-error" role="alert">{error}</div>}

          <label className="notif-field">
            <span>E-mail du destinataire</span>
            <input
              type="email"
              required
              value={compose.email}
              onChange={(e) => setCompose((p) => ({ ...p, email: e.target.value }))}
              placeholder="ex. agent@entreprise.com"
              autoComplete="off"
              autoFocus
            />
          </label>

          <label className="notif-field">
            <span>Objet</span>
            <input
              type="text"
              value={compose.sujet}
              onChange={(e) => setCompose((p) => ({ ...p, sujet: e.target.value }))}
              placeholder="Objet du message"
              maxLength={200}
            />
          </label>

          <label className="notif-field">
            <span>Message</span>
            <textarea
              required
              rows={7}
              value={compose.contenu}
              onChange={(e) => setCompose((p) => ({ ...p, contenu: e.target.value }))}
              placeholder="Écrivez votre message…"
            />
          </label>

          <div className="rapport-modal-actions">
            <button type="button" className="reports-btn reports-btn--ghost" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <LoadingButton
              className="reports-btn--primary"
              loading={saving}
              loadingText="Envoi…"
              type="submit"
            >
              <Send size={16} aria-hidden="true" />
              Envoyer
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
}

function NotificationsPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const rows = await listNotifications({ limit: 100 })
      const list = Array.isArray(rows) ? rows : []
      setItems(list)
      setSelectedId((prev) => {
        if (prev != null && list.some((n) => n.id === prev)) return prev
        return list[0]?.id ?? null
      })
      requestBadgesRefresh({ source: 'notifications' })
    } catch (err) {
      setItems([])
      setSelectedId(null)
      setError(err.message || 'Impossible de charger les messages.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Poll léger pour nouveaux messages pendant que la page est ouverte
  useEffect(() => {
    const id = window.setInterval(() => {
      refresh({ silent: true })
    }, 20000)
    return () => window.clearInterval(id)
  }, [refresh])

  const selected = useMemo(
    () => items.find((n) => n.id === selectedId) || null,
    [items, selectedId],
  )

  const unreadCount = useMemo(
    () => items.filter((n) => !n.lu).length,
    [items],
  )

  const openMessage = async (notif) => {
    setSelectedId(notif.id)
    if (notif.lu) return
    try {
      const updated = await markNotificationRead(notif.id)
      setItems((prev) => prev.map((row) => (row.id === notif.id ? { ...row, ...updated } : row)))
      requestBadgesRefresh({ source: 'notifications' })
    } catch {
      // lecture optimiste non bloquante
    }
  }

  const handleMarkAll = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((row) => ({
        ...row,
        lu: true,
        date_lecture: row.date_lecture || new Date().toISOString(),
      })))
      setMessage('Tous les messages sont marqués comme lus.')
      requestBadgesRefresh({ source: 'notifications' })
    } catch (err) {
      setError(err.message || 'Impossible de tout marquer comme lu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell app-shell--messaging">
      <Topbar activeView="notifications" onNavigate={onNavigate} />
      <PageEnter className="notif-page-enter">
        <main className="notifications-layout">
          <WelcomeBanner
            title="Messagerie"
            subtitle="Messages reçus, alertes notifiées et échanges internes CarburFlow."
          />

          <div className="notif-inbox notif-inbox--solo">
            <div className="notif-inbox-toolbar">
              <p className="notif-inbox-meta">
                {unreadCount > 0
                  ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
                  : 'Aucun message non lu'}
              </p>
              <div className="notif-inbox-actions">
                <LoadingButton
                  className="reports-btn--ghost"
                  loading={loading}
                  loadingText="Actualisation…"
                  onClick={() => refresh()}
                >
                  Actualiser
                </LoadingButton>
                <LoadingButton
                  className="reports-btn--ghost"
                  loading={saving}
                  loadingText="…"
                  disabled={unreadCount === 0}
                  onClick={handleMarkAll}
                >
                  <MailOpen size={15} aria-hidden="true" />
                  Tout marquer lu
                </LoadingButton>
              </div>
            </div>

            {message && <div className="reports-success" role="status">{message}</div>}
            {error && <div className="reports-error" role="alert">{error}</div>}

            <div className="notif-inbox-body">
              {loading ? (
                <PageLoader label="Chargement de la messagerie…" />
              ) : items.length === 0 ? (
                <p className="notif-empty">Votre boîte de réception est vide pour le moment.</p>
              ) : (
                <div className="notif-split">
                  <ul className="notif-list">
                    {items.map((notif) => (
                      <li key={notif.id}>
                        <button
                          type="button"
                          className={`notif-item${!notif.lu ? ' is-unread' : ''}${selectedId === notif.id ? ' is-active' : ''}`}
                          onClick={() => openMessage(notif)}
                        >
                          <span className="notif-item-top">
                            <strong>{notif.sujet || 'Sans objet'}</strong>
                            <time dateTime={notif.date_envoi}>{formatWhen(notif.date_envoi)}</time>
                          </span>
                          <span className="notif-item-from">
                            De : {notif.expediteur_nom || 'Système'}
                            {notif.alerte_id ? ' · Alerte' : ''}
                          </span>
                          <span className="notif-item-preview">{notif.contenu}</span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <article className="notif-detail">
                    {selected ? (
                      <>
                        <header className="notif-detail-head">
                          <h3>{selected.sujet || 'Sans objet'}</h3>
                          <p>
                            De <strong>{selected.expediteur_nom || 'Système'}</strong>
                            {' · '}
                            {formatWhen(selected.date_envoi)}
                          </p>
                        </header>
                        <div className="notif-detail-body">{selected.contenu}</div>
                        {selected.alerte_id && isAdmin && (
                          <button
                            type="button"
                            className="reports-btn reports-btn--ghost"
                            onClick={() => onNavigate({ view: 'alerts' })}
                          >
                            Voir les alertes
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="notif-empty">Sélectionnez un message.</p>
                    )}
                  </article>
                </div>
              )}
            </div>
          </div>
        </main>
      </PageEnter>

      {isAdmin && (
        <button
          type="button"
          className="notif-fab"
          aria-label="Écrire un message"
          title="Écrire un message"
          onClick={() => {
            setError('')
            setMessage('')
            setComposeOpen(true)
          }}
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
        </button>
      )}

      {composeOpen && (
        <ComposeMessageModal
          onClose={() => setComposeOpen(false)}
          onSent={(detail) => {
            setMessage(detail)
            requestBadgesRefresh({ source: 'notifications-send' })
          }}
        />
      )}
    </div>
  )
}

export default NotificationsPage
