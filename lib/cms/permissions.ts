export type Permission =
  | "news:draft"
  | "news:review"
  | "news:publish"
  | "media:upload"
  | "document:register"
  | "audit:read"
  | "user:assign_role";

export type RoleName = "viewer" | "officer" | "editor" | "publisher" | "admin";

export const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  // A consumer of the published site: it reads, so it needs no permission at all, and every
  // write route refuses it. The read endpoints filter on news:draft instead of on this key.
  viewer: [],
  officer: ["news:draft", "media:upload", "document:register"],
  editor: ["news:draft", "news:review", "media:upload", "document:register"],
  publisher: ["news:draft", "news:review", "news:publish", "media:upload", "document:register"],
  admin: [
    "news:draft",
    "news:review",
    "news:publish",
    "media:upload",
    "document:register",
    "audit:read",
    "user:assign_role",
  ],
};

export class PermissionDenied extends Error {
  readonly status = 403;
  constructor(permission: Permission) {
    super(`missing permission ${permission}`);
    this.name = "PermissionDenied";
  }
}

export function hasPermission(role: RoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(role: RoleName, permission: Permission): void {
  if (!hasPermission(role, permission)) throw new PermissionDenied(permission);
}
