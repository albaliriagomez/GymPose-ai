import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gym-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gym-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gym-text">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
