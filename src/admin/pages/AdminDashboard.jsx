import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
} from 'firebase/firestore'
import { db, firebaseConfigured } from '../../firebase/firebaseConfig.js'

const emptySummary = {
  students: 0,
  activeStudents: 0,
  products: 0,
  pendingProducts: 0,
  orders: 0,
  reportedProducts: 0,
  blockedAccounts: 0,
}

function AdminDashboard() {
  const [summary, setSummary] = useState(emptySummary)
  const [students, setStudents] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const statCards = useMemo(
    () => [
      {
        label: 'Total Students',
        value: summary.students,
        tone: 'primary',
      },
      {
        label: 'Active Students',
        value: summary.activeStudents,
        tone: 'success',
      },
      {
        label: 'Total Products',
        value: summary.products,
        tone: 'info',
      },
      {
        label: 'Pending Products',
        value: summary.pendingProducts,
        tone: 'warning',
      },
      {
        label: 'Total Orders',
        value: summary.orders,
        tone: 'primary',
      },
      {
        label: 'Reported Products',
        value: summary.reportedProducts,
        tone: 'danger',
      },
      {
        label: 'Blocked Accounts',
        value: summary.blockedAccounts,
        tone: 'neutral',
      },
    ],
    [summary],
  )

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!firebaseConfigured || !db) {
        setError(
          'Firebase is not configured. Add your project credentials before using the admin dashboard.',
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        /*
         * Fetch data from Firestore
         */
        const [
          usersSnapshot,
          productsSnapshot,
          ordersSnapshot,
          reportsSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, 'users')),

          getDocs(
            query(
              collection(db, 'products'),
              orderBy('createdAt', 'desc'),
              limit(50),
            ),
          ),

          getDocs(
            query(
              collection(db, 'orders'),
              orderBy('createdAt', 'desc'),
              limit(50),
            ),
          ),

          getDocs(
            query(
              collection(db, 'reports'),
              orderBy('createdAt', 'desc'),
              limit(50),
            ),
          ),
        ])

        /*
         * Convert Firestore documents into JavaScript objects
         */
        const users = usersSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))

        const products = productsSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))

        const orders = ordersSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))

        const reports = reportsSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))

        /*
         * =====================================================
         * STUDENTS
         * =====================================================
         *
         * Only users whose role is "student" are counted.
         *
         * Example:
         *
         * admin
         * student
         * student
         * student
         *
         * Total Students = 3
         */
        const studentUsers = users.filter(
          (user) => user.role === 'student',
        )

        /*
         * =====================================================
         * ACTIVE STUDENTS
         * =====================================================
         */
        const activeStudents = studentUsers.filter(
          (user) =>
            user.status === 'active' ||
            user.status === 'Active' ||
            !user.status,
        ).length

        /*
         * =====================================================
         * BLOCKED ACCOUNTS
         * =====================================================
         */
        const blockedAccounts = users.filter(
          (user) =>
            user.status === 'suspended' ||
            user.status === 'Suspended' ||
            user.status === 'blocked' ||
            user.status === 'Blocked',
        ).length

        /*
         * =====================================================
         * PRODUCTS
         * =====================================================
         */
        const pendingProducts = products.filter(
          (product) =>
            String(product.status || 'Approved').toLowerCase() ===
            'pending',
        ).length

        /*
         * =====================================================
         * REPORTS
         * =====================================================
         */
        const reportedProducts = reports.filter(
          (report) =>
            report.productId ||
            report.reportedUserId ||
            report.reason,
        ).length

        /*
         * =====================================================
         * ALL STUDENTS
         * =====================================================
         *
         * IMPORTANT:
         *
         * There is NO .slice(0, 5) here.
         *
         * Therefore every student in Firestore is displayed.
         */
        const studentRows = studentUsers.map((user) => ({
          id: user.id,
          name:
            user.fullName ||
            user.displayName ||
            user.name ||
            user.email ||
            'Student',

          email: user.email || 'N/A',

          role: user.role || 'student',

          status: user.status || 'active',

          department: user.department || 'N/A',

          block: user.block || 'N/A',

          registerNumber: user.registerNumber || 'N/A',

          phone: user.phone || 'N/A',

          createdAt: user.createdAt || '',
        }))

        /*
         * Sort students by name
         */
        studentRows.sort((a, b) =>
          a.name.localeCompare(b.name),
        )

        /*
         * =====================================================
         * RECENT ACTIVITY
         * =====================================================
         */
        const recentActivityRows = [
          ...products.slice(0, 3).map((product) => ({
            action: 'Product listed',
            user:
              product.sellerName ||
              product.sellerEmail ||
              'Student',
            detail:
              product.title ||
              product.name ||
              'Marketplace listing',
            time: product.createdAt || 'Recently',
          })),

          ...orders.slice(0, 2).map((order) => ({
            action: 'Order created',
            user: order.buyerId || 'Buyer',
            detail:
              order.productName ||
              order.title ||
              'Order item',
            time: order.createdAt || 'Recently',
          })),

          ...reports.slice(0, 2).map((report) => ({
            action: 'Report received',
            user: report.reporterId || 'User',
            detail:
              report.reason ||
              'Marketplace issue',
            time: report.createdAt || 'Recently',
          })),
        ].slice(0, 5)

        /*
         * =====================================================
         * UPDATE DASHBOARD
         * =====================================================
         */
        setSummary({
          students: studentUsers.length,
          activeStudents,
          products: products.length,
          pendingProducts,
          orders: orders.length,
          reportedProducts,
          blockedAccounts,
        })

        setStudents(studentRows)

        setRecentActivity(recentActivityRows)
      } catch (dashboardError) {
        console.error(
          'Admin dashboard query failed:',
          dashboardError,
        )

        setError(
          dashboardError?.message ||
            'Unable to load admin dashboard data right now.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="admin-page admin-dashboard-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="admin-page-header">
        <div>
          <p className="admin-page-kicker">
            Overview
          </p>

          <h2>
            Welcome back, Admin
          </h2>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      {/* =====================================================
          STAT CARDS
      ====================================================== */}

      <section className="admin-stat-grid">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`admin-stat-card tone-${stat.tone}`}
          >
            <div className="admin-stat-label">
              {stat.label}
            </div>

            <div className="admin-stat-value">
              {loading ? '...' : stat.value}
            </div>
          </div>
        ))}
      </section>

      {/* =====================================================
          ALL STUDENTS
      ====================================================== */}

      <section className="admin-panel">

        <div className="admin-panel-header">
          <div>
            <h3>
              All Students
            </h3>

            <small>
              {loading
                ? 'Loading students...'
                : `${students.length} registered student${
                    students.length === 1 ? '' : 's'
                  }`}
            </small>
          </div>

          <span>
            {summary.students}
          </span>
        </div>

        {loading ? (
          <div className="admin-empty-state">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="admin-empty-state">
            No students found yet.
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              overflowX: 'auto',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '1000px',
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>
                    #
                  </th>

                  <th style={tableHeaderStyle}>
                    Name
                  </th>

                  <th style={tableHeaderStyle}>
                    Email
                  </th>

                  <th style={tableHeaderStyle}>
                    Department
                  </th>

                  <th style={tableHeaderStyle}>
                    Register Number
                  </th>

                  <th style={tableHeaderStyle}>
                    Block
                  </th>

                  <th style={tableHeaderStyle}>
                    Phone
                  </th>

                  <th style={tableHeaderStyle}>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id}>

                    <td style={tableCellStyle}>
                      {index + 1}
                    </td>

                    <td style={tableCellStyle}>
                      <strong>
                        {student.name}
                      </strong>
                    </td>

                    <td style={tableCellStyle}>
                      {student.email}
                    </td>

                    <td style={tableCellStyle}>
                      {student.department}
                    </td>

                    <td style={tableCellStyle}>
                      {student.registerNumber}
                    </td>

                    <td style={tableCellStyle}>
                      {student.block}
                    </td>

                    <td style={tableCellStyle}>
                      {student.phone}
                    </td>

                    <td style={tableCellStyle}>
                      <span
                        className={`admin-pill ${
                          student.status === 'active' ||
                          student.status === 'Active'
                            ? 'success'
                            : 'warning'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </section>

      {/* =====================================================
          RECENT ACTIVITY
      ====================================================== */}

      <section className="admin-panel-grid two-up">

        <div className="admin-panel">

          <div className="admin-panel-header">
            <h3>
              Recent Activity
            </h3>

            <span>
              Live
            </span>
          </div>

          <div className="admin-list-stack">

            {recentActivity.length === 0 ? (
              <div className="admin-empty-state">
                No recent platform activity.
              </div>
            ) : (
              recentActivity.map(
                (activity, index) => (
                  <div
                    key={`${activity.action}-${activity.user}-${index}`}
                    className="admin-activity-item"
                  >
                    <div>
                      <strong>
                        {activity.action}
                      </strong>

                      <small>
                        {activity.detail}
                      </small>
                    </div>

                    <span className="admin-activity-time">
                      {formatDate(activity.time)}
                    </span>
                  </div>
                ),
              )
            )}

          </div>
        </div>

        {/* =====================================================
            STUDENT SUMMARY
        ====================================================== */}

        <div className="admin-panel">

          <div className="admin-panel-header">
            <h3>
              Student Summary
            </h3>

            <span>
              {summary.students}
            </span>
          </div>

          <div className="admin-mini-metrics">

            <div>
              <strong>
                {summary.students}
              </strong>

              <span>
                Total students
              </span>
            </div>

            <div>
              <strong>
                {summary.activeStudents}
              </strong>

              <span>
                Active students
              </span>
            </div>

            <div>
              <strong>
                {summary.blockedAccounts}
              </strong>

              <span>
                Blocked accounts
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          REPORTS + PLATFORM HEALTH
      ====================================================== */}

      <section className="admin-panel-grid two-up">

        <div className="admin-panel">

          <div className="admin-panel-header">
            <h3>
              Pending Reports
            </h3>

            <span>
              {summary.reportedProducts}
            </span>
          </div>

          <div className="admin-mini-metrics">

            <div>
              <strong>
                {summary.reportedProducts}
              </strong>

              <span>
                Open reports
              </span>
            </div>

            <div>
              <strong>
                {summary.blockedAccounts}
              </strong>

              <span>
                Blocked
              </span>
            </div>

          </div>

        </div>

        <div className="admin-panel">

          <div className="admin-panel-header">
            <h3>
              Platform Health
            </h3>

            <span>
              Stable
            </span>
          </div>

          <div className="admin-mini-metrics">

            <div>
              <strong>
                {summary.pendingProducts}
              </strong>

              <span>
                Pending products
              </span>
            </div>

            <div>
              <strong>
                {summary.orders}
              </strong>

              <span>
                Orders
              </span>
            </div>

          </div>

        </div>

      </section>

    </div>
  )
}

/*
 * ============================================================
 * TABLE STYLES
 * ============================================================
 */

const tableHeaderStyle = {
  textAlign: 'left',
  padding: '14px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '13px',
  fontWeight: '700',
  color: '#64748b',
  whiteSpace: 'nowrap',
}

const tableCellStyle = {
  padding: '16px 12px',
  borderBottom: '1px solid #eef2f7',
  fontSize: '14px',
  color: '#334155',
  verticalAlign: 'middle',
}

/*
 * ============================================================
 * DATE FORMATTER
 * ============================================================
 */

const formatDate = (value) => {
  if (!value) {
    return 'Recently'
  }

  try {
    let date

    /*
     * Firestore Timestamp
     */
    if (typeof value?.toDate === 'function') {
      date = value.toDate()
    }

    /*
     * JavaScript Date
     */
    else if (value instanceof Date) {
      date = value
    }

    /*
     * String / number
     */
    else {
      date = new Date(value)
    }

    if (Number.isNaN(date.getTime())) {
      return 'Recently'
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return 'Recently'
  }
}

export default AdminDashboard