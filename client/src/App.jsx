import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import RequireRole from './components/RequireRole.jsx'
import BrowseProviders from './pages/BrowseProviders.jsx'
import ProviderDetail from './pages/ProviderDetail.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import MyBookings from './pages/MyBookings.jsx'
import ProviderDashboard from './pages/ProviderDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<BrowseProviders />} />
          <Route path="/providers/:providerId" element={<ProviderDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/my-bookings"
            element={
              <RequireRole role="customer">
                <MyBookings />
              </RequireRole>
            }
          />
          <Route
            path="/provider"
            element={
              <RequireRole role="provider">
                <ProviderDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
