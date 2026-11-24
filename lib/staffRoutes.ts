export type StaffType = "washer" | "folder" | "fumigator";

function isStaffType(value: unknown): value is StaffType {
  return value === "washer" || value === "folder" || value === "fumigator";
}

export function getStaffType(role: unknown, staffType: unknown): StaffType | null {
  if (isStaffType(role)) return role;
  if (role === "staff" && isStaffType(staffType)) return staffType;
  return null;
}

export function getStaffDashboardPath(role: unknown, staffType: unknown): string | null {
  const resolvedStaffType = getStaffType(role, staffType);
  return resolvedStaffType ? `/staff/${resolvedStaffType}` : null;
}
