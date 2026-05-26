import fs from 'node:fs/promises';
import path from 'node:path';

import {
  ALL_ROLES,
  COORDINATOR_ROLE,
  buildAgentConfig,
  getAgentConfigPath,
  getAgentLogPath,
  getAgentRuntimePath,
  getCoordinatorRuntimePath,
  getPromptPath,
  getTicketDir,
  getTicketTranscriptPath
} from './layout.js';

const DEFAULT_PROVIDER = 'stub';

export async function loadAgentConfig(targetPath) {
  const configPath = getAgentConfigPath(targetPath);

  try {
    const contents = await fs.readFile(configPath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return buildAgentConfig();
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Could not parse ${configPath}. Fix the JSON before running providers.`);
    }

    throw error;
  }
}

export function resolveRoleProvider(agentConfig, role) {
  if (!ALL_ROLES.includes(role)) {
    throw new Error(`Unknown role: ${role}`);
  }

  const rawProvider = agentConfig?.providers?.[role] ?? DEFAULT_PROVIDER;

  if (typeof rawProvider === 'string') {
    return { adapter: rawProvider };
  }

  if (rawProvider && typeof rawProvider === 'object' && typeof rawProvider.adapter === 'string') {
    return rawProvider;
  }

  throw new Error(`Invalid provider configuration for ${role}. Expected a string adapter or {"adapter": "..."}.`);
}

export function buildRoleExecutionContext(targetPath, ticketId, role) {
  const ticketDir = getTicketDir(targetPath, ticketId);
  const roleLogPath = getAgentLogPath(targetPath, ticketId, role);
  const transcriptPath = getTicketTranscriptPath(targetPath, ticketId);
  const promptPath = getPromptPath(targetPath, role);
  const runtimePath = role === COORDINATOR_ROLE
    ? getCoordinatorRuntimePath(targetPath, ticketId)
    : getAgentRuntimePath(targetPath, ticketId, role);

  return {
    targetPath,
    ticketId,
    role,
    ticketDir,
    roleLogPath,
    transcriptPath,
    promptPath,
    runtimePath,
    configPath: getAgentConfigPath(targetPath)
  };
}

export async function validateRoleExecutionContext(executionContext) {
  const requiredPaths = [
    { path: executionContext.ticketDir, label: 'ticket directory', hint: 'Run package-agent start-ticket first.' },
    { path: executionContext.roleLogPath, label: 'role log', hint: 'Run package-agent start-ticket first.' }
  ];

  for (const entry of requiredPaths) {
    try {
      await fs.stat(entry.path);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Missing ${entry.label}: ${entry.path}\n${entry.hint}`);
      }

      throw error;
    }
  }
}

export function buildProviderExecution(provider, executionContext) {
  switch (provider.adapter) {
    case 'stub':
      return {
        command: buildStubCommand(executionContext),
        env: buildProviderEnvironment(provider, executionContext)
      };
    case 'command':
      if (typeof provider.command !== 'string' || provider.command.trim() === '') {
        throw new Error(`Provider adapter "command" for ${executionContext.role} requires a non-empty "command" string.`);
      }

      return {
        command: provider.command,
        env: buildProviderEnvironment(provider, executionContext)
      };
    default:
      throw new Error(`Unsupported provider adapter for ${executionContext.role}: ${provider.adapter}`);
  }
}

function buildStubCommand(executionContext) {
  const quotedRoleLogPath = quoteShellPath(executionContext.roleLogPath);

  if (executionContext.role === COORDINATOR_ROLE) {
    return `tail -n +1 -f ${quoteShellPath(executionContext.transcriptPath)} ${quotedRoleLogPath}`;
  }

  return `tail -n +1 -f ${quotedRoleLogPath}`;
}

function buildProviderEnvironment(provider, executionContext) {
  return {
    PACKAGE_AGENT_PROVIDER: provider.adapter,
    PACKAGE_AGENT_ROLE: executionContext.role,
    PACKAGE_AGENT_TICKET_ID: executionContext.ticketId,
    PACKAGE_AGENT_TARGET_PATH: executionContext.targetPath,
    PACKAGE_AGENT_TICKET_DIR: executionContext.ticketDir,
    PACKAGE_AGENT_ROLE_LOG_PATH: executionContext.roleLogPath,
    PACKAGE_AGENT_TRANSCRIPT_PATH: executionContext.transcriptPath,
    PACKAGE_AGENT_PROMPT_PATH: executionContext.promptPath,
    PACKAGE_AGENT_RUNTIME_PATH: executionContext.runtimePath,
    PACKAGE_AGENT_CONFIG_PATH: executionContext.configPath,
    PACKAGE_AGENT_COMMAND_CWD: path.resolve(executionContext.targetPath)
  };
}

function quoteShellPath(filePath) {
  return `'${filePath.replaceAll("'", "'\\''")}'`;
}