import type { ApiClient } from "../api.js";
import type { Printer, ApiListResponse } from "../types.js";

interface RawPrinter extends Omit<Printer, "station"> {
  Station?: number;
  station?: number;
}

function normalizePrinter(raw: RawPrinter): Printer {
  const { Station, ...rest } = raw;
  return {
    ...rest,
    station: rest.station ?? Station ?? 0,
  };
}

const DEFAULT_PER_PAGE = 50;

export async function listPrinters(
  client: ApiClient,
  args: { page?: number; perPage?: number },
) {
  const queryArgs: Record<string, string> = {
    perPage: String(args.perPage ?? DEFAULT_PER_PAGE),
  };
  if (args.page !== undefined) queryArgs.page = String(args.page);

  const result = await client.getList<RawPrinter>("/printers", queryArgs);
  return {
    data: result.data.map(normalizePrinter),
    pagination: result.pagination,
  };
}

export async function getPrinter(
  client: ApiClient,
  args: { printerId: number },
) {
  const raw = await client.get<RawPrinter>(`/printers/${args.printerId}`);
  return normalizePrinter(raw);
}

export function formatPrinter(p: Printer): string {
  const status = p.enabled ? "Enabled" : "Disabled";
  const lines = [
    `Printer: ${p.title} (ID: ${p.id}) -${status}`,
    `  Station: ${p.station} | Copies: ${p.copies} | Paper: ${p.paperSize}`,
    `  Color: ${p.color ? "Yes" : "No"} | Duplex: ${p.duplex} | Orientation: ${p.orientation}`,
  ];
  return lines.join("\n");
}

export function formatPrinterList(result: ApiListResponse<Printer>): string {
  if (result.data.length === 0) {
    return "No printers found.";
  }
  const lines = result.data.map((p) => {
    const status = p.enabled ? "Enabled" : "Disabled";
    return `• ${p.title} (ID: ${p.id}) -${status}, Station ${p.station}, ${p.paperSize}, ${p.color ? "Color" : "B&W"}`;
  });
  const { pagination } = result;
  if (pagination.totalAll > 0) {
    lines.push(
      `\n${result.data.length} of ${pagination.totalAll} printers shown.`,
    );
  }
  if (pagination.hasMore) {
    lines.push("More results available - use page parameter to see next page.");
  }
  return lines.join("\n");
}
