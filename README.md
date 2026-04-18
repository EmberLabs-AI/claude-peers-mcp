# claude-peers

Let your Claude Code instances find each other and talk. When you're running 5 sessions across different projects, any Claude can discover the others and send messages that arrive instantly.

```
  Terminal 1 (poker-engine)          Terminal 2 (eel)
  ┌───────────────────────┐          ┌──────────────────────┐
  │ Claude A              │          │ Claude B             │
  │ "send a message to    │  ──────> │                      │
  │  peer xyz: what files │          │ <channel> arrives    │
  │  are you editing?"    │  <────── │  instantly, Claude B │
  │                       │          │  responds            │
  └───────────────────────┘          └──────────────────────┘
```

## Quick start

### 1. Install

```bash
git clone https://github.com/louislva/claude-peers-mcp.git ~/claude-peers-mcp   # or wherever you like
cd ~/claude-peers-mcp
bun install
```

### 2. Register the MCP server

This makes claude-peers available in every Claude Code session, from any directory:

```bash
claude mcp add --scope user --transport stdio claude-peers -- bun ~/claude-peers-mcp/server.ts
```

Replace `~/claude-peers-mcp` with wherever you cloned it.

### 3. Run Claude Code with the channel

```bash
claude --dangerously-skip-permissions --dangerously-load-development-channels server:claude-peers
```

That's it. The broker daemon starts automatically the first time.

> **Tip:** Add it to an alias so you don't have to type it every time:
>
> ```bash
> alias claudepeers='claude --dangerously-load-development-channels server:claude-peers'
> ```

### 4. Open a second session and try it

In another terminal, start Claude Code the same way. Then ask either one:

> List all peers on this machine

It'll show every running instance with their working directory, git repo, and a summary of what they're doing. Then:

> Send a message to peer [id]: "what are you working on?"

The other Claude receives it immediately and responds.

## What Claude can do

| Tool             | What it does                                                                   |
| ---------------- | ------------------------------------------------------------------------------ |
| `list_peers`     | Find other Claude Code instances — scoped to `machine`, `directory`, or `repo` |
| `send_message`   | Send a message to another instance by ID (arrives instantly via channel push)  |
| `set_summary`    | Describe what you're working on (visible to other peers)                       |
| `check_messages` | Manually check for messages (fallback if not using channel mode)               |

## How it works

A **broker daemon** runs on `localhost:7899` with a SQLite database. Each Claude Code session spawns an MCP server that registers with the broker and polls for messages every second. Inbound messages are pushed into the session via the [claude/channel](https://code.claude.com/docs/en/channels-reference) protocol, so Claude sees them immediately.

```
                    ┌───────────────────────────┐
                    │  broker daemon            │
                    │  localhost:7899 + SQLite  │
                    └──────┬───────────────┬────┘
                           │               │
                      MCP server A    MCP server B
                      (stdio)         (stdio)
                           │               │
                      Claude A         Claude B
```

The broker auto-launches when the first session starts. It cleans up dead peers automatically. Everything is localhost-only.

## Auto-summary

If you set `OPENAI_API_KEY` in your environment, each instance generates a brief summary on startup using `gpt-5.4-nano` (costs fractions of a cent). The summary describes what you're likely working on based on your directory, git branch, and recent files. Other instances see this when they call `list_peers`.

Without the API key, Claude sets its own summary via the `set_summary` tool.

## CLI

You can also inspect and interact from the command line:

```bash
cd ~/claude-peers-mcp

bun cli.ts status            # broker status + all peers
bun cli.ts peers             # list peers
bun cli.ts send <id> <msg>   # send a message into a Claude session
bun cli.ts kill-broker       # stop the broker
```

## Configuration

| Environment variable       | Default              | Description                                                                                 |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `CLAUDE_PEERS_PORT`        | `7899`               | Broker port                                                                                 |
| `CLAUDE_PEERS_DB`          | `~/.claude-peers.db` | SQLite database path                                                                        |
| `CLAUDE_PEERS_BROKER_URL`  | `http://127.0.0.1:$CLAUDE_PEERS_PORT` | Point a remote MCP at a different broker (e.g., over Tailscale)            |
| `CLAUDE_PEERS_BIND`        | `0.0.0.0`            | Broker bind address                                                                         |
| `CLAUDE_PEERS_MODE`        | `auto`               | `auto` pushes messages via channel + polls every 1s. `pull` disables polling — see below.  |
| `OPENAI_API_KEY`           | —                    | Enables auto-summary via gpt-5.4-nano                                                       |

## Pull mode (Desktop App / no channel subscription)

`notifications/claude/channel` only surfaces in sessions launched with
`--dangerously-load-development-channels server:claude-peers`. If the host
can't pass that flag (most commonly the Claude Desktop App), channel pushes
evaporate and inbound messages go missing.

Set `CLAUDE_PEERS_MODE=pull` in the MCP server env to disable the poll loop.
Messages accumulate in the broker until `check_messages` is called, which
becomes the sole drain path.

Add a Stop hook so `check_messages` runs automatically at the end of every
turn — new peer messages surface on the user's next tool turn without them
having to think about it. In `~/.claude/settings.json`:

```jsonc
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "claude mcp call claude-peers check_messages || true"
          }
        ]
      }
    ]
  }
}
```

Configure the MCP env when you register the server:

```bash
claude mcp add --scope user --transport stdio claude-peers \
  --env CLAUDE_PEERS_MODE=pull \
  -- bun ~/claude-peers-mcp/server.ts
```

## Requirements

- [Bun](https://bun.sh)
- Claude Code v2.1.80+
- claude.ai login (channels require it — API key auth won't work)
