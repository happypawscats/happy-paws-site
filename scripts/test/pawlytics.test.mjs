import test from 'node:test';
import assert from 'node:assert/strict';
import { graphqlClient, login, settingsFromEnv } from '../lib/pawlytics.mjs';

const settings = { domain: 'example.auth0.test', audience: 'https://api.example.test', clientId: 'client123', username: 'site@example.test', password: 'hunter2-secret' };
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('login posts the password grant to the Auth0 domain and returns the token', async () => {
  let seen;
  const token = await login(settings, async (url, init) => { seen = { url, init }; return reply(200, { access_token: 'tok-abc' }); });
  assert.equal(token, 'tok-abc');
  assert.equal(seen.url, 'https://example.auth0.test/oauth/token');
  const body = JSON.parse(seen.init.body);
  assert.deepEqual(body, { grant_type: 'password', username: settings.username, password: settings.password, audience: settings.audience, client_id: 'client123', scope: 'openid' });
});
test('a failed login explains what to check and never repeats the password', async () => {
  await assert.rejects(
    login(settings, async () => reply(403, { error: 'invalid_grant', error_description: 'Wrong email or password.' })),
    (err) => /login failed \(HTTP 403\)/.test(err.message) && /Wrong email or password/.test(err.message) && !err.message.includes(settings.password),
  );
});
test('missing settings are named, not guessed', async () => {
  await assert.rejects(login({ ...settings, audience: '' }, async () => reply(200, {})), /Missing setting: audience/);
});
test('graphql calls send the token as a bearer header and return the data', async () => {
  let seen;
  const q = graphqlClient({ token: 'tok-abc', fetchFn: async (url, init) => { seen = { url, init }; return reply(200, { data: { hello: 1 } }); } });
  assert.deepEqual(await q('{ hello }', { a: 1 }), { hello: 1 });
  assert.equal(seen.url, 'https://api.pawlytics.com/api/graphql');
  assert.equal(seen.init.headers.authorization, 'Bearer tok-abc');
  assert.deepEqual(JSON.parse(seen.init.body), { query: '{ hello }', variables: { a: 1 } });
});
test('graphql errors surface without leaking the token', async () => {
  const q = graphqlClient({ token: 'tok-abc', fetchFn: async () => reply(200, { errors: [{ message: 'Field "x" not found' }] }) });
  await assert.rejects(q('{ x }'), (err) => /not found/.test(err.message) && !err.message.includes('tok-abc'));
  const down = graphqlClient({ token: 'tok-abc', fetchFn: async () => reply(502, {}) });
  await assert.rejects(down('{ x }'), /HTTP 502/);
});
test('settings come from the environment variables the README names', () => {
  assert.deepEqual(
    settingsFromEnv({ AUTH0_DOMAIN: 'd', AUTH0_AUDIENCE: 'a', AUTH0_CLIENT_ID: 'c', PAWLYTICS_USERNAME: 'u', PAWLYTICS_PASSWORD: 'p' }),
    { domain: 'd', audience: 'a', clientId: 'c', username: 'u', password: 'p' },
  );
});
