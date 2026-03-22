import { signGetParams, signPostBody, type AuthKeys } from "./auth.js";
import {
  BizPrintError,
  type ApiListResponse,
  type PaginationInfo,
  type ApiErrorResponse,
} from "./types.js";

const BASE_URL = "https://print.bizswoop.app/api/connect-application/v1";

export class ApiClient {
  private keys: AuthKeys;
  private baseUrl: string;

  constructor(keys: AuthKeys, baseUrl?: string) {
    this.keys = keys;
    this.baseUrl = baseUrl ?? BASE_URL;
  }

  async get<T>(
    path: string,
    queryArgs: Record<string, string> = {},
  ): Promise<T> {
    const params = signGetParams(queryArgs, this.keys);
    const url = `${this.baseUrl}${path}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    return this.handleResponse<T>(response);
  }

  async getList<T>(
    path: string,
    queryArgs: Record<string, string> = {},
  ): Promise<ApiListResponse<T>> {
    const params = signGetParams(queryArgs, this.keys);
    const url = `${this.baseUrl}${path}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      await this.throwApiError(response);
    }

    const body = await response.json();
    const data: T[] = Array.isArray(body) ? body : (body as { data: T[] }).data;
    const pagination = this.extractPagination(response);

    return { data, pagination };
  }

  async post<T>(
    path: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    const signedBody = signPostBody(data, this.keys);
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify(signedBody),
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      await this.throwApiError(response);
    }
    return (await response.json()) as T;
  }

  private async throwApiError(response: Response): Promise<never> {
    let errorBody: ApiErrorResponse;
    try {
      errorBody = (await response.json()) as ApiErrorResponse;
    } catch {
      throw new BizPrintError(
        "ERR_UNKNOWN",
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
      );
    }
    throw new BizPrintError(
      errorBody.errorCode || "ERR_UNKNOWN",
      errorBody.message || response.statusText,
      response.status,
      errorBody.errors,
    );
  }

  private extractPagination(response: Response): PaginationInfo {
    return {
      hasMore: response.headers.get("X-Biz-Has-More") === "true",
      totalAll: Number(response.headers.get("X-Biz-Total-All") ?? 0),
      totalPages: Number(response.headers.get("X-Biz-Total-Pages") ?? 0),
    };
  }
}
