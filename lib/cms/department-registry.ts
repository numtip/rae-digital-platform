// M13 Departments / org structure: a tree (parent/child) of units with Thai + English names. Pure rules.
// No personnel link until M12; units are archived, never deleted.

export const DEPARTMENT_STATUSES = ["draft", "published", "archived"] as const;
export const DEPARTMENT_CODE = /^RAE-DP-\d{4,}$/;
export const MAX_DEPTH = 4;

export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number];

export type Department = {
  code: string;
  parentCode: string | null;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  descriptionEn: string;
  sortOrder: number;
  status: DepartmentStatus;
  createdBy: string;
  updatedAt: number;
};

export type DepartmentInput = Partial<Omit<Department, "code" | "createdBy" | "updatedAt">>;

export class DepartmentInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "DepartmentInvalid";
  }
}

const text = (value: unknown, max: number, field: string, required = false) => {
  const v = typeof value === "string" ? value.trim() : "";
  if (required && !v) throw new DepartmentInvalid(`${field} is required`);
  if (v.length > max) throw new DepartmentInvalid(`${field} is longer than ${max} characters`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw new DepartmentInvalid(`${field} has control characters`);
  return v;
};

export const formatDepartmentCode = (n: number) => `RAE-DP-${String(n).padStart(4, "0")}`;

/** Depth of a unit's chain to the root (root = 1); throws on a cycle or a missing ancestor. */
function depthOf(code: string | null, byCode: Map<string, Department>, seen = new Set<string>()): number {
  if (code === null) return 0;
  if (seen.has(code)) throw new DepartmentInvalid("the parent chain would loop");
  const node = byCode.get(code);
  if (!node) throw new DepartmentInvalid("parent unit does not exist");
  seen.add(code);
  return 1 + depthOf(node.parentCode, byCode, seen);
}

/**
 * Validates the fields and where the unit sits. `self` is the unit being edited (null on create); `all` is every
 * existing unit. Refuses self-parenting, loops, a parent that is archived, and a tree deeper than MAX_DEPTH
 * (counting the unit's own subtree when it moves).
 */
export function validateDepartment(input: DepartmentInput, all: Department[], self: Department | null) {
  const status = (input.status ?? "draft") as string;
  if (!(DEPARTMENT_STATUSES as readonly string[]).includes(status)) throw new DepartmentInvalid("unknown status");
  const order = input.sortOrder === undefined ? 100 : Number(input.sortOrder);
  if (!Number.isInteger(order) || order < 0 || order > 100000) throw new DepartmentInvalid("sortOrder must be a whole number 0–100000");
  const parentCode = input.parentCode === undefined || input.parentCode === "" ? null : (input.parentCode as string | null);
  if (parentCode !== null) {
    if (!DEPARTMENT_CODE.test(parentCode)) throw new DepartmentInvalid("parentCode is not a department code");
    if (self && parentCode === self.code) throw new DepartmentInvalid("a unit cannot be its own parent");
    const byCode = new Map(all.map((d) => [d.code, d]));
    if (self) byCode.set(self.code, { ...self, parentCode }); // test the chain as it will be
    const parent = byCode.get(parentCode);
    if (!parent) throw new DepartmentInvalid("parent unit does not exist");
    if (parent.status === "archived") throw new DepartmentInvalid("parent unit is archived");
    const above = depthOf(parentCode, byCode);
    const below = self ? subtreeHeight(self.code, byCode) : 0;
    if (above + 1 + below > MAX_DEPTH) throw new DepartmentInvalid(`the tree may be at most ${MAX_DEPTH} levels deep`);
  }
  return {
    parentCode,
    nameTh: text(input.nameTh, 200, "nameTh", true),
    nameEn: text(input.nameEn, 200, "nameEn", true),
    descriptionTh: text(input.descriptionTh, 1000, "descriptionTh"),
    descriptionEn: text(input.descriptionEn, 1000, "descriptionEn"),
    sortOrder: order,
    status: status as DepartmentStatus,
  };
}

function subtreeHeight(code: string, byCode: Map<string, Department>): number {
  const kids = [...byCode.values()].filter((d) => d.parentCode === code);
  return kids.length === 0 ? 0 : 1 + Math.max(...kids.map((k) => subtreeHeight(k.code, byCode)));
}

export function applyDepartmentUpdate(current: Department, input: DepartmentInput, all: Department[], now: number): Department {
  const merged = validateDepartment(
    {
      parentCode: input.parentCode === undefined ? current.parentCode : input.parentCode,
      nameTh: input.nameTh ?? current.nameTh,
      nameEn: input.nameEn ?? current.nameEn,
      descriptionTh: input.descriptionTh ?? current.descriptionTh,
      descriptionEn: input.descriptionEn ?? current.descriptionEn,
      sortOrder: input.sortOrder ?? current.sortOrder,
      status: input.status ?? current.status,
    },
    all,
    current,
  );
  return { ...current, ...merged, updatedAt: now };
}

export const bySort = <T extends { sortOrder: number; code: string }>(a: T, b: T) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code);

/** Public tree: published units whose whole chain is published (a hidden parent hides its children). Flat, ordered by sortOrder then code (the page nests it by parentCode). */
export function publicDepartments(all: Department[]) {
  const byCode = new Map(all.map((d) => [d.code, d]));
  const visible = (d: Department, hops = 0): boolean => d.status === "published" && (d.parentCode === null || (hops < MAX_DEPTH + 1 && !!byCode.get(d.parentCode) && visible(byCode.get(d.parentCode)!, hops + 1)));
  return all
    .filter((d) => visible(d))
    .sort(bySort)
    .map((d) => ({ code: d.code, parentCode: d.parentCode, nameTh: d.nameTh, nameEn: d.nameEn, descriptionTh: d.descriptionTh, descriptionEn: d.descriptionEn, sortOrder: d.sortOrder }));
}
