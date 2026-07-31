import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Inbox, Plus, Send, X } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import SectionWorkspace from '../components/SectionWorkspace.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import { LoadingButton } from '../components/reports/ReportsUi.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { requestBadgesRefresh } from '../utils/badges.js'
import {
  listMessagingAdmins,
  listNotifications,
  markNotificationRead,
  notificationsUnreadCount,
  sendNotificationMessage,
} from '../auth.js'

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function ComposeMessageModal({ onClose, onSent, toAdminsOnly = false }) {
  const [compose, setCompose] = useState({ email: '', userId: '', sujet: '', contenu: '' })
  const [admins, setAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(toAdminsOnly)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!toAdminsOnly) return undefined
    let cancelled = false
    setLoadingAdmins(true)
    listMessagingAdmins()
      .then((rows) => {
        if (cancelled) return
        const list = Array.isArray(rows) ? rows : []
        setAdmins(list)
        if (list.length === 1) {
          setCompose((p) => ({ ...p, userId: String(list[0].id) }))
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Impossible de charger les responsables.')
      })
      .finally(() => {
        if (!cancelled) setLoadingAdmins(false)
      })
    return () => { cancelled = true }
  }, [toAdminsOnly])

  const handleSend = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        sujet: compose.sujet.trim() || 'Message',
        contenu: compose.contenu.trim(),
      }
      if (toAdminsOnly) {
        payload.user_id = Number(compose.userId)
      } else {
        payload.email = compose.email.trim()
      }
      const result = await sendNotificationMessage(payload)
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
            <p>
              {toAdminsOnly
                ? 'Écrivez à un responsable CarburFlow.'
                : 'Envoyez un message à un utilisateur via son e-mail.'}
            </p>
          </div>
          <button type="button" className="rapport-modal-close" onClick={onClose} aria-label="Fermer">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="rapport-modal-form notif-compose" onSubmit={handleSend}>
          {error && <div className="reports-error" role="alert">{error}</div>}

          {toAdminsOnly ? (
            <label className="notif-field">
              <span>Responsable</span>
              <select
                required
                value={compose.userId}
                disabled={loadingAdmins || admins.length === 0}
                onChange={(e) => setCompose((p) => ({ ...p, userId: e.target.value }))}
                autoFocus
              >
                <option value="">
                  {loadingAdmins ? 'Chargement…' : 'Choisir un responsable'}
                </option>
                {admins.map((admin) => (
                  <option key={admin.id} value={String(admin.id)}>
                    {admin.nom}
                    {admin.email ? ` — ${admin.email}` : ''}
                  </option>
                ))}
              </select>
              {!loadingAdmins && admins.length === 0 && (
                <small className="notif-field-hint">Aucun responsable disponible pour le moment.</small>
              )}
            </label>
          ) : (
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
          )}

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
              disabled={toAdminsOnly && (loadingAdmins || !compose.userId)}
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
  const [box, setBox] = useState('inbox')
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [inboxUnread, setInboxUnread] = useState(0)

  const isSent = box === 'sent'

  const refresh = useCallback(async ({ silent = false, mailbox = box } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const [rows, unreadPayload] = await Promise.all([
        listNotifications({ limit: 100, box: mailbox }),
        notificationsUnreadCount().catch(() => null),
      ])
      const list = Array.isArray(rows) ? rows.filter((n) => !n.alerte_id) : []
      setItems(list)
      setSelectedId((prev) => {
        if (prev != null && list.some((n) => n.id === prev)) return prev
        return list[0]?.id ?? null
      })
      if (unreadPayload && typeof unreadPayload.unread === 'number') {
        setInboxUnread(unreadPayload.unread)
      } else if (mailbox === 'inbox') {
        setInboxUnread(list.filter((n) => !n.lu).length)
      }
      requestBadgesRefresh({ source: 'notifications' })
    } catch (err) {
      setItems([])
      setSelectedId(null)
      setError(err.message || 'Impossible de charger les messages.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [box])

  useEffect(() => {
    refresh({ mailbox: box })
  }, [box, refresh])

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh({ silent: true, mailbox: box })
    }, 20000)
    return () => window.clearInterval(id)
  }, [refresh, box])

  const navItems = useMemo(() => ([
    {
      id: 'inbox',
      label: 'Réception',
      description: 'Messages reçus',
      icon: Inbox,
      badge: inboxUnread > 0 ? inboxUnread : undefined,
    },
    {
      id: 'sent',
      label: 'Envoyés',
      description: 'Messages transmis',
      icon: Send,
    },
  ]), [inboxUnread])

  const selected = useMemo(
    () => items.find((n) => n.id === selectedId) || null,
    [items, selectedId],
  )

  const openMessage = async (notif) => {
    setSelectedId(notif.id)
    if (isSent || notif.lu) return
    try {
      const updated = await markNotificationRead(notif.id)
      setItems((prev) => prev.map((row) => (row.id === notif.id ? { ...row, ...updated } : row)))
      setInboxUnread((prev) => Math.max(0, prev - 1))
      requestBadgesRefresh({ source: 'notifications' })
    } catch {
      // lecture optimiste non bloquante
    }
  }

  const emptyLabel = isSent
    ? 'Aucun message envoyé pour le moment.'
    : 'Votre boîte de réception est vide pour le moment.'

  const mailboxPane = (
    <div className="notif-inbox notif-inbox--solo">
      <div className="notif-inbox-toolbar">
        <p className="notif-inbox-meta">
          {isSent
            ? (items.length
              ? `${items.length} message${items.length > 1 ? 's' : ''} envoyé${items.length > 1 ? 's' : ''}`
              : 'Aucun envoi')
            : (inboxUnread > 0
              ? `${inboxUnread} non lu${inboxUnread > 1 ? 's' : ''}`
              : 'Aucun message non lu')}
        </p>
        <div className="notif-inbox-actions">
          <LoadingButton
            className="reports-btn--ghost"
            loading={loading}
            loadingText="Actualisation…"
            onClick={() => refresh({ mailbox: box })}
          >
            Actualiser
          </LoadingButton>
        </div>
      </div>

      {message && <div className="reports-success" role="status">{message}</div>}
      {error && <div className="reports-error" role="alert">{error}</div>}

      <div className="notif-inbox-body">
        {loading ? (
          <PageLoader label="Chargement de la messagerie…" />
        ) : items.length === 0 ? (
          <p className="notif-empty">{emptyLabel}</p>
        ) : (
          <div className="notif-split">
            <ul className="notif-list">
              {items.map((notif) => (
                <li key={notif.id}>
                  <button
                    type="button"
                    className={`notif-item${!isSent && !notif.lu ? ' is-unread' : ''}${selectedId === notif.id ? ' is-active' : ''}`}
                    onClick={() => openMessage(notif)}
                  >
                    <span className="notif-item-top">
                      <strong>{notif.sujet || 'Sans objet'}</strong>
                      <time dateTime={notif.date_envoi}>{formatWhen(notif.date_envoi)}</time>
                    </span>
                    <span className="notif-item-from">
                      {isSent
                        ? `À : ${notif.destinataire_nom || notif.destinataire_email || 'Destinataire'}`
                        : `De : ${notif.expediteur_nom || 'Système'}`}
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
                      {isSent ? (
                        <>
                          À <strong>{selected.destinataire_nom || selected.destinataire_email || 'Destinataire'}</strong>
                          {selected.destinataire_email
                            ? ` (${selected.destinataire_email})`
                            : ''}
                        </>
                      ) : (
                        <>
                          De <strong>{selected.expediteur_nom || 'Système'}</strong>
                        </>
                      )}
                      {' · '}
                      {formatWhen(selected.date_envoi)}
                      {isSent && selected.lu ? ' · Lu' : null}
                      {isSent && !selected.lu ? ' · Non lu' : null}
                    </p>
                  </header>
                  <div className="notif-detail-body">{selected.contenu}</div>
                </>
              ) : (
                <p className="notif-empty">Sélectionnez un message.</p>
              )}
            </article>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="app-shell app-shell--messaging">
      <Topbar activeView="notifications" onNavigate={onNavigate} />
      <PageEnter className="notif-page-enter">
        <main className="notifications-layout">
          <WelcomeBanner
            kicker="Échanges internes"
            title="Messagerie"
            subtitle={
              isAdmin
                ? 'Réception et envois — écrivez à un utilisateur via son e-mail.'
                : 'Réception et envois — écrivez à un responsable avec le bouton +.'
            }
          />

          <SectionWorkspace
            className="section-workspace--fill section-workspace--messaging"
            title="Boîtes"
            items={navItems}
            activeId={box}
            onChange={(next) => {
              setMessage('')
              setError('')
              setSelectedId(null)
              setBox(next)
            }}
          >
            {mailboxPane}
          </SectionWorkspace>
        </main>
      </PageEnter>

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

      {composeOpen && (
        <ComposeMessageModal
          toAdminsOnly={!isAdmin}
          onClose={() => setComposeOpen(false)}
          onSent={(detail) => {
            setMessage(detail)
            requestBadgesRefresh({ source: 'notifications-send' })
            if (box === 'sent') {
              refresh({ silent: true, mailbox: 'sent' })
            } else {
              setBox('sent')
            }
          }}
        />
      )}
    </div>
  )
}

export default NotificationsPage
