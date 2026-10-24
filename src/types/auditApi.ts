export interface AuditSummaryResponse {
  id: number;
  userId: number | null;
  entity: string;
  entityId: number | null;
  action: string;
  reason: string | null;
  occurredAt: string;
}

export interface PagedAuditResponse {
  content: AuditSummaryResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditDetailResponse extends AuditSummaryResponse {
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  sourceIp: string | null;
  userAgent: string | null;
}

export interface AuditListParams {
  page?: number;
  size?: number;
  entity?: string;
  action?: string;
  userId?: number;
  from?: string;
  to?: string;
}
