/**
 * Shared API contract for the Team Notes service.
 *
 * Plain TypeScript types describing the request and response shapes, imported
 * by both the server and the web client so the wire contract stays in sync.
 * Type-only — nothing here ends up in any runtime bundle.
 */

export type Visibility = "private" | "team";
export type TeamRole = "owner" | "member";

// --- requests ------------------------------------------------------------

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateTeamRequest {
  name: string;
}

export interface AddMemberRequest {
  email: string;
}

export interface CreateNoteRequest {
  title: string;
  content?: string;
  visibility?: Visibility;
  teamId?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  visibility?: Visibility;
  teamId?: string | null;
}

// --- responses -----------------------------------------------------------

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Team {
  id: string;
  name: string;
  role: TeamRole;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: TeamRole;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  teamId: string | null;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export type HealthStatus = "ok" | "down";

export interface HealthResponse {
  status: HealthStatus;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}
