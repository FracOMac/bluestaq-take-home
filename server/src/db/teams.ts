import { insert, type Db } from "./index.js";
import type { TeamMember, TeamRole } from "@team-notes/shared";

export interface TeamRow {
  id: string;
  name: string;
  created_at: string;
  role: TeamRole; // the queried user's role in the team
}

// a team joined with the caller's membership row (for their role)
const TEAM_WITH_ROLE = `
  SELECT t.id, t.name, t.created_at, m.role
  FROM teams t
  JOIN team_members m ON m.team_id = t.id`;

export function findTeamForUser(
  db: Db,
  teamId: string,
  userId: string,
): TeamRow | undefined {
  return db
    .prepare(`${TEAM_WITH_ROLE} WHERE t.id = @teamId AND m.user_id = @userId`)
    .get({ teamId, userId }) as TeamRow | undefined;
}

export function listTeamsForUser(db: Db, userId: string): TeamRow[] {
  return db
    .prepare(
      `${TEAM_WITH_ROLE} WHERE m.user_id = @userId ORDER BY t.created_at DESC`,
    )
    .all({ userId }) as TeamRow[];
}

export function findMembership(
  db: Db,
  teamId: string,
  userId: string,
): { role: TeamRole } | undefined {
  return db
    .prepare(
      "SELECT role FROM team_members WHERE team_id = @teamId AND user_id = @userId",
    )
    .get({ teamId, userId }) as { role: TeamRole } | undefined;
}

export function isMember(db: Db, teamId: string, userId: string): boolean {
  return findMembership(db, teamId, userId) !== undefined;
}

export function listTeamMembers(db: Db, teamId: string): TeamMember[] {
  return db
    .prepare(
      `SELECT u.id, u.email, m.role
       FROM team_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.team_id = @teamId
       ORDER BY u.email`,
    )
    .all({ teamId }) as TeamMember[];
}

export function insertTeam(
  db: Db,
  team: { id: string; name: string; createdAt: string },
): void {
  insert(db, "teams", {
    id: team.id,
    name: team.name,
    created_at: team.createdAt,
  });
}

export function addMembership(
  db: Db,
  member: { teamId: string; userId: string; role: TeamRole },
): void {
  insert(db, "team_members", {
    team_id: member.teamId,
    user_id: member.userId,
    role: member.role,
  });
}
