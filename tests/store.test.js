import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function runStore(dir, script) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    env: { ...process.env, DATA_DIR: dir },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

test('SQLite store persists state across process restarts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studybuddy-store-'));
  try {
    runStore(dir, `import {read,write} from './server/store.js'; read().users.push({id:'u1',email:'test@example.com'}); write();`);
    const output = runStore(dir, `import {read} from './server/store.js'; console.log(read().users[0].email);`);
    assert.equal(output, 'test@example.com');
    assert.ok(fs.existsSync(path.join(dir, 'studybuddy.sqlite')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('SQLite store migrates the previous JSON database once', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studybuddy-migrate-'));
  try {
    fs.writeFileSync(path.join(dir, 'db.json'), JSON.stringify({ users: [{ id: 'legacy', email: 'legacy@example.com' }] }));
    const output = runStore(dir, `import {read} from './server/store.js'; console.log(read().users[0].id);`);
    assert.equal(output, 'legacy');
    assert.ok(fs.existsSync(path.join(dir, 'studybuddy.sqlite')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
