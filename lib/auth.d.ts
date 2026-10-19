export const SESSION_COOKIE: string;
export type SessionPayload = { sub: string; email: string; name: string; role: string; exp: number };

export function sessionSecret(): string;
export function hashPassword(password: string, salt?: string): string;
export function verifyPassword(password: string, stored: string): boolean;
export function signSession(payload: SessionPayload): string;
export function readSession(token?: string): SessionPayload | null;
export function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};
export function getSession(): Promise<SessionPayload | null>;
export function requireAdmin(): Promise<SessionPayload | null>;
export function hashIp(ip: string): string;
export function ensureAdminSeed(): { created: boolean; email?: string; usingDefaultPassword?: boolean };
export function createSessionFor(user: Record<string, any>): string;
export function authenticate(email: string, password: string): Record<string, any> | null;
