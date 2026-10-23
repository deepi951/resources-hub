import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isAdminAuthenticated } from '../services/adminAuthService'

function AdminProtectedRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) {
    return <div className="empty-state">Loading admin session...</div>
  }

  if (!isAdminAuthenticated(currentUser, userProfile)) {
    return <Navigate to="/login" replace state={{ error: 'Admin access required. Choose Admin Login to continue.' }} />
  }

  if (userProfile?.status === 'blocked') {
    return <Navigate to="/login" replace state={{ error: 'This admin account has been blocked.' }} />
  }

  return children
}

export default AdminProtectedRoute
