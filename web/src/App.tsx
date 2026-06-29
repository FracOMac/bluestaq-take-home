import { Navigate, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { LoginPage } from './pages/LoginPage'
import { NotesPage } from './pages/NotesPage'
import { NoteEditorPage } from './pages/NoteEditorPage'
import { TeamsPage } from './pages/TeamsPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Nav />

      <main className="mx-auto max-w-3xl p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/notes" replace />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/new" element={<NoteEditorPage />} />
          <Route path="/notes/:id/edit" element={<NoteEditorPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
