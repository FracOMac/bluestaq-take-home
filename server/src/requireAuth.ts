import type { RequestHandler } from "express";
import { verifyToken } from "./token.js";

// The authenticated user's id, attached by requireAuth.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Require a valid `Authorization: Bearer <jwt>`; attaches req.userId. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  const userId = scheme === "Bearer" && token ? verifyToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: "authentication required" });
    return;
  }
  req.userId = userId;
  next();
};
