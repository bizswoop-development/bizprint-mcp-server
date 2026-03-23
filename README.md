# BizPrint MCP Server

## Description

An MCP (Model Context Protocol) server that connects AI assistants to the [BizPrint](https://www.getbizprint.com/) Cloud Print API. Send print jobs, manage printers and stations, and monitor print job status through natural language.

## Features

- List and inspect printers, stations, and print jobs
- Send documents to any configured printer by URL
- Monitor print job status in real time
- Pagination support for large fleets
- Secure HMAC-SHA256 API authentication
- One-click installation via Claude Desktop extension

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

- A BizPrint Cloud account with API keys ([get started](https://print.bizswoop.app/applications))
- Node.js 18 or later (not required for Desktop Extension install)

## Installation

### Desktop Extension (Recommended)

Install directly from the Anthropic Connectors Directory in Claude Desktop:

1. Open Claude Desktop
2. Go to Settings > Extensions
3. Search for "BizPrint" and click Install
4. Enter your BizPrint API keys when prompted

Your API keys are stored securely in your operating system's keychain.

Alternatively, download the `.mcpb` file from [Releases](https://github.com/bizswoop-development/bizprint-mcp-server/releases) and double-click to install.

### From npm

```bash
npm install -g @bizswoop/bizprint-mcp-server
```

### From source

```bash
git clone https://github.com/bizswoop-development/bizprint-mcp-server.git
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

### Claude Desktop (Manual)

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

## Examples

### Example 1: Checking your printer setup

**You:** What printers do I have set up?

**Claude:** Let me check your BizPrint printers.

You have 2 printers configured:

1. **Front Desk Laser** (ID: 12) - Enabled, Station 3, A4, Color
2. **Warehouse Label** (ID: 15) - Enabled, Station 3, 4x6 Label, B&W

Both printers are assigned to Station 3 ("Office Station"), which is currently online.

### Example 2: Sending a print job

**You:** Print the invoice at https://example.com/invoices/1042.pdf on the front desk printer.

**Claude:** I've created a print job:

- **Job ID:** 287
- **Printer:** Front Desk Laser (ID: 12)
- **Status:** pending
- **Document:** https://example.com/invoices/1042.pdf

The job has been sent to BizPrint and will print once the station picks it up.

### Example 3: Monitoring print job status

**You:** Show me the recent print jobs and their status.

**Claude:** Here are your recent print jobs:

1. **Job 287** - COMPLETED, Printer 12, "Invoice #1042"
2. **Job 286** - COMPLETED, Printer 15, "Shipping label order #523"
3. **Job 285** - FAILED, Printer 12, "Monthly report"

Job 285 failed. You may want to check the printer status and try again.

**You:** What's the status of job 287?

**Claude:** Job 287 is now **completed**. It was printed successfully on the Front Desk Laser printer.

## Development

```bash
npm install
npm test          # run tests
npm run build     # compile TypeScript
npm run pack:mcpb # build .mcpb desktop extension bundle
```

## Privacy Policy

This extension connects to the BizPrint Cloud Print API (print.bizswoop.app) using your API credentials. It transmits printer commands and document URLs to BizPrint's servers for print job execution. No data is stored locally beyond your API keys (secured in your OS keychain). For complete privacy information, see our privacy policy: https://getbizprint.com/privacy-policy/

### Data Handling

- API credentials are stored in your operating system's secure keychain
- Print job data (document URLs, printer selections) is sent to BizPrint Cloud API
- No conversation data or personal information is collected by this extension
- No data is shared with third parties beyond what is required for print job execution

## Support

- GitHub Issues: https://github.com/bizswoop-development/bizprint-mcp-server/issues
- Email: support@bizswoop.com
- Documentation: https://www.getbizprint.com

## License

MIT
