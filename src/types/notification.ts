/** Backend `NotificationPushDto` (TaneHesap.Application.Common.Interfaces.IRealtimeNotifier) ile eşleşir. */
export interface NotificationPush {
  id: string;
  type: string;
  message: string;
  createdAtUtc: string;
}

/** Backend `NotificationDto` (kalıcı kayıt, `GET /api/notifications`) ile birebir eşleşir. */
export interface NotificationDto {
  id: string;
  type: number;
  message: string;
  isRead: boolean;
  createdAtUtc: string;
}
