import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

const supabaseUrl = process.env.SUPABASE_URL!;

const importJose = new Function("s", "return import(s)") as (
  s: string,
) => Promise<typeof import("jose")>;

let josePromise: Promise<typeof import("jose")> | null = null;
function getJose() {
  if (!josePromise) {
    josePromise = importJose("jose");
  }
  return josePromise;
}

let jwksPromise: Promise<any> | null = null;
async function getJwks() {
  if (!jwksPromise) {
    jwksPromise = getJose().then(({ createRemoteJWKSet }) =>
      createRemoteJWKSet(
        new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
      ),
    );
  }
  return jwksPromise;
}

export async function authenticate(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization || "";
    console.log("[Auth] Header present:", !!header);
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    console.log("[Auth] Token length:", token?.length || 0);

    if (!token) {
      console.log("[Auth] Missing token");
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const { jwtVerify } = await getJose();
    const jwks = await getJwks();

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `${supabaseUrl}/auth/v1`,
        clockTolerance: 120, // 2 minutes tolerance
      });
      console.log("[Auth] Verified, user:", payload.sub);
      req.userId = payload.sub;
      req.userEmail =
        typeof payload.email === "string" ? payload.email : undefined;
      return next();
    } catch (verifyErr: any) {
      console.error("[Auth] JWT verification error:", verifyErr.message);
      console.error("[Auth] Full error:", verifyErr);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (e: any) {
    console.error("[Auth] JWT auth failed:", e?.message ?? String(e));
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
