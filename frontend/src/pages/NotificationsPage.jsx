import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Inbox, Plus, Reply, Search, Send, X } from 'lucide-react'
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
  searchUsersByEmail,
  sendNotificationMessage,
} from '../auth.js'

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function replySubject(sujet) {
  const raw = (sujet || 'Sans objet').trim()
  if (/^re\s*:/i.test(raw)) return raw
  return `Re: ${raw}`
}

function ComposeMessageModal({
  onClose,
  onSent,
  toAdminsOnly = false,
  initial = null,
}) {
  const [compose, setCompose] = useState({
    email: initial?.email || '',
    userId: initial?.userId ? String(initial.userId) : '',
    sujet: initial?.sujet || '',
    contenu: initial?.contenu || '',
  })
  const [admins, setAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(toAdminsOnly)
  const [recipientQuery, setRecipientQuery] = useState(initial?.email || '')
  const [recipientHits, setRecipientHits] = useState([])
  const [selectedRecipient, setSelectedRecipient] = useState(
    initial?.userId
      ? {
          id: initial.userId,
          email: initial.email || '',
          full_name: initial.displayName || '',
        }
      : null,
  )
  const [searchingRecipient, setSearchingRecipient] = useState(false)
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
        if (initial?.userId && list.some((a) => String(a.id) === String(initial.userId))) {
          setCompose((p) => ({ ...p, userId: String(initial.userId) }))
        } else if (!initial?.userId && list.length === 1) {
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
  }, [toAdminsOnly, initial?.userId])

  const runRecipientSearch = async (event) => {
    event?.preventDefault?.()
    const q = recipientQuery.trim()
    setError('')
    if (q.length < 2) {
      setError('Indiquez au moins 2 caractères (nom ou e-mail).')
      return
    }
    setSearchingRecipient(true)
    try {
      const rows = await searchUsersByEmail(q)
      const list = Array.isArray(rows) ? rows : []
      setRecipientHits(list)
      if (!list.length) {
        setError('Aucun compte trouvé pour cette recherche.')
      }
    } catch (err) {
      setRecipientHits([])
      setError(err.message || 'Recherche impossible.')
    } finally {
      setSearchingRecipient(false)
    }
  }

  const pickRecipient = (user) => {
    setSelectedRecipient(user)
    setCompose((p) => ({
      ...p,
      userId: String(user.id),
      email: user.email || '',
    }))
    setRecipientHits([])
    setRecipientQuery(user.email || user.full_name || user.username || '')
    setError('')
  }

  const clearRecipient = () => {
    setSelectedRecipient(null)
    setCompose((p) => ({ ...p, userId: '', email: '' }))
  }

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
      } else if (compose.userId) {
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

  const canSubmit = toAdminsOnly
    ? Boolean(compose.userId) && !loadingAdmins
    : Boolean(compose.userId || compose.email.trim())

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
            <h2 id="notif-compose-title">{initial?.sujet ? 'Répondre' : 'Nouveau message'}</h2>
            <p>
              {toAdminsOnly
                ? 'Écrivez à un responsable CarburFlow.'
                : 'Cherchez un collègue par nom ou e-mail, puis écrivez votre message.'}
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
                autoFocus={!initial}
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
            <div className="notif-recipient-picker">
              <span className="notif-field-label">Destinataire</span>
              {selectedRecipient ? (
                <div className="notif-recipient-chip">
                  <div>
                    <strong>{selectedRecipient.full_name || selectedRecipient.username || 'Compte'}</strong>
                    <span>{selectedRecipient.email || '—'}</span>
                  </div>
                  <button type="button" className="reports-btn reports-btn--ghost" onClick={clearRecipient}>
                    Changer
                  </button>
                </div>
              ) : (
                <>
                  <div className="notif-recipient-search">
                    <input
                      type="search"
                      value={recipientQuery}
                      onChange={(e) => setRecipientQuery(e.target.value)}
                      placeholder="Nom ou e-mail…"
                      autoComplete="off"
                      autoFocus={!initial}
                    />
                    <LoadingButton
                      className="reports-btn--primary"
                      loading={searchingRecipient}
                      loadingText="…"
                      type="button"
                      onClick={runRecipientSearch}
                    >
                      <Search size={16} aria-hidden="true" />
                      Chercher
                    </LoadingButton>
                  </div>
                  {recipientHits.length > 0 && (
                    <ul className="notif-recipient-hits">
                      {recipientHits.map((user) => (
                        <li key={user.id}>
                          <button type="button" onClick={() => pickRecipient(user)}>
                            <strong>{user.full_name || user.username}</strong>
                            <span>{user.email || '—'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
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
              autoFocus={Boolean(initial?.sujet)}
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
              disabled={!canSubmit}
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeInitial, setComposeInitial] = useState(null)
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

  const openCompose = (initial = null) => {
    setError('')
    setMessage('')
    setComposeInitial(initial)
    setComposeOpen(true)
  }

  const openMessage = async (notif) => {
    setSelectedId(notif.id)
    setMobileDetailOpen(true)
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

  const startReply = () => {
    if (!selected || isSent) return
    if (!selected.expediteur) {
      setError('Impossible de répondre : expéditeur inconnu (message système).')
      return
    }
    openCompose({
      userId: selected.expediteur,
      email: '',
      displayName: selected.expediteur_nom || selected.expediteur_username || '',
      sujet: replySubject(selected.sujet),
      contenu: '',
    })
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
          <button
            type="button"
            className="reports-btn reports-btn--primary notif-compose-btn"
            onClick={() => openCompose(null)}
          >
            <Plus size={16} aria-hidden="true" />
            Écrire un message
          </button>
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
          <div className="notif-empty-state">
            <p className="notif-empty">{emptyLabel}</p>
            <button
              type="button"
              className="reports-btn reports-btn--primary"
              onClick={() => openCompose(null)}
            >
              <Plus size={16} aria-hidden="true" />
              Écrire un message
            </button>
          </div>
        ) : (
          <div className={`notif-split${mobileDetailOpen ? ' show-detail' : ''}`}>
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
                    <button
                      type="button"
                      className="notif-detail-back"
                      onClick={() => setMobileDetailOpen(false)}
                    >
                      <ArrowLeft size={16} aria-hidden="true" />
                      Retour
                    </button>
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
                  {!isSent && selected.expediteur ? (
                    <div className="notif-detail-actions">
                      <button
                        type="button"
                        className="reports-btn reports-btn--primary"
                        onClick={startReply}
                      >
                        <Reply size={16} aria-hidden="true" />
                        Répondre
                      </button>
                    </div>
                  ) : null}
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
                ? 'Lisez et écrivez à un collègue. Les alertes cuves restent dans Centre d’alertes.'
                : 'Lisez vos messages et écrivez à un responsable.'
            }
          />

          <SectionWorkspace
            className="section-workspace--fill section-workspace--messaging"
            title="Messages"
            items={navItems}
            activeId={box}
            onChange={(next) => {
              setMessage('')
              setError('')
              setSelectedId(null)
              setMobileDetailOpen(false)
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
        onClick={() => openCompose(null)}
      >
        <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {composeOpen && (
        <ComposeMessageModal
          toAdminsOnly={!isAdmin}
          initial={composeInitial}
          onClose={() => {
            setComposeOpen(false)
            setComposeInitial(null)
          }}
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
