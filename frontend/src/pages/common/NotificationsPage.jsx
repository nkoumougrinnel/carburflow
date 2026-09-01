import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Inbox, MailPlus, Send } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import SectionWorkspace from '@/components/SectionWorkspace.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import Button from '@/components/ui/button.jsx'
import { EmptyState } from '@/components/ui/empty-state.jsx'
import Modal from '@/components/ui/modal.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { requestBadgesRefresh } from '@/utils/badges.js'
import { pathForView, isModifiedNavigation } from '@/utils/views.js'
import {
  listMessagingAdmins,
  listNotifications,
  markNotificationRead,
  notificationsUnreadCount,
  sendNotificationMessage,
} from '@/auth.js'

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function ReadStatePill({ lu, dateLecture }) {
  return lu ? (
    <span className="notif-read-pill notif-read-pill--read">
      ✔ Lu{dateLecture ? ` · ${formatWhen(dateLecture)}` : ''}
    </span>
  ) : (
    <span className="notif-read-pill notif-read-pill--unread">
      ● Non lu
    </span>
  )
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
    <Modal
      onClose={onClose}
      kicker="Messagerie"
      title="Nouveau message"
      titleId="notif-compose-title"
      cardClassName="notif-compose-modal"
      subtitle={(
        <span className="notif-compose-helper">
          {toAdminsOnly
            ? 'En tant qu’opérateur ou lecteur, vous pouvez écrire uniquement à un responsable CarburFlow.'
            : 'Envoyez un message à n’importe quel utilisateur via son e-mail.'}
        </span>
      )}
    >
      <form className="rapport-modal-form notif-compose" onSubmit={handleSend}>
          {error && <div className="reports-error" role="alert">{error}</div>}

          {toAdminsOnly ? (
            <label className="notif-field">
              <span>Responsable destinataire</span>
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
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={saving}
              type="submit"
              disabled={toAdminsOnly && (loadingAdmins || !compose.userId)}
            >
              <Send size={16} aria-hidden="true" />
              Envoyer
            </Button>
          </div>
        </form>
    </Modal>
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
  const [toast, setToast] = useState(null)
  const prevItemsRef = useRef([])
  const toastTimerRef = useRef(null)

  const isSent = box === 'sent'

  const showToast = useCallback((payload) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(payload)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  const refresh = useCallback(async ({ silent = false, mailbox = box } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const [rows, unreadPayload] = await Promise.all([
        listNotifications({ limit: 100, box: mailbox }),
        notificationsUnreadCount().catch(() => null),
      ])
      const list = Array.isArray(rows) ? rows.filter((n) => !n.alerte_id) : []

      if (mailbox === 'inbox' && prevItemsRef.current.length) {
        const prevIds = new Set(prevItemsRef.current.map((n) => n.id))
        const fresh = list.find((n) => !prevIds.has(n.id))
        if (fresh) {
          showToast({
            kind: 'live',
            title: 'Nouveau message reçu',
            body: `${fresh.expediteur_nom || 'Système'} · ${fresh.sujet || 'Sans objet'}`,
            notifId: fresh.id,
          })
        }
      }
      prevItemsRef.current = list

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
  }, [box, showToast])

  useEffect(() => {
    refresh({ mailbox: box })
  }, [box, refresh])

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh({ silent: true, mailbox: box })
    }, 20000)
    return () => window.clearInterval(id)
  }, [refresh, box])

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
  }, [])

  const navItems = useMemo(() => ([
    {
      id: 'inbox',
      label: 'Boîte de réception',
      description: 'Messages reçus',
      icon: Inbox,
      badge: inboxUnread > 0 ? inboxUnread : undefined,
    },
    {
      id: 'sent',
      label: 'Mes envois',
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

  const handleCompose = () => {
    setError('')
    setMessage('')
    setComposeOpen(true)
  }

  const closeDetailMobile = () => setSelectedId(null)

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
          <Button
            variant="ghost"
            loading={loading}
            onClick={() => refresh({ mailbox: box })}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {message && <div className="reports-success" role="status">{message}</div>}
      {error && <div className="reports-error" role="alert">{error}</div>}

      <div className="notif-inbox-body">
        {loading ? (
          <PageLoader label="Chargement de la messagerie…" />
        ) : items.length === 0 ? (
          isSent ? (
            <EmptyState
              icon={<Send size={30} />}
              title="Aucun envoi"
              description="Vous n'avez pas encore envoyé de messages."
            />
          ) : (
            <EmptyState
              icon={<Inbox size={30} />}
              title="Boîte de réception vide"
              description={isAdmin
                ? 'Aucun message pour l’instant. Cliquez sur « Écrire un message » pour en envoyer un.'
                : 'Aucun message pour l’instant. Cliquez sur « Écrire un message » pour contacter un responsable.'}
              action={{
                label: 'Écrire un message',
                onClick: handleCompose,
                icon: <MailPlus size={16} />,
                variant: 'primary'
              }}
            />
          )
        ) : (
          <div className={`notif-split ${selectedId ? 'is-detail-open' : ''}`}>
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
                  <button
                    type="button"
                    className="notif-mobile-back"
                    onClick={closeDetailMobile}
                    aria-label="Revenir à la liste"
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    Liste
                  </button>
                  <header className="notif-detail-head">
                    <h3>{selected.sujet || 'Sans objet'}</h3>
                    {isSent ? (
                      <ReadStatePill
                        lu={Boolean(selected.lu)}
                        dateLecture={selected.date_lecture}
                      />
                    ) : null}
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
        <main className="page-layout">
          <WelcomeBanner
            kicker="Échanges internes"
            title="Messagerie"
            subtitle="Échanges avec votre équipe et les responsables CarburFlow — ouvrez, répondez, suivez."
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

      <span className="notif-fab-helper" aria-hidden="true">
        + Nouveau message
      </span>

      <Button
        variant="primary"
        className="notif-fab"
        aria-label="Écrire un message"
        title="Écrire un message"
        onClick={handleCompose}
      >
        <MailPlus size={26} strokeWidth={2.4} aria-hidden="true" />
      </Button>

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

      {toast && toast.kind === 'live' && (
        <div className="cf-toast-live" role="status" aria-live="polite">
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
            <a
              href={pathForView('notifications')}
              onClick={(e) => {
                if (isModifiedNavigation(e)) return
                e.preventDefault()
                const target = items.find((n) => n.id === toast.notifId)
                if (target) openMessage(target)
              }}
            >
              Ouvrir le message →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
