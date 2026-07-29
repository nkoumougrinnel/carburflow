import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { downloadRapport, listMesRapports } from '../auth.js'
import { formatDate, LoadingButton, Spinner } from '../components/reports/ReportsUi.jsx'

function HistoryPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const [rapports, setRapports] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [downloadingRapport, setDownloadingRapport] = useState('')

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

  const filteredRapports = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rapports
    return rapports.filter((r) => {
      const author = (r.created_by_username || '').toLowerCase()
      return String(r.id).includes(q) || author.includes(q)
        || String(r.date_debut || '').includes(q) || String(r.date_fin || '').includes(q)
    })
  }, [rapports, query])

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
            subtitle={isAdmin ? 'Fichiers reçus des équipes.' : 'Retrouvez et téléchargez vos envois.'}
          />
          {message && <div className="reports-success" role="status">{message}</div>}
          {error && <div className="reports-error-panel" role="alert"><div className="reports-error-panel-head"><strong>Problème</strong><p>{error}</p></div></div>}

          <section className={`reports-history ${isAdmin ? 'reports-history--admin' : ''}`}>
            <div className="reports-history-head">
              <div>
                <h2>{isAdmin ? 'Tous les rapports' : 'Mes envois'}</h2>
                <p className="reports-history-sub">{rapports.length} rapport{rapports.length > 1 ? 's' : ''}</p>
              </div>
              <div className="reports-history-tools">
                <LoadingButton className="reports-btn--ghost" loading={loadingList} onClick={() => refresh()}>Actualiser</LoadingButton>
                {(isAdmin || rapports.length > 3) && (
                  <label className="reports-search">
                    <span className="sr-only">Rechercher</span>
                    <input type="search" placeholder="Chercher…" value={query} onChange={(e) => setQuery(e.target.value)} />
                  </label>
                )}
                {!isAdmin && (
                  <LoadingButton className="reports-btn--primary" onClick={() => onNavigate('reports')}>Nouveau relevé</LoadingButton>
                )}
              </div>
            </div>

            {loadingList ? (
              <div className="reports-skeleton" aria-busy="true">{[1, 2, 3].map((i) => <div key={i} className="reports-skeleton-row"><span /><span /><span /><span /></div>)}</div>
            ) : filteredRapports.length === 0 ? (
              <p className="reports-empty">{query ? 'Aucun résultat.' : 'Aucun rapport pour l’instant.'}</p>
            ) : isAdmin ? (
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead><tr><th>Rapport</th><th>Période</th><th>Lignes</th><th>Importé par</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredRapports.map((r) => (
                      <tr key={r.id}>
                        <td><strong>n°{r.id}</strong></td>
                        <td>{formatDate(r.date_debut)} → {formatDate(r.date_fin)}</td>
                        <td>{r.lignes_count ?? 0}</td>
                        <td>{r.created_by_username || '—'}</td>
                        <td>
                          <div className="reports-card-actions reports-table-actions">
                            <LoadingButton className="reports-btn--primary" loading={downloadingRapport === `${r.id}:xlsx`} disabled={busy && downloadingRapport !== `${r.id}:xlsx`} onClick={() => handleDownloadRapport(r.id, 'xlsx')}>Excel</LoadingButton>
                            <LoadingButton className="reports-btn--ghost" loading={downloadingRapport === `${r.id}:csv`} disabled={busy && downloadingRapport !== `${r.id}:csv`} onClick={() => handleDownloadRapport(r.id, 'csv')}>CSV</LoadingButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="reports-cards">
                {filteredRapports.map((r) => (
                  <article key={r.id} className="reports-card">
                    <div className="reports-card-main">
                      <div className="reports-card-title">Rapport n°{r.id}</div>
                      <div className="reports-card-meta">Période : <strong>{formatDate(r.date_debut)} → {formatDate(r.date_fin)}</strong></div>
                      <div className="reports-card-meta">{r.lignes_count ?? 0} ligne(s)</div>
                    </div>
                    <div className="reports-card-actions">
                      <LoadingButton className="reports-btn--primary" loading={downloadingRapport === `${r.id}:xlsx`} disabled={busy && downloadingRapport !== `${r.id}:xlsx`} onClick={() => handleDownloadRapport(r.id, 'xlsx')}>Excel</LoadingButton>
                      <LoadingButton className="reports-btn--ghost" loading={downloadingRapport === `${r.id}:csv`} disabled={busy && downloadingRapport !== `${r.id}:csv`} onClick={() => handleDownloadRapport(r.id, 'csv')}>CSV</LoadingButton>
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
