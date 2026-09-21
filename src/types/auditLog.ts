/** Backend `AuditLogDto` (TaneHesap.Application.AuditLogs) ile birebir eşleşir. */
export interface AuditLogDto {
  id: string;
  businessId: string | null;
  userId: string;
  actionType: string;
  entityName: string;
  entityId: string;
  oldValuesJson: string | null;
  newValuesJson: string | null;
  timestampUtc: string;
}

export interface AuditLogQuery {
  entityName?: string;
  fromUtc?: string;
  toUtc?: string;
}
