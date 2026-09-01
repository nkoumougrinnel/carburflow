import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck, UserRound } from 'lucide-react'
import PageLoader from './PageLoader.jsx'
import { LoadingButton } from './reports/ReportsUi.jsx'
import { listStaffUsers, searchUsersByEmail, setUserRole } from '@/auth.js'
import { useAuth } from '@/context/AuthContext.jsx'
import Modal from '@/components/ui/modal.jsx'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Responsable' },
  { value: 'operateur', label: 'Opérateur' },
  { value: 'user', label: 'Consultation' },
]

const ROLE_LABELS = {
  admin: 'Responsable',
  operateur: 'Opérateur',
  user: 'Consultation',
}

function isPrivilegedRole(role) {
  return role === 'admin' || role === 'operateur'
}

function isSameUser(a, b) {
  if (!a || !b) return false
  if (a.id != null && b.id != null && String(a.id) === String(b.id)) return true
  if (a.email && b.email && String(a.email).toLowerCase() === String(b.email).toLowerCase()) return true
  return false
}

function AdminProfilesManager() {
  const { user: currentUser } = useAuth()
  const [emailQuery, setEmailQuery] = useState('')
  const [staffList, setStaffList] = useState([])
  const [searchResults, setSearchResults] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [roleDraft, setRoleDraft] = useState('operateur')
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const displayList = searchResults ?? staffList

  const selected = useMemo(
    () => displayList.find((u) => u.id === selectedId) || null,
    [displayList, selectedId],
  )

  const isSelf = isSameUser(selected, currentUser)

  const loadStaff = useCallback(async ({ keepSelection = true } = {}) => {
    setLoadingStaff(true)
    setError('')
    try {
      const rows = await listStaffUsers()
      const list = Array.isArray(rows) ? rows : []
      setStaffList(list)
      setSearchResults(null)
      setSelectedId((prev) => {
        if (!keepSelection) return list[0]?.id ?? null
        if (prev != null && list.some((u) => u.id === prev)) return prev
        return list[0]?.id ?? null
      })
    } catch (err) {
      setStaffList([])
      setError(err.message || 'Impossible de charger les profils.')
    } finally {
      setLoadingStaff(false)
    }
  }, [])

  useEffect(() => {
    loadStaff({ keepSelection: false })
  }, [loadStaff])

  useEffect(() => {
    if (!selected) return
    setRoleDraft(selected.role || 'operateur')
  }, [selected])

  const runSearch = async (event) => {
    event?.preventDefault?.()
    const q = emailQuery.trim()
    setError('')
    setMessage('')
    if (!q) {
      setSearchResults(null)
      setSelectedId(staffList[0]?.id ?? null)
      return
    }
    if (q.length < 2) {
      setError('Indiquez au moins 2 caractères.')
      return
    }
    setSearching(true)
    try {
      const rows = await searchUsersByEmail(q)
      const list = Array.isArray(rows) ? rows : []
      setSearchResults(list)
      setSelectedId(list[0]?.id ?? null)
      if (!list.length) {
        setMessage('Aucun utilisateur trouvé.')
      }
    } catch (err) {
      setSearchResults([])
      setSelectedId(null)
      setError(err.message || 'Recherche impossible.')
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setEmailQuery('')
    setSearchResults(null)
    setMessage('')
    setError('')
    setSelectedId(staffList[0]?.id ?? null)
  }

  const requestApplyRole = () => {
    if (!selected?.email || roleDraft === selected.role || isSelf) return
    setError('')
    setMessage('')
    setConfirmOpen(true)
  }

  const applyRole = async () => {
    if (!selected?.email || isSelf) return
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const result = await setUserRole({
        email: selected.email,
        role: roleDraft,
      })
      const updated = result?.user
      setMessage(result?.detail || 'Rôle mis à jour.')
      setConfirmOpen(false)

      if (!updated) return

      if (isPrivilegedRole(updated.role)) {
        setStaffList((prev) => {
          const exists = prev.some((row) => row.id === updated.id)
          if (exists) {
            return prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
          }
          return [...prev, updated].sort((a, b) =>
            String(a.email || '').localeCompare(String(b.email || '')),
          )
        })
      } else {
        const nextStaff = staffList.filter((row) => row.id !== updated.id)
        setStaffList(nextStaff)
        if (!searchResults && selectedId === updated.id) {
          setSelectedId(nextStaff[0]?.id ?? null)
        }
      }

      if (searchResults) {
        setSearchResults((prev) =>
          (prev || []).map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
        )
      }
    } catch (err) {
      setError(err.message || 'Impossible de mettre à jour le rôle.')
    } finally {
      setSaving(false)
    }
  }

  const listTitle = searchResults
    ? `Résultats (${displayList.length})`
    : `Équipe (${displayList.length})`

  return (
    <section className="users-admin-embed users-admin-embed--saas">
      <header className="users-admin-saas-head">
        <div>
          <h2>Équipe & rôles</h2>
          <p>Cherchez un compte, attribuez Responsable, Opérateur ou Consultation.</p>
        </div>
      </header>

      {message && <div className="reports-success" role="status">{message}</div>}
      {error && <div className="reports-error" role="alert">{error}</div>}

      <form className="users-admin-search users-admin-search--saas" onSubmit={runSearch}>
        <label className="users-admin-field">
          <span>Rechercher un compte</span>
          <input
            type="search"
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            placeholder="Nom, e-mail…"
            autoComplete="off"
          />
        </label>
        <div className="users-admin-search-actions">
          <LoadingButton
            className="reports-btn--primary"
            loading={searching}
            loadingText="Recherche…"
            type="submit"
          >
            <Search size={16} aria-hidden="true" />
            Rechercher
          </LoadingButton>
          {searchResults && (
            <button type="button" className="reports-btn reports-btn--ghost" onClick={clearSearch}>
              Voir l’équipe
            </button>
          )}
        </div>
      </form>

      {(loadingStaff || searching) && (
        <PageLoader label={searching ? 'Recherche…' : 'Chargement des profils…'} />
      )}

      {!loadingStaff && !searching && (
        <div className="users-admin-results users-admin-results--saas">
          <div className="users-admin-list">
            <h3>{listTitle}</h3>
            {displayList.length === 0 ? (
              <div className="users-admin-empty-block">
                <p className="users-admin-empty">
                  {searchResults
                    ? 'Aucun compte trouvé.'
                    : 'Aucun responsable ni opérateur pour le moment.'}
                </p>
                <p className="users-admin-empty-hint">
                  Pour ajouter un accès, cherchez l’e-mail d’un compte déjà créé, puis enregistrez son rôle.
                </p>
              </div>
            ) : (
              <ul>
                {displayList.map((user) => {
                  const selfRow = isSameUser(user, currentUser)
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        className={`users-admin-result${selectedId === user.id ? ' is-active' : ''}`}
                        onClick={() => setSelectedId(user.id)}
                      >
                        <span className="users-admin-result-main">
                          <strong>
                            {user.full_name || user.username}
                            {selfRow ? ' (vous)' : ''}
                          </strong>
                          <span>{user.email || '—'}</span>
                        </span>
                        <span className={`users-admin-role-chip users-admin-role-chip--${user.role}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {selected && (
            <div className="users-admin-detail users-admin-detail--saas">
              <div className="users-admin-detail-head">
                <UserRound size={20} aria-hidden="true" />
                <div>
                  <h3>{selected.full_name || selected.username}</h3>
                  <p>{selected.email}</p>
                </div>
              </div>

              <dl className="users-admin-meta">
                <div>
                  <dt>Identifiant</dt>
                  <dd>{selected.email || '—'}</dd>
                </div>
                <div>
                  <dt>Nom d’utilisateur</dt>
                  <dd>{selected.username || '—'}</dd>
                </div>
                <div>
                  <dt>Rôle actuel</dt>
                  <dd>{ROLE_LABELS[selected.role] || selected.role}</dd>
                </div>
                {selected.site_nom && (
                  <div>
                    <dt>Site</dt>
                    <dd>{selected.site_nom}</dd>
                  </div>
                )}
              </dl>

              {isSelf ? (
                <div className="users-admin-self-lock" role="status">
                  Vous ne pouvez pas modifier votre propre rôle. Demandez à un autre responsable si besoin.
                </div>
              ) : (
                <>
                  <label className="users-admin-field">
                    <span>Nouveau rôle</span>
                    <select value={roleDraft} onChange={(e) => setRoleDraft(e.target.value)}>
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>

                  <LoadingButton
                    className="reports-btn--primary"
                    loading={saving && !confirmOpen}
                    loadingText="Enregistrement…"
                    disabled={roleDraft === selected.role}
                    type="button"
                    onClick={requestApplyRole}
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    Enregistrer le rôle
                  </LoadingButton>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {confirmOpen && selected && !isSelf && (
        <Modal
          onClose={() => { if (!saving) setConfirmOpen(false) }}
          closeDisabled={saving}
          kicker="Comptes"
          title="Confirmer le rôle"
          titleId="users-role-confirm-title"
          subtitle={selected.full_name || selected.username || selected.email}
          cardClassName="users-role-confirm-modal"
        >
            <div className="users-role-confirm-body">
              <div className="users-role-confirm-flow">
                <span className={`users-admin-role-chip users-admin-role-chip--${selected.role}`}>
                  {ROLE_LABELS[selected.role] || selected.role}
                </span>
                <span className="users-role-confirm-arrow" aria-hidden="true">→</span>
                <span className={`users-admin-role-chip users-admin-role-chip--${roleDraft}`}>
                  {ROLE_LABELS[roleDraft] || roleDraft}
                </span>
              </div>
              <p className="users-role-confirm-hint">
                Ce changement prend effet immédiatement pour les accès de la personne.
              </p>
            </div>

            <div className="rapport-modal-actions">
              <button
                type="button"
                className="reports-btn reports-btn--ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Annuler
              </button>
              <LoadingButton
                className="reports-btn--primary"
                loading={saving}
                loadingText="Enregistrement…"
                type="button"
                onClick={applyRole}
              >
                Confirmer
              </LoadingButton>
            </div>
        </Modal>
      )}
    </section>
  )
}

export default AdminProfilesManager
