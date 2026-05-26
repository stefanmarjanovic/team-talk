import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildAgentConfig, getAgentConfigPath, getAgentRuntimePath } from '../src/core/layout.js';
import { runInit } from '../src/commands/init.js';
import { runLaunchAgents } from '../src/commands/launch-agents.js';
import { runStartTicket } from '../src/commands/start-ticket.js';
import { getCoordinatorRuntimePath, getLaunchManifestPath, getRepoTasksPath } from '../src/core/layout.js';

const packageAgentBinPath = fileURLToPath(new URL('../bin/team-talk.js', import.meta.url));

test('runLaunchAgents generates runtime files and VS Code tasks for a ticket', async () => {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-talk-launch-'));
  spawnSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.email', 'team-talk@example.com'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.name', 'Team Talk'], { cwd: repoDir, stdio: 'ignore' });
  await fs.writeFile(path.join(repoDir, 'README.md'), '# temp\n', 'utf8');
  spawnSync('git', ['add', 'README.md'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoDir, stdio: 'ignore' });

  await runInit({ targetPath: repoDir });
  await runStartTicket({ targetPath: repoDir, ticketId: 'PROJ-456 Multi terminal launch' });
  await runLaunchAgents({ targetPath: repoDir, ticketId: 'PROJ-456 Multi terminal launch' });

  const ticketSlug = 'proj-456-multi-terminal-launch';
  const tasksContents = await fs.readFile(getRepoTasksPath(repoDir), 'utf8');
  const manifestContents = await fs.readFile(getLaunchManifestPath(repoDir, ticketSlug), 'utf8');
  const coordinatorRuntimeContents = await fs.readFile(getCoordinatorRuntimePath(repoDir, ticketSlug), 'utf8');

  assert.match(tasksContents, /team-talk:launch:proj-456-multi-terminal-launch/);
  assert.match(tasksContents, /team-talk:coordinator:proj-456-multi-terminal-launch/);
  assert.match(tasksContents, /\.agents\/scripts\/run-role\.sh coordinator proj-456-multi-terminal-launch/);
  assert.match(manifestContents, /team-talk:launch:proj-456-multi-terminal-launch/);
  assert.match(manifestContents, /\.agents\/scripts\/relay\.sh lead-engineer proj-456-multi-terminal-launch/);
  assert.match(coordinatorRuntimeContents, /status=ready/);
  assert.match(coordinatorRuntimeContents, /provider=stub/);
});

test('run-role executes configured provider commands for coordinator and agents', async () => {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-talk-run-role-'));
  spawnSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.email', 'team-talk@example.com'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.name', 'Team Talk'], { cwd: repoDir, stdio: 'ignore' });
  await fs.writeFile(path.join(repoDir, 'README.md'), '# temp\n', 'utf8');
  spawnSync('git', ['add', 'README.md'], { cwd: repoDir, stdio: 'ignore' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoDir, stdio: 'ignore' });

  await runInit({ targetPath: repoDir });

  const config = buildAgentConfig();
  const providerCommand = 'printf "backend:%s:%s\\n" "$PACKAGE_AGENT_ROLE" "$PACKAGE_AGENT_TICKET_ID"';
  config.providers.coordinator = { adapter: 'command', command: providerCommand };
  config.providers['lead-engineer'] = { adapter: 'command', command: providerCommand };
  await fs.writeFile(getAgentConfigPath(repoDir), `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  await runStartTicket({ targetPath: repoDir, ticketId: 'PROJ-789 Provider execution' });
  await runLaunchAgents({ targetPath: repoDir, ticketId: 'PROJ-789 Provider execution', skipVsCodeTasks: true });

  const ticketSlug = 'proj-789-provider-execution';
  const coordinatorRuntimeContents = await fs.readFile(getCoordinatorRuntimePath(repoDir, ticketSlug), 'utf8');
  const leadEngineerRuntimeContents = await fs.readFile(getAgentRuntimePath(repoDir, ticketSlug, 'lead-engineer'), 'utf8');

  assert.match(coordinatorRuntimeContents, /provider=command/);
  assert.match(leadEngineerRuntimeContents, /provider=command/);

  for (const role of ['coordinator', 'lead-engineer']) {
    const result = spawnSync('node', [packageAgentBinPath, 'run-role', role, ticketSlug, '--target', repoDir], {
      cwd: repoDir,
      encoding: 'utf8'
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /team-talk-ready/);
    assert.match(result.stdout, /provider: command/);
    assert.match(result.stdout, new RegExp(`backend:${role}:${ticketSlug}`));
  }
});