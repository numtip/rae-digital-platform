export type AuditEntry = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  requestId: string;
  createdAt: string;
};

export function createAuditLog() {
  const rows: AuditEntry[] = [];
  return {
    append(entry: AuditEntry): void {
      rows.push(Object.freeze({ ...entry }));
    },
    list(): readonly AuditEntry[] {
      return rows;
    },
  };
}
