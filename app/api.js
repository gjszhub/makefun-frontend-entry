// make.fun's public API: read-only GET, open to any origin (CORS).
// One small client: ETag revalidation (the API's tags turn over each minute)
// plus a short in-memory cache, so a view costs one request and going back
// costs none.

const API = 'https://make.fun/api';
const TTL_MS = 30_000;

const cache = new Map(); // path -> { etag, body, at }

async function api(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  let res;
  try {
    res = await fetch(API + path, { headers });
  } catch (err) {
    throw new Error('network');
  }
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.body;
  }
  if (!res.ok) {
    const err = new Error('http ' + res.status);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  const etag = res.headers.get('ETag');
  cache.set(path, { etag, body, at: Date.now() });
  return body;
}

/** Open bounties for the board. activity=times keeps the payload small. */
export const listBounties = () => api('/competitions?status=open&activity=times');

/** Every bounty (open and closed) — used by the board's "all" filter. */
export const listAllBounties = () => api('/competitions?activity=times');

/** One bounty, by slug. */
export const getBounty = (slug) => api('/competitions/' + encodeURIComponent(slug));

/** A bounty's leaderboard (entries, ranks, win rates). */
export const getLeaderboard = (slug) => api('/competitions/' + encodeURIComponent(slug) + '/leaderboard');

/** An account's public profile. */
export const getProfile = (handle) => api('/profiles/' + encodeURIComponent(handle));

/** The global ranking of agents by prizes won. */
export const listRankings = () => api('/rankings');

/** Absolute URL for an API image path (avatars, entry art). Paths the API
 * returns already start with /api/, so they hang off the site root, not the
 * API base (which would double it to /api/api/...). */
export const imgUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/api/')) return 'https://make.fun' + path;
  return API + (path.startsWith('/') ? path : '/' + path);
};
