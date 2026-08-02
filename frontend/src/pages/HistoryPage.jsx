import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Plus, History as HistoryIcon } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { downloadRapport, listMesRapports } from '../auth.js'
import { formatDate, LoadingButton, Spinner } from '../components/reports/ReportsUi.jsx'

const PERIOD_OPTIONS = [
  { id: '7d', label: '7 j', days: 7 },
  { id: '30d', label: '30 j', days: 30 },
  { id: '90d', label: '90 j', days: 90 },
  { id: 'all', label: 'Tout', days: null },
]

function filterByPeriod(rows, periodId) {
  const opt = PERIOD_OPTIONS.find((p) => p.id === periodId) || PERIOD_OPTIONS[3]
  if (!opt.days) return rows
  const cutoff = Date.now() - opt.days * 24 * 60 * 60 * 1000
  return rows.filter((r) => {
    const stamp = r.date_creation || r.date_debut || r.date_fin
    if (!stamp) return false
    const t = new Date(stamp).getTime()
    return Number.isFinite(t) && t >= cutoff
  })
}

function estimateVolume(rows) {
  const count = rows.reduce((sum, r) => sum + (Number(r.lignes_count) || 0), 0)
  if (!count) return null
  // estimation grossière basée sur le nombre de lignes (1 ligne ≈ 0,3 Ko CSV)
  return `~${Math.max(1, Math.round(count * 0.3))} Ko`
}

function HistoryEmpty({ isAdmin, onNavigate }) {
  return (
    <div className="cf-empty-rich">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="10" y="14" width="44" height="40" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <path d="M18 24 L46 24 M18 32 L42 32 M18 40 L36 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="48" cy="14" r="9" fill="#16a34a" />
        <path d="M48 11 L48 17 M44.5 14 L51.5 14" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h3>Tout est vide. Bonne nouvelle.</h3>
      <p>
        {isAdmin
          ? 'Aucun relevé reçu pour l’instant. Dès qu’un opérateur dépose un fichier, il apparaîtra ici.'
          : 'Vous n’avez encore rien transmis. Cliquez sur le bouton ci-dessous pour générer votre première fiche.'}
      </p>
      <button
        type="button"
        className="reports-btn reports-btn--primary"
        onClick={() => onNavigate('reports')}
      >
        <Plus size={16} aria-hidden="true" />
        {isAdmin ? 'Aller à la page Relevés' : 'Ajouter un relevé'}
      </button>
    </div>
  )
}

function HistoryPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const [rapports, setRapports] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [downloadingRapport, setDownloadingRapport] = useState('')
  const [period, setPeriod] = useState('all')

  const busy = Boolean(downloadingRapport)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingList(true)
    try {
      const r = await listMesRapports()
      setRapports(Array.isArray(r) ? r : [])
      setError('')
    } catch (err) {
      setError(err.message || 'Impossible de charger l’historique.')
    } finally {
      if (!silent) setLoadingList(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const periodFiltered = useMemo(
    () => filterByPeriod(rapports, period),
    [rapports, period],
  )

  const filteredRapports = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return periodFiltered
    return periodFiltered.filter((r) => {
      const author = (r.created_by_username || '').toLowerCase()
      return String(r.id).includes(q) || author.includes(q)
        || String(r.date_debut || '').includes(q) || String(r.date_fin || '').includes(q)
    })
  }, [periodFiltered, query])

  const volumeHint = useMemo(() => estimateVolume(filteredRapports), [filteredRapports])

  const handleDownloadRapport = async (rapportId, format) => {
    setError(''); setMessage('')
    setDownloadingRapport(`${rapportId}:${format}`)
    try {
      await downloadRapport(rapportId, format)
      setMessage(`Le rapport n°${rapportId} a été téléchargé.`)
    } catch (err) {
      setError(err.message || 'Impossible de télécharger ce rapport.')
    } finally {
      setDownloadingRapport('')
    }
  }

  return (
    <div className="app-shell">
      <Topbar activeView="history" onNavigate={onNavigate} />
      <PageEnter>
        <main className="reports-layout reports-layout--simple">
          {Boolean(downloadingRapport) && (
            <div className="reports-toast-loading" role="status">
              <Spinner size={22} />
              <div><strong>Téléchargement…</strong></div>
            </div>
          )}
          <WelcomeBanner
            title={isAdmin ? 'Historique des relevés' : 'Mes relevés envoyés'}
            subtitle={
              isAdmin
                ? 'Tous les relevés transmis par les opérateurs. Téléchargez-les en Excel ou CSV à tout moment.'
                : 'Retrouvez vos envois et retéléchargez-les en Excel ou CSV.'
            }
          />
          {message && <div className="reports-success" role="status">{message}</div>}
          {error && <div className="reports-error-panel" role="alert"><div className="reports-error-panel-head"><strong>Problème</strong><p>{error}</p></div></div>}

          <section className={`reports-history ${isAdmin ? 'reports-history--admin' : ''}`}>
            <div className="reports-history-head">
              <div>
                <h2>{isAdmin ? 'Tous les rapports' : 'Mes envois'}</h2>
                <p className="reports-history-sub">
                  {rapports.length} rapport{rapports.length > 1 ? 's' : ''} au total
                  {volumeHint ? ` · ${volumeHint} cumulés` : ''}
                </p>
              </div>
              <div className="reports-history-tools">
                <LoadingButton className="reports-btn--ghost" loading={loadingList} onClick={() => refresh()}>Actualiser</LoadingButton>
                <label className="reports-search reports-search--always">
                  <span className="sr-only">Rechercher</span>
                  <input
                    type="search"
                    placeholder="Rechercher par n°, date ou opérateur"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={!rapports.length}
                  />
                </label>
                <LoadingButton className="reports-btn--primary" onClick={() => onNavigate('reports')}>
                  <Plus size={16} aria-hidden="true" />
                  Ajouter un relevé
                </LoadingButton>
              </div>
            </div>

            {rapports.length > 0 && (
              <div className="cf-period-chips" role="group" aria-label="Filtrer par période">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`cf-period-chip${period === opt.id ? ' is-active' : ''}`}
                    onClick={() => setPeriod(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {loadingList ? (
              <div className="reports-skeleton" aria-busy="true">{[1, 2, 3].map((i) => <div key={i} className="reports-skeleton-row"><span /><span /><span /><span /></div>)}</div>
            ) : filteredRapports.length === 0 ? (
              rapports.length === 0 ? (
                <HistoryEmpty isAdmin={isAdmin} onNavigate={onNavigate} />
              ) : (
                <p className="reports-empty">{query || period !== 'all' ? 'Aucun résultat pour ces filtres.' : 'Aucun rapport pour l’instant.'}</p>
              )
            ) : (
              <div className="reports-cards">
                {filteredRapports.map((r) => (
                  <article key={r.id} className="reports-card">
                    <div className="reports-card-main">
                      <div className="reports-card-title">
                        <HistoryIcon size={16} aria-hidden="true" style={{ marginRight: 6, verticalAlign: -2 }} />
                        Rapport n°{r.id}
                      </div>
                      <div className="reports-card-meta">Période : <strong>{formatDate(r.date_debut)} → {formatDate(r.date_fin)}</strong></div>
                      <div className="reports-card-meta">{r.lignes_count ?? 0} ligne(s)</div>
                      <div className="reports-card-volume">
                        Importé par <strong>{r.created_by_username || '—'}</strong> · {formatDate(r.date_creation || r.date_debut)}
                      </div>
                    </div>
                    <div className="reports-card-actions">
                      <LoadingButton className="reports-btn--primary" loading={downloadingRapport === `${r.id}:xlsx`} disabled={busy && downloadingRapport !== `${r.id}:xlsx`} onClick={() => handleDownloadRapport(r.id, 'xlsx')}>
                        <Download size={14} aria-hidden="true" />
                        Excel
                      </LoadingButton>
                      <LoadingButton className="reports-btn--ghost" loading={downloadingRapport === `${r.id}:csv`} disabled={busy && downloadingRapport !== `${r.id}:csv`} onClick={() => handleDownloadRapport(r.id, 'csv')}>
                        CSV
                      </LoadingButton>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </PageEnter>
    </div>
  )
}

export default HistoryPage
