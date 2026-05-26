import path from 'node:path';

export const AGENT_ROLES = [
  'quality-assurance',
  'lead-engineer',
  'database-admin'
];

export const DEFAULT_BRANCH_PREFIX = 'ticket';

export function getAgentsRoot(targetPath) {
  return path.join(targetPath, '.agents');
}

export function getTicketsDir(targetPath) {
  return path.join(getAgentsRoot(targetPath), 'tickets');
}

export function getScriptsDir(targetPath) {
  return path.join(getAgentsRoot(targetPath), 'scripts');
}

export function getPromptsDir(targetPath) {
  return path.join(getAgentsRoot(targetPath), 'prompts');
}

export function getRuntimeDir(targetPath) {
  return path.join(getAgentsRoot(targetPath), 'runtime');
}

export function getWorkspaceDir(targetPath) {
  return path.join(getAgentsRoot(targetPath), 'workspace');
}

export function getVsCodeDir(targetPath) {
  return path.join(getAgentsRoot(targetPath), 'vscode');
}

export function getTicketDir(targetPath, ticketSlug) {
  return path.join(getTicketsDir(targetPath), ticketSlug);
}

export function getTicketTranscriptPath(targetPath, ticketSlug) {
  return path.join(getTicketDir(targetPath, ticketSlug), 'transcript.md');
}

export function getAgentLogPath(targetPath, ticketSlug, role) {
  return path.join(getTicketDir(targetPath, ticketSlug), `${role}.md`);
}

export function getCoordinatorRuntimePath(targetPath, ticketSlug) {
  return path.join(getRuntimeDir(targetPath), `${ticketSlug}.coordinator.env`);
}

export function getAgentRuntimePath(targetPath, ticketSlug, role) {
  return path.join(getRuntimeDir(targetPath), `${ticketSlug}.${role}.env`);
}

export function buildAgentConfig() {
  return {
    version: 1,
    branchPrefix: DEFAULT_BRANCH_PREFIX,
    workspaceDir: '.agents',
    providers: {
      coordinator: 'stub',
      'quality-assurance': 'stub',
      'lead-engineer': 'stub',
      'database-admin': 'stub'
    },
    relay: {
      transcript: 'markdown',
      requireCoordinator: true
    }
  };
}