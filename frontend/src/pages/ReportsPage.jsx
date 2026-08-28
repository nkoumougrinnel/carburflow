import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Upload, History, Search, Trash2 } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  downloadFicheHebdo,
  downloadNorme,
  downloadRapport,
  deleteRapport,
  listMesRapports,
  normeMeta,
  uploadRapport,
} from '../auth.js'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
}

function toInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultWeekRange() {
  const today = new Date()
  const day = (today.getDay() + 6) % 7 // lundi = 0
  const debut = new Date(today)
  debut.setDate(today.getDate() - day)
  const fin = new Date(debut)
  fin.setDate(debut.getDate() + 6)
  return { dateDebut: toInputDate(debut), dateFin: toInputDate(fin) }
}

function Spinner({ size = 18, label }) {
  return (
    <span className="reports-spinner" style={{ width: size, height: size }} role="status" aria-label={label || 'Chargement'}>
      <span className="reports-spinner-ring" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}

function LoadingButton({
  children,
  loading = false,
  loadingText,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      className={`reports-btn ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="reports-btn-loading">
          <Spinner size={16} />
          <span>{loadingText || 'Patientez…'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}

function initialReportsPane(isAdmin) {
  const pane = new URLSearchParams(window.location.search).get('pane')
  if (pane === 'history' || pane === 'download') return 'download'
  // Admin : consultation uniquement (pas d’envoi de relevé)
  if (isAdmin) return 'download'
  if (pane === 'upload') return 'upload'
  return 'upload'
}

function ReportsPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const inputRef = useRef(null)
  const errorRef = useRef(null)
  const [pane, setPane] = useState(() => initialReportsPane(isAdmin))
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [downloadingFiche, setDownloadingFiche] = useState(false)
  const [downloadingNorme, setDownloadingNorme] = useState('')
  const [downloadingRapport, setDownloadingRapport] = useState('')
  const [deletingRapport, setDeletingRapport] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [rapports, setRapports] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const week = useMemo(() => defaultWeekRange(), [])
  const [periodDebut, setPeriodDebut] = useState(week.dateDebut)
  const [periodFin, setPeriodFin] = useState(week.dateFin)
  const [hasSearched, setHasSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [matchedRapports, setMatchedRapports] = useState([])
  const [selectedRapportId, setSelectedRapportId] = useState('')
  /** Consulter : filtre « période » ou « tous les envois » */
  const [consultFilter, setConsultFilter] = useState('period')

  const busy = uploading
    || downloadingFiche
    || Boolean(downloadingNorme)
    || Boolean(downloadingRapport)
    || Boolean(deletingRapport)

  const navItems = useMemo(() => {
    // Admin : consultation seule — pas de dépôt de relevé
    if (isAdmin) {
      return [
        {
          id: 'download',
          label: 'Consulter',
          description: 'Tous les envois et export',
          icon: Download,
        },
      ]
    }
    return [
      {
        id: 'upload',
        label: 'Ajouter',
        description: 'Générer, remplir et envoyer',
        icon: Upload,
      },
      {
        id: 'download',
        label: 'Mes envois',
        description: 'Consulter et télécharger',
        icon: History,
      },
    ]
  }, [isAdmin])

  useEffect(() => {
    const ids = new Set(navItems.map((item) => item.id))
    if (!ids.has(pane)) setPane(navItems[0].id)
  }, [navItems, pane])

  const refreshHistory = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingList(true)
    try {
      const [, r] = await Promise.all([normeMeta(), listMesRapports()])
      setRapports(Array.isArray(r) ? r : [])
    } catch (err) {
      setError(err.message || 'Impossible de charger la page pour le moment.')
    } finally {
      if (!silent) setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (pane === 'download') {
      refreshHistory()
    } else if (pane === 'upload') {
      normeMeta().catch(() => {})
    }
  }, [pane, refreshHistory])

  useEffect(() => {
    if ((error || importErrors.length) && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error, importErrors])

  const selectedRapport = useMemo(
    () => matchedRapports.find((r) => String(r.id) === String(selectedRapportId)) || null,
    [matchedRapports, selectedRapportId],
  )

  const clearFeedback = () => {
    setError('')
    setMessage('')
    setImportErrors([])
  }

  const handleSearchPeriod = async (event) => {
    event?.preventDefault?.()
    clearFeedback()
    if (!periodDebut || !periodFin) {
      setError('Indiquez une date de début et une date de fin.')
      return
    }
    if (periodDebut > periodFin) {
      setError('La date de début doit précéder la date de fin.')
      return
    }
    setSearching(true)
    setHasSearched(true)
    try {
      const rows = await listMesRapports({
        date_debut: periodDebut,
        date_fin: periodFin,
      })
      const list = Array.isArray(rows) ? rows : []
      setMatchedRapports(list)
      setSelectedRapportId(list[0] ? String(list[0].id) : '')
      if (!list.length) {
        setMessage('')
        setError('Aucun relevé trouvé pour cette période.')
      }
    } catch (err) {
      setMatchedRapports([])
      setSelectedRapportId('')
      setError(err.message || 'Recherche impossible.')
    } finally {
      setSearching(false)
    }
  }

  const handleDownloadFicheHebdo = async () => {
    clearFeedback()
    setDownloadingFiche(true)
    try {
      await downloadFicheHebdo()
      setMessage('Fiche de relevé de la semaine générée avec succès. Complétez uniquement les valeurs mesurées, puis déposez le fichier à l’étape 3.')
    } catch (err) {
      setError(err.message || 'Impossible de générer la fiche de la semaine.')
    } finally {
      setDownloadingFiche(false)
    }
  }

  const handleDownloadNorme = async (format) => {
    clearFeedback()
    setDownloadingNorme(format)
    try {
      await downloadNorme(format)
      setMessage(
        format === 'xlsx'
          ? 'Fichier modèle téléchargé. Ouvrez-le, remplacez la ligne d’exemple, puis envoyez-le à l’étape 3.'
          : 'Fichier modèle CSV téléchargé. Complétez-le puis envoyez-le à l’étape 3.',
      )
    } catch (err) {
      setError(err.message || 'Le téléchargement n’a pas fonctionné. Réessayez.')
    } finally {
      setDownloadingNorme('')
    }
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

  const handleDeleteRapport = async (rapportId) => {
    if (!window.confirm(`Retirer le relevé n°${rapportId} ? Cette action est irréversible.`)) return
    clearFeedback()
    setDeletingRapport(String(rapportId))
    try {
      await deleteRapport(rapportId)
      setRapports((current) => current.filter((rapport) => String(rapport.id) !== String(rapportId)))
      setMatchedRapports((current) => current.filter((rapport) => String(rapport.id) !== String(rapportId)))
      setSelectedRapportId((current) => (String(current) === String(rapportId) ? '' : current))
      setMessage(`Le relevé n°${rapportId} a été retiré.`)
    } catch (err) {
      setError(err.message || 'Impossible de retirer ce relevé.')
    } finally {
      setDeletingRapport('')
    }
  }

  const handleFiles = async (fileList) => {
    const file = fileList?.[0]
    if (!file || uploading) return
    clearFeedback()
    setUploadName(file.name)
    setUploading(true)
    try {
      const result = await uploadRapport(file)
      setMessage(result.detail || 'Votre fichier a bien été enregistré.')
      if (pane === 'download') await refreshHistory({ silent: true })
    } catch (err) {
      setError(err.message || 'Votre fichier n’a pas pu être importé.')
      setImportErrors(Array.isArray(err.errors) ? err.errors : (err.data?.errors || []))
    } finally {
      setUploading(false)
      setUploadName('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const feedbackBlocks = (
    <>
      {message && (
        <div className="reports-success" role="status">
          <strong>C’est bon.</strong> {message}
        </div>
      )}
      {(error || importErrors.length > 0) && (
        <div className="reports-error-panel" ref={errorRef} role="alert">
          <div className="reports-error-panel-head">
            <strong>{importErrors.length ? 'À corriger dans votre fichier' : 'Problème'}</strong>
            <p>{error || 'Voici les points à reprendre, puis renvoyez le fichier.'}</p>
          </div>
          {importErrors.length > 0 ? (
            <ul className="reports-error-list">
              {importErrors.map((item, idx) => (
                <li key={`${item.row}-${item.column}-${idx}`}>
                  <div className="reports-error-where">
                    {item.row ? `Ligne ${item.row}` : 'Fichier'}
                    {item.column_label || item.column
                      ? ` · ${item.column_label || item.column}`
                      : ''}
                  </div>
                  <div className="reports-error-msg">{item.message}</div>
                  {item.how_to_fix ? (
                    <div className="reports-error-fix">
                      <span>Que faire :</span> {item.how_to_fix}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {importErrors.length > 0 && (
            <p className="reports-error-foot">
              Corrigez ces points dans Excel, enregistrez, puis renvoyez le fichier à l’étape 3.
            </p>
          )}
        </div>
      )}
    </>
  )

  const downloadPane = (
    <section className="reports-download-flow">
      <div className="reports-consult-filters" role="tablist" aria-label="Mode de consultation">
        <button
          type="button"
          role="tab"
          aria-selected={consultFilter === 'period'}
          className={`reports-consult-filter${consultFilter === 'period' ? ' is-active' : ''}`}
          onClick={() => setConsultFilter('period')}
        >
          <Search size={16} aria-hidden="true" />
          Par période
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={consultFilter === 'all'}
          className={`reports-consult-filter${consultFilter === 'all' ? ' is-active' : ''}`}
          onClick={() => setConsultFilter('all')}
        >
          <History size={16} aria-hidden="true" />
          {isAdmin ? 'Tous les envois' : 'Mes envois'}
          {rapports.length > 0 ? (
            <span className="reports-consult-filter-count">{rapports.length}</span>
          ) : null}
        </button>
      </div>

      {feedbackBlocks}

      {consultFilter === 'period' ? (
        <>
          <form className="reports-period-form" onSubmit={handleSearchPeriod}>
            <label className="reports-period-field">
              <span>Date de début</span>
              <input
                type="date"
                value={periodDebut}
                onChange={(e) => setPeriodDebut(e.target.value)}
                required
              />
            </label>
            <label className="reports-period-field">
              <span>Date de fin</span>
              <input
                type="date"
                value={periodFin}
                onChange={(e) => setPeriodFin(e.target.value)}
                required
              />
            </label>
            <LoadingButton
              className="reports-btn--primary"
              loading={searching}
              loadingText="Recherche…"
              type="submit"
            >
              <Search size={16} aria-hidden="true" />
              Voir les relevés
            </LoadingButton>
          </form>

          <div className="reports-download-result">
            {!hasSearched && (
              <p className="reports-empty">
                Sélectionnez un intervalle, puis cliquez sur « Voir les relevés ».
                Tous les relevés qui chevauchent cette période seront listés.
              </p>
            )}

            {hasSearched && !searching && matchedRapports.length > 0 && (
              <>
                {matchedRapports.length > 1 && (
                  <div className="reports-match-picker" role="listbox" aria-label="Relevés trouvés">
                    {matchedRapports.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        role="option"
                        aria-selected={String(r.id) === String(selectedRapportId)}
                        className={`reports-match-card${String(r.id) === String(selectedRapportId) ? ' is-active' : ''}`}
                        onClick={() => setSelectedRapportId(String(r.id))}
                      >
                        <strong>Relevé n°{r.id}</strong>
                        <span>{formatDate(r.date_debut)} → {formatDate(r.date_fin)}</span>
                        <span>{r.lignes_count ?? 0} ligne(s) · {r.created_by_username || '—'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedRapport && (
                  <>
                    <div className="reports-download-sticky-actions">
                      <LoadingButton
                        className="reports-btn--primary"
                        loading={downloadingRapport === `${selectedRapport.id}:xlsx`}
                        loadingText="Téléchargement…"
                        disabled={busy && downloadingRapport !== `${selectedRapport.id}:xlsx`}
                        onClick={() => handleDownloadRapport(selectedRapport.id, 'xlsx')}
                      >
                        Télécharger Excel
                      </LoadingButton>
                      <LoadingButton
                        className="reports-btn--ghost"
                        loading={downloadingRapport === `${selectedRapport.id}:csv`}
                        loadingText="Téléchargement…"
                        disabled={busy && downloadingRapport !== `${selectedRapport.id}:csv`}
                        onClick={() => handleDownloadRapport(selectedRapport.id, 'csv')}
                      >
                        Télécharger CSV
                      </LoadingButton>
                      {!isAdmin && (
                        <LoadingButton
                          className="reports-btn--danger"
                          loading={deletingRapport === String(selectedRapport.id)}
                          loadingText="Retrait…"
                          disabled={busy && deletingRapport !== String(selectedRapport.id)}
                          onClick={() => handleDeleteRapport(selectedRapport.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          Retirer
                        </LoadingButton>
                      )}
                    </div>
                    <article className="reports-download-details">
                      <header>
                        <h3>Relevé n°{selectedRapport.id}</h3>
                        <p>
                          Période {formatDate(selectedRapport.date_debut)} → {formatDate(selectedRapport.date_fin)}
                        </p>
                      </header>
                      <dl className="reports-download-meta-grid">
                        <div>
                          <dt>Importé par</dt>
                          <dd>{selectedRapport.created_by_username || 'Non indiqué'}</dd>
                        </div>
                        <div>
                          <dt>Lignes</dt>
                          <dd>{selectedRapport.lignes_count ?? 0}</dd>
                        </div>
                        <div>
                          <dt>Créé le</dt>
                          <dd>{formatDate(selectedRapport.date_creation)}</dd>
                        </div>
                      </dl>
                    </article>
                  </>
                )}
              </>
            )}

            {hasSearched && !searching && matchedRapports.length === 0 && (
              <p className="reports-empty">Aucun relevé ne chevauche cette période.</p>
            )}
          </div>
        </>
      ) : (
        <div className="reports-history reports-history--workspace reports-history--consult">
          <div className="reports-history-head">
            <div>
              <h2>{isAdmin ? 'Tous les envois' : 'Mes envois'}</h2>
              <p className="reports-history-sub">
                {rapports.length} relevé{rapports.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="reports-history-tools">
              <LoadingButton
                className="reports-btn--ghost"
                loading={loadingList}
                loadingText="Actualisation…"
                onClick={() => refreshHistory()}
                disabled={busy && !loadingList}
              >
                Actualiser
              </LoadingButton>
            </div>
          </div>

          {loadingList ? (
            <div className="reports-skeleton" aria-busy="true" aria-label="Chargement">
              {[1, 2, 3].map((i) => (
                <div key={i} className="reports-skeleton-row">
                  <span /><span /><span /><span />
                </div>
              ))}
            </div>
          ) : rapports.length === 0 ? (
            <div className="reports-empty-state">
              <p className="reports-empty">Aucun relevé pour l’instant.</p>
              <button
                type="button"
                className="reports-btn reports-btn--primary"
                onClick={() => setPane('upload')}
              >
                Déposer un relevé
              </button>
            </div>
          ) : (
            <div className="reports-cards">
              {rapports.map((r) => {
                const keyX = `${r.id}:xlsx`
                const keyC = `${r.id}:csv`
                return (
                  <article key={r.id} className="reports-card">
                    <div className="reports-card-main">
                      <div className="reports-card-title">Relevé n°{r.id}</div>
                      <div className="reports-card-meta">
                        Période : <strong>{formatDate(r.date_debut)} → {formatDate(r.date_fin)}</strong>
                      </div>
                      <div className="reports-card-meta">
                        {r.lignes_count ?? 0} ligne(s)
                        {r.created_by_username ? ` · ${r.created_by_username}` : ''}
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
                        Excel
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
                      {!isAdmin && (
                        <LoadingButton
                          className="reports-btn--danger"
                          loading={deletingRapport === String(r.id)}
                          loadingText="Retrait…"
                          disabled={busy && deletingRapport !== String(r.id)}
                          onClick={() => handleDeleteRapport(r.id)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Retirer
                        </LoadingButton>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )

  const uploadPane = (
    <div className="reports-pane-scroll">
      <section className="reports-howto" aria-label="Comment faire">
        <article className="reports-howto-card">
          <div className="reports-howto-num">1</div>
          <h2>Générer la fiche</h2>
          <p>Obtenez le fichier Excel pré-rempli avec la liste de tous vos sites et groupes existants.</p>
          <div className="reports-download-row">
            <LoadingButton
              className="reports-btn--primary reports-btn--lg"
              loading={downloadingFiche}
              loadingText="Génération…"
              disabled={busy}
              onClick={handleDownloadFicheHebdo}
            >
              Générer la fiche de cette semaine
            </LoadingButton>
            <LoadingButton
              className="reports-btn--ghost"
              loading={downloadingNorme === 'csv'}
              loadingText="Téléchargement…"
              disabled={busy && downloadingNorme !== 'csv'}
              onClick={() => handleDownloadNorme('csv')}
            >
              Ou modèle CSV historique
            </LoadingButton>
          </div>
        </article>

        <article className="reports-howto-card">
          <div className="reports-howto-num">2</div>
          <h2>Remplir les relevés</h2>
          <p>
            Ouvrez le fichier Excel. Les noms de sites et groupes sont <strong>verrouillés</strong> pour éviter les erreurs de frappe.
          </p>
          <ul className="reports-plain-list">
            <li>Saisissez uniquement vos mesures (quantités de gasoil, dépotage, compteur horaire).</li>
            <li>Sélectionnez l’état de fonctionnement dans la liste déroulante (F / P / HS).</li>
            <li>Pour ajouter un site non répertorié, utilisez la section basse dédiée dans l’Excel.</li>
          </ul>
          <p className="reports-legend-fp-hs">
            <strong>F</strong> = Fonctionne · <strong>P</strong> = Partiel · <strong>HS</strong> = Hors service
          </p>
        </article>

        <article className="reports-howto-card">
          <div className="reports-howto-num">3</div>
          <h2>Envoyer le fichier</h2>
          <p>Quand c’est rempli, déposez-le ici. On vous dira tout de suite s’il y a un souci.</p>

          <section
            className={`reports-dropzone ${dragging ? 'dragging' : ''} ${uploading ? 'busy' : ''}`}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => !uploading && !busy && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
            aria-label="Déposer le fichier de relevé"
            aria-busy={uploading}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              hidden
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
            {uploading ? (
              <div className="reports-dropzone-loading">
                <Spinner size={36} label="Envoi en cours" />
                <div className="reports-dropzone-title">Envoi en cours…</div>
                <p>{uploadName || 'Vérification de votre fichier'}</p>
                <div className="reports-progress-bar" aria-hidden="true">
                  <span className="reports-progress-bar-fill" />
                </div>
              </div>
            ) : (
              <>
                <div className="reports-dropzone-title">Déposez votre fichier ici</div>
                <p>ou cliquez pour le choisir · Excel (.xlsx) ou CSV</p>
                <p className="reports-dropzone-helper">Formats acceptés : .xlsx, .csv · 10 Mo max</p>
              </>
            )}
          </section>
        </article>
      </section>
      {feedbackBlocks}
    </div>
  )

  const paneContent = pane === 'download' ? downloadPane : (isAdmin ? downloadPane : uploadPane)

  return (
    <div className="app-shell app-shell--reports">
      <Topbar activeView="reports" onNavigate={onNavigate} />
      <PageEnter className="reports-page-enter">
        <main className="profile-layout profile-layout--saas reports-layout--saas">
          <WelcomeBanner
            kicker="Fichiers & dépôt"
            title="Relevés"
            subtitle="3 étapes : générez la fiche, remplissez-la, déposez-la ici."
          />
          {(uploading || downloadingFiche || downloadingNorme || downloadingRapport) && (
            <div className="reports-toast-loading" role="status" aria-live="polite">
              <Spinner size={22} />
              <div>
                <strong>
                  {uploading && 'Envoi du fichier…'}
                  {downloadingFiche && 'Génération de la fiche hebdomadaire…'}
                  {downloadingNorme && 'Préparation du modèle…'}
                  {downloadingRapport && 'Préparation du téléchargement…'}
                </strong>
                <p>
                  {uploading && (uploadName ? `Fichier : ${uploadName}` : 'Vérification en cours')}
                  {downloadingFiche && 'Fichier Excel pré-rempli en cours de préparation…'}
                  {downloadingNorme && 'Quelques secondes…'}
                  {downloadingRapport && 'Votre fichier arrive…'}
                </p>
              </div>
            </div>
          )}

          {navItems.length > 1 ? (
            <div className="saas-profile-tabs" role="tablist" aria-label="Sections relevés">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={pane === item.id}
                    className={`saas-profile-tab${pane === item.id ? ' is-active' : ''}`}
                    onClick={() => {
                      clearFeedback()
                      setPane(item.id)
                    }}
                  >
                    {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                    {item.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="saas-section-pane">
            {paneContent}
          </div>
        </main>
      </PageEnter>
    </div>
  )
}

export default ReportsPage
