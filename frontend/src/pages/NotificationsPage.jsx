import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Inbox, MailPlus, MailOpen, Send } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import SectionWorkspace from '../components/SectionWorkspace.jsx'
import { LoadingButton } from '../components/reports/ReportsUi.jsx'
import { useAuth } from '../context/AuthContext.jsx'
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

function NotificationsPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const [pane, setPane] = useState('inbox')
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [compose, setCompose] = useState({
    email: '',
    sujet: '',
    contenu: '',
  })

  const navItems = useMemo(() => {
    const itemsNav = [
      {
        id: 'inbox',
        label: 'Boîte de réception',
        description: 'Messages et alertes reçus',
        icon: Inbox,
      },
    ]
    if (isAdmin) {
      itemsNav.push({
        id: 'compose',
        label: 'Écrire un message',
        description: 'Envoyer à un utilisateur',
        icon: MailPlus,
      })
    }
    return itemsNav
  }, [isAdmin])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await listNotifications({ limit: 100 })
      const list = Array.isArray(rows) ? rows : []
      setItems(list)
      setSelectedId((prev) => {
        if (prev != null && list.some((n) => n.id === prev)) return prev
        return list[0]?.id ?? null
      })
    } catch (err) {
      setItems([])
      setSelectedId(null)
      setError(err.message || 'Impossible de charger les messages.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!isAdmin && pane === 'compose') setPane('inbox')
  }, [isAdmin, pane])

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
    } catch (err) {
      setError(err.message || 'Impossible de tout marquer comme lu.')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await sendNotificationMessage({
        email: compose.email.trim(),
        sujet: compose.sujet.trim() || 'Message',
        contenu: compose.contenu.trim(),
      })
      setMessage(result?.detail || 'Message envoyé.')
      setCompose({ email: '', sujet: '', contenu: '' })
    } catch (err) {
      setError(err.message || 'Envoi impossible.')
    } finally {
      setSaving(false)
    }
  }

  const inboxPane = (
    <div className="notif-inbox">
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
            onClick={refresh}
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
  )

  const composePane = (
    <form className="notif-compose" onSubmit={handleSend}>
      {message && <div className="reports-success" role="status">{message}</div>}
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
          rows={8}
          value={compose.contenu}
          onChange={(e) => setCompose((p) => ({ ...p, contenu: e.target.value }))}
          placeholder="Écrivez votre message…"
        />
      </label>

      <LoadingButton
        className="reports-btn--primary"
        loading={saving}
        loadingText="Envoi…"
        type="submit"
      >
        <Send size={16} aria-hidden="true" />
        Envoyer
      </LoadingButton>
    </form>
  )

  return (
    <div className="app-shell">
      <Topbar activeView="notifications" onNavigate={onNavigate} />
      <PageEnter>
        <main className="notifications-layout">
          <SectionWorkspace
            title="Notifications"
            subtitle="Messagerie interne CarburFlow"
            items={navItems}
            activeId={pane}
            onChange={(id) => {
              setError('')
              setMessage('')
              setPane(id)
            }}
          >
            {pane === 'compose' ? composePane : inboxPane}
          </SectionWorkspace>
        </main>
      </PageEnter>
    </div>
  )
}

export default NotificationsPage
