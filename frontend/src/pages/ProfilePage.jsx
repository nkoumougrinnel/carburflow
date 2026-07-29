import React, { useEffect, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { LoadingButton } from '../components/reports/ReportsUi.jsx'

const ROLE_LABELS = {
  admin: 'Responsable',
  operateur: 'Opérateur',
  user: 'Utilisateur',
}

function ProfilePage({ onNavigate }) {
  const { user, role, isAdmin, isOperator, updateProfile, changePassword } = useAuth()
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordErr, setPasswordErr] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (!user) return
    setProfileForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
    })
  }, [user])

  const homeView = isAdmin ? 'dashboard' : isOperator ? 'operator' : 'viewer'

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileMsg('')
    setProfileErr('')
    setSavingProfile(true)
    try {
      await updateProfile({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim(),
      })
      setProfileMsg('Profil mis à jour.')
    } catch (err) {
      setProfileErr(err.message || 'Impossible d’enregistrer le profil.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordMsg('')
    setPasswordErr('')
    if (passwordForm.new_password !== passwordForm.new_password_confirm) {
      setPasswordErr('Les nouveaux mots de passe ne correspondent pas.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(passwordForm)
      setPasswordForm({ current_password: '', new_password: '', new_password_confirm: '' })
      setPasswordMsg('Mot de passe mis à jour.')
    } catch (err) {
      setPasswordErr(err.message || 'Impossible de changer le mot de passe.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="app-shell">
      <Topbar activeView="profile" onNavigate={onNavigate} />
      <PageEnter>
        <main className="profile-layout">
          <WelcomeBanner
            title="Mon profil"
            subtitle="Gérez vos informations personnelles et la sécurité de votre compte."
          />

          <section className="profile-summary">
            <div>
              <div className="profile-summary-kicker">Compte</div>
              <h2>{user?.username}</h2>
              <p>{ROLE_LABELS[role] || 'Utilisateur'}</p>
            </div>
            <button type="button" className="reports-btn reports-btn--ghost" onClick={() => onNavigate(homeView)}>
              Retour à l’accueil
            </button>
          </section>

          <div className="profile-grid">
            <form className="profile-card" onSubmit={handleProfileSubmit}>
              <div className="profile-card-head">
                <h2>Informations</h2>
                <p>Nom, prénom et e-mail visibles dans l’application.</p>
              </div>

              <label className="profile-field">
                <span>Identifiant</span>
                <input type="text" value={user?.username || ''} disabled readOnly />
              </label>

              <div className="profile-row">
                <label className="profile-field">
                  <span>Prénom</span>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))}
                    autoComplete="given-name"
                  />
                </label>
                <label className="profile-field">
                  <span>Nom</span>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))}
                    autoComplete="family-name"
                  />
                </label>
              </div>

              <label className="profile-field">
                <span>E-mail</span>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  autoComplete="email"
                />
              </label>

              {profileMsg && <div className="reports-success" role="status">{profileMsg}</div>}
              {profileErr && <div className="reports-error" role="alert">{profileErr}</div>}

              <LoadingButton
                className="reports-btn--primary"
                loading={savingProfile}
                loadingText="Enregistrement…"
                type="submit"
              >
                Enregistrer le profil
              </LoadingButton>
            </form>

            <form className="profile-card" onSubmit={handlePasswordSubmit}>
              <div className="profile-card-head">
                <h2>Mot de passe</h2>
                <p>Changez votre mot de passe. Vous resterez connecté.</p>
              </div>

              <label className="profile-field">
                <span>Mot de passe actuel</span>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="profile-field">
                <span>Nouveau mot de passe</span>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </label>
              <label className="profile-field">
                <span>Confirmer le nouveau mot de passe</span>
                <input
                  type="password"
                  value={passwordForm.new_password_confirm}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, new_password_confirm: e.target.value }))}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </label>

              {passwordMsg && <div className="reports-success" role="status">{passwordMsg}</div>}
              {passwordErr && <div className="reports-error" role="alert">{passwordErr}</div>}

              <LoadingButton
                className="reports-btn--primary"
                loading={savingPassword}
                loadingText="Mise à jour…"
                type="submit"
              >
                Changer le mot de passe
              </LoadingButton>
            </form>
          </div>
        </main>
      </PageEnter>
    </div>
  )
}

export default ProfilePage
