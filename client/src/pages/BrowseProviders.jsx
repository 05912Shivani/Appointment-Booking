import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicAPI } from '../api/endpoints.js'

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function BrowseProviders() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    PublicAPI.listProviders()
      .then(setProviders)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Browse providers</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Pick a provider to see their services and open slots.
        </p>
      </div>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && providers.length === 0 && (
        <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
          No providers available yet — check back soon.
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {providers.map((p) => (
          <li key={p._id}>
            <Link
              to={`/providers/${p._id}`}
              className="card flex items-center gap-4 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-950/50 dark:text-indigo-400">
                {initials(p.businessName)}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{p.businessName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {p.bio || 'View services & availability'}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
