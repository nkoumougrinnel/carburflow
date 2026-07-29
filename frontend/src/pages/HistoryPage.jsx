import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import RapportEditModal from '../components/RapportEditModal.jsx'
import PageEnter from '../components/PageEnter.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  deleteRapport,
  downloadRapport,
  listMesRapports,
} from '../auth.js'
import { formatDate, LoadingButton, Spinner } from '../components/reports/ReportsUi.jsx'

function HistoryPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const [rapports, setRapports] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editingRapportId, setEditingRapportId] = useState(null)
  const [deletingRapportId, setDeletingRapportId] = useState(null)
  const [downloadingRapport, setDownloadingRapport] = useState('')

  const busy = Boolean(downloadingRapport) || deletingRapportId != null

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

  useEffect(() => {
    refresh()
  }, [refresh])

  const filteredRapports = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rapports
    return rapports.filter((r) => {
      const author = (r.created_by_username || '').toLowerCase()
      return (
        String(r.id).includes(q)
        || author.includes(q)
        || String(r.date_debut || '').includes(q)
        || String(r.date_fin || '').includes(q)
      )
    })
  }, [rapports, query])

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const handleDownloadRapport = async (rapportId, format) => {
    clearFeedback()
    setDownloadingRapport(`${rapportId}:${format}`)
    try {
      await downloadRapport(rapportId, format)
      setMessage(`Le rapport n°${rapportId} a été téléchargé sur votre ordinateur.`)
    } catch (err) {
      setError(err.message || 'Impossible de télécharger ce rapport.')
    } finally {
      setDownloadingRapport('')
    }
  }

  const handleDeleteRapport = async (rapport) => {
    if (!isAdmin) return
    const ok = window.confirm(
      `Supprimer le rapport n°${rapport.id} ?\n\n`
      + `Période : ${formatDate(rapport.date_debut)} → ${formatDate(rapport.date_fin)}\n`
      + 'Cette action est définitive : les lignes de relevé liées seront aussi retirées.',
    )
    if (!ok) return
    clearFeedback()
    setDeletingRapportId(rapport.id)
    try {
      const result = await deleteRapport(rapport.id)
      setMessage(result.detail || `Le rapport n°${rapport.id} a été supprimé.`)
      await refresh({ silent: true })
    } catch (err) {
      setError(err.message || 'Impossible de supprimer ce rapport.')
    } finally {
      setDeletingRapportId(null)
    }
  }

  return (
    <div className="app-shell">
      <Topbar activeView="history" onNavigate={onNavigate} />
      <PageEnter>
        <main className="reports-layout reports-layout--simple">
          {Boolean(downloadingRapport) && (
            <div className="reports-toast-loading" role="status" aria-live="polite">
              <Spinner size={22} />
              <div>
                <strong>Préparation du téléchargement…</strong>
                <p>Votre fichier arrive…</p>
              </div>
            </div>
          )}

          <WelcomeBanner
            title={isAdmin ? 'Historique des relevés' : 'Mes relevés envoyés'}
            subtitle={
              isAdmin
                ? 'Tous les fichiers reçus des équipes. Téléchargez, modifiez ou retirez un envoi.'
                : 'Retrouvez vos envois, re-téléchargez-les ou corrigez une fiche déjà déposée.'
            }
          />

          <section className="reports-hero reports-hero--simple">
            <div className="reports-stub-badge">Historique</div>
            <h2>{isAdmin ? 'Rapports des équipes' : 'Historique de mes relevés'}</h2>
            <p>
              {isAdmin
                ? 'Chaque ligne correspond à un fichier déjà reçu.'
                : 'Chaque carte correspond à un fichier que vous avez déjà envoyé.'}
            </p>
          </section>

          {message && (
            <div className="reports-success" role="status">
              <strong>C’est bon.</strong> {message}
            </div>
          )}

          {error && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Problème</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <section className={`reports-history ${isAdmin ? 'reports-history--admin' : ''}`}>
            <div className="reports-history-head">
              <div>
                <h2>{isAdmin ? 'Tous les rapports' : 'Mes envois'}</h2>
                <p className="reports-history-sub">
                  {rapports.length} rapport{rapports.length > 1 ? 's' : ''} au total
                </p>
              </div>
              <div className="reports-history-tools">
                <LoadingButton
                  className="reports-btn--ghost"
                  loading={loadingList}
                  loadingText="Actualisation…"
                  onClick={() => refresh()}
                  disabled={busy && !loadingList}
                >
                  Actualiser
                </LoadingButton>
                {(isAdmin || rapports.length > 3) && (
                  <label className="reports-search">
                    <span className="sr-only">Rechercher</span>
                    <input
                      type="search"
                      placeholder="Chercher un n°, une date…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                )}
                {!isAdmin && (
                  <LoadingButton
                    className="reports-btn--primary"
                    onClick={() => onNavigate('reports')}
                  >
                    Nouveau relevé
                  </LoadingButton>
                )}
              </div>
            </div>

            {loadingList ? (
              <div className="reports-skeleton" aria-busy="true" aria-label="Chargement">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="reports-skeleton-row">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : filteredRapports.length === 0 ? (
              <p className="reports-empty">
                {query
                  ? 'Aucun résultat pour cette recherche.'
                  : 'Aucun rapport pour l’instant. Commencez par envoyer un relevé.'}
              </p>
            ) : isAdmin ? (
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Rapport</th>
                      <th>Période</th>
                      <th>Lignes</th>
                      <th>Importé par</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRapports.map((r) => {
                      const keyX = `${r.id}:xlsx`
                      const keyC = `${r.id}:csv`
                      const importer = r.created_by_username || 'Non indiqué'
                      return (
                        <tr key={r.id}>
                          <td>
                            <strong className="reports-table-id">n°{r.id}</strong>
                          </td>
                          <td>
                            {formatDate(r.date_debut)} → {formatDate(r.date_fin)}
                          </td>
                          <td>{r.lignes_count ?? 0}</td>
                          <td>
                            <span className="reports-importer" title={importer}>
                              {importer}
                            </span>
                          </td>
                          <td>
                            <div className="reports-card-actions reports-table-actions">
                              <LoadingButton
                                className="reports-btn--primary reports-btn--download"
                                loading={downloadingRapport === keyX}
                                loadingText="Téléchargement…"
                                disabled={busy && downloadingRapport !== keyX}
                                onClick={() => handleDownloadRapport(r.id, 'xlsx')}
                              >
                                Télécharger Excel
                              </LoadingButton>
                              <LoadingButton
                                className="reports-btn--ghost"
                                loading={downloadingRapport === keyC}
                                loadingText="Téléchargement…"
                                disabled={busy && downloadingRapport !== keyC}
                                onClick={() => handleDownloadRapport(r.id, 'csv')}
                              >
                                CSV
                              </LoadingButton>
                              <LoadingButton
                                className="reports-btn--edit"
                                disabled={busy}
                                onClick={() => setEditingRapportId(r.id)}
                              >
                                Modifier
                              </LoadingButton>
                              <LoadingButton
                                className="reports-btn--danger"
                                loading={deletingRapportId === r.id}
                                loadingText="Suppression…"
                                disabled={busy && deletingRapportId !== r.id}
                                onClick={() => handleDeleteRapport(r)}
                              >
                                Supprimer
                              </LoadingButton>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="reports-cards">
                {filteredRapports.map((r) => {
                  const keyX = `${r.id}:xlsx`
                  const keyC = `${r.id}:csv`
                  return (
                    <article key={r.id} className="reports-card">
                      <div className="reports-card-main">
                        <div className="reports-card-title">Rapport n°{r.id}</div>
                        <div className="reports-card-meta">
                          Période : <strong>{formatDate(r.date_debut)} → {formatDate(r.date_fin)}</strong>
                        </div>
                        <div className="reports-card-meta">
                          {r.lignes_count ?? 0} ligne(s) de relevé
                        </div>
                      </div>
                      <div className="reports-card-actions">
                        <LoadingButton
                          className="reports-btn--primary reports-btn--download"
                          loading={downloadingRapport === keyX}
                          loadingText="Téléchargement…"
                          disabled={busy && downloadingRapport !== keyX}
                          onClick={() => handleDownloadRapport(r.id, 'xlsx')}
                        >
                          Télécharger Excel
                        </LoadingButton>
                        <LoadingButton
                          className="reports-btn--ghost"
                          loading={downloadingRapport === keyC}
                          loadingText="Téléchargement…"
                          disabled={busy && downloadingRapport !== keyC}
                          onClick={() => handleDownloadRapport(r.id, 'csv')}
                        >
                          CSV
                        </LoadingButton>
                        <LoadingButton
                          className="reports-btn--edit"
                          disabled={busy}
                          onClick={() => setEditingRapportId(r.id)}
                        >
                          Modifier
                        </LoadingButton>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {editingRapportId != null && (
            <RapportEditModal
              rapportId={editingRapportId}
              onClose={() => setEditingRapportId(null)}
              onSaved={() => refresh({ silent: true })}
            />
          )}
        </main>
      </PageEnter>
    </div>
  )
}

export default HistoryPage
