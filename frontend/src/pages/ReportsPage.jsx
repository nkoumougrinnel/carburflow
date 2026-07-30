import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Upload, History } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import SectionWorkspace from '../components/SectionWorkspace.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  downloadFicheHebdo,
  downloadNorme,
  downloadRapport,
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

function ReportsPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const inputRef = useRef(null)
  const errorRef = useRef(null)
  const [pane, setPane] = useState(() => (isAdmin ? 'download' : 'upload'))
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [downloadingFiche, setDownloadingFiche] = useState(false)
  const [downloadingNorme, setDownloadingNorme] = useState('')
  const [downloadingRapport, setDownloadingRapport] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [rapports, setRapports] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [selectedRapportId, setSelectedRapportId] = useState('')

  const busy = uploading
    || downloadingFiche
    || Boolean(downloadingNorme)
    || Boolean(downloadingRapport)

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        {
          id: 'download',
          label: 'Télécharger',
          description: 'Récupérer un relevé déjà reçu',
          icon: Download,
        },
        {
          id: 'upload',
          label: 'Ajouter',
          description: 'Générer, remplir et envoyer',
          icon: Upload,
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
        id: 'history',
        label: 'Mes envois',
        description: 'Relevés déjà transmis',
        icon: History,
      },
    ]
  }, [isAdmin])

  useEffect(() => {
    const ids = new Set(navItems.map((item) => item.id))
    if (!ids.has(pane)) setPane(navItems[0].id)
  }, [navItems, pane])

  const refresh = useCallback(async ({ silent = false } = {}) => {
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
    refresh()
  }, [refresh])

  useEffect(() => {
    if ((error || importErrors.length) && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error, importErrors])

  const filteredRapports = useMemo(() => rapports, [rapports])

  useEffect(() => {
    if (!filteredRapports.length) {
      setSelectedRapportId('')
      return
    }
    const stillThere = filteredRapports.some((r) => String(r.id) === String(selectedRapportId))
    if (!stillThere) {
      setSelectedRapportId(String(filteredRapports[0].id))
    }
  }, [filteredRapports, selectedRapportId])

  const selectedRapport = useMemo(
    () => filteredRapports.find((r) => String(r.id) === String(selectedRapportId)) || null,
    [filteredRapports, selectedRapportId],
  )

  const clearFeedback = () => {
    setError('')
    setMessage('')
    setImportErrors([])
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

  const handleFiles = async (fileList) => {
    const file = fileList?.[0]
    if (!file || uploading) return
    clearFeedback()
    setUploadName(file.name)
    setUploading(true)
    try {
      const result = await uploadRapport(file)
      setMessage(result.detail || 'Votre fichier a bien été enregistré.')
      await refresh({ silent: true })
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
            <strong>À corriger dans votre fichier</strong>
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
          <p className="reports-error-foot">
            Corrigez ces points dans Excel, enregistrez, puis renvoyez le fichier à l’étape 3.
          </p>
        </div>
      )}
    </>
  )

  const downloadPane = (
    <section className="reports-download-panel reports-download-panel--workspace">
      <div className="reports-download-panel-head">
        <div>
          <p>Choisissez un rapport déjà reçu, puis téléchargez-le en Excel ou CSV.</p>
        </div>
        <LoadingButton
          className="reports-btn--ghost"
          loading={loadingList}
          loadingText="Actualisation…"
          onClick={() => refresh()}
          disabled={busy && !loadingList}
        >
          Actualiser
        </LoadingButton>
      </div>

      {loadingList ? (
        <div className="reports-download-panel-loading" aria-busy="true">
          <Spinner size={22} label="Chargement des relevés" />
          <span>Chargement des relevés…</span>
        </div>
      ) : filteredRapports.length === 0 ? (
        <p className="reports-empty">Aucun relevé disponible pour le moment.</p>
      ) : (
        <div className="reports-download-panel-body">
          <label className="reports-download-select">
            <span>Relevé</span>
            <select
              value={selectedRapportId}
              onChange={(e) => setSelectedRapportId(e.target.value)}
            >
              {filteredRapports.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {`n°${r.id} · ${formatDate(r.date_debut)} → ${formatDate(r.date_fin)} · ${r.lignes_count ?? 0} ligne(s)`}
                </option>
              ))}
            </select>
          </label>
          {selectedRapport && (
            <p className="reports-download-meta">
              Importé par <strong>{selectedRapport.created_by_username || 'Non indiqué'}</strong>
            </p>
          )}
          <div className="reports-download-row">
            <LoadingButton
              className="reports-btn--primary"
              loading={downloadingRapport === `${selectedRapportId}:xlsx`}
              loadingText="Téléchargement…"
              disabled={!selectedRapportId || (busy && downloadingRapport !== `${selectedRapportId}:xlsx`)}
              onClick={() => handleDownloadRapport(Number(selectedRapportId), 'xlsx')}
            >
              Télécharger Excel
            </LoadingButton>
            <LoadingButton
              className="reports-btn--ghost"
              loading={downloadingRapport === `${selectedRapportId}:csv`}
              loadingText="Téléchargement…"
              disabled={!selectedRapportId || (busy && downloadingRapport !== `${selectedRapportId}:csv`)}
              onClick={() => handleDownloadRapport(Number(selectedRapportId), 'csv')}
            >
              Télécharger CSV
            </LoadingButton>
          </div>
        </div>
      )}
      {feedbackBlocks}
    </section>
  )

  const uploadPane = (
    <>
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
              </>
            )}
          </section>
        </article>
      </section>
      {feedbackBlocks}
    </>
  )

  const historyPane = (
    <section className="reports-history reports-history--workspace">
      <div className="reports-history-head">
        <div>
          <p className="reports-history-sub">
            Retrouvez ici vos envois. Vous pouvez les re-télécharger si besoin.
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
            Actualiser la liste
          </LoadingButton>
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
          Aucun rapport pour l’instant. Commencez par l’onglet Ajouter.
        </p>
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
                </div>
              </article>
            )
          })}
        </div>
      )}
      {feedbackBlocks}
    </section>
  )

  let paneContent = uploadPane
  if (pane === 'download') paneContent = downloadPane
  if (pane === 'history') paneContent = historyPane

  return (
    <div className="app-shell">
      <Topbar activeView="reports" onNavigate={onNavigate} />
      <PageEnter>
        <main className="reports-layout reports-layout--workspace">
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

          <SectionWorkspace
            title="Relevés"
            subtitle={isAdmin ? 'Télécharger ou ajouter un fichier' : 'Envoyer et suivre vos relevés'}
            items={navItems}
            activeId={pane}
            onChange={(id) => {
              clearFeedback()
              setPane(id)
            }}
          >
            {paneContent}
          </SectionWorkspace>
        </main>
      </PageEnter>
    </div>
  )
}

export default ReportsPage
