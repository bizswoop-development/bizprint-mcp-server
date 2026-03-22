import type { ApiClient } from "../api.js";
import type { Station, ApiListResponse } from "../types.js";

const DEFAULT_PER_PAGE = 50;

export async function listStations(
  client: ApiClient,
  args: { page?: number; perPage?: number },
) {
  const queryArgs: Record<string, string> = {
    perPage: String(args.perPage ?? DEFAULT_PER_PAGE),
  };
  if (args.page !== undefined) queryArgs.page = String(args.page);

  return client.getList<Station>("/stations", queryArgs);
}

export async function getStation(
  client: ApiClient,
  args: { stationId: number },
) {
  return client.get<Station>(`/stations/${args.stationId}`);
}

export function formatStation(s: Station): string {
  const lines = [
    `Station: ${s.title} (ID: ${s.id}) — ${s.status}`,
    `  Domain: ${s.domain} | Version: ${s.version}`,
    `  Printers: ${s.printers.length > 0 ? s.printers.join(", ") : "none"}`,
  ];
  return lines.join("\n");
}

export function formatStationList(result: ApiListResponse<Station>): string {
  if (result.data.length === 0) {
    return "No stations found.";
  }
  const lines = result.data.map((s) =>
    `• ${s.title} (ID: ${s.id}) — ${s.status}, ${s.printers.length} printer(s)`,
  );
  const { pagination } = result;
  if (pagination.totalAll > 0) {
    lines.push(`\n${result.data.length} of ${pagination.totalAll} stations shown.`);
  }
  if (pagination.hasMore) {
    lines.push("More results available — use page parameter to see next page.");
  }
  return lines.join("\n");
}
