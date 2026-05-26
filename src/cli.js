import path from 'node:path';
import process from 'node:process';

import { runInit } from './commands/init.js';
import { runLaunchAgents } from './commands/launch-agents.js';
import { runRelay } from './commands/relay.js';
import { runRole } from './commands/run-role.js';
import { runStartTicket } from './commands/start-ticket.js';
import { runStatus } from './commands/status.js';

const HELP_TEXT = `team-talk <command> [options]

Commands:
  init [--target <path>]               Bootstrap .agents into a git repository
  start-ticket <ticket-id> [options]  Create a git branch and ticket workspace
  launch-agents <ticket-id> [options] Create runtime files for coordinator and agents
  relay <role> <ticket-id> <message> [options] Append a coordinator relay into a role log
  run-role <role> <ticket-id> [options] Run one role through its configured provider
  status [--target <path>]            Show the current ticket workspace summary

Options:
  --target <path>   Target repository path (defaults to current directory)
  --branch <name>   Override the branch name for start-ticket
  --help            Show this message
`;

export async function run(argv) {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP_TEXT);
    return;
  }

  const parsed = parseArgs(rest);
  const targetPath = parsed.flags.target
    ? path.resolve(parsed.flags.target)
    : process.cwd();

  switch (command) {
    case 'init':
      await runInit({ targetPath });
      return;
    case 'start-ticket':
      if (!parsed.positionals[0]) {
        throw new Error('start-ticket requires a <ticket-id>.');
      }

      await runStartTicket({
        targetPath,
        ticketId: parsed.positionals[0],
        branchName: parsed.flags.branch
      });
      return;
    case 'launch-agents':
      if (!parsed.positionals[0]) {
        throw new Error('launch-agents requires a <ticket-id>.');
      }

      await runLaunchAgents({
        targetPath,
        ticketId: parsed.positionals[0],
        skipVsCodeTasks: Boolean(parsed.flags['skip-vscode-tasks'])
      });
      return;
    case 'relay':
      if (!parsed.positionals[0] || !parsed.positionals[1]) {
        throw new Error('relay requires a <role>, <ticket-id>, and <message>.');
      }

      if (parsed.positionals.length < 3) {
        throw new Error('relay requires a non-empty <message>.');
      }

      await runRelay({
        targetPath,
        role: parsed.positionals[0],
        ticketId: parsed.positionals[1],
        message: parsed.positionals.slice(2).join(' ')
      });
      return;
    case 'status':
      await runStatus({ targetPath });
      return;
    case 'run-role':
      if (!parsed.positionals[0] || !parsed.positionals[1]) {
        throw new Error('run-role requires a <role> and <ticket-id>.');
      }

      await runRole({
        targetPath,
        role: parsed.positionals[0],
        ticketId: parsed.positionals[1]
      });
      return;
    default:
      throw new Error(`Unknown command: ${command}\n\n${HELP_TEXT}`);
  }
}

function parseArgs(argv) {
  const flags = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith('--')) {
      positionals.push(current);
      continue;
    }

    const flagName = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      flags[flagName] = true;
      continue;
    }

    flags[flagName] = next;
    index += 1;
  }

  return { flags, positionals };
}