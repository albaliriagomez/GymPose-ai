import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './index.css'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Training from './pages/Training'
import { Nutrition, Settings } from './pages/Placeholders'
import Posture from './pages/Posture'
import TrainingPlan from './pages/TrainingPlan'


import Notifications from './pages/Notifications'
import Profile from './pages/Profile'

const DEMO_USER = {
  name: 'Demo',
  email: 'demo@gympose.com',
}



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} /> 
          <Route path="/register"   element={<Register />} />
          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/training"   element={<ProtectedRoute><Training /></ProtectedRoute>} />
          <Route path="/posture"    element={<ProtectedRoute><Posture /></ProtectedRoute>} />
          <Route path="/nutrition"  element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
          <Route path="/plan" element={<TrainingPlan />} />
          <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*"           element={<Navigate to="/login" replace />} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
)
