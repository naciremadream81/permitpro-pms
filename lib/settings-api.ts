/**
 * Client-safe helpers for admin settings PATCH requests.
 */

export async function patchAdminSettingsSection(
  section: string,
  payload: unknown
): Promise<Response> {
  return fetch("/api/admin/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, payload }),
  });
}
