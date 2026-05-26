import fs from 'node:fs/promises';

import {
  ALL_ROLES,
  getAgentLogPath,
  getTicketDir,
  getTicketTranscriptPath
} from '../core/layout.js';
import { normalizeTicketSlug } from '../core/tickets.js';

const EMPTY_ACTIVITY_MARKER = 'No activity recorded yet.\n';

export async function runRelay({ targetPath, role, ticketId, message }) {
  const ticketSlug = normalizeTicketSlug(ticketId);
  const trimmedMessage = message?.trim();

  if (!ALL_ROLES.includes(role)) {
    throw new Error(`Unknown role: ${role}`);
  }

  if (!ticketSlug) {
    throw new Error('ticket-id must contain at least one letter or number.');
  }

  if (!trimmedMessage) {
    throw new Error('relay requires a non-empty <message>.');
  }

  const ticketDir = getTicketDir(targetPath, ticketSlug);
  const roleLogPath = getAgentLogPath(targetPath, ticketSlug, role);
  const transcriptPath = getTicketTranscriptPath(targetPath, ticketSlug);
  const timestamp = new Date().toISOString();

  await ensurePathExists(ticketDir, `Ticket ${ticketSlug} does not exist. Run team-talk start-ticket first.`);
  await ensurePathExists(roleLogPath, `Role log for ${role} does not exist. Run team-talk start-ticket first.`);
  await ensurePathExists(transcriptPath, `Transcript for ${ticketSlug} does not exist. Run team-talk start-ticket first.`);

  await Promise.all([
    appendRoleRelay(roleLogPath, role, trimmedMessage, timestamp),
    fs.appendFile(transcriptPath, buildTranscriptRelay(role, trimmedMessage, timestamp), 'utf8')
  ]);

  console.log(`Relayed user reply to ${role} for ${ticketSlug}`);
}

async function ensurePathExists(targetPath, notFoundMessage) {
  try {
    await fs.stat(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(notFoundMessage);
    }

    throw error;
  }
}

async function appendRoleRelay(roleLogPath, role, message, timestamp) {
  const currentContents = await fs.readFile(roleLogPath, 'utf8');
  const relayEntry = buildRoleRelay(role, message, timestamp);

  const nextContents = currentContents.includes(EMPTY_ACTIVITY_MARKER)
    ? currentContents.replace(EMPTY_ACTIVITY_MARKER, relayEntry)
    : `${currentContents}${relayEntry}`;

  await fs.writeFile(roleLogPath, nextContents, 'utf8');
}

function buildRoleRelay(role, message, timestamp) {
  return `### Coordinator relay\n\n- Time: ${timestamp}\n- Target role: ${role}\n- Source: user reply\n\n${formatQuotedMessage(message)}\n\n`;
}

function buildTranscriptRelay(role, message, timestamp) {
  return `- ${timestamp} coordinator relayed user reply to ${role}.\n\n${formatQuotedMessage(message)}\n\n`;
}

function formatQuotedMessage(message) {
  return message
    .split(/\r?\n/u)
    .map((line) => `> ${line}`)
    .join('\n');
}