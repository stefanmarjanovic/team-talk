import fs from 'node:fs/promises';

import {
  AGENT_ROLES,
  getAgentRuntimePath,
  getCoordinatorRuntimePath,
  getTicketDir,
  getTicketTranscriptPath
} from '../core/layout.js';

export async function runLaunchAgents({ targetPath, ticketId }) {
  const ticketDir = getTicketDir(targetPath, ticketId);

  await fs.mkdir(ticketDir, { recursive: true });

  const runtimeWrites = [
    fs.writeFile(
      getCoordinatorRuntimePath(targetPath, ticketId),
      buildRuntimeMessage('coordinator', ticketId),
      'utf8'
    ),
    fs.appendFile(
      getTicketTranscriptPath(targetPath, ticketId),
      `- Launch requested for ${ticketId}\n`,
      'utf8'
    )
  ];

  for (const role of AGENT_ROLES) {
    runtimeWrites.push(
      fs.writeFile(getAgentRuntimePath(targetPath, ticketId, role), buildRuntimeMessage(role, ticketId), 'utf8')
    );
  }

  await Promise.all(runtimeWrites);

  console.log(`Prepared runtime files for ${ticketId}.`);
  console.log('Separate terminal orchestration is not implemented yet; use the generated runtime files and tasks sample as the next integration point.');
}

function buildRuntimeMessage(role, ticketId) {
  return `role=${role}\nticket=${ticketId}\nstatus=ready\n`;
}