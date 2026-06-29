# Overview

Note-taking service used and shared amongst several small teams. Users need somewhere to capture and work with their notes.

# API endpoints (draft)

Quick notes on the routes I'm planning to build. Subject to change once I start wiring things up.

All request/response bodies are JSON. Auth is a bearer JWT in the Authorization header except for register/login and health.

## auth

POST /auth/register   {email, password}  -> {token}
POST /auth/login      {email, password}  -> {token}

password gets hashed (bcrypt), token is a signed JWT. nothing fancy.

## teams

POST /teams                {name}      creator becomes the owner
GET  /teams                            teams I'm a member of
GET  /teams/:id                        members only
GET  /teams/:id/members                members only, lists the team's members
POST /teams/:id/members    {email}     owner only, adds an existing user

## notes

POST   /notes      {title, content, visibility, teamId?}
GET    /notes      ?teamId= &q=        notes I can see
GET    /notes/:id
PATCH  /notes/:id  {title?, content?, visibility?, teamId?}
DELETE /notes/:id

visibility is either "private" or "team". a team note has to point at a team the owner belongs to. team members can read + edit team notes, but only the owner can delete one or flip its visibility.

## misc

GET /health    -> 200, used for a basic liveness check

## errors

consistent shape: { error: { message, code } }
  400 validation
  401 missing/bad token
  403 not allowed
  404 not found

q= search and tags are probably a later thing if i have time.
