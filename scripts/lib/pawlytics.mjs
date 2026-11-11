// Talking to Pawlytics: an Auth0 password login, then GraphQL calls with the token.
// Nothing here prints or stores the password or the token. Error messages never include them.

export async function login({ domain, audience, clientId, username, password }, fetchFn = fetch) {
  for (const [k, v] of Object.entries({ domain, audience, clientId, username, password })) {
    if (!v) throw new Error(`Missing setting: ${k}. See scripts/README.md.`);
  }
  const res = await fetchFn(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'password', username, password, audience, client_id: clientId, scope: 'openid' }),
    signal: AbortSignal.timeout(30000),
  });
  let body = {};
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || !body.access_token) {
    const why = [body.error, body.error_description].filter(Boolean).join(': ');
    throw new Error(`Pawlytics login failed (HTTP ${res.status})${why ? `: ${String(why).slice(0, 200)}` : ''}. Check the Auth0 settings, the username and the password.`);
  }
  return body.access_token;
}

export function graphqlClient({ endpoint = 'https://api.pawlytics.com/api/graphql', token, fetchFn = fetch }) {
  return async function query(text, variables = {}) {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      // "Bearer" is the usual form. Pawlytics' page only says to send the token "as a header", so confirm
      // this against the first real call.
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: text, variables }),
      signal: AbortSignal.timeout(60000),
    });
    let body = {};
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) throw new Error(`Pawlytics request failed (HTTP ${res.status}).`);
    if (body.errors && body.errors.length) {
      throw new Error(`Pawlytics returned errors: ${body.errors.map((e) => String(e.message).slice(0, 200)).join('; ')}`);
    }
    return body.data;
  };
}

export function settingsFromEnv(env = process.env) {
  return {
    domain: env.AUTH0_DOMAIN,
    audience: env.AUTH0_AUDIENCE,
    clientId: env.AUTH0_CLIENT_ID,
    username: env.PAWLYTICS_USERNAME,
    password: env.PAWLYTICS_PASSWORD,
  };
}
