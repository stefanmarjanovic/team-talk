import { spawn } from 'node:child_process';

import {
  buildProviderExecution,
  buildRoleExecutionContext,
  loadAgentConfig,
  resolveRoleProvider,
  validateRoleExecutionContext
} from '../core/providers.js';

export async function runRole({ targetPath, role, ticketId }) {
  const executionContext = buildRoleExecutionContext(targetPath, ticketId, role);
  await validateRoleExecutionContext(executionContext);

  const agentConfig = await loadAgentConfig(targetPath);
  const provider = resolveRoleProvider(agentConfig, role);
  const providerExecution = buildProviderExecution(provider, executionContext);

  process.stdout.write('package-agent-ready\n');
  process.stdout.write(`role: ${role}\n`);
  process.stdout.write(`ticket: ${ticketId}\n`);
  process.stdout.write(`provider: ${provider.adapter}\n`);
  process.stdout.write(`log: ${executionContext.roleLogPath}\n`);

  process.stdout.write(`prompt: ${executionContext.promptPath}\n`);
  process.stdout.write(`runtime: ${executionContext.runtimePath}\n\n`);

  await new Promise((resolve, reject) => {
    const child = spawn(providerExecution.command, {
      cwd: targetPath,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        ...providerExecution.env
      }
    });

    child.on('error', reject);
    child.on('exit', (exitCode, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      if (exitCode && exitCode !== 0) {
        reject(new Error(`Provider command for ${role} exited with code ${exitCode}.`));
        return;
      }

      resolve();
    });
  });
}