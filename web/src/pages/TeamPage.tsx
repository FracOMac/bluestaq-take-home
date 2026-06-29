import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { Team } from '@team-notes/shared'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'

export function TeamPage() {
  const { isAuthenticated } = useAuth()
  const { id } = useParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !id) return
    api
      .getTeam(id)
      .then(setTeam)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load team'),
      )
      .finally(() => setLoading(false))
  }, [isAuthenticated, id])

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!id) return
    try {
      const member = await api.addTeamMember(id, { email })
      setMessage(`Added ${member.email}`)
      setEmail('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add member')
    }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (loading) return <p className="text-gray-600">Loading…</p>
  if (!team) return <p className="text-red-600">{error || 'Team not found'}</p>

  return (
    <div>
      <Link to="/teams" className="text-sm text-gray-600 hover:text-gray-900">
        ← Teams
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{team.name}</h1>
      <p className="mt-1 text-gray-600">Your role: {team.role}</p>

      {team.role === 'owner' && (
        <form onSubmit={handleAddMember} className="mt-6">
          <h2 className="font-medium text-gray-900">Add member</h2>
          <div className="mt-2 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Existing user's email"
              required
              className="flex-1 rounded border border-gray-300 px-3 py-2"
            />
            <button
              type="submit"
              className="rounded bg-gray-900 px-3 py-2 text-white"
            >
              Add
            </button>
          </div>
          {message && <p className="mt-2 text-sm text-green-700">{message}</p>}
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
