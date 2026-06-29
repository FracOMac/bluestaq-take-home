import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '@team-notes/shared'

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
  token?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
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
  register(body: RegisterRequest) {
    return request<AuthResponse>('/auth/register', { method: 'POST', body })
  },
  login(body: LoginRequest) {
    return request<AuthResponse>('/auth/login', { method: 'POST', body })
  },
}
