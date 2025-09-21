import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { TraceabilityPage, SystemRequirementsPage, UserRequirementsPage } from './components/pages'
import { LoginPage } from './components/pages/LoginPage'
import { RegisterPage } from './components/pages/RegisterPage'
import { EmailVerificationPage } from './components/pages/EmailVerificationPage'
import { TestRunsPage } from './components/pages/TestRunsPage'
import { TestCasesPage } from './components/pages/TestCasesPage'
import { AuditPage } from './components/pages/AuditPage'
import { AuthGuard } from './components/auth/AuthGuard'
import axios from 'axios'
import './index.css'

// Set token from localStorage if it exists
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/" element={
          <AuthGuard>
            <TraceabilityPage />
          </AuthGuard>
        } />
        <Route path="/user-requirements" element={
          <AuthGuard>
            <UserRequirementsPage />
          </AuthGuard>
        } />
        <Route path="/user-requirements/:id" element={
          <AuthGuard>
            <UserRequirementsPage />
          </AuthGuard>
        } />
        <Route path="/system-requirements" element={
          <AuthGuard>
            <SystemRequirementsPage />
          </AuthGuard>
        } />
        <Route path="/system-requirements/:id" element={
          <AuthGuard>
            <SystemRequirementsPage />
          </AuthGuard>
        } />
        <Route path="/test-cases" element={
          <AuthGuard>
            <TestCasesPage />
          </AuthGuard>
        } />
        <Route path="/test-cases/:id" element={
          <AuthGuard>
            <TestCasesPage />
          </AuthGuard>
        } />
        <Route path="/test-runs" element={
          <AuthGuard>
            <TestRunsPage />
          </AuthGuard>
        } />
        <Route path="/test-runs/:runId" element={
          <AuthGuard>
            <TestRunsPage />
          </AuthGuard>
        } />
        <Route path="/audit" element={
          <AuthGuard>
            <AuditPage />
          </AuthGuard>
        } />
      </Routes>
    </Router>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)