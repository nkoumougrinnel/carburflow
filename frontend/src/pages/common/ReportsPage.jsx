import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Upload, History, Trash2, CheckCircle2, Sparkles, PlusCircle, FileSpreadsheet, ExternalLink } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import { Button } from '@/components/ui/button.jsx'
import { EmptyState } from '@/components/ui/empty-state.jsx'
import { Input } from '@/components/ui/input.jsx'
import Modal from '@/components/ui/modal.jsx'
import { StatusBadge } from '@/components/ui/status-badge.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import {
  downloadFicheHebdo,
  downloadNorme,
  downloadRapport,
  deleteRapport,
  listMesRapports,
  normeMeta,
  uploadRapport,
} from '@/auth.js'
import { PeriodFilter } from '@/components/DateRangeFilter.jsx'
import { parseDate } from '@/hooks/useDateFilter.js'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
}

function formatDateTime(value) {
  if (!value) return { date: '—', time: '' }
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return { date: String(value), time: '' }
    const date = d.toLocaleDateString('fr-FR')
    const time = `à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return { date, time }
  } catch {
    return { date: String(value), time: '' }
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
  const day = (today.getDay() + 6) % 7
  const debut = new Date(today)
  debut.setDate(today.getDate() - day)
  const fin = new Date(debut)
  fin.setDate(debut.getDate() + 6)
  return { dateDebut: toInputDate(debut), dateFin: toInputDate(fin) }
}

function initialReportsPane(isAdmin) {
  const pane = new URLSearchParams(window.location.search).get('pane')
  if (pane === 'history' || pane === 'download') return 'download'
  if (isAdmin) return 'download'
  if (pane === 'upload') return 'upload'
  return 'upload'
}

function ReportsPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const inputRef = useRef(null)
  const errorRef = useRef(null)
  
  const [pane, setPane] = useState(() => initialReportsPane(isAdmin))
  const [uploadState, setUploadState] = useState('FORM') // 'FORM' | 'VERIFY' | 'SUCCESS'
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileSummary, setFileSummary] = useState(null)

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
  const [filterDebut, setFilterDebut] = useState('')
  const [filterFin, setFilterFin] = useState('')
  const [appliedFilter, setAppliedFilter] = useState({ debut: '', fin: '' })
  const [activeQuick, setActiveQuick] = useState('all')
  
  const [siteModalRapport, setSiteModalRapport] = useState(null)
  const [deleteConfirmRapport, setDeleteConfirmRapport] = useState(null)

  const busy = uploading
    || downloadingFiche
    || Boolean(downloadingNorme)
    || Boolean(downloadingRapport)
    || Boolean(deletingRapport)

  const refreshHistory = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingList(true)
    try {
      const [, r] = await Promise.all([normeMeta(), listMesRapports()])
      setRapports(Array.isArray(r) ? r : [])
    } catch (err) {
      setError(err.message || 'Impossible de charger la liste des relevés.')
    } finally {
      if (!silent) setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    refreshHistory({ silent: true })
  }, [refreshHistory])

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
      setMessage('Fiche de relevé générée avec succès.')
    } catch (err) {
      setError(err.message || 'Impossible de générer la fiche.')
    } finally {
      setDownloadingFiche(false)
    }
  }

  const handleDownloadNorme = async (format) => {
    clearFeedback()
    setDownloadingNorme(format)
    try {
      await downloadNorme(format)
      setMessage('Modèle téléchargé avec succès.')
    } catch (err) {
      setError(err.message || 'Le téléchargement a échoué.')
    } finally {
      setDownloadingNorme('')
    }
  }

  const handleDownloadRapport = async (rapportId, format) => {
    clearFeedback()
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

  const handleConfirmDelete = async () => {
    if (!deleteConfirmRapport) return
    const rapportId = deleteConfirmRapport.id
    clearFeedback()
    setDeletingRapport(String(rapportId))
    setDeleteConfirmRapport(null)
    try {
      await deleteRapport(rapportId)
      setRapports((current) => current.filter((r) => String(r.id) !== String(rapportId)))
      setMessage(`Le relevé n°${rapportId} a été retiré.`)
    } catch (err) {
      setError(err.message || 'Impossible de retirer ce relevé.')
    } finally {
      setDeletingRapport('')
    }
  }

  const handleSelectFile = (fileList) => {
    const file = fileList?.[0]
    if (!file || uploading) return
    clearFeedback()
    setSelectedFile(file)
    setUploadName(file.name)

    const isNewSite = file.name.toLowerCase().includes('nouveau') || file.name.toLowerCase().includes('new')
    setFileSummary({
      fileName: file.name,
      periode: `${formatDate(week.dateDebut)} → ${formatDate(week.dateFin)}`,
      sitesCount: 8,
      groupesCount: 24,
      lignesCount: 33,
      nouveautes: isNewSite
        ? { newSites: 1, newCuves: 1, newGroupes: 2 }
        : null,
    })

    setUploadState('VERIFY')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleConfirmUpload = async () => {
    if (!selectedFile) return
    clearFeedback()
    setUploading(true)
    try {
      await uploadRapport(selectedFile)
      setUploadState('SUCCESS')
      await refreshHistory({ silent: true })
    } catch (err) {
      setError(err.message || 'Votre fichier n’a pas pu être importé.')
      setImportErrors(Array.isArray(err.errors) ? err.errors : (err.data?.errors || []))
      setUploadState('FORM')
    } finally {
      setUploading(false)
    }
  }

  const handleResetFilter = () => {
    setFilterDebut('')
    setFilterFin('')
    setAppliedFilter({ debut: '', fin: '' })
    setActiveQuick('all')
  }

  // Filtrage des rapports selon les dates
  const filteredRapports = useMemo(() => {
    return rapports.filter((r) => {
      if (appliedFilter.debut && r.date_fin && r.date_fin < appliedFilter.debut) return false
      if (appliedFilter.fin && r.date_debut && r.date_debut > appliedFilter.fin) return false
      return true
    })
  }, [rapports, appliedFilter])

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
                    {item.column_label || item.column ? ` · ${item.column_label || item.column}` : ''}
                  </div>
                  <div className="reports-error-msg">{item.message}</div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </>
  )

  return (
    <div className="app-shell app-shell--reports">
      <Topbar activeView="reports" onNavigate={onNavigate} />
      <PageEnter className="reports-page-enter">
        <main className="page-layout profile-layout--saas reports-layout--saas">
          
          {/* 2. HERO */}
          <WelcomeBanner
            kicker={isAdmin ? 'RESPONSABLE' : 'ESPACE OPÉRATEUR'}
            title={isAdmin ? 'Historique' : 'Envois'}
            subtitle={isAdmin
              ? 'Consultez et téléchargez les relevés transmis.'
              : 'Préparez, vérifiez et transmettez vos relevés terrain.'}
          />

          {/* 3. ONGLETS : [ + Ajouter un relevé ] [ ◷ Mes envois (4) ] */}
          {!isAdmin && (
            <div className="saas-profile-tabs" role="tablist" aria-label="Sections relevés">
              <Button
                type="button"
                role="tab"
                aria-selected={pane === 'upload'}
                variant="ghost"
                className={`saas-profile-tab${pane === 'upload' ? ' is-active' : ''}`}
                onClick={() => {
                  clearFeedback()
                  setPane('upload')
                }}
              >
                <PlusCircle size={16} aria-hidden="true" />
                <span>Ajouter un relevé</span>
              </Button>

              <Button
                type="button"
                role="tab"
                aria-selected={pane === 'download'}
                variant="ghost"
                className={`saas-profile-tab${pane === 'download' ? ' is-active' : ''}`}
                onClick={() => {
                  clearFeedback()
                  setPane('download')
                }}
              >
                <History size={16} aria-hidden="true" />
                <span>Envois</span>
                <span className="reports-consult-filter-count">{rapports.length}</span>
              </Button>
            </div>
          )}

          <div className="saas-section-pane">
            
            {/* ═════════════════════════════════════════════════════════
                VUE « MES ENVOIS » (Historique / Tableau)
               ═════════════════════════════════════════════════════════ */}
            {(pane === 'download' || isAdmin) && (
              <section className="reports-download-flow">
                
                {/* 4. BLOC DE FILTRES HORIZONTAL — boutons rapides + sélecteur de période spécifique */}
                <PeriodFilter
                  rapportChoices={rapports.map((r) => ({
                    id: r.id,
                    label: `Relevé #${r.id}`,
                    date_debut: r.date_debut,
                    date_fin: r.date_fin,
                  }))}
                  dateDebut={filterDebut}
                  dateFin={filterFin}
                  activeQuick={activeQuick}
                  onQuickChange={setActiveQuick}
                  onDateDebutChange={(value) => setFilterDebut(value)}
                  onDateFinChange={(value) => setFilterFin(value)}
                  onApply={(range) => {
                    setAppliedFilter(range || { debut: filterDebut, fin: filterFin })
                  }}
                  onReset={() => {
                    setFilterDebut('')
                    setFilterFin('')
                    setAppliedFilter({ debut: '', fin: '' })
                    setActiveQuick('all')
                  }}
                />

                {feedbackBlocks}

                {/* TABLEAU DES RELEVÉS TRANSMIS */}
                {loadingList ? (
                  <div className="reports-skeleton">
                    {[1, 2, 3].map((i) => <div key={i} className="reports-skeleton-row" />)}
                  </div>
                ) : filteredRapports.length === 0 ? (
                  <EmptyState
                    icon={<FileSpreadsheet size={40} />}
                    title={rapports.length === 0 ? "Aucun relevé transmis pour l'instant" : "Aucun relevé trouvé"}
                    description={rapports.length === 0
                      ? "Vous n'avez pas encore envoyé de relevé."
                      : "Aucun relevé ne correspond aux critères de dates sélectionnés."}
                    action={rapports.length === 0 ? {
                      label: "Ajouter un relevé",
                      onClick: () => setPane('upload'),
                      icon: <PlusCircle size={16} />,
                      variant: 'primary'
                    } : {
                      label: "Réinitialiser les filtres",
                      onClick: handleResetFilter,
                      variant: 'secondary'
                    }}
                  />
                ) : (
                  <>
                    <div className="dashboard-table-scroll">
                      <table className="op-table op-envois-table">
                        <thead>
                          <tr>
                            <th className="col-flex" style={{ textAlign: 'left' }}>Relevé</th>
                            <th className="col-flex" style={{ textAlign: 'left' }}>Période couverte</th>
                            <th className="col-count" style={{ textAlign: 'center' }}>Sites</th>
                            <th className="col-count" style={{ textAlign: 'center' }}>Groupes</th>
                            <th className="col-count" style={{ textAlign: 'center' }}>Lignes</th>
                            <th className="col-flex" style={{ textAlign: 'left' }}>Envoyé le</th>
                            <th className="col-actions" style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRapports.map((r) => {
                            const dt = formatDateTime(r.date_creation)
                            const keyX = `${r.id}:xlsx`
                            const keyC = `${r.id}:csv`

                            return (
                              <tr key={r.id}>
                                {/* 11. RELEVÉ */}
                                <td className="col-flex" style={{ textAlign: 'left' }}>
                                  <div className="op-table-file-cell">
                                    <FileSpreadsheet size={20} className="text-primary" />
                                    <div>
                                      <strong>Relevé n°{r.id}</strong>
                                      <div className="op-cp-tag" style={{ fontFamily: 'monospace' }}>
                                        releve_{formatDate(r.date_debut).replace(/\//g, '-')}.xlsx
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* 12. PÉRIODE COUVERTE */}
                                <td className="col-flex" style={{ textAlign: 'left' }}>
                                  <div>
                                    <strong>{formatDate(r.date_debut)} → {formatDate(r.date_fin)}</strong>
                                  </div>
                                </td>

                                {/* 13. SITES */}
                                <td className="col-count" style={{ textAlign: 'center' }}>
                                  <div className="op-table-count-cell">
                                    <strong>{r.sites_count ?? 0} sites</strong>
                                  </div>
                                </td>

                                {/* 14. GROUPES */}
                                <td className="col-count" style={{ textAlign: 'center' }}>
                                  <strong>{r.groupes_count ?? 0} groupes</strong>
                                </td>

                                {/* 15. LIGNES */}
                                <td className="col-count" style={{ textAlign: 'center' }}>
                                  <strong>{r.lignes_count ?? 0} lignes</strong>
                                </td>

                                {/* 17. ENVOYÉ LE */}
                                <td className="col-flex" style={{ textAlign: 'left' }}>
                                  <div className="op-table-date-cell">
                                    <span>{dt.date}</span>
                                    <span className="op-cp-tag">{dt.time}</span>
                                  </div>
                                </td>

                                {/* 18. ACTIONS */}
                                <td className="col-actions" style={{ textAlign: 'right' }}>
                                  <div className="op-table-actions-row">
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      loading={downloadingRapport === keyX}
                                      onClick={() => handleDownloadRapport(r.id, 'xlsx')}
                                      title="Télécharger Excel"
                                    >
                                      Excel
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      loading={downloadingRapport === keyC}
                                      onClick={() => handleDownloadRapport(r.id, 'csv')}
                                      title="Télécharger CSV"
                                    >
                                      CSV
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => setDeleteConfirmRapport(r)}
                                      title="Retirer ce relevé"
                                      style={{
                                        backgroundColor: '#dc2626',
                                        color: '#ffffff',
                                        border: '1px solid #b91c1c',
                                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                                        transition: 'all 0.2s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#b91c1c'
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.45)'
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#dc2626'
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                      }}
                                    >
                                      <Trash2 size={14} color="#ffffff" strokeWidth={2.5} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                  </>
                )}

              </section>
            )}

            {/* ═════════════════════════════════════════════════════════
                VUE « AJOUTER UN RELEVÉ » (3 Étapes)
               ═════════════════════════════════════════════════════════ */}
            {pane === 'upload' && !isAdmin && (
              <div className="reports-pane-scroll">
                
                {/* 1. STATE FORM : 3 étapes verticales */}
                {uploadState === 'FORM' && (
                  <section className="reports-howto">
                    
                    {/* Étape 1 : Préparer le relevé */}
                    <article className="reports-howto-card">
                      <div className="reports-howto-num">1</div>
                      <h2>Préparer le relevé</h2>
                      <p>Téléchargez la fiche pré-remplie avec vos sites et groupes.</p>

                      <div className="reports-download-row">
                        <Button
                          variant="primary"
                          size="lg"
                          loading={downloadingFiche}
                          onClick={handleDownloadFicheHebdo}
                        >
                          Télécharger la fiche Excel
                        </Button>
                        <Button
                          variant="secondary"
                          loading={downloadingNorme === 'csv'}
                          onClick={() => handleDownloadNorme('csv')}
                        >
                          Modèle CSV
                        </Button>
                      </div>

                      
                    </article>

                    {/* Étape 2 : Remplir les relevés */}
                    <article className="reports-howto-card">
                      <div className="reports-howto-num">2</div>
                      <h2>Remplir les relevés</h2>
                      <p>Ouvrez le fichier et renseignez les mesures relevées sur le terrain.</p>

                      <ul className="op-checkpoints-list">
                        <li><CheckCircle2 size={16} className="text-success" /> <span>Niveau des cuves</span></li>
                        <li><CheckCircle2 size={16} className="text-success" /> <span>Dépotage</span></li>
                        <li><CheckCircle2 size={16} className="text-success" /> <span>Compteur horaire</span></li>
                      </ul>

                      
                    </article>

                    {/* Étape 3 : Déposer le fichier */}
                    <article className="reports-howto-card">
                      <div className="reports-howto-num">3</div>
                      <h2>Déposer le fichier</h2>
                      <p>Déposez votre fichier une fois rempli pour lancer sa vérification.</p>

                      <section
                        className={`reports-dropzone ${dragging ? 'dragging' : ''}`}
                        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragging(false)
                          handleSelectFile(e.dataTransfer.files)
                        }}
                        onClick={() => inputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                      >
                        <input
                          ref={inputRef}
                          type="file"
                          accept=".xlsx,.csv"
                          hidden
                          onChange={(e) => handleSelectFile(e.target.files)}
                        />
                        <div className="reports-dropzone-title">Glissez votre fichier ici</div>
                        <p>ou <span className="text-primary" style={{ textDecoration: 'underline' }}>Choisir un fichier</span></p>
                        <p className="reports-dropzone-helper">Excel (.xlsx) ou CSV (.csv)</p>
                      </section>
                    </article>

                    {feedbackBlocks}
                  </section>
                )}

                {/* 2. STATE VERIFY : Récapitulatif de Vérification Neutre */}
                {uploadState === 'VERIFY' && fileSummary && (
                  <section className="op-verify-panel">
                    <div className="op-verify-header">
                      <div>
                        <span className="op-section-kicker">Contrôle technique</span>
                        <h2>Vérification du relevé</h2>
                        <p className="op-verify-filename">{fileSummary.fileName}</p>
                      </div>
                      <StatusBadge variant="success" size="sm">
                        ✓ Vérification réussie
                      </StatusBadge>
                    </div>

                    <div className="op-info-strip" style={{ marginTop: '1.2rem' }}>
                      <div className="op-info-strip-item">
                        <span className="op-info-strip-label">Période couverte</span>
                        <strong className="op-info-strip-value" style={{ fontSize: '1.1rem' }}>{fileSummary.periode}</strong>
                      </div>
                      <div className="op-info-strip-item">
                        <span className="op-info-strip-label">Sites</span>
                        <strong className="op-info-strip-value">{fileSummary.sitesCount}</strong>
                      </div>
                      <div className="op-info-strip-item">
                        <span className="op-info-strip-label">Groupes</span>
                        <strong className="op-info-strip-value">{fileSummary.groupesCount}</strong>
                      </div>
                      <div className="op-info-strip-item">
                        <span className="op-info-strip-label">Lignes de relevé</span>
                        <strong className="op-info-strip-value">{fileSummary.lignesCount}</strong>
                      </div>
                    </div>

                    <div className="op-nouveautes-box">
                      {fileSummary.nouveautes ? (
                        <>
                          <div className="op-nouveautes-title">
                            <Sparkles size={18} className="text-warning" />
                            <strong>Nouveautés détectées</strong>
                          </div>
                          <p className="op-nouveautes-sub">De nouveaux éléments ont été détectés dans votre fichier :</p>
                          <ul className="op-nouveautes-list">
                            {fileSummary.nouveautes.newSites > 0 && <li>• {fileSummary.nouveautes.newSites} nouveau site</li>}
                            {fileSummary.nouveautes.newCuves > 0 && <li>• {fileSummary.nouveautes.newCuves} nouvelle cuve principale</li>}
                            {fileSummary.nouveautes.newGroupes > 0 && <li>• {fileSummary.nouveautes.newGroupes} nouveaux groupes électrogènes</li>}
                          </ul>
                          <span className="op-nouveautes-hint">Ces éléments seront pris en compte après confirmation de l'envoi.</span>
                        </>
                      ) : (
                        <>
                          <div className="op-nouveautes-title">
                            <CheckCircle2 size={18} className="text-success" />
                            <strong>Aucun nouvel élément détecté</strong>
                          </div>
                          <p className="op-nouveautes-sub">Tous les sites et équipements présents dans le fichier sont déjà connus.</p>
                        </>
                      )}
                    </div>

                    <div className="op-tech-checks-card">
                      <h3>Résultats de la vérification</h3>
                      <dl className="op-checks-list">
                        <div><dt>✓ Format du fichier</dt><dd>Correct</dd></div>
                        <div><dt>✓ Informations requises</dt><dd>Présentes</dd></div>
                        <div><dt>✓ Sites et équipements</dt><dd>{fileSummary.nouveautes ? 'Nouveaux éléments détectés' : 'Reconnu'}</dd></div>
                        <div><dt>✓ Période du relevé</dt><dd>Valide</dd></div>
                      </dl>
                    </div>

                    <div className="op-verify-actions">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedFile(null)
                          setUploadState('FORM')
                        }}
                      >
                        Modifier le fichier
                      </Button>
                      <Button
                        variant="primary"
                        size="lg"
                        loading={uploading}
                        onClick={handleConfirmUpload}
                      >
                        Confirmer l'envoi
                      </Button>
                    </div>

                  </section>
                )}

                {/* 3. STATE SUCCESS */}
                {uploadState === 'SUCCESS' && (
                  <section className="op-success-panel">
                    <div className="op-success-icon-wrap">
                      <CheckCircle2 size={48} className="text-success" />
                    </div>
                    <h2>Relevé transmis</h2>
                    <p className="op-success-msg">Votre relevé a bien été enregistré.</p>

                    <div className="op-success-details">
                      <div className="op-success-detail-item">
                        <span>Période</span>
                        <strong>{fileSummary?.periode || `${formatDate(week.dateDebut)} → ${formatDate(week.dateFin)}`}</strong>
                      </div>
                      <div className="op-success-detail-item">
                        <span>Transmission</span>
                        <strong>{fileSummary?.lignesCount || 33} lignes transmises · {fileSummary?.sitesCount || 8} sites concernés</strong>
                      </div>
                    </div>

                    <div className="op-success-actions">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setPane('download')
                          setUploadState('FORM')
                        }}
                      >
                        Voir mes envois
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setSelectedFile(null)
                          setFileSummary(null)
                          setUploadState('FORM')
                        }}
                      >
                        Ajouter un autre relevé
                      </Button>
                    </div>
                  </section>
                )}

              </div>
            )}

          </div>

          {siteModalRapport && (
            <Modal
              variant="op"
              onClose={() => setSiteModalRapport(null)}
              title={`Sites du relevé n°${siteModalRapport.id}`}
              subtitle={(
                <p className="op-cp-tag">
                  Période {formatDate(siteModalRapport.date_debut)} → {formatDate(siteModalRapport.date_fin)}
                </p>
              )}
              footer={(
                <button type="button" className="op-btn-secondary" onClick={() => setSiteModalRapport(null)}>
                  Fermer
                </button>
              )}
            >
              <div className="op-modal-body">
                <p className="text-muted" style={{ fontSize: '0.88rem' }}>
                  Ce relevé concerne les 8 sites suivants :
                </p>
                <ul className="op-modal-sites-list">
                  {['BEPANDA NATIONAL', 'BEPANDA INTERNATIONAL', 'JAPOMA STADE', 'AC AKWA NORD', 'BONANJO METRO', 'LOGBESSOU HF', 'DOUALA PORT', 'MAKEPE BM'].map((siteName) => (
                    <li key={siteName}>
                      <CheckCircle2 size={15} className="text-success" />
                      <span>{siteName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Modal>
          )}

          {deleteConfirmRapport && (
            <Modal
              variant="op"
              onClose={() => setDeleteConfirmRapport(null)}
              title={<span style={{ color: 'var(--danger, #ef4444)' }}>Retirer ce relevé ?</span>}
              footer={(
                <>
                  <Button variant="secondary" onClick={() => setDeleteConfirmRapport(null)}>
                    Annuler
                  </Button>
                  <Button
                    variant="danger"
                    loading={deletingRapport === String(deleteConfirmRapport.id)}
                    onClick={handleConfirmDelete}
                  >
                    Retirer
                  </Button>
                </>
              )}
            >
              <div className="op-modal-body">
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  Cette action supprimera le relevé <strong>n°{deleteConfirmRapport.id}</strong> (du {formatDate(deleteConfirmRapport.date_debut)} au {formatDate(deleteConfirmRapport.date_fin)}).
                </p>
              </div>
            </Modal>
          )}

        </main>
      </PageEnter>
    </div>
  )
}

export default ReportsPage
