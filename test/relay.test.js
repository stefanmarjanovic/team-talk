import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { runInit } from '../src/commands/init.js';
import { runRelay } from '../src/commands/relay.js';
import { runStartTicket } from '../src/commands/start-ticket.js';
import { getAgentLogPath, getTicketTranscriptPath } from '../src/core/layout.js';

test('runRelay appends the user reply to the target role log and transcript', async () => {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-talk-relay-'));
  spawnSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.email', 'team-talk@example.com'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.name', 'Team Talk'], { cwd: repoDir, stdio: 'ignore' });
  await fs.writeFile(path.join(repoDir, 'README.md'), '# temp\n', 'utf8');
  spawnSync('git', ['add', 'README.md'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoDir, stdio: 'ignore' });

  await runInit({ targetPath: repoDir });
  await runStartTicket({ targetPath: repoDir, ticketId: 'PROJ-789 Relay updates' });
  await runRelay({
    targetPath: repoDir,
    role: 'lead-engineer',
    ticketId: 'PROJ-789 Relay updates',
    message: 'Please verify the branch wiring.\nInclude CLI edge cases.'
  });

  const ticketSlug = 'proj-789-relay-updates';
  const roleLogContents = await fs.readFile(getAgentLogPath(repoDir, ticketSlug, 'lead-engineer'), 'utf8');
  const transcriptContents = await fs.readFile(getTicketTranscriptPath(repoDir, ticketSlug), 'utf8');

  assert.doesNotMatch(roleLogContents, /No activity recorded yet\./);
  assert.match(roleLogContents, /### Coordinator relay/);
  assert.match(roleLogContents, /> Please verify the branch wiring\./);
  assert.match(roleLogContents, /> Include CLI edge cases\./);
  assert.match(transcriptContents, /coordinator relayed user reply to lead-engineer/);
});