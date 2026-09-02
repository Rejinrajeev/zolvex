/**
 * `fetch` for admin BFF (`/admin/api/*`) calls made from client components.
 *
 * When the session is over — the access token expired and the refresh token
 * could not renew it — every BFF route answers `401`. Left alone, each page
 * just renders "Could not load…" against a dead session and the admin is
 * stuck there until they manually reload. This wrapper turns that 401 into a
 * hard redirect to the login screen instead.
 *
 * The redirect uses `window.location` (not the router) so all in-memory
 * React state is dropped and the middleware re-runs, and the returned
 * promise never resolves in that case, so the calling component never gets
 * to flip into its error state before the navigation happens.
 */
export function adminFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init).then((res) => {
    if (res.status === 401) {
      window.location.href = "/admin/login?expired=1";
      return new Promise<Response>(() => {});
    }
    return res;
  });
}
