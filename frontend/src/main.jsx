import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TrainerDashboard from './pages/TrainerDashboard'
import ClientNutrition from './pages/trainer/ClientNutrition'
import ClientTraining from './pages/trainer/ClientTraining'
import Progress from './pages/Progress'
import Training from './pages/Training'
import { Nutrition, Settings } from './pages/Placeholders'
import Posture from './pages/Posture'
import TrainingPlan from './pages/TrainingPlan'


import Notifications from './pages/Notifications'
import Profile from './pages/Profile'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} /> 
          <Route path="/register"   element={<Register />} />
          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/trainer/dashboard"  element={<ProtectedRoute allowedRoles={['trainer']}><TrainerDashboard /></ProtectedRoute>} />
          <Route path="/trainer/clients/:id/nutrition"  element={<ProtectedRoute allowedRoles={['trainer']}><ClientNutrition /></ProtectedRoute>} />
          <Route path="/trainer/clients/:id/training"  element={<ProtectedRoute allowedRoles={['trainer']}><ClientTraining /></ProtectedRoute>} />
          <Route path="/progress"    element={<ProtectedRoute><Progress /></ProtectedRoute>} />
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
