import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type { CreateTeamRequest, Team, TeamRole } from "@team-notes/shared";
import { insert, selectJoin, type Db } from "../db.js";

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
