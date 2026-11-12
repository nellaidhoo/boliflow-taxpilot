export type Business = {
  id: string;
  name: string;
  tin: string;
  sector: "general" | "tourism";
  filingPeriod: "monthly" | "quarterly";
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Sale = {
  id: string;
  businessId: string;
  saleDate: string;
  reference: string;
  customerName: string | null;
  customerTin: string | null;
  description: string | null;
  taxLines: { rate: number; taxableAmount: number; gstAmount: number }[];
  zeroRatedAmount: number;
  exemptAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseStatus = "processing" | "needs_review" | "approved" | "failed";
export type PurchaseInvoice = {
  id: string;
  businessId: string;
  status: PurchaseStatus;
  fileName: string;
  contentType: string;
  supplierName: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  taxLines: { rate: number; taxableAmount: number; gstAmount: number }[];
  uploadedAt: string;
};

type ApiErrorBody = { error?: string; message?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requestApi<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const { body, headers: providedHeaders, ...init } = options;
  const headers = new Headers(providedHeaders);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const baseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let data: ApiErrorBody = {};
    try {
      data = (await response.json()) as ApiErrorBody;
    } catch {
      // Use the status code when the API response is not JSON.
    }
    throw new ApiError(data.message ?? "The request could not be completed", response.status, data.error);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
