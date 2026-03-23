import type { ApiClient } from "../api.js";
import type { Job, ApiListResponse } from "../types.js";

export async function createPrintJob(
  client: ApiClient,
  args: {
    printerId: number;
    url: string;
    description: string;
    printOption?: Record<string, unknown>;
  },
) {
  const data: Record<string, unknown> = {
    printerId: args.printerId,
    url: args.url,
    description: args.description,
  };
  if (args.printOption !== undefined) {
    data.printOption = args.printOption;
  }

  // POST /jobs returns { job: Job }, not { data: Job }
  const result = await client.post<{ job: Job }>("/jobs", data);
  return result.job;
}

export async function getPrintJob(
  client: ApiClient,
  args: { jobId: number },
) {
  return client.get<Job>(`/jobs/${args.jobId}`);
}

const DEFAULT_PER_PAGE = 50;

export async function listPrintJobs(
  client: ApiClient,
  args: { page?: number; perPage?: number },
) {
  const queryArgs: Record<string, string> = {
    perPage: String(args.perPage ?? DEFAULT_PER_PAGE),
  };
  if (args.page !== undefined) queryArgs.page = String(args.page);

  return client.getList<Job>("/jobs", queryArgs);
}

export function formatJob(j: Job): string {
  const lines = [
    `Job ${j.id}: ${j.status.toUpperCase()}`,
    `  Printer: ${j.printerId} | Description: ${j.description}`,
    `  URL: ${j.url}`,
  ];
  if (j.createdAt) {
    lines.push(`  Created: ${j.createdAt}`);
  }
  if (j.printOption && Object.keys(j.printOption).length > 0) {
    lines.push(`  Options: ${JSON.stringify(j.printOption)}`);
  }
  return lines.join("\n");
}

export function formatJobList(result: ApiListResponse<Job>): string {
  if (result.data.length === 0) {
    return "No print jobs found.";
  }
  const lines = result.data.map((j) =>
    `• Job ${j.id}: ${j.status.toUpperCase()} -Printer ${j.printerId}, "${j.description}"`,
  );
  const { pagination } = result;
  if (pagination.totalAll > 0) {
    lines.push(`\n${result.data.length} of ${pagination.totalAll} jobs shown.`);
  }
  if (pagination.hasMore) {
    lines.push("More results available - use page parameter to see next page.");
  }
  return lines.join("\n");
}
