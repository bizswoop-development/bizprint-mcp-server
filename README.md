# BizPrint MCP Server

An MCP (Model Context Protocol) server that connects AI assistants to the [BizPrint](https://www.bizswoop.app/) Cloud Print API. Send print jobs, manage printers and stations, and monitor print job status — all through natural language.

## Tools

| Tool | Description |
|------|-------------|
| `list_printers` | List all configured printers with their settings |
| `get_printer` | Get details for a specific printer by ID |
| `list_stations` | List all print stations and their status |
| `get_station` | Get details for a specific station by ID |
| `create_print_job` | Send a document URL to a printer |
| `get_print_job` | Check the status of a print job |
| `list_print_jobs` | List all print jobs with pagination |

## Prerequisites

- Node.js 18 or later
- A BizPrint Cloud account with API keys ([get started](https://print.bizswoop.app/applications))

## Installation

### From npm

```bash
npm install -g @bizswoop/bizprint-mcp-server
```

### From source

```bash
git clone https://github.com/BizSwoop/bizprint-mcp-server.git
cd bizprint-mcp-server
npm install
npm run build
```

## Configuration

The server requires two environment variables, with one optional override:

| Variable | Required | Description |
|----------|----------|-------------|
| `BIZPRINT_PUBLIC_KEY` | Yes | Your BizPrint API public key |
| `BIZPRINT_SECRET_KEY` | Yes | Your BizPrint API secret key |
| `BIZPRINT_API_URL` | No | Override the API base URL (default: `https://print.bizswoop.app/api/connect-application/v1`) |

You can find your API keys in the [BizPrint dashboard](https://print.bizswoop.app/applications) under your application settings.

### Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bizprint": {
      "command": "npx",
      "args": ["-y", "@bizswoop/bizprint-mcp-server"],
      "env": {
        "BIZPRINT_PUBLIC_KEY": "your-public-key",
        "BIZPRINT_SECRET_KEY": "your-secret-key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add bizprint -- npx -y @bizswoop/bizprint-mcp-server \
  --env BIZPRINT_PUBLIC_KEY=your-public-key \
  --env BIZPRINT_SECRET_KEY=your-secret-key
```

## Example Conversation

**You:** What printers do I have set up?

**Claude:** Let me check your BizPrint printers.

You have 2 printers configured:

1. **Front Desk Laser** (ID: 12) — Enabled, Station 3, A4, Color
2. **Warehouse Label** (ID: 15) — Enabled, Station 3, 4x6 Label, B&W

**You:** Print the invoice at https://example.com/invoices/1042.pdf on the front desk printer.

**Claude:** I've created a print job:

- **Job ID:** 287
- **Printer:** Front Desk Laser (ID: 12)
- **Status:** pending
- **Document:** https://example.com/invoices/1042.pdf

The job has been sent to BizPrint and will print once the station picks it up.

**You:** What's the status of that job now?

**Claude:** Job 287 is now **completed** — it was printed successfully.

## Development

```bash
npm install
npm test          # run tests
npm run build     # compile TypeScript
```

## License

MIT
