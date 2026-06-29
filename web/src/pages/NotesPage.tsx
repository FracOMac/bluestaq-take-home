import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { Note } from '@team-notes/shared'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'

export function NotesPage() {
  const { isAuthenticated } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) return
    api
      .listNotes()
      .then(setNotes)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load notes'),
      )
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  async function handleDelete(id: string) {
    setError('')
    try {
      await api.deleteNote(id)
      setNotes(notes.filter((note) => note.id !== id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete note')
    }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        <Link
          to="/notes/new"
          className="rounded bg-gray-900 px-3 py-2 text-white"
        >
          New note
        </Link>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-gray-600">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="mt-4 text-gray-600">No notes yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded border border-gray-200 bg-white p-3"
            >
              <div className="flex justify-between gap-2">
                <h2 className="font-medium text-gray-900">{note.title}</h2>
                <div className="flex gap-3 text-sm">
                  <Link
                    to={`/notes/${note.id}/edit`}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {note.content && (
                <p className="mt-1 whitespace-pre-wrap text-gray-700">
                  {note.content}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
