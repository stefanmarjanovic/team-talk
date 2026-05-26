import fs from 'node:fs/promises';

import { getTicketsDir } from '../core/layout.js';

export async function runStatus({ targetPath }) {
  const ticketsDir = getTicketsDir(targetPath);

  try {
    const entries = await fs.readdir(ticketsDir, { withFileTypes: true });
    const tickets = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    if (tickets.length === 0) {
      console.log('No tickets found.');
      return;
    }

    console.log('Tickets:');

    for (const ticket of tickets) {
      console.log(`- ${ticket}`);
    }
  } catch {
    console.log('No .agents workspace found. Run `team-talk init` first.');
  }
}