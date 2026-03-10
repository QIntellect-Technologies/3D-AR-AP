import type { AuthedRequest } from "../middleware/auth";

export function requireUserId(req: AuthedRequest): string {
  if (!req.userId) {
    // This should only happen if authenticate middleware is missing or broken.
    throw new Error(
      "Unauthorized: missing userId (check Bearer token + middleware)",
    );
  }
  return req.userId;
}
