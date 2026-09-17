/** Backend `NotificationPushDto` (TaneHesap.Application.Common.Interfaces.IRealtimeNotifier) ile eşleşir. */
export interface NotificationPush {
  id: string;
  type: string;
  message: string;
  createdAtUtc: string;
}
