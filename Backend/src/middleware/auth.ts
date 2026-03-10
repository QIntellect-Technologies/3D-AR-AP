// import type { Request, Response, NextFunction } from "express";

// export interface AuthedRequest extends Request {
//   userId?: string;
//   userEmail?: string;
// }

// const supabaseUrl = process.env.SUPABASE_URL!;

// // This avoids ts-node/CommonJS rewriting import("jose") to require("jose")
// const importJose = new Function("s", "return import(s)") as (
//   s: string,
// ) => Promise<typeof import("jose")>;

// let josePromise: Promise<typeof import("jose")> | null = null;
// function getJose() {
//   if (!josePromise) {
//     josePromise = importJose("jose");
//   }
//   return josePromise;
// }

// let jwksPromise: Promise<ReturnType<
//   (typeof import("jose"))["createRemoteJWKSet"]
// > | null> | null = null;

// async function getJwks() {
//   if (!jwksPromise) {
//     jwksPromise = getJose().then(({ createRemoteJWKSet }) =>
//       createRemoteJWKSet(
//         new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
//       ),
//     );
//   }
//   return jwksPromise;
// }

// export async function authenticate(
//   req: AuthedRequest,
//   res: Response,
//   next: NextFunction,
// ) {
//   try {
//     const header = req.headers.authorization || "";
//     const token = header.startsWith("Bearer ") ? header.slice(7) : null;

//     if (!token) {
//       return res.status(401).json({ error: "Missing Bearer token" });
//     }

//     const { jwtVerify } = await getJose();
//     const jwks = await getJwks();

//     const { payload } = await jwtVerify(token, jwks!, {
//       issuer: `${supabaseUrl}/auth/v1`,
//     });

//     req.userId = typeof payload.sub === "string" ? payload.sub : undefined;
//     req.userEmail =
//       typeof payload.email === "string" ? payload.email : undefined;

//     if (!req.userId) {
//       return res.status(401).json({ error: "Invalid token payload" });
//     }

//     console.log(`Authenticated user: ${req.userId} (${req.userEmail})`);
//     return next();
//   } catch (e: any) {
//     console.error("JWT auth failed:", e?.message ?? String(e));
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// }
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
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const { jwtVerify } = await getJose();
    const jwks = await getJwks();

    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${supabaseUrl}/auth/v1`,
      clockTolerance: 120, // 2 minutes tolerance
    });

    req.userId = typeof payload.sub === "string" ? payload.sub : undefined;
    req.userEmail =
      typeof payload.email === "string" ? payload.email : undefined;

    if (!req.userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    console.log(`Authenticated user: ${req.userId} (${req.userEmail})`);
    return next();
  } catch (e: any) {
    console.error("JWT auth failed:", e?.message ?? String(e));
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
