import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type {
  AddMemberRequest,
  CreateTeamRequest,
  Team,
  TeamMember,
} from "@team-notes/shared";
import type { Db } from "../db/index.js";
import { findUserByEmail } from "../db/users.js";
import {
  addMembership,
  findMembership,
  findTeamForUser,
  insertTeam,
  isMember,
  listTeamMembers,
  listTeamsForUser,
  type TeamRow,
} from "../db/teams.js";

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
      insertTeam(db, team);
      addMembership(db, {
        teamId: team.id,
        userId: req.userId!,
        role: "owner",
      });
    })();

    res.status(201).json(team);
  };
}

export function getTeam(db: Db): RequestHandler {
  return (req, res) => {
    // scoped to the caller's membership, so non-members read as 404
    const row = findTeamForUser(db, String(req.params.id), req.userId!);
    if (!row) {
      res.status(404).json({ error: "team not found" });
      return;
    }
    res.json(toTeam(row));
  };
}

export function listTeams(db: Db): RequestHandler {
  return (req, res) => {
    const rows = listTeamsForUser(db, req.userId!);
    res.json(rows.map(toTeam));
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
    const teamId = String(req.params.id);

    // caller must be the team's owner (non-members read as 404, no leak)
    const membership = findMembership(db, teamId, req.userId!);
    if (!membership) {
      res.status(404).json({ error: "team not found" });
      return;
    }
    if (membership.role !== "owner") {
      res.status(403).json({ error: "only the team owner can add members" });
      return;
    }

    const user = findUserByEmail(db, request.email);
    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }
    if (isMember(db, teamId, user.id)) {
      res.status(409).json({ error: "user is already a member" });
      return;
    }

    addMembership(db, { teamId, userId: user.id, role: "member" });

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
    const teamId = String(req.params.id);

    // only members may view the roster (non-members read as 404)
    if (!isMember(db, teamId, req.userId!)) {
      res.status(404).json({ error: "team not found" });
      return;
    }
    res.json(listTeamMembers(db, teamId));
  };
}
