import { describe, it, expect, vi } from "vitest";
import {
  listPrinters,
  getPrinter,
  formatPrinter,
  formatPrinterList,
} from "../tools/printers.js";
import {
  listStations,
  getStation,
  formatStation,
  formatStationList,
} from "../tools/stations.js";
import {
  createPrintJob,
  getPrintJob,
  listPrintJobs,
  formatJob,
  formatJobList,
} from "../tools/jobs.js";
import type { ApiClient } from "../api.js";
import type { Printer, Station, Job } from "../types.js";

function mockClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn(),
    getList: vi.fn(),
    post: vi.fn(),
    ...overrides,
  } as unknown as ApiClient;
}

describe("printers", () => {
  it("listPrinters normalizes Station to station", async () => {
    const client = mockClient({
      getList: vi.fn().mockResolvedValue({
        data: [
          { id: 1, title: "Printer 1", Station: 5 },
          { id: 2, title: "Printer 2", station: 3 },
        ],
        pagination: { hasMore: false, totalAll: 2, totalPages: 1 },
      }),
    });

    const result = await listPrinters(client, {});
    expect(result.data[0].station).toBe(5);
    expect(result.data[1].station).toBe(3);
    expect((result.data[0] as Record<string, unknown>).Station).toBeUndefined();
  });

  it("listPrinters defaults perPage to 50", async () => {
    const getListMock = vi.fn().mockResolvedValue({ data: [], pagination: { hasMore: false, totalAll: 0, totalPages: 0 } });
    const client = mockClient({ getList: getListMock });

    await listPrinters(client, {});
    expect(getListMock).toHaveBeenCalledWith("/printers", { perPage: "50" });
  });

  it("listPrinters passes page and perPage as query args", async () => {
    const getListMock = vi.fn().mockResolvedValue({ data: [], pagination: { hasMore: false, totalAll: 0, totalPages: 0 } });
    const client = mockClient({ getList: getListMock });

    await listPrinters(client, { page: 2, perPage: 10 });
    expect(getListMock).toHaveBeenCalledWith("/printers", { page: "2", perPage: "10" });
  });

  it("getPrinter normalizes Station", async () => {
    const client = mockClient({
      get: vi.fn().mockResolvedValue({ id: 1, title: "Test", Station: 7 }),
    });

    const result = await getPrinter(client, { printerId: 1 });
    expect(result.station).toBe(7);
    expect((result as Record<string, unknown>).Station).toBeUndefined();
  });

  it("formatPrinter produces human-readable output", () => {
    const printer: Printer = {
      id: 12,
      title: "Front Desk Laser",
      enabled: true,
      station: 3,
      copies: 1,
      paperSize: "A4",
      color: true,
      duplex: "none",
      orientation: "portrait",
      bin: "",
      paperSizeCustom: "",
      media: "",
    };

    const text = formatPrinter(printer);
    expect(text).toContain("Front Desk Laser");
    expect(text).toContain("ID: 12");
    expect(text).toContain("Enabled");
    expect(text).toContain("Station: 3");
    expect(text).toContain("Color: Yes");
  });

  it("formatPrinterList shows empty message when no printers", () => {
    const text = formatPrinterList({
      data: [],
      pagination: { hasMore: false, totalAll: 0, totalPages: 0 },
    });
    expect(text).toBe("No printers found.");
  });

  it("formatPrinterList shows pagination hint when hasMore", () => {
    const printers: Printer[] = [
      {
        id: 1, title: "P1", enabled: true, station: 1, copies: 1,
        paperSize: "A4", color: false, duplex: "none", orientation: "portrait",
        bin: "", paperSizeCustom: "", media: "",
      },
    ];
    const text = formatPrinterList({
      data: printers,
      pagination: { hasMore: true, totalAll: 10, totalPages: 5 },
    });
    expect(text).toContain("More results available");
    expect(text).toContain("1 of 10 printers shown");
  });
});

describe("stations", () => {
  it("listStations defaults perPage to 50", async () => {
    const getListMock = vi.fn().mockResolvedValue({
      data: [],
      pagination: { hasMore: false, totalAll: 0, totalPages: 0 },
    });
    const client = mockClient({ getList: getListMock });

    await listStations(client, {});
    expect(getListMock).toHaveBeenCalledWith("/stations", { perPage: "50" });
  });

  it("listStations delegates to getList", async () => {
    const getListMock = vi.fn().mockResolvedValue({
      data: [{ id: 1, title: "Station 1" }],
      pagination: { hasMore: false, totalAll: 1, totalPages: 1 },
    });
    const client = mockClient({ getList: getListMock });

    const result = await listStations(client, { page: 1 });
    expect(getListMock).toHaveBeenCalledWith("/stations", { page: "1", perPage: "50" });
    expect(result.data).toHaveLength(1);
  });

  it("getStation delegates to get", async () => {
    const getMock = vi.fn().mockResolvedValue({ id: 5, title: "My Station" });
    const client = mockClient({ get: getMock });

    const result = await getStation(client, { stationId: 5 });
    expect(getMock).toHaveBeenCalledWith("/stations/5");
    expect(result.id).toBe(5);
  });

  it("formatStation produces human-readable output", () => {
    const station: Station = {
      id: 3,
      title: "Office Station",
      status: "online",
      version: "2.1.0",
      domain: "office.local",
      printers: [12, 15],
    };

    const text = formatStation(station);
    expect(text).toContain("Office Station");
    expect(text).toContain("ID: 3");
    expect(text).toContain("online");
    expect(text).toContain("12, 15");
  });

  it("formatStationList shows empty message when no stations", () => {
    const text = formatStationList({
      data: [],
      pagination: { hasMore: false, totalAll: 0, totalPages: 0 },
    });
    expect(text).toBe("No stations found.");
  });
});

