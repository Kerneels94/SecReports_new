/** True when the user's granted permission list includes `key`. */
export function hasPermission(
  user: { permissions?: string[] } | null,
  key: string,
): boolean {
  return user?.permissions?.includes(key) ?? false;
}