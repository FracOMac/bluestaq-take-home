import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'

export function NoteEditorPage() {
  const { isAuthenticated } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !id) return
    api
      .getNote(id)
      .then((note) => {
        setTitle(note.title)
        setContent(note.content)
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load note'),
      )
      .finally(() => setLoading(false))
  }, [isAuthenticated, id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (id) {
        await api.updateNote(id, { title, content })
      } else {
        await api.createNote({ title, content })
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