describe("jobs", () => {
  it("createPrintJob sends POST and extracts job from response", async () => {
    const job = { id: 1, printerId: 1, status: "pending" };
    const postMock = vi.fn().mockResolvedValue({ job });
    const client = mockClient({ post: postMock });

    const result = await createPrintJob(client, {
      printerId: 1,
      url: "https://example.com/doc.pdf",
      description: "Test print",
    });

    expect(postMock).toHaveBeenCalledWith("/jobs", {
      printerId: 1,
      url: "https://example.com/doc.pdf",
      description: "Test print",
    });
    expect(result).toEqual(job);
  });

  it("createPrintJob includes printOption when provided", async () => {
    const postMock = vi.fn().mockResolvedValue({ job: { id: 1 } });
    const client = mockClient({ post: postMock });

    await createPrintJob(client, {
      printerId: 1,
      url: "https://example.com/doc.pdf",
      description: "Test",
      printOption: { copies: 2 },
    });

    expect(postMock).toHaveBeenCalledWith("/jobs", {
      printerId: 1,
      url: "https://example.com/doc.pdf",
      description: "Test",
      printOption: { copies: 2 },
    });
  });

  it("getPrintJob delegates to get", async () => {
    const getMock = vi.fn().mockResolvedValue({ id: 42, status: "completed" });
    const client = mockClient({ get: getMock });

    const result = await getPrintJob(client, { jobId: 42 });
    expect(getMock).toHaveBeenCalledWith("/jobs/42");
    expect(result.id).toBe(42);
  });

  it("listPrintJobs defaults perPage to 50", async () => {
    const getListMock = vi.fn().mockResolvedValue({
      data: [],
      pagination: { hasMore: false, totalAll: 0, totalPages: 0 },
    });
    const client = mockClient({ getList: getListMock });

    await listPrintJobs(client, {});
    expect(getListMock).toHaveBeenCalledWith("/jobs", { perPage: "50" });
  });

  it("listPrintJobs delegates to getList with pagination", async () => {
    const getListMock = vi.fn().mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }],
      pagination: { hasMore: true, totalAll: 50, totalPages: 25 },
    });
    const client = mockClient({ getList: getListMock });

    const result = await listPrintJobs(client, { page: 3, perPage: 2 });
    expect(getListMock).toHaveBeenCalledWith("/jobs", { page: "3", perPage: "2" });
    expect(result.pagination.hasMore).toBe(true);
  });

  it("formatJob shows status prominently", () => {
    const job: Job = {
      id: 287,
      printerId: 12,
      url: "https://example.com/invoice.pdf",
      description: "Invoice #1042",
      status: "completed",
      printOption: null,
      createdAt: "2025-01-15T10:30:00Z",
    };

    const text = formatJob(job);
    expect(text).toContain("Job 287: COMPLETED");
    expect(text).toContain("Printer: 12");
    expect(text).toContain("Invoice #1042");
    expect(text).toContain("https://example.com/invoice.pdf");
    expect(text).toContain("2025-01-15");
  });

  it("formatJob includes print options when present", () => {
    const job: Job = {
      id: 1,
      printerId: 1,
      url: "https://example.com/doc.pdf",
      description: "Test",
      status: "pending",
      printOption: { copies: 3 },
      createdAt: "2025-01-15T10:30:00Z",
    };

    const text = formatJob(job);
    expect(text).toContain("Options:");
    expect(text).toContain("copies");
  });

  it("formatJobList shows empty message when no jobs", () => {
    const text = formatJobList({
      data: [],
      pagination: { hasMore: false, totalAll: 0, totalPages: 0 },
    });
    expect(text).toBe("No print jobs found.");
  });

  it("formatJobList shows status-first summary", () => {
    const jobs: Job[] = [
      {
        id: 1, printerId: 12, url: "https://example.com/a.pdf",
        description: "Doc A", status: "completed", printOption: null, createdAt: "",
      },
      {
        id: 2, printerId: 12, url: "https://example.com/b.pdf",
        description: "Doc B", status: "failed", printOption: null, createdAt: "",
      },
    ];
    const text = formatJobList({
      data: jobs,
      pagination: { hasMore: false, totalAll: 2, totalPages: 1 },
    });
    expect(text).toContain("Job 1: COMPLETED");
    expect(text).toContain("Job 2: FAILED");
  });
});
