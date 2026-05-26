import fs from 'node:fs/promises';

import {
  AGENT_ROLES,
  getAgentRuntimePath,
  getCoordinatorRuntimePath,
  getLaunchManifestPath,
  getTicketDir,
  getTicketTranscriptPath
} from '../core/layout.js';
import { loadAgentConfig, resolveRoleProvider } from '../core/providers.js';
import { normalizeTicketSlug } from '../core/tickets.js';
import { buildLaunchInstructions, writeVsCodeTasks } from '../core/vscode.js';

export async function runLaunchAgents({ targetPath, ticketId, skipVsCodeTasks = false }) {
  const ticketSlug = normalizeTicketSlug(ticketId);
  const ticketDir = getTicketDir(targetPath, ticketSlug);
  const agentConfig = await loadAgentConfig(targetPath);

  try {
    await fs.stat(ticketDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Ticket ${ticketSlug} does not exist. Run package-agent start-ticket first.`);
    }

    throw error;
  }

  const runtimeWrites = [
    fs.writeFile(
      getCoordinatorRuntimePath(targetPath, ticketSlug),
      buildRuntimeMessage('coordinator', ticketSlug, resolveRoleProvider(agentConfig, 'coordinator').adapter),
      'utf8'
    ),
    fs.appendFile(
      getTicketTranscriptPath(targetPath, ticketSlug),
      `- Launch requested for ${ticketSlug}\n`,
      'utf8'
    ),
    fs.writeFile(
      getLaunchManifestPath(targetPath, ticketSlug),
      `${JSON.stringify(buildLaunchInstructions(ticketSlug), null, 2)}\n`,
      'utf8'
    )
  ];

  for (const role of AGENT_ROLES) {
    runtimeWrites.push(
      fs.writeFile(
        getAgentRuntimePath(targetPath, ticketSlug, role),
        buildRuntimeMessage(role, ticketSlug, resolveRoleProvider(agentConfig, role).adapter),
        'utf8'
      )
    );
  }

  await Promise.all(runtimeWrites);

  let tasksPath = null;

  if (!skipVsCodeTasks) {
    tasksPath = await writeVsCodeTasks(targetPath, ticketSlug);
  }

  console.log(`Prepared runtime files for ${ticketSlug}.`);

  if (tasksPath) {
    const instructions = buildLaunchInstructions(ticketSlug);
    console.log(`Generated VS Code tasks in ${tasksPath}`);
    console.log(`Run the VS Code task ${instructions.task} to open coordinator and agent terminals.`);

    for (const relayInstruction of instructions.relayCommands) {
      console.log(`Relay to ${relayInstruction.role}: ${relayInstruction.command}`);
    }
  }
}

function buildRuntimeMessage(role, ticketId, providerAdapter) {
  return `role=${role}\nticket=${ticketId}\nprovider=${providerAdapter}\nstatus=ready\n`;
}