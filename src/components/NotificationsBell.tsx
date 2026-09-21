import { useState } from "react";
import { notificationApi } from "../api/moduleApis";
import { useAuth } from "../auth/useAuth";
import { useAsyncData } from "../hooks/useAsyncData";
import { useNotificationsHub } from "../realtime/useNotificationsHub";
import { UserRole } from "../types/auth";
import "./NotificationsBell.css";

interface BellItem {
  id: string;
  message: string;
  createdAtUtc: string;
}

/**
 * ADMIN bildirimleri: açılışta kalıcı okunmamış bildirimler (`GET /api/notifications`) yüklenir,
 * sonrasında gelenler SignalR ile anlık eklenir; "okundu" işaretlenen bildirim listeden düşer.
 * Backend bildirim uçları ve hub'ı yalnızca `Admin` rolüne açıktır.
 */
export function NotificationsBell() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.Admin;
  return isAdmin ? <AdminNotificationsBell /> : null;
}

function AdminNotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const persisted = useAsyncData(() => notificationApi.getAll(true));
  const pushed = useNotificationsHub(true);

  const byId = new Map<string, BellItem>();
  for (const item of [...pushed, ...(persisted.data ?? [])]) {
    if (!readIds.has(item.id) && !byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  const items = [...byId.values()].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));

  async function markAsRead(id: string) {
    setReadIds((current) => new Set(current).add(id));
    try {
      await notificationApi.markAsRead(id);
    } catch {
      // Başarısız olursa bir sonraki yüklemede bildirim tekrar görünür; kullanıcı akışı bozulmaz.
    }
  }

  return (
    <div className="notifications-bell">
      <button type="button" className="notifications-bell-toggle" onClick={() => setIsOpen((open) => !open)} aria-label="Bildirimler">
        🔔
        {items.length > 0 && <span className="notifications-bell-badge">{items.length}</span>}
      </button>

      {isOpen && (
        <div className="notifications-bell-dropdown">
          {items.length === 0 ? (
            <p className="notifications-bell-empty">Okunmamış bildirim yok.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="notifications-bell-item">
                <p>{item.message}</p>
                <div className="notifications-bell-meta">
                  <time>{new Date(item.createdAtUtc).toLocaleString("tr-TR")}</time>
                  <button type="button" onClick={() => void markAsRead(item.id)}>
                    Okundu
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
