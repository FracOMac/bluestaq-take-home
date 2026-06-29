import type {
  AddMemberRequest,
  AuthResponse,
  CreateNoteRequest,
  CreateTeamRequest,
  LoginRequest,
  Note,
  RegisterRequest,
  Team,
  TeamMember,
  UpdateNoteRequest,
} from '@team-notes/shared'
import { getToken } from './auth'

const BASE = '/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const data = res.status === 204 ? null : await res.json()
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'request failed')
  }
  return data as T
}

export const api = {
  // auth
  register(body: RegisterRequest) {
    return request<AuthResponse>('/auth/register', { method: 'POST', body })
  },
  login(body: LoginRequest) {
    return request<AuthResponse>('/auth/login', { method: 'POST', body })
  },

  // notes
  listNotes() {
    return request<Note[]>('/notes')
  },
  getNote(id: string) {
    return request<Note>(`/notes/${id}`)
  },
  createNote(body: CreateNoteRequest) {
    return request<Note>('/notes', { method: 'POST', body })
  },
  updateNote(id: string, body: UpdateNoteRequest) {
    return request<Note>(`/notes/${id}`, { method: 'PATCH', body })
  },
  deleteNote(id: string) {
    return request<void>(`/notes/${id}`, { method: 'DELETE' })
  },

  // teams
  listTeams() {
    return request<Team[]>('/teams')
  },
  getTeam(id: string) {
    return request<Team>(`/teams/${id}`)
  },
  createTeam(body: CreateTeamRequest) {
    return request<Team>('/teams', { method: 'POST', body })
  },
  addTeamMember(teamId: string, body: AddMemberRequest) {
    return request<TeamMember>(`/teams/${teamId}/members`, {
      method: 'POST',
      body,
    })
  },
}
