import React, { useEffect, useMemo, useState } from 'react'
import { KeyRound, UserRound, Users } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import AdminProfilesManager from '../components/AdminProfilesManager.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { LoadingButton } from '../components/reports/ReportsUi.jsx'

const ROLE_LABELS = {
  admin: 'Responsable',
  operateur: 'Opérateur',
  user: 'Consultation',
}

function initialsFromUser(user) {
  const first = (user?.first_name || '').trim()
  const last = (user?.last_name || '').trim()
  if (first || last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'CF'
  const base = (user?.username || user?.email || 'CF').trim()
  return base.slice(0, 2).toUpperCase()
}

function ProfilePage({ onNavigate }) {
  const { user, role, isAdmin, updateProfile, changePassword } = useAuth()
  const [pane, setPane] = useState('me')
  const [profileForm, setProfileForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
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
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
    })
  }, [user])

  useEffect(() => {
    if (!isAdmin && pane === 'manage') setPane('me')
  }, [isAdmin, pane])

  const displayName = useMemo(() => (
    [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || user?.username
    || user?.email
    || 'Compte'
  ), [user])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileMsg('')
    setProfileErr('')
    setSavingProfile(true)
    try {
      await updateProfile({
        username: profileForm.username.trim(),
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
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

  const mePane = (
    <div className="saas-profile">
      <header className="saas-profile-hero">
        <div className="saas-profile-avatar" aria-hidden="true">{initialsFromUser(user)}</div>
        <div className="saas-profile-hero-copy">
          <h2>{displayName}</h2>
          <p>{user?.email || '—'}</p>
          <span className={`saas-profile-role saas-profile-role--${role || 'user'}`}>
            {ROLE_LABELS[role] || 'Consultation'}
          </span>
        </div>
      </header>

      <div className="saas-profile-grid">
        <form className="saas-profile-panel" onSubmit={handleProfileSubmit}>
          <div className="saas-profile-panel-head">
            <UserRound size={18} aria-hidden="true" />
            <div>
              <h3>Informations du compte</h3>
              <p>Nom affiché et identifiant de connexion.</p>
            </div>
          </div>

          <label className="profile-field">
            <span>E-mail</span>
            <input type="email" value={user?.email || ''} disabled readOnly />
          </label>

          <label className="profile-field">
            <span>Nom d’utilisateur</span>
            <input
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
              autoComplete="username"
              required
            />
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

          {profileMsg && <div className="reports-success" role="status">{profileMsg}</div>}
          {profileErr && <div className="reports-error" role="alert">{profileErr}</div>}

          <LoadingButton
            className="reports-btn--primary"
            loading={savingProfile}
            loadingText="Enregistrement…"
            type="submit"
          >
            Enregistrer
          </LoadingButton>
        </form>

        <form className="saas-profile-panel" onSubmit={handlePasswordSubmit}>
          <div className="saas-profile-panel-head">
            <KeyRound size={18} aria-hidden="true" />
            <div>
              <h3>Sécurité</h3>
              <p>Changez votre mot de passe. Vous restez connecté.</p>
            </div>
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
            <small className="profile-field-hint">Minimum 6 caractères.</small>
          </label>
          <label className="profile-field">
            <span>Confirmer</span>
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
            Mettre à jour le mot de passe
          </LoadingButton>
        </form>
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <Topbar activeView="profile" onNavigate={onNavigate} />
      <PageEnter>
        <main className="profile-layout profile-layout--saas">
          <WelcomeBanner
            kicker="Identité & accès"
            title={isAdmin ? 'Comptes' : 'Mon profil'}
            subtitle={
              isAdmin
                ? 'Votre profil et les accès de l’équipe.'
                : 'Informations personnelles et sécurité du compte.'
            }
          />

          {isAdmin ? (
            <div className="saas-profile-tabs" role="tablist" aria-label="Sections comptes">
              <button
                type="button"
                role="tab"
                aria-selected={pane === 'me'}
                className={`saas-profile-tab${pane === 'me' ? ' is-active' : ''}`}
                onClick={() => setPane('me')}
              >
                <UserRound size={16} aria-hidden="true" />
                Mon profil
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pane === 'manage'}
                className={`saas-profile-tab${pane === 'manage' ? ' is-active' : ''}`}
                onClick={() => setPane('manage')}
              >
                <Users size={16} aria-hidden="true" />
                Équipe & rôles
              </button>
            </div>
          ) : null}

          {pane === 'manage' && isAdmin ? <AdminProfilesManager /> : mePane}
        </main>
      </PageEnter>
    </div>
  )
}

export default ProfilePage
