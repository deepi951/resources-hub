import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Products from './pages/Products'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import SellProduct from './pages/SellProduct'
import EditProduct from './pages/EditProduct'
import ProductDetails from './pages/ProductDetails'
import Checkout from './pages/Checkout'
import Payment from './pages/Payment'
import ReportIssue from './pages/ReportIssue'
import Contact from './pages/Contact'
import Support from './pages/Support'
import Safety from './pages/Safety'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import LoginSelection from './pages/LoginSelection'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import AdminLayout from './admin/components/AdminLayout'
import AdminProtectedRoute from './admin/components/AdminProtectedRoute'
import AdminLogin from './admin/pages/AdminLogin'
import AdminDashboard from './admin/pages/AdminDashboard'
import AdminUsers from './admin/pages/AdminUsers'
import AdminProducts from './admin/pages/AdminProducts'
import AdminOrders from './admin/pages/AdminOrders'
import AdminSales from './admin/pages/AdminSales'
import AdminSettings from './admin/pages/AdminSettings'
import AdminProfile from './admin/pages/AdminProfile'
import AdminReports from './admin/pages/AdminReports'
import AdminReturns from './admin/pages/AdminReturns'
import './App.css'

function AppShell() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <div className="app-shell">
      {!isAdminRoute && <Navbar />}
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:productId" element={<ProductDetails />} />
          <Route path="/product/:productId/edit" element={<ProtectedRoute><EditProduct /></ProtectedRoute>} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<LoginSelection />} />
          <Route path="/login/student" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/checkout/:productId?" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/payment/:orderId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/report/:productId?" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />
          <Route path="/payment-success" element={<Navigate to="/dashboard" replace />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/support" element={<Support />} />
          <Route path="/safety" element={<Safety />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route
            path="/sell"
            element={
              <ProtectedRoute>
                <SellProduct />
              </ProtectedRoute>
            }
          />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="returns" element={<AdminReturns />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </AuthProvider>
  )
}

export default App
