import React, { useEffect, useMemo, useState } from 'react'
import { UserRound, Users } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import SectionWorkspace from '../components/SectionWorkspace.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import AdminProfilesManager from '../components/AdminProfilesManager.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { LoadingButton } from '../components/reports/ReportsUi.jsx'

const ROLE_LABELS = {
  admin: 'Responsable',
  operateur: 'Opérateur',
  user: 'Utilisateur',
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

  const navItems = useMemo(() => {
    const items = [
      {
        id: 'me',
        label: 'Mon profil',
        description: 'Infos personnelles et mot de passe',
        icon: UserRound,
      },
    ]
    if (isAdmin) {
      items.push({
        id: 'manage',
        label: 'Gestionnaire des profils',
        description: 'Élire admins et agents',
        icon: Users,
      })
    }
    return items
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin && pane === 'manage') setPane('me')
  }, [isAdmin, pane])

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
    <>
      <section className="profile-summary profile-summary--workspace">
        <div>
          <div className="profile-summary-kicker">Compte connecté</div>
          <h2>
            {[user?.first_name, user?.last_name].filter(Boolean).join(' ')
              || user?.username
              || user?.email
              || 'Compte'}
          </h2>
          <p>{ROLE_LABELS[role] || 'Utilisateur'}</p>
        </div>
      </section>

      <div className="profile-grid">
        <form className="profile-card" onSubmit={handleProfileSubmit}>
          <div className="profile-card-head">
            <h2>Informations</h2>
            <p>L’e-mail est l’identifiant du compte ; le reste est modifiable.</p>
          </div>

          <label className="profile-field">
            <span>Identifiant (e-mail)</span>
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
    </>
  )

  const content = isAdmin ? (
    <SectionWorkspace
      title="Navigation"
      items={navItems}
      activeId={pane}
      onChange={setPane}
    >
      {pane === 'manage' ? <AdminProfilesManager /> : mePane}
    </SectionWorkspace>
  ) : (
    <div className="profile-solo">
      {mePane}
    </div>
  )

  return (
    <div className="app-shell">
      <Topbar activeView="profile" onNavigate={onNavigate} />
      <PageEnter>
        <main className="profile-layout">
          <WelcomeBanner
            kicker="Identité & accès"
            title="Comptes"
            subtitle={
              isAdmin
                ? 'Votre profil et la gestion des rôles de l’équipe.'
                : 'Gérez vos informations personnelles et la sécurité du compte.'
            }
          />
          {content}
        </main>
      </PageEnter>
    </div>
  )
}

export default ProfilePage
