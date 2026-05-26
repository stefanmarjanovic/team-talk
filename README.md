# team-talk

`team-talk` is an npm CLI that bootstraps a project-local multi-agent workspace into any git repository. The generated workspace lives under `.agents/`, stays local by default through `.git/info/exclude`, and creates a ticket-oriented structure for the coordinator, QA, lead engineer, and database admin roles.

## Requirements

- Node.js 18.17 or newer
- Git
- An existing git repository to bootstrap into

## Install

Run locally from this repository:

```bash
node ./bin/team-talk.js --help
```

Link it globally during development:

```bash
npm link
team-talk --help
```

Pack or publish for npm distribution:

```bash
npm pack
```

## Use With PNPM In Any Existing Repo

Yes. You can run this from any existing project repository as long as that repository is already initialized with git.

One-off run without adding a dependency:

```bash
pnpm dlx team-talk init
```

Install as a development dependency in the current project:

```bash
pnpm add -D team-talk
pnpm exec team-talk init
```

Install from GitHub before publishing to npm:

```bash
pnpm add -D github:YOUR_ORG/team-talk
pnpm exec team-talk init
```

Install from a local path during development:

```bash
pnpm add -D /absolute/path/to/team-talk
pnpm exec team-talk init
```

Then run ticket commands from that same project repository:

```bash
pnpm exec team-talk start-ticket "PROJ-123 Improve agent routing"
pnpm exec team-talk launch-agents proj-123-improve-agent-routing
pnpm exec team-talk status
```

## Command Summary

### `init`

Bootstraps the `.agents/` workspace into the target repository.

What it does:

- Creates `.agents/` and its subdirectories.
- Writes starter config, prompts, scripts, and coordinator protocol files.
- Adds `.agents/` to `.git/info/exclude` so the directory is not indexed by git by default.

Terminal command:

```bash
team-talk init --target /path/to/repo
```

If you are already in the target repository:

```bash
team-talk init
```

Generated paths:

- `.agents/config.json`
- `.agents/README.md`
- `.agents/prompts/`
- `.agents/scripts/start-ticket.sh`
- `.agents/scripts/launch-agents.sh`
- `.agents/scripts/run-role.sh`
- `.agents/tickets/`
- `.agents/workspace/coordinator.md`
- `.agents/vscode/tasks.sample.json`
- `.vscode/tasks.json`

### `start-ticket`

Creates a new ticket workspace and a matching git branch.

What it does:

- Normalizes the ticket id into a slug.
- Creates a branch using `ticket/<slug>` by default.
- Creates `.agents/tickets/<slug>/`.
- Writes one markdown file per role plus `transcript.md` and `ticket.json`.

Terminal command:

```bash
team-talk start-ticket PROJ-123-improve-agent-routing --target /path/to/repo
```

Example from inside the repository:

```bash
team-talk start-ticket "PROJ-123 Improve agent routing"
```

Override the branch name:

```bash
team-talk start-ticket "PROJ-123 Improve agent routing" --branch feature/proj-123-routing
```

Generated ticket files:

- `.agents/tickets/<slug>/ticket.json`
- `.agents/tickets/<slug>/transcript.md`
- `.agents/tickets/<slug>/coordinator.md`
- `.agents/tickets/<slug>/quality-assurance.md`
- `.agents/tickets/<slug>/lead-engineer.md`
- `.agents/tickets/<slug>/database-admin.md`

### `launch-agents`

Prepares runtime files for the coordinator and agent roles for a specific ticket and generates real VS Code tasks for separate integrated terminals.

What it does today:

- Writes ready-state runtime files under `.agents/runtime/`.
- Appends a launch event into the ticket transcript.
- Writes a ticket-specific `.vscode/tasks.json` launch flow.
- Generates a launch manifest with the exact VS Code task label to run.

Terminal command:

```bash
team-talk launch-agents proj-123-improve-agent-routing --target /path/to/repo
```

Example from inside the repository:

```bash
team-talk launch-agents proj-123-improve-agent-routing
```

Current limitation:

```text
This command generates the VS Code tasks that open separate coordinator and agent terminals.
It still does not invoke real provider backends; each terminal currently tails the role log/runtime files.
```

### `status`

Lists the ticket directories currently present under `.agents/tickets/`.

Terminal command:

```bash
team-talk status --target /path/to/repo
```

If you are already in the target repository:

```bash
team-talk status
```

## Architecture

`team-talk` uses a coordinator-first layout inside `.agents/`.

- The coordinator owns ticket flow, shared context, and the handoff protocol between roles.
- Role files are split by responsibility so each agent can work from a narrow prompt and artifact set.
- The current built-in roles are coordinator, quality assurance, lead engineer, and database admin.

Today, `launch-agents` prepares runtime files, transcript state, and VS Code task wiring for each role. The next planned layer is provider adapters that translate the same role definitions into concrete backend actions, such as terminal sessions with real agent commands, editor integrations, or hosted agent providers.

## Typical Workflow

Initialize the repo once:

```bash
team-talk init
```

Start a ticket:

```bash
team-talk start-ticket "PROJ-123 Improve agent routing"
```

Prepare the coordinator and agent runtime files and VS Code tasks:

```bash
team-talk launch-agents proj-123-improve-agent-routing
```

Then run the generated VS Code task:

```text
team-talk:launch:proj-123-improve-agent-routing
```

Check current tickets:

```bash
team-talk status
```

## Generated Helper Scripts

After `init`, the target repository also gets wrapper scripts inside `.agents/scripts/`.

Start a ticket through the generated script:

```bash
.agents/scripts/start-ticket.sh "PROJ-123 Improve agent routing"
```

Prepare agents through the generated script:

```bash
.agents/scripts/launch-agents.sh proj-123-improve-agent-routing
```

Run one role terminal directly if needed:

```bash
.agents/scripts/run-role.sh coordinator proj-123-improve-agent-routing
```

These scripts call back into `team-talk` with the repository root as the target.

## Development

Run tests:

```bash
npm test
```

Preview the published package contents:

```bash
npm pack --dry-run
```