import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logoutAdmin } from '../services/adminAuthService'

const navigation = [
  { group: 'Overview', to: '/admin/dashboard', label: 'Dashboard' },
  { group: 'Users', to: '/admin/users', label: 'Students' },
  { group: 'Marketplace', to: '/admin/products', label: 'Products' },
  { group: 'Marketplace', to: '/admin/orders', label: 'Orders' },
  { group: 'Marketplace', to: '/admin/returns', label: 'Returns' },
  { group: 'Management', to: '/admin/sales', label: 'Sales' },
  { group: 'Management', to: '/admin/reports', label: 'Complaints' },
  { group: 'Management', to: '/admin/settings', label: 'Settings' }
]

function AdminLayout() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()

  const handleLogout = async () => {
    await logoutAdmin()
    navigate('/', { replace: true })
  }

  const adminName = userProfile?.name || userProfile?.fullName || currentUser?.displayName || currentUser?.email || 'Administrator'
  const adminRole = userProfile?.role === 'admin' ? 'Administrator' : 'Admin'

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand-wrap">
          <Link to="/admin/dashboard" className="admin-brand">
            <span className="admin-brand-mark">R</span>
            <span>ResourceHub</span>
          </Link>
        </div>

        <nav className="admin-nav">
          {navigation.map((item, index) => (
            <div className="admin-nav-item" key={item.to}>
              {navigation[index - 1]?.group !== item.group && <span className="admin-nav-group">{item.group}</span>}
              <NavLink
                to={item.to}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-pill">
            <span className="admin-user-dot" />
            <div>
              <strong>{adminName}</strong>
              <small>{adminRole}</small>
            </div>
          </div>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-main-panel">
        <header className="admin-header">
          <div>
            <p className="admin-header-kicker">ResourceHub Admin</p>
            <h1>Operations Center</h1>
          </div>

          <div className="admin-header-actions">
            <Link to="/admin/profile" className="admin-profile-pill" aria-label="Open administrator profile">
              <span className="admin-profile-avatar">{adminName.charAt(0).toUpperCase()}</span>
              <span>{adminName}</span>
            </Link>
            <button type="button" className="admin-logout-inline" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="admin-page-body">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
