import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { Team, TeamMember } from '@team-notes/shared'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'

export function TeamPage() {
  const { isAuthenticated } = useAuth()
  const { id } = useParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !id) return
    Promise.all([api.getTeam(id), api.listTeamMembers(id)])
      .then(([loadedTeam, loadedMembers]) => {
        setTeam(loadedTeam)
        setMembers(loadedMembers)
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load team'),
      )
      .finally(() => setLoading(false))
  }, [isAuthenticated, id])

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!id) return
    try {
      const member = await api.addTeamMember(id, { email })
      setMembers((prev) =>
        [...prev, member].sort((a, b) => a.email.localeCompare(b.email)),
      )
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

      <h2 className="mt-6 font-medium text-gray-900">Members</h2>
      <ul className="mt-2 space-y-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex justify-between rounded border border-gray-200 bg-white p-3"
          >
            <span className="text-gray-900">{member.email}</span>
            <span className="text-sm text-gray-600">{member.role}</span>
          </li>
        ))}
      </ul>

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
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
