import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutStudent } from '../services/authService'
import { logoutAdmin } from '../admin/services/adminAuthService'

function Navbar() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const userName =
    currentUser?.displayName ||
    userProfile?.fullName ||
    currentUser?.email?.split('@')[0] ||
    'Student'
  const isAdmin = userProfile?.role === 'admin'

  const handleLogout = async () => {
    try {
      if (isAdmin) {
        await logoutAdmin()
      } else {
        await logoutStudent()
      }
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Logout failed', error)
    }
  }

  const handleSearch = (event) => {
    if (event.key !== 'Enter') return

    const trimmed = searchQuery.trim()
    navigate(`/products${trimmed ? `?search=${encodeURIComponent(trimmed)}` : ''}`)
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label="ResourceHub home">
          <span className="brand-mark">R</span>
          <span>Resourcehub</span>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/about">About Us</Link>
        </nav>

        <div className="nav-search">
          <input
            className="search-box"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search books, calculators, laptops, lab tools..."
            aria-label="Search products"
          />
        </div>

        <div className="nav-actions">
          {currentUser ? (
            <>
              <Link className="nav-user-badge" to={isAdmin ? '/admin/profile' : '/profile'} aria-label={isAdmin ? 'Open administrator profile' : 'Open student profile'}>
                {userName}
              </Link>
              <Link className="nav-action" to={isAdmin ? '/admin/dashboard' : '/dashboard'}>Dashboard</Link>
              {!isAdmin && <Link className="nav-action" to="/dashboard#notifications">Notifications</Link>}
              {!isAdmin && <Link className="primary-btn" to="/sell">+ Sell</Link>}
              <button type="button" className="secondary-btn small-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="nav-action" to="/login">Login</Link>
              <Link className="primary-btn" to="/sell">+ Sell</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
