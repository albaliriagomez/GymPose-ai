import { createContext, useContext, useState, useEffect } from 'react'
import { getUser, isAuthenticated, logout } from '../services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated()) setUser(getUser())
    setLoading(false)
  }, [])

  const signIn  = (u) => setUser(u)
  const signOut = () => { logout(); setUser(null) }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)