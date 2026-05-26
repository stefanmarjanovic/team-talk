import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureGitRepository, gitBranchExists, gitCheckoutNewBranch } from '../core/git.js';
import {
  ALL_ROLES,
  DEFAULT_BRANCH_PREFIX,
  getTicketDir,
  getTicketTranscriptPath,
  getAgentLogPath
} from '../core/layout.js';
import { normalizeTicketSlug } from '../core/tickets.js';

export async function runStartTicket({ targetPath, ticketId, branchName }) {
  await ensureGitRepository(targetPath);

  const slug = normalizeTicketSlug(ticketId);

  if (!slug) {
    throw new Error('ticket-id must contain at least one letter or number.');
  }

  const resolvedBranchName = branchName || `${DEFAULT_BRANCH_PREFIX}/${slug}`;
  const ticketDir = getTicketDir(targetPath, slug);

  await fs.mkdir(ticketDir, { recursive: true });

  if (!(await gitBranchExists(targetPath, resolvedBranchName))) {
    await gitCheckoutNewBranch(targetPath, resolvedBranchName);
  }

  const writes = [
    fs.writeFile(
      path.join(ticketDir, 'ticket.json'),
      `${JSON.stringify({ ticketId, slug, branchName: resolvedBranchName }, null, 2)}\n`,
      'utf8'
    ),
    fs.writeFile(getTicketTranscriptPath(targetPath, slug), buildTranscript(ticketId, resolvedBranchName), 'utf8')
  ];

  for (const role of ALL_ROLES) {
    writes.push(
      fs.writeFile(getAgentLogPath(targetPath, slug, role), buildAgentLog(ticketId, role), 'utf8')
    );
  }

  await Promise.all(writes);

  console.log(`Started ticket ${slug} on branch ${resolvedBranchName}`);
}
function buildTranscript(ticketId, branchName) {
  return `# Transcript

- Ticket: ${ticketId}
- Branch: ${branchName}

## Relay log

`;
}

function buildAgentLog(ticketId, role) {
  return `# ${role}

- Ticket: ${ticketId}
- Role: ${role}

## Execution cycles

No activity recorded yet.
`;
}