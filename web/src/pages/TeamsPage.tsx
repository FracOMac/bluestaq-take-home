import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { Team } from '@team-notes/shared'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'

export function TeamsPage() {
  const { isAuthenticated } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    if (!isAuthenticated) return
    api
      .listTeams()
      .then(setTeams)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load teams'),
      )
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const team = await api.createTeam({ name })
      setTeams([team, ...teams])
      setName('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create team')
    }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Teams</h1>

      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New team name"
          required
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-gray-900 px-3 py-2 text-white"
        >
          Create
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-gray-600">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="mt-4 text-gray-600">No teams yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {teams.map((team) => (
            <li
              key={team.id}
              className="flex justify-between rounded border border-gray-200 bg-white p-3"
            >
              <Link
                to={`/teams/${team.id}`}
                className="font-medium text-gray-900 hover:underline"
              >
                {team.name}
              </Link>
              <span className="text-sm text-gray-600">{team.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
