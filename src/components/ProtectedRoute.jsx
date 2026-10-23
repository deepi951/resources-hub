import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="empty-state">Loading...</div>
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (userProfile?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (userProfile?.status === 'blocked') {
    return <Navigate to="/login" replace state={{ error: 'This student account has been blocked. Please contact the admin team.' }} />
  }

  if (userProfile?.role !== 'student') {
    return <Navigate to="/login" replace state={{ error: 'A student account is required to access this page.' }} />
  }

  const isVerified = currentUser.emailVerified || userProfile?.emailVerified === true

  if (!isVerified && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
