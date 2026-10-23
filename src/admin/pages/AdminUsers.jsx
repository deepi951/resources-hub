import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { db, firebaseConfigured } from '../../firebase/firebaseConfig.js'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatDateTime } from '../utils/dateUtils'

const formatValue = (value) => (value === undefined || value === null || value === '' ? 'N/A' : value)

function AdminUsers() {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [studentActivity, setStudentActivity] = useState({ listings: 0, orders: 0, reports: 0 })
  const [updating, setUpdating] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  const loadUsers = async () => {
    if (!firebaseConfigured || !db) {
      setError('Firebase is not configured. Add your project credentials before using the admin dashboard.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const snapshot = await getDocs(collection(db, 'users'))
      const nextUsers = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .filter((user) => user.role !== 'admin')
        .map((user) => ({
          id: user.id,
          name: user.name || user.fullName || 'N/A',
          email: user.email || 'N/A',
          role: user.role || 'student',
          status: user.status || 'active',
          department: user.department || 'N/A',
          semester: user.semester || 'N/A',
          phone: user.phone || 'N/A',
          createdAt: user.createdAt || 'N/A',
        }))

      setUsers(nextUsers)
      if (!selectedUserId && nextUsers.length > 0) {
        setSelectedUserId(nextUsers[0].id)
      }
    } catch (loadError) {
      console.error('Admin users load failed:', loadError)
      setError(loadError?.message || 'Unable to load students right now.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    const selectedUser = users.find((user) => user.id === selectedUserId) || null
    if (!selectedUser) {
          setStudentActivity({ listings: 0, orders: 0, reports: 0 })
      return
    }

    const loadSelectedStudentActivity = async () => {
      try {
        const [listingsSnapshot, ordersSnapshot, reportsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'products'), where('sellerId', '==', selectedUser.id))),
          getDocs(query(collection(db, 'orders'), where('buyerId', '==', selectedUser.id))),
          getDocs(query(collection(db, 'reports'), where('reportedUserId', '==', selectedUser.id))),
        ])

        const listingCount = listingsSnapshot.size
        const orderCount = ordersSnapshot.size
        const reportCount = reportsSnapshot.size
        setStudentActivity({ listings: listingCount, orders: orderCount, reports: reportCount })
      } catch (activityError) {
        console.error('Student activity lookup failed:', activityError)
        setStudentActivity({ listings: 0, orders: 0, reports: 0 })
      }
    }

    loadSelectedStudentActivity()
  }, [selectedUserId, users])

  const filteredUsers = useMemo(() => {
    const safeQuery = search.trim().toLowerCase()
    if (!safeQuery) return users

    return users.filter((user) => {
      const name = String(user.name || '').toLowerCase()
      const email = String(user.email || '').toLowerCase()
      return name.includes(safeQuery) || email.includes(safeQuery)
    })
  }, [search, users])

  const selectedUser = users.find((user) => user.id === selectedUserId) || null

  if (!selectedUser && users.length > 0 && !selectedUserId) {
    setSelectedUserId(users[0].id)
  }

  const handleToggleStatus = async () => {
    if (!selectedUser) return
    if (currentUser?.uid === selectedUser.id) {
      setMessage('You cannot block or unblock your own admin account.')
      return
    }

    const nextStatus = String(selectedUser.status || 'active').toLowerCase() === 'blocked' ? 'active' : 'blocked'
    setUpdating(true)
    setMessage('')

    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      })

      setMessage(`Student status updated to ${nextStatus}.`)
      await loadUsers()
    } catch (statusError) {
      console.error('Status update failed:', statusError)
      setMessage(statusError?.message || 'Unable to update student status.')
    } finally {
      setUpdating(false)
    }
  }

  const studentColumns = [
    { key: 'name', label: 'User', width: '14%', render: (value) => <span className="table-primary-text" title={value}>{value}</span> },
    { key: 'email', label: 'Email', width: '22%', render: (value) => <span className="data-table-cell-text" title={value}>{value}</span> },
    { key: 'role', label: 'Role', width: '8%', render: (value) => <StatusBadge status={value} /> },
    { key: 'status', label: 'Status', width: '10%', render: (value) => <StatusBadge status={value} /> },
    { key: 'department', label: 'Department', width: '11%' },
    { key: 'phone', label: 'Phone', width: '12%' },
    { key: 'createdAt', label: 'Created', width: '15%', render: (value) => <span className="table-date">{formatDate(value)}</span> },
    { key: 'action', label: 'Action', width: '8%', render: (_, user) => <button className="table-action" type="button" onClick={() => { setSelectedUserId(user.id); setCopyMessage('') }}>View</button> },
  ]

  return (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <p className="admin-page-kicker">Accounts</p>
          <h2>Students</h2>
        </div>
        <div className="admin-section-actions">
          <button type="button" className="secondary-btn compact-btn" onClick={loadUsers} disabled={loading}>Refresh</button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="admin-search-input"
            aria-label="Search by name or email"
          />
        </div>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}
        {message && <div className="admin-alert admin-alert-success">{message}</div>}

        {loading ? (
          <div className="admin-empty-state">Loading students...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="admin-empty-state">No student records found.</div>
        ) : (
          <>
            <DataTable columns={studentColumns} rows={filteredUsers} emptyMessage="No students available." ariaLabel="Admin students" />

            {selectedUser && (
              <div className="admin-detail-panel">
                <div className="admin-detail-header">
                  <div>
                    <p className="admin-page-kicker">Student profile</p>
                    <h3>{selectedUser.name}</h3>
                  </div>
                  <button
                    type="button"
                    className="primary-btn compact-btn"
                    onClick={handleToggleStatus}
                    disabled={updating || currentUser?.uid === selectedUser.id}
                  >
                    {updating ? 'Updating...' : String(selectedUser.status || 'active').toLowerCase() === 'blocked' ? 'Unblock account' : 'Block account'}
                  </button>
                </div>

                <div className="admin-record-details-grid">
                  <div className="admin-record-detail"><span>Email</span><strong>{formatValue(selectedUser.email)}</strong></div>
                  <div className="admin-record-detail"><span>Phone</span><strong>{formatValue(selectedUser.phone)}</strong></div>
                  <div className="admin-record-detail"><span>Department</span><strong>{formatValue(selectedUser.department)}</strong></div>
                  <div className="admin-record-detail"><span>Semester</span><strong>{formatValue(selectedUser.semester)}</strong></div>
                  <div className="admin-record-detail"><span>Role</span><StatusBadge status={selectedUser.role} /></div>
                  <div className="admin-record-detail"><span>Status</span><StatusBadge status={selectedUser.status} /></div>
                  <div className="admin-record-detail"><span>Account created</span><strong>{formatDateTime(selectedUser.createdAt)}</strong></div>
                </div>

                <details className="admin-technical-details">
                  <summary>Technical information</summary>
                  <div className="admin-technical-value"><code>{selectedUser.id}</code><button className="table-action" type="button" onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(selectedUser.id)
                      setCopyMessage('Internal user ID copied.')
                    } catch {
                      setCopyMessage('Copy is unavailable in this browser.')
                    }
                  }}>Copy internal ID</button>{copyMessage && <span role="status">{copyMessage}</span>}</div>
                </details>

                <div className="admin-activity-card">
                  <h4>Student activity</h4>
                  <div className="admin-mini-metrics">
                    <div><strong>{studentActivity.listings}</strong><span>Listings</span></div>
                    <div><strong>{studentActivity.orders}</strong><span>Orders</span></div>
                    <div><strong>{studentActivity.reports}</strong><span>Reports</span></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AdminUsers
