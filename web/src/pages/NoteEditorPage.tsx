import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Team, Visibility } from '@team-notes/shared'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'

export function NoteEditorPage() {
  const { isAuthenticated, userId } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [teamId, setTeamId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  // new notes are owned by the caller; only the owner may change visibility
  const [canEditVisibility, setCanEditVisibility] = useState(true)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    api.listTeams().then(setTeams).catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !id) return
    api
      .getNote(id)
      .then((note) => {
        setTitle(note.title)
        setContent(note.content)
        setVisibility(note.visibility)
        setTeamId(note.teamId ?? '')
        setCanEditVisibility(note.ownerId === userId)
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load note'),
      )
      .finally(() => setLoading(false))
  }, [isAuthenticated, id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (canEditVisibility && visibility === 'team' && !teamId) {
      setError('Pick a team for a team note')
      return
    }
    setSaving(true)
    // non-owners may only edit title/content; sending visibility would be rejected
    const body = canEditVisibility
      ? {
          title,
          content,
          visibility,
          ...(visibility === 'team' ? { teamId } : {}),
        }
      : { title, content }
    try {
      if (id) {
        await api.updateNote(id, body)
      } else {
        await api.createNote(body)
      }
      navigate('/notes')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (loading) return <p className="text-gray-600">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Edit note' : 'New note'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write something..."
          rows={8}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />

        {canEditVisibility && (
          <div className="flex gap-2">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="rounded border border-gray-300 px-3 py-2"
            >
              <option value="private">Private</option>
              <option value="team">Team</option>
            </select>

            {visibility === 'team' && (
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="flex-1 rounded border border-gray-300 px-3 py-2"
              >
                <option value="">Select a team…</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
          >
            {isEdit ? 'Save' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="rounded border border-gray-300 px-3 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
