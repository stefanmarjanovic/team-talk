import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { runInit } from '../src/commands/init.js';
import { getAgentsRoot } from '../src/core/layout.js';

test('runInit creates .agents workspace and excludes it from git indexing', async () => {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'package-agent-init-'));
  spawnSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });

  await runInit({ targetPath: repoDir });

  const agentsRoot = getAgentsRoot(repoDir);
  const configPath = path.join(agentsRoot, 'config.json');
  const excludePath = path.join(repoDir, '.git', 'info', 'exclude');

  await assert.doesNotReject(() => fs.stat(agentsRoot));
  await assert.doesNotReject(() => fs.stat(configPath));

  const excludeContents = await fs.readFile(excludePath, 'utf8');
  assert.match(excludeContents, /\.agents\//);
});