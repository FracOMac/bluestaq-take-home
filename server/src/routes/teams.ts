import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type { CreateTeamRequest, Team, TeamRole } from "@team-notes/shared";
import { insert, type Db } from "../db.js";

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

export function listTeams(db: Db): RequestHandler {
  return (req, res) => {
    const rows = db
      .prepare(
        `SELECT t.id, t.name, t.created_at, m.role
         FROM teams t
         JOIN team_members m ON m.team_id = t.id
         WHERE m.user_id = ?
         ORDER BY t.created_at DESC`,
      )
      .all(req.userId) as TeamRow[];
    res.json(rows.map(toTeam));
  };
}
