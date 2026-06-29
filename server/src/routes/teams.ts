import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type {
  AddMemberRequest,
  CreateTeamRequest,
  Team,
  TeamMember,
  TeamRole,
} from "@team-notes/shared";
import { insert, selectWhere, selectJoin, type Db } from "../db.js";

// a team plus the caller's role in it
const TEAMS_FROM = "teams t JOIN team_members m ON m.team_id = t.id";
const TEAM_COLUMNS = "t.id, t.name, t.created_at, m.role";

interface TeamRow {
  id: string;
  name: string;
  created_at: string;
  role: TeamRole;
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function createTeam(db: Db): RequestHandler {
  return (req, res) => {
    const { name } = req.body ?? {};
    if (typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const request: CreateTeamRequest = { name: name.trim() };

    const team: Team = {
      id: randomUUID(),
      name: request.name,
      role: "owner",
      createdAt: new Date().toISOString(),
    };

    // team + owner membership must land together
    db.transaction(() => {
      insert(db, "teams", {
        id: team.id,
        name: team.name,
        created_at: team.createdAt,
      });
      insert(db, "team_members", {
        team_id: team.id,
        user_id: req.userId,
        role: "owner",
      });
    })();

    res.status(201).json(team);
  };
}

export function getTeam(db: Db): RequestHandler {
  return (req, res) => {
    // Match on team id AND caller membership, so non-members read as 404.
    const rows = selectJoin<TeamRow>(db, {
      from: TEAMS_FROM,
      columns: TEAM_COLUMNS,
      where: { "t.id": req.params.id, "m.user_id": req.userId },
    });
    if (!rows[0]) {
      res.status(404).json({ error: "team not found" });
      return;
    }
    res.json(toTeam(rows[0]));
  };
}

export function addMember(db: Db): RequestHandler {
  return (req, res) => {
    const { email } = req.body ?? {};
    if (typeof email !== "string" || email.trim() === "") {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const request: AddMemberRequest = { email: email.toLowerCase().trim() };
    const teamId = req.params.id;

    // caller must be the team's owner (non-members read as 404, no leak)
    const membership = selectWhere<{ role: TeamRole }>(db, "team_members", {
      team_id: teamId,
      user_id: req.userId,
    });
    if (!membership[0]) {
      res.status(404).json({ error: "team not found" });
      return;
    }
    if (membership[0].role !== "owner") {
      res.status(403).json({ error: "only the team owner can add members" });
      return;
    }

    // the user being added must already exist
    const users = selectWhere<{ id: string; email: string }>(db, "users", {
      email: request.email,
    });
    const user = users[0];
    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }

    const already = selectWhere(db, "team_members", {
      team_id: teamId,
      user_id: user.id,
    });
    if (already[0]) {
      res.status(409).json({ error: "user is already a member" });
      return;
    }

    insert(db, "team_members", {
      team_id: teamId,
      user_id: user.id,
      role: "member",
    });

    const member: TeamMember = {
      id: user.id,
      email: user.email,
      role: "member",
    };
    res.status(201).json(member);
  };
}

export function listMembers(db: Db): RequestHandler {
  return (req, res) => {
    const teamId = req.params.id;

    // only members may view the roster (non-members read as 404)
    const membership = selectWhere(db, "team_members", {
      team_id: teamId,
      user_id: req.userId,
    });
    if (!membership[0]) {
      res.status(404).json({ error: "team not found" });
      return;
    }

    const members = selectJoin<TeamMember>(db, {
      from: "team_members m JOIN users u ON u.id = m.user_id",
      columns: "u.id, u.email, m.role",
      where: { "m.team_id": teamId },
      orderBy: "u.email",
    });
    res.json(members);
  };
}

export function listTeams(db: Db): RequestHandler {
  return (req, res) => {
    const rows = selectJoin<TeamRow>(db, {
      from: TEAMS_FROM,
      columns: TEAM_COLUMNS,
      where: { "m.user_id": req.userId },
      orderBy: "t.created_at DESC",
    });
    res.json(rows.map(toTeam));
  };
}
