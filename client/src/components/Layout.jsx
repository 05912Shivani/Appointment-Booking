import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <rect x="3" y="4" width="18" height="17" rx="3" fill="currentColor" className="text-indigo-600" />
    <rect x="3" y="4" width="18" height="5" rx="2" className="fill-indigo-800" />
    <path d="M8 14l2.5 2.5L16 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${
          isActive
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f1a] text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-[#0b0f1a]/80">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <CalendarIcon />
            <span>Appointment Booking</span>
          </Link>
          <div className="flex items-center gap-5">
            <NavItem to="/">Browse</NavItem>
            {user?.role === 'customer' && <NavItem to="/my-bookings">My Bookings</NavItem>}
            {user?.role === 'provider' && <NavItem to="/provider">Provider Dashboard</NavItem>}
            {user?.role === 'admin' && <NavItem to="/admin">Admin</NavItem>}
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">{user.name}</span>
                <button onClick={handleLogout} className="btn btn-ghost !px-2 !py-1 text-sm">
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700">
                <Link to="/login" className="btn btn-ghost !px-3 !py-1.5 text-sm">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary !px-3 !py-1.5 text-sm">
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
