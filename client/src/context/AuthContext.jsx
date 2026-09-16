import { createContext, useContext, useEffect, useRef, useState } from 'react'
import api, { setAccessToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Guards against the initial session check (below) resolving *after* an
  // explicit login/register/logout and clobbering that fresher state — a
  // real race on a page that loads straight into /login or /register and
  // submits quickly, before the mount-time /auth/refresh round trip settles.
  const settledElsewhere = useRef(false)

  useEffect(() => {
    api
      .post('/auth/refresh')
      .then(async (res) => {
        if (settledElsewhere.current) return
        setAccessToken(res.data.accessToken)
        const me = await api.get('/auth/me')
        if (settledElsewhere.current) return
        setUser(me.data.user)
      })
      .catch(() => {
        if (!settledElsewhere.current) setAccessToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    settledElsewhere.current = true
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    setLoading(false)
    return res.data.user
  }

  async function register(data) {
    const res = await api.post('/auth/register', data)
    settledElsewhere.current = true
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    setLoading(false)
    return res.data.user
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {})
    settledElsewhere.current = true
    setAccessToken(null)
    setUser(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
