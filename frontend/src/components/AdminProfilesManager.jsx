import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck, UserRound } from 'lucide-react'
import PageLoader from './PageLoader.jsx'
import { LoadingButton } from './reports/ReportsUi.jsx'
import { listStaffUsers, searchUsersByEmail, setUserRole } from '../auth.js'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'operateur', label: 'Agent / Opérateur' },
  { value: 'user', label: 'Utilisateur' },
]

const ROLE_LABELS = {
  admin: 'Administrateur',
  operateur: 'Agent / Opérateur',
  user: 'Utilisateur',
}

function isPrivilegedRole(role) {
  return role === 'admin' || role === 'operateur'
}

function AdminProfilesManager() {
  const [emailQuery, setEmailQuery] = useState('')
  const [staffList, setStaffList] = useState([])
  const [searchResults, setSearchResults] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [roleDraft, setRoleDraft] = useState('operateur')
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const displayList = searchResults ?? staffList

  const selected = useMemo(
    () => displayList.find((u) => u.id === selectedId) || null,
    [displayList, selectedId],
  )

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
      setError('Indiquez au moins 2 caractères d’e-mail.')
      return
    }
    setSearching(true)
    try {
      const rows = await searchUsersByEmail(q)
      const list = Array.isArray(rows) ? rows : []
      setSearchResults(list)
      setSelectedId(list[0]?.id ?? null)
      if (!list.length) {
        setMessage('Aucun utilisateur trouvé pour cet e-mail.')
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

  const applyRole = async () => {
    if (!selected?.email) return
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
    ? `Résultats de recherche (${displayList.length})`
    : `Admins et agents (${displayList.length})`

  return (
    <section className="users-admin-embed">
      {message && <div className="reports-success" role="status">{message}</div>}
      {error && <div className="reports-error" role="alert">{error}</div>}

      <form className="users-admin-search" onSubmit={runSearch}>
        <label className="users-admin-field">
          <span>Chercher par e-mail (tous les comptes)</span>
          <input
            type="search"
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            placeholder="ex. marie@entreprise.com"
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
              Voir admins / agents
            </button>
          )}
        </div>
      </form>

      {(loadingStaff || searching) && (
        <PageLoader label={searching ? 'Recherche…' : 'Chargement des profils…'} />
      )}

      {!loadingStaff && !searching && (
        <div className="users-admin-results">
          <div className="users-admin-list">
            <h3>{listTitle}</h3>
            {displayList.length === 0 ? (
              <p className="users-admin-empty">
                {searchResults
                  ? 'Aucun compte trouvé.'
                  : 'Aucun administrateur ni agent pour le moment.'}
              </p>
            ) : (
              <ul>
                {displayList.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={`users-admin-result${selectedId === user.id ? ' is-active' : ''}`}
                      onClick={() => setSelectedId(user.id)}
                    >
                      <span className="users-admin-result-main">
                        <strong>{user.full_name || user.username}</strong>
                        <span>{user.email || '—'}</span>
                      </span>
                      <span className={`users-admin-role-chip users-admin-role-chip--${user.role}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected && (
            <div className="users-admin-detail">
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
                  <dd>{selected.username}</dd>
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
                loading={saving}
                loadingText="Enregistrement…"
                disabled={roleDraft === selected.role}
                type="button"
                onClick={applyRole}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Élire / appliquer le rôle
              </LoadingButton>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default AdminProfilesManager
