import { HubConnectionBuilder, type HubConnection } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../api/httpClient";
import { getAccessToken } from "../api/tokenStore";
import type { NotificationPush } from "../types/notification";

const MAX_KEPT_NOTIFICATIONS = 20;

/**
 * Backend `NotificationsHub` (`/hubs/notifications`, sadece ADMIN — bkz. proje raporu bölüm 8)
 * ile anlık bildirim bağlantısı. JWT, WebSocket bağlantısında `accessTokenFactory` ile query
 * string üzerinden gönderilir. Bağlantı kurulamazsa sessizce yoksayılır: bildirimler her zaman
 * `GET /api/notifications` ile de okunabildiği için anlık iletim best-effort'tur.
 */
export function useNotificationsHub(enabled: boolean): NotificationPush[] {
  const [notifications, setNotifications] = useState<NotificationPush[]>([]);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/notifications`, {
        accessTokenFactory: () => getAccessToken() ?? "",
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNotification", (notification: NotificationPush) => {
      setNotifications((current) => [notification, ...current].slice(0, MAX_KEPT_NOTIFICATIONS));
    });

    connection.start().catch(() => {
      // best-effort — yukarıdaki not.
    });

    connectionRef.current = connection;

    return () => {
      void connection.stop();
      connectionRef.current = null;
    };
  }, [enabled]);

  return notifications;
}
