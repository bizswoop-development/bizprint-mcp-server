import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ApiClient } from "./api.js";
import { BizPrintError } from "./types.js";
import {
  listPrinters,
  getPrinter,
  formatPrinterList,
  formatPrinter,
} from "./tools/printers.js";
import {
  listStations,
  getStation,
  formatStationList,
  formatStation,
} from "./tools/stations.js";
import {
  createPrintJob,
  getPrintJob,
  listPrintJobs,
  formatJob,
  formatJobList,
} from "./tools/jobs.js";

const BIZPRINT_PUBLIC_KEY = process.env.BIZPRINT_PUBLIC_KEY;
const BIZPRINT_SECRET_KEY = process.env.BIZPRINT_SECRET_KEY;
const BIZPRINT_API_URL = process.env.BIZPRINT_API_URL;

if (!BIZPRINT_PUBLIC_KEY || !BIZPRINT_SECRET_KEY) {
  console.error(
    "Missing required environment variables: BIZPRINT_PUBLIC_KEY and BIZPRINT_SECRET_KEY",
  );
  process.exit(1);
}

const client = new ApiClient(
  { publicKey: BIZPRINT_PUBLIC_KEY, secretKey: BIZPRINT_SECRET_KEY },
  BIZPRINT_API_URL,
);

const server = new Server(
  {
    name: "bizprint",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const paginationSchema = {
  page: {
    type: "number" as const,
    description: "Page number for pagination",
    minimum: 1,
  },
  perPage: {
    type: "number" as const,
    description: "Number of results per page (default: 50)",
    minimum: 1,
    maximum: 100,
  },
};

const TOOLS = [
  {
    name: "list_printers",
    description:
      "List all printers configured in BizPrint. Returns printer details including id, title, enabled status, station assignment, and print settings.",
    inputSchema: {
      type: "object" as const,
      properties: { ...paginationSchema },
    },
  },
  {
    name: "get_printer",
    description:
      "Get details for a specific printer by ID. Returns printer configuration including title, enabled status, station, copies, paper size, color, duplex, and orientation settings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        printerId: {
          type: "number" as const,
          description: "The printer ID",
          minimum: 1,
        },
      },
      required: ["printerId"],
    },
  },
  {
    name: "list_stations",
    description:
      "List all print stations configured in BizPrint. Returns station details including id, title, status, version, domain, and assigned printers.",
    inputSchema: {
      type: "object" as const,
      properties: { ...paginationSchema },
    },
  },
  {
    name: "get_station",
    description:
      "Get details for a specific print station by ID. Returns station configuration including title, status, version, domain, and assigned printers.",
    inputSchema: {
      type: "object" as const,
      properties: {
        stationId: {
          type: "number" as const,
          description: "The station ID",
          minimum: 1,
        },
      },
      required: ["stationId"],
    },
  },
  {
    name: "create_print_job",
    description:
      "Create a new print job in BizPrint. Sends a document URL to a specific printer for printing. Returns the created job details including id and status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        printerId: {
          type: "number" as const,
          description: "The ID of the printer to send the job to",
          minimum: 1,
        },
        url: {
          type: "string" as const,
          description: "The URL of the document to print",
          format: "uri",
        },
        description: {
          type: "string" as const,
          description: "A description for this print job",
          minLength: 1,
        },
        printOption: {
          type: "object" as const,
          description: "Optional print settings (e.g., copies, paper size)",
        },
      },
      required: ["printerId", "url", "description"],
    },
  },
  {
    name: "get_print_job",
    description:
      "Get details for a specific print job by ID. Returns job information including printer, URL, description, status, and creation time.",
    inputSchema: {
      type: "object" as const,
      properties: {
        jobId: {
          type: "number" as const,
          description: "The print job ID",
          minimum: 1,
        },
      },
      required: ["jobId"],
    },
  },
  {
    name: "list_print_jobs",
    description:
      "List all print jobs in BizPrint. Returns job details including id, printer, URL, description, status, and creation time.",
    inputSchema: {
      type: "object" as const,
      properties: { ...paginationSchema },
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

const ERROR_GUIDANCE: Record<string, string> = {
  ERR_UNAUTHORIZED:
    "Check that BIZPRINT_PUBLIC_KEY and BIZPRINT_SECRET_KEY are correct and that the application is active in the BizPrint dashboard.",
  ERR_TOO_OLD_REQUEST:
    "The server clock may be out of sync. Verify system time is accurate.",
  ERR_NOT_FOUND:
    "The requested resource does not exist. Verify the ID is correct.",
  ERR_VALIDATION:
    "The request contained invalid data. Check the field errors below.",
  ERR_ACCESS_FORBIDDEN:
    "The API key does not have permission for this action. Check application permissions in the BizPrint dashboard.",
  ERR_SOMETHING_WRONG:
    "An unexpected error occurred on the BizPrint server. Try again shortly or contact BizPrint support if the issue persists.",
  ERR_JOB_LIMIT_REACHED:
    "The print job limit for this account has been reached. Upgrade your BizPrint plan or wait for existing jobs to complete.",
  ERR_JOB_CREATING_PRINT_JOB_LIMIT:
    "The print job limit for this account has been reached. Upgrade your BizPrint plan or wait for existing jobs to complete.",
  ERR_PRINTER_OFFLINE:
    "The target printer or its station is offline. Check that the station is running and connected.",
  ERR_JOB_CREATING_INVALID_PRINTER_ID:
    "The specified printer ID does not exist or is not available. Verify the printer ID with list_printers.",
  ERR_INVALID_URL:
    "The document URL provided is not accessible or not in a supported format.",
};

function formatError(error: BizPrintError): string {
  const parts = [`Error ${error.errorCode}: ${error.message}`];

  const guidance = ERROR_GUIDANCE[error.errorCode];
  if (guidance) {
    parts.push(`Suggestion: ${guidance}`);
  }

  if (error.statusCode >= 500) {
    parts.push("Suggestion: This is a server-side error. Try again shortly.");
  }

  if (error.fieldErrors) {
    parts.push("Field errors:");
    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      parts.push(`  ${field}: ${messages.join(", ")}`);
    }
  }

  return parts.join("\n");
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let text: string;

    switch (name) {
      case "list_printers":
        text = formatPrinterList(
          await listPrinters(client, args as { page?: number; perPage?: number }),
        );
        break;
      case "get_printer":
        text = formatPrinter(
          await getPrinter(client, args as { printerId: number }),
        );
        break;
      case "list_stations":
        text = formatStationList(
          await listStations(client, args as { page?: number; perPage?: number }),
        );
        break;
      case "get_station":
        text = formatStation(
          await getStation(client, args as { stationId: number }),
        );
        break;
      case "create_print_job":
        text = formatJob(
          await createPrintJob(
            client,
            args as {
              printerId: number;
              url: string;
              description: string;
              printOption?: Record<string, unknown>;
            },
          ),
        );
        break;
      case "get_print_job":
        text = formatJob(
          await getPrintJob(client, args as { jobId: number }),
        );
        break;
      case "list_print_jobs":
        text = formatJobList(
          await listPrintJobs(client, args as { page?: number; perPage?: number }),
        );
        break;
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text", text }],
    };
  } catch (error) {
    if (error instanceof BizPrintError) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
