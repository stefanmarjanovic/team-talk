import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { runInit } from '../src/commands/init.js';
import { runStartTicket } from '../src/commands/start-ticket.js';
import { getTicketDir } from '../src/core/layout.js';

test('runStartTicket creates a branch and markdown files for all roles', async () => {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-talk-ticket-'));
  spawnSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.email', 'team-talk@example.com'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.name', 'Team Talk'], { cwd: repoDir, stdio: 'ignore' });
  await fs.writeFile(path.join(repoDir, 'README.md'), '# temp\n', 'utf8');
  spawnSync('git', ['add', 'README.md'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoDir, stdio: 'ignore' });

  await runInit({ targetPath: repoDir });
  await runStartTicket({ targetPath: repoDir, ticketId: 'PROJ-123 Improve agent routing' });

  const ticketDir = getTicketDir(repoDir, 'proj-123-improve-agent-routing');
  const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repoDir, encoding: 'utf8' }).stdout.trim();
  const files = await fs.readdir(ticketDir);

  assert.equal(branch, 'ticket/proj-123-improve-agent-routing');
  assert.deepEqual(
    files.sort(),
    [
      'coordinator.md',
      'database-admin.md',
      'lead-engineer.md',
      'quality-assurance.md',
      'ticket.json',
      'transcript.md'
    ]
  );
});