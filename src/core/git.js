import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export async function ensureGitRepository(targetPath) {
  const gitDir = path.join(targetPath, '.git');

  try {
    const stats = await fs.stat(gitDir);

    if (!stats.isDirectory()) {
      throw new Error();
    }
  } catch {
    throw new Error(`Expected a git repository at ${targetPath}. Initialize git before running package-agent.`);
  }
}

export async function ensureGitExcludeEntry(targetPath, entry) {
  const infoDir = path.join(targetPath, '.git', 'info');
  const excludePath = path.join(infoDir, 'exclude');

  await fs.mkdir(infoDir, { recursive: true });

  let contents = '';

  try {
    contents = await fs.readFile(excludePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = contents.split(/\r?\n/).filter(Boolean);

  if (!lines.includes(entry)) {
    lines.push(entry);
    await fs.writeFile(excludePath, `${lines.join('\n')}\n`, 'utf8');
  }
}

export async function gitBranchExists(targetPath, branchName) {
  const result = await runGit(targetPath, ['rev-parse', '--verify', branchName], { allowFailure: true });
  return result.exitCode === 0;
}

export async function gitCheckoutNewBranch(targetPath, branchName) {
  const result = await runGit(targetPath, ['checkout', '-b', branchName], { allowFailure: true });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `Failed to create branch ${branchName}.`);
  }
}

function runGit(targetPath, args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: targetPath,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (exitCode) => {
      if (!allowFailure && exitCode !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `git ${args.join(' ')} failed.`));
        return;
      }

      resolve({ exitCode, stdout, stderr });
    });
  });
}