// Thin fetch wrapper for the PHP API. Same approach as the sales dashboard:
// full backend URL, login token sent in a custom header (no cookies).

// The backend file on your Hostinger site. Every call goes to this one real file, with the
// route in ?r=  (e.g. .../backend/index.php?r=/login), so no URL rewriting is needed.
const BASE = 'https://united.webhostdevs.com/backend/index.php';

// '/availability?week=2026-10-19'  ->  BASE + '?r=/availability&week=2026-10-19'
function url(path) {
  const [route, query] = path.split('?');
  return `${BASE}?r=${encodeURIComponent(route)}${query ? '&' + query : ''}`;
}

const TOKEN_KEY = 'roster_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

function headers() {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { 'X-Auth-Token': token } : {}) };
}

async function request(method, path, body) {
  const res = await fetch(url(path), {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
};
