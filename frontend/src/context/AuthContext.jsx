import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  loginRequest,
  logoutRequest,
  meRequest,
  persistAuth,
  registerRequest,
  updateProfileRequest,
  changePasswordRequest,
} from '../auth.js'

const AuthContext = createContext(null)

function resolveRole(user) {
  if (!user) return null
  if (user.role === 'admin' || user.is_staff || user.is_superuser) return 'admin'
  if (user.role === 'operateur') return 'operateur'
  return 'user'
}

export function homeViewForUser(userOrFlags) {
  if (!userOrFlags) return 'login'
  const role = userOrFlags.role
    || (userOrFlags.isAdmin && 'admin')
    || (userOrFlags.isOperator && 'operateur')
    || (userOrFlags.isViewer && 'user')
    || null
  if (role === 'admin' || userOrFlags.is_staff) return 'dashboard'
  if (role === 'operateur') return 'operator'
  return 'viewer'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [token, setToken] = useState(() => getStoredToken())
  const [loading, setLoading] = useState(Boolean(getStoredToken()))

  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      if (!getStoredToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await meRequest()
        if (!cancelled) {
          setUser(me)
          persistAuth(getStoredToken(), me)
        }
      } catch {
        if (!cancelled) {
          clearAuth()
          setUser(null)
          setToken(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    hydrate()
    return () => { cancelled = true }
  }, [])

  const applyAuth = useCallback((payload) => {
    persistAuth(payload.token, payload.user)
    setToken(payload.token)
    setUser(payload.user)
  }, [])

  const login = useCallback(async (username, password) => {
    const payload = await loginRequest(username, password)
    applyAuth(payload)
    return payload.user
  }, [applyAuth])

  const register = useCallback(async (form) => {
    const payload = await registerRequest(form)
    applyAuth(payload)
    return payload.user
  }, [applyAuth])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
    setToken(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await meRequest()
    setUser(me)
    persistAuth(getStoredToken(), me)
    return me
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const me = await updateProfileRequest(payload)
    setUser(me)
    persistAuth(getStoredToken(), me)
    return me
  }, [])

  const changePassword = useCallback(async (payload) => {
    const result = await changePasswordRequest(payload)
    if (result.token) {
      persistAuth(result.token, result.user)
      setToken(result.token)
      setUser(result.user)
    }
    return result
  }, [])

  const isAuthenticated = Boolean(user && token)
  const role = resolveRole(user)
  const isAdmin = role === 'admin'
  const isOperator = role === 'operateur'
  const isViewer = role === 'user'
  const canUploadReports = isAdmin || isOperator

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated,
    role,
    isAdmin,
    isOperator,
    isViewer,
    canUploadReports,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    changePassword,
  }), [
    user, token, loading, isAuthenticated, role, isAdmin, isOperator, isViewer,
    canUploadReports, login, register, logout, refreshUser, updateProfile, changePassword,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
