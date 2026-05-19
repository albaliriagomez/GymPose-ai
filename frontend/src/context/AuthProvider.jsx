import { useState, useEffect, useCallback } from 'react'
import * as authService from '../services/authService'
import { AuthContext } from './authContext'

const withDefaultRole = (userData) => userData ? { ...userData, role: userData.role || 'user' } : null

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const savedToken = authService.getToken()
    const savedUser = authService.getUser()

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(withDefaultRole(savedUser))
    }

    setLoading(false)
  }, [])

  const register = useCallback(async (userData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authService.register(userData)
      setToken(response.access_token)
      setUser(withDefaultRole(response.user))
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authService.login(email, password)
      setToken(response.access_token)
      setUser(withDefaultRole(response.user))
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  const updateProfile = useCallback(async (updateData) => {
    if (!token) {
      throw new Error('No hay sesión activa')
    }

    setLoading(true)
    setError(null)

    try {
      const updatedUser = await authService.updateProfile(updateData, token)
      setUser(withDefaultRole(updatedUser))
      return updatedUser
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const refreshUser = useCallback(async () => {
    if (!token) {
      return
    }

    try {
      const updatedUser = await authService.fetchUserProfile(token)
      setUser(withDefaultRole(updatedUser))
    } catch (err) {
      setError(err.message)
      if (err.response?.status === 401) {
        logout()
      }
    }
  }, [token, logout])

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    register,
    login,
    logout,
    updateProfile,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
