import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { supabase } from './lib/supabase'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

import Login from './pages/auth/Login'
import AdminLayout from './components/AdminLayout'
import IssuerLayout from './components/IssuerLayout'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminStudents from './pages/admin/Students'
import AdminBooks from './pages/admin/Books'
import AdminBundles from './pages/admin/Bundles'
import AdminIssuances from './pages/admin/Issuances'
import AdminSales from './pages/admin/Sales'
import AdminAllotments from './pages/admin/Allotments'
import AdminInventory from './pages/admin/Inventory'
import AdminUsers from './pages/admin/Users'
import AdminReports from './pages/admin/Reports'
import AdminAuditLog from './pages/admin/AuditLog'
import AdminBatches from './pages/admin/Batches'
import AdminCourses from './pages/admin/Courses'
import StudentDetail from './pages/admin/StudentDetail'
import AdminIssue from './pages/admin/Issue'

// Issuer pages
import IssuerDashboard from './pages/issuer/Dashboard'
import IssuerStudents from './pages/issuer/Students'
import IssuerIssue from './pages/issuer/Issue'
import IssuerSales from './pages/issuer/Sales'
import IssuerStudentDetail from './pages/issuer/StudentDetail'

function ProtectedAdmin({ children }) {
  const { user, isAdmin } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/issuer" replace />
  return children
}

function ProtectedIssuer({ children }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function SessionGuard() {
  const { user, logout, loginAt } = useAuthStore()

  useEffect(() => {
    // Auto-logout if 30 days have passed since login
    if (loginAt && Date.now() - loginAt > THIRTY_DAYS_MS) {
      logout()
      return
    }

    // Sync Zustand with actual Supabase session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && user) logout()
    })

    // Listen for Supabase auth events (token refresh failure, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') && !session && user) {
        logout()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionGuard />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e1e35',
            color: '#f1f1f1',
            border: '1px solid #2a2a45',
            fontFamily: 'Outfit, sans-serif'
          }
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="books" element={<AdminBooks />} />
          <Route path="bundles" element={<AdminBundles />} />
          <Route path="issuances" element={<AdminIssuances />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="allotments" element={<AdminAllotments />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="audit" element={<AdminAuditLog />} />
          <Route path="batches" element={<AdminBatches />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="issue" element={<AdminIssue />} />
          <Route path="students/:id" element={<StudentDetail />} />
        </Route>

        {/* Issuer routes */}
        <Route path="/issuer" element={<ProtectedIssuer><IssuerLayout /></ProtectedIssuer>}>
          <Route index element={<IssuerDashboard />} />
          <Route path="students" element={<IssuerStudents />} />
          <Route path="issue" element={<IssuerIssue />} />
          <Route path="sales" element={<IssuerSales />} />
          <Route path="students/:id" element={<IssuerStudentDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}