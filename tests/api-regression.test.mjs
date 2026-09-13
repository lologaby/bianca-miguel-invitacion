import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { createHmac } from 'node:crypto';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GUESTS = 'guests:bianca-placeholder-2026';
const REMOVED = 'guests:removed:bianca-placeholder-2026';
const rsvpKey = (id) => 'rsvp:bianca-placeholder-2026:' + id;
const SECRET = 'isolated-regression-fixture-secret-000000000000000000';
const tick = () => new Promise((resolveTick) => setImmediate(resolveTick));

/*
 * Executes the actual TypeScript handlers and Redis adapter against a private
 * in-memory Redis command double. No environment files or network are read.
 * EVAL models Redis's serialized execution of the two JSON-list mutations;
 * SET NX is also atomic. The tests exercise observable API workflows.
 */
function fixture() {
  process.env.SESSION_SECRET = SECRET;
  process.env.ADMIN_PASSWORD = 'isolated-fixture-admin-password';
  process.env.REDIS_URL = 'redis://isolated-fixture.invalid:6379';
  process.env.VERCEL_ENV = 'production';
  process.env.GUESTS_JSON = '[]';
  process.env.PRIVATE_EVENT_JSON = JSON.stringify({
    couple: { first: 'Fixture', second: 'Example' },
    start: '2030-01-01T12:00:00Z',
    ceremony: { name: 'Fixture' },
  });
  const db = new Map();
  const failures = new Set();
  const commands = [];
  const check = (...keys) => {
    if (failures.has('*') || keys.some((key) => failures.has(key))) throw new Error('Fixture storage unavailable');
  };
  const client = {
    isOpen: false,
    on() {},
    async connect() { this.isOpen = true; },
    async get(key) { await tick(); check(key); return db.get(key) ?? null; },
    async set(key, value, options) {
      await tick(); check(key);
      commands.push({ operation: 'set', key, nx: options?.NX === true });
      if (options?.NX && db.has(key)) return null;
      db.set(key, value);
      return 'OK';
    },
    async incr(key) { await tick(); check(key); const count = Number(db.get(key) ?? 0) + 1; db.set(key, String(count)); return count; },
    async expire(key) { check(key); return 1; },
    async mGet(keys) { await tick(); check(...keys); return keys.map((key) => db.get(key) ?? null); },
    async eval(script, { keys, arguments: args }) {
      await tick(); check(...keys);
      commands.push({ operation: 'eval', keys });
      // No awaits after reading: Redis runs the full EVAL as one operation.
      const guests = JSON.parse(db.get(keys[0]) ?? '[]');
      if (!Array.isArray(guests)) throw new Error('Invalid guest list');
      if (script.includes('-- append-guest-v1')) {
        if (guests.length >= Number(args[1])) return 0;
        guests.push(JSON.parse(args[0]));
        db.set(keys[0], JSON.stringify(guests));
        return 1;
      }
      assert.ok(script.includes('-- remove-guest-v1'), 'Unexpected Redis script');
      const removed = JSON.parse(db.get(keys[1]) ?? '[]');
      if (!Array.isArray(removed)) throw new Error('Invalid removed list');
      const remaining = guests.filter((guest) => guest.id !== args[0]);
      const removesSeed = args[1] === '1' && !removed.includes(args[0]);
      if (remaining.length === guests.length && !removesSeed) return 0;
      if (remaining.length !== guests.length) db.set(keys[0], JSON.stringify(remaining));
      if (removesSeed) { removed.push(args[0]); db.set(keys[1], JSON.stringify(removed)); }
      return 1;
    },
  };

  const modules = new Map();
  function load(file) {
    file = resolve(root, file).replace(/\.js$/, '.ts');
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const source = readFileSync(file, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(file).href));
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (specifier) => {
      if (specifier === 'redis') return {
        createClient(options) {
          assert.equal(options.url, 'redis://isolated-fixture.invalid:6379');
          return client;
        },
      };
      if (specifier === 'node:fs/promises') return { readFile: async () => Buffer.from('fixture-artwork') };
      return specifier.startsWith('.') ? load(resolve(dirname(file), specifier)) : require(specifier);
    };
    vm.runInThisContext('(function(exports, require, module) {' + compiled + '\n})', { filename: file })(
      module.exports, localRequire, module,
    );
    return module.exports;
  }
  const security = load('api/_security.ts');
  const admin = load('api/_admin.ts');
  const store = load('api/_guests-store.ts');
  const guest = (id = 'fixture-guest', extras = {}) => ({
    id, name: 'Fixture Guest', partyLimit: 2, plusOneAllowed: false,
    codeHash: store.hashCode('FIXT-ABCD'), ...extras,
  });
  const seed = (guests) => { process.env.GUESTS_JSON = JSON.stringify(guests); };
  const put = (key, value) => db.set(key, JSON.stringify(value));
  const request = ({ guest: person, admin: isAdmin, ...options } = {}) => ({
    method: 'GET',
    headers: { 'content-type': 'application/json', origin: 'https://fixture.test', host: 'fixture.test' },
    cookies: {
      ...(person ? { bianca_session: security.signSession(person) } : {}),
      ...(isAdmin ? { bianca_admin: admin.signAdminSession() } : {}),
    },
    ...options,
  });
  async function call(file, options) {
    const res = {
      code: 200, headers: {}, body: undefined,
      setHeader(key, value) { this.headers[key] = value; },
      status(code) { this.code = code; return this; },
      json(value) { this.body = value; },
      send(value) { this.body = value; },
      end() {},
    };
    await load('api/' + file + '.ts').default(request(options), res);
    return res;
  }
  return { db, failures, commands, load, guest, seed, put, call, request, security, admin, store };
}

test('anonymous endpoints and private artwork deny access without querying storage', async () => {
  const f = fixture();
  f.failures.add('*');
  for (const route of ['session', 'admin-guests', 'admin-rsvps']) {
    const res = await f.call(route);
    assert.equal(res.code, 401);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  }
  assert.equal((await f.call('private-asset', { query: { file: 'wordmark.webp' } })).code, 404);
  assert.equal((await f.call('rsvp', { method: 'POST', body: { attendance: 'yes', partySize: 1 } })).code, 401);
});

test('portal-created guest restores a session and receives a null RSVP before responding', async () => {
  const f = fixture();
  const person = f.guest();
  f.put(GUESTS, [person]);
  const res = await f.call('session', { guest: person });
  assert.equal(res.code, 200);
  assert.equal(res.body.guest.name, person.name);
  assert.equal(res.body.rsvp, null);
});

test('removed seed and portal guests lose session, RSVP and private artwork access', async () => {
  const f = fixture();
  const seeded = f.guest('fixture-seed');
  const added = f.guest('fixture-added');
  f.seed([seeded]);
  f.put(GUESTS, [added]);
  for (const person of [seeded, added]) {
    assert.equal((await f.call('admin-guests', { admin: true, method: 'DELETE', query: { id: person.id } })).code, 200);
    assert.equal((await f.call('session', { guest: person })).code, 401);
    assert.equal((await f.call('rsvp', { guest: person, method: 'POST', body: { attendance: 'yes', partySize: 1 } })).code, 401);
    assert.equal((await f.call('private-asset', { guest: person, query: { file: 'wordmark.webp' } })).code, 404);
  }
  assert.deepEqual(JSON.parse(f.db.get(GUESTS)), []);
});

test('storage outage or malformed revocation data fails closed with generic errors', async () => {
  const f = fixture();
  const person = f.guest();
  f.seed([person]);
  for (const mode of ['unreachable', 'invalid-json', 'invalid-shape']) {
    f.failures.clear();
    if (mode === 'unreachable') f.failures.add(REMOVED);
    else f.db.set(REMOVED, mode === 'invalid-json' ? '{broken' : '{}');
    for (const route of ['session', 'private-asset']) {
      const res = await f.call(route, { guest: person, query: { file: 'wordmark.webp' } });
      assert.equal(res.code, 503);
      assert.ok(res.body.error.code);
      assert.ok(!JSON.stringify(res.body).includes('Fixture storage'));
    }
  }
});

test('malformed, expired, wrong-scope and missing-secret sessions are denied', () => {
  const f = fixture();
  for (const raw of ['not-a-session', 'e30.invalid', f.admin.signAdminSession(), f.security.signSession(f.guest()) + '.extra']) {
    assert.equal(f.security.readSession(f.request({ cookies: { bianca_session: raw } })), null);
  }
  const signFixture = (value) => {
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
    return payload + '.' + createHmac('sha256', SECRET).update(payload).digest('base64url');
  };
  const expired = signFixture({ ...f.guest(), exp: Date.now() - 1 });
  assert.equal(f.security.readSession(f.request({ cookies: { bianca_session: expired } })), null);
  const expiredAdmin = signFixture({ scope: 'rsvp-admin', exp: Date.now() - 1 });
  assert.equal(f.admin.isAdmin(f.request({ cookies: { bianca_admin: expiredAdmin } })), false);
  assert.equal(f.security.readSession(f.request({ cookies: { bianca_session: expired.replace(/^./, '_') } })), null);
  delete process.env.SESSION_SECRET;
  assert.equal(f.security.readSession(f.request({ cookies: { bianca_session: expired } })), null);
  assert.equal(f.admin.isAdmin(f.request({ cookies: { bianca_admin: expired } })), false);
});

test('admin login fails safely when session configuration is unavailable', async () => {
  const f = fixture();
  const options = { method: 'POST', body: { password: 'isolated-fixture-admin-password' } };
  const login = await f.call('admin-login', options);
  assert.equal(login.code, 200);
  assert.match(login.headers['Set-Cookie'], /^bianca_admin=.+; Path=/);
  delete process.env.SESSION_SECRET;
  const unavailable = await f.call('admin-login', options);
  assert.equal(unavailable.code, 503);
  assert.equal(unavailable.headers['Set-Cookie'], undefined);
  assert.ok(!JSON.stringify(unavailable.body).includes('SESSION_SECRET'));
});

test('logout expires the admin cookie and rejects a foreign origin or wrong method', async () => {
  const f = fixture();
  assert.equal((await f.call('admin-logout')).code, 405);
  assert.equal((await f.call('admin-logout', { method: 'POST', headers: { origin: 'https://other.test', host: 'fixture.test' } })).code, 403);
  const res = await f.call('admin-logout', { admin: true, method: 'POST' });
  assert.equal(res.code, 200);
  assert.match(res.headers['Set-Cookie'], /^bianca_admin=;/);
  for (const attribute of ['Max-Age=0', 'HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/']) {
    assert.ok(res.headers['Set-Cookie'].includes(attribute));
  }
});

test('parallel additions and deletions preserve every unrelated invitation', async () => {
  const f = fixture();
  const created = await Promise.all(Array.from({ length: 16 }, (_, n) =>
    f.call('admin-guests', { admin: true, method: 'POST', body: { name: 'Fixture ' + n, partyLimit: 2 } })));
  assert.ok(created.every((res) => res.code === 201));
  const ids = created.map((res) => res.body.guest.id);
  assert.equal(new Set(ids).size, 16);
  const changed = await Promise.all([
    ...ids.slice(0, 8).map((id) => f.call('admin-guests', { admin: true, method: 'DELETE', query: { id } })),
    ...Array.from({ length: 8 }, (_, n) => f.call('admin-guests', { admin: true, method: 'POST', body: { name: 'New fixture ' + n } })),
  ]);
  assert.ok(changed.every((res) => res.code === 200 || res.code === 201));
  const listed = await f.call('admin-guests', { admin: true });
  assert.equal(listed.body.guests.length, 16);
  assert.ok(ids.slice(8).every((id) => listed.body.guests.some((person) => person.id === id)));
  assert.equal(f.commands.filter((command) => command.operation === 'eval').length, 32);
});

test('parallel creation enforces the list limit atomically', async () => {
  const f = fixture();
  f.put(GUESTS, Array.from({ length: 399 }, (_, n) => f.guest('fixture-' + n)));
  const results = await Promise.all([0, 1].map((n) =>
    f.call('admin-guests', { admin: true, method: 'POST', body: { name: 'Last fixture ' + n } })));
  assert.deepEqual(results.map((res) => res.code).sort(), [201, 409]);
  assert.equal(JSON.parse(f.db.get(GUESTS)).length, 400);
});

test('delete and recreate cannot inherit an old RSVP or reactivate an old cookie', async () => {
  const f = fixture();
  const create = () => f.call('admin-guests', { admin: true, method: 'POST', body: { name: 'Same fixture name' } });
  const first = (await create()).body.guest;
  f.put(rsvpKey(first.id), { attendance: 'yes', partySize: 2, plusOneName: '', updatedAt: '2030-01-01T00:00:00Z' });
  await f.call('admin-guests', { admin: true, method: 'DELETE', query: { id: first.id } });
  const next = (await create()).body.guest;
  assert.notEqual(next.id, first.id);
  assert.equal((await f.call('session', { guest: first })).code, 401);
  assert.equal((await f.call('session', { guest: next })).body.rsvp, null);
  assert.equal((await f.call('admin-rsvps', { admin: true })).body.records[0].attendance, 'pending');
});

test('RSVP validates current capacity and positive attendance independently of legacy companion permission', async () => {
  const f = fixture();
  const old = f.guest('fixture-limits', { partyLimit: 5, plusOneAllowed: true });
  f.seed([{ ...old, partyLimit: 2, plusOneAllowed: false }]);
  for (const partySize of [0, -1, 1.5, 3]) {
    assert.equal((await f.call('rsvp', { guest: old, method: 'POST', body: { attendance: 'yes', partySize } })).code, 400);
  }
  const res = await f.call('rsvp', { guest: old, method: 'POST', body: { attendance: 'yes', partySize: 2, attendeeNames: ['Fixture Guest', 'Invited person'], plusOneName: 'Legacy field ignored' } });
  assert.equal(res.code, 200);
  assert.equal(res.body.rsvp.plusOneName, '');
  assert.deepEqual(res.body.rsvp.attendeeNames, ['Fixture Guest', 'Invited person']);
});

test('first RSVP persists across login, session reload and conflicting concurrent retries', async () => {
  const f = fixture();
  const person = f.guest('fixture-answer', { plusOneAllowed: true });
  f.seed([person]);
  const first = await f.call('rsvp', { guest: person, method: 'POST', body: {
    attendance: 'yes', partySize: 2, attendeeNames: ['Fixture Guest', 'Fixture companion'], dietary: 'Fixture dietary note',
  } });
  assert.equal(first.code, 200);
  assert.deepEqual(Object.keys(first.body.rsvp).sort(), ['attendance', 'attendeeNames', 'partySize', 'plusOneName', 'updatedAt']);
  const before = f.db.get(rsvpKey(person.id));
  const repeated = await Promise.all(Array.from({ length: 8 }, () =>
    f.call('rsvp', { guest: person, method: 'POST', body: { attendance: 'no', partySize: 0 } })));
  assert.ok(repeated.every((res) => res.code === 200));
  repeated.forEach((res) => assert.deepEqual(res.body.rsvp, first.body.rsvp));
  assert.equal(f.db.get(rsvpKey(person.id)), before);
  assert.deepEqual((await f.call('session', { guest: person })).body.rsvp, first.body.rsvp);
  const login = await f.call('guest', { method: 'POST', body: { code: 'fixt abcd' } });
  assert.equal(login.code, 200);
  assert.deepEqual(login.body.rsvp, first.body.rsvp);
  assert.ok(!JSON.stringify(login.body).includes('Fixture dietary note'));
});

test('existing legacy confirmations and link reentry retain the saved answer', async () => {
  const f = fixture();
  const person = f.guest('fixture-legacy', { linkHash: f.store.hashToken('fixture-link-token') });
  f.seed([person]);
  const legacy = { attendance: 'yes', partySize: 0, updatedAt: '2030-01-01T00:00:00Z' };
  f.put(rsvpKey(person.id), legacy);
  const response = (await f.call('session', { guest: person })).body.rsvp;
  assert.deepEqual(response, { ...legacy, plusOneName: '' });
  const byLink = await f.call('guest', { method: 'POST', body: { linkToken: 'fixture-link-token' } });
  assert.equal(byLink.code, 200);
  assert.deepEqual(byLink.body.rsvp, response);
  const repeated = await f.call('rsvp', { guest: person, method: 'POST', body: { attendance: 'no' } });
  assert.equal(repeated.code, 200);
  assert.deepEqual(repeated.body.rsvp, response);
  assert.deepEqual(JSON.parse(f.db.get(rsvpKey(person.id))), legacy);
});

test('two first responses in flight resolve to one identical saved response via SET NX', async () => {
  const f = fixture();
  const person = f.guest('fixture-race');
  f.seed([person]);
  const results = await Promise.all([
    f.call('rsvp', { guest: person, method: 'POST', body: { attendance: 'yes', partySize: 2, attendeeNames: ['Fixture Guest', 'Fixture companion'] } }),
    f.call('rsvp', { guest: person, method: 'POST', body: { attendance: 'no', partySize: 0 } }),
  ]);
  assert.ok(results.every((res) => res.code === 200));
  assert.deepEqual(results[0].body.rsvp, results[1].body.rsvp);
  const writes = f.commands.filter((command) => command.operation === 'set' && command.key === rsvpKey(person.id));
  assert.ok(writes.length >= 1);
  assert.ok(writes.every((command) => command.nx));
});

test('declined RSVP is persistent and always stores zero attendees', async () => {
  const f = fixture();
  const person = f.guest();
  f.seed([person]);
  const res = await f.call('rsvp', { guest: person, method: 'POST', body: { attendance: 'no', partySize: 9, attendeeNames: ['Must not persist'], plusOneName: 'Must not persist' } });
  assert.equal(res.code, 200);
  assert.equal(res.body.rsvp.partySize, 0);
  assert.deepEqual(res.body.rsvp.attendeeNames, []);
  assert.equal(res.body.rsvp.plusOneName, '');
  assert.equal((await f.call('session', { guest: person })).body.rsvp.attendance, 'no');
});

test('failed or corrupt RSVP storage never reports success or prompts a fresh response', async () => {
  const f = fixture();
  const person = f.guest();
  f.seed([person]);
  f.failures.add(rsvpKey(person.id));
  for (const route of ['session', 'rsvp']) {
    const res = await f.call(route, { guest: person, method: route === 'rsvp' ? 'POST' : 'GET', body: { attendance: 'yes', partySize: 1 } });
    assert.equal(res.code, 503);
    assert.ok(res.body.error);
  }
  assert.equal(f.db.has(rsvpKey(person.id)), false);
  f.failures.clear();
  f.db.set(rsvpKey(person.id), '{"attendance":"broken"}');
  assert.equal((await f.call('session', { guest: person })).code, 503);
  assert.equal((await f.call('rsvp', { guest: person, method: 'POST', body: { attendance: 'yes', partySize: 1 } })).code, 503);
});


test('a family of six provides every attendee name without legacy companion permission', async () => {
  const f = fixture();
  const person = f.guest('fixture-family', { partyLimit: 6, plusOneAllowed: false });
  f.seed([person]);
  const attendeeNames = ['Ana Uno', 'Luis Dos', 'María Tres', 'Pedro Cuatro', 'Eva Cinco', 'José Seis'];
  const res = await f.call('rsvp', { guest: person, method: 'POST', body: {
    attendance: 'yes', partySize: 6, attendeeNames: attendeeNames.map((name) => '  ' + name + '  '),
  } });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.rsvp.attendeeNames, attendeeNames);
  assert.deepEqual(JSON.parse(f.db.get(rsvpKey(person.id))).attendeeNames, attendeeNames);
  assert.deepEqual((await f.call('session', { guest: person })).body.rsvp.attendeeNames, attendeeNames);
  const adminRecord = (await f.call('admin-rsvps', { admin: true })).body.records[0];
  assert.equal(adminRecord.partySize, 6);
  assert.deepEqual(adminRecord.attendeeNames, attendeeNames);
  assert.equal(adminRecord.plusOneName, '');
});

test('new confirmations reject absent, mismatched, blank and invalid attendee names without writes', async () => {
  const f = fixture();
  const person = f.guest();
  f.seed([person]);
  for (const attendeeNames of [undefined, 'One, Two', [], ['Only One'], ['One', 'Two', 'Three'],
    ['One', '   '], ['One', 42], ['One', null], ['One', 'a'.repeat(81)]]) {
    const res = await f.call('rsvp', { guest: person, method: 'POST', body: {
      attendance: 'yes', partySize: 2, attendeeNames,
    } });
    assert.equal(res.code, 400);
    assert.equal(res.body.error.code, 'invalid_attendee_names');
    assert.equal(f.db.has(rsvpKey(person.id)), false);
  }
});

test('twelve attendees fit the invitation limit and names accept the 80-character boundary', async () => {
  const f = fixture();
  const person = f.guest('fixture-twelve', { partyLimit: 12, plusOneAllowed: false });
  f.seed([person]);
  const attendeeNames = Array.from({ length: 12 }, (_, i) => i === 0 ? 'a'.repeat(80) : 'Invited Person ' + i);
  const overflow = await f.call('rsvp', { guest: person, method: 'POST', body: {
    attendance: 'yes', partySize: 13, attendeeNames: [...attendeeNames, 'Extra Person'],
  } });
  assert.equal(overflow.code, 400);
  assert.equal(overflow.body.error.code, 'invalid_party_size');
  const accepted = await f.call('rsvp', { guest: person, method: 'POST', body: {
    attendance: 'yes', partySize: 12, attendeeNames,
  } });
  assert.equal(accepted.code, 200);
  assert.deepEqual(accepted.body.rsvp.attendeeNames, attendeeNames);
});

test('legacy companion names remain readable and missing attendee lists do not require reconfirmation', async () => {
  const f = fixture();
  const person = f.guest('fixture-old-companion');
  f.seed([person]);
  const legacy = { attendance: 'yes', partySize: 2, plusOneName: 'Original Companion', updatedAt: '2030-01-01T00:00:00Z' };
  f.put(rsvpKey(person.id), legacy);
  assert.deepEqual((await f.call('session', { guest: person })).body.rsvp, legacy);
  const retry = await f.call('rsvp', { guest: person, method: 'POST', body: {
    attendance: 'yes', partySize: 2, attendeeNames: ['Replacement', 'Replacement Two'],
  } });
  assert.equal(retry.code, 200);
  assert.deepEqual(retry.body.rsvp, legacy);
  assert.deepEqual(JSON.parse(f.db.get(rsvpKey(person.id))), legacy);
  const record = (await f.call('admin-rsvps', { admin: true })).body.records[0];
  assert.deepEqual(record.attendeeNames, []);
  assert.equal(record.plusOneName, 'Original Companion');
});

test('corrupt saved attendee lists fail closed instead of opening a fresh confirmation', async () => {
  const f = fixture();
  const person = f.guest();
  f.seed([person]);
  for (const attendeeNames of ['Invalid list', ['Only one'], ['First', null], ['First', ' ']]) {
    f.put(rsvpKey(person.id), { attendance: 'yes', partySize: 2, attendeeNames, plusOneName: '', updatedAt: '2030-01-01T00:00:00Z' });
    const res = await f.call('session', { guest: person });
    assert.equal(res.code, 503);
    assert.ok(res.body.error.code);
    assert.equal(res.body.rsvp, undefined);
  }
});
