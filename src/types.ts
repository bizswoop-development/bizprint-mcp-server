export interface Printer {
  id: number;
  title: string;
  enabled: boolean;
  station: number;
  copies: number;
  paperSize: string;
  color: boolean;
  duplex: string;
  orientation: string;
  bin: string;
  paperSizeCustom: string;
  media: string;
}

export interface Station {
  id: number;
  title: string;
  status: string;
  version: string;
  domain: string;
  printers: number[];
}

export interface Job {
  id: number;
  printerId: number;
  url: string;
  description: string;
  status: string;
  printOption: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginationInfo {
  hasMore: boolean;
  totalAll: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface ApiErrorResponse {
  errorCode: string;
  message: string;
  errors?: Record<string, string[]>;
}

export class BizPrintError extends Error {
  public readonly errorCode: string;
  public readonly statusCode: number;
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    errorCode: string,
    message: string,
    statusCode: number,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "BizPrintError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}
