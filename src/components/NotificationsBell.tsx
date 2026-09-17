import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useNotificationsHub } from "../realtime/useNotificationsHub";
import { UserRole } from "../types/auth";
import "./NotificationsBell.css";

/** Backend `NotificationsHub` yalnızca `Admin` rolüne izin verir (`[Authorize(Roles = "Admin")]`). */
export function NotificationsBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useNotificationsHub(user?.role === UserRole.Admin);

  if (user?.role !== UserRole.Admin) {
    return null;
  }

  return (
    <div className="notifications-bell">
      <button
        type="button"
        className="notifications-bell-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Bildirimler"
      >
        🔔
        {notifications.length > 0 && <span className="notifications-bell-badge">{notifications.length}</span>}
      </button>

      {isOpen && (
        <div className="notifications-bell-dropdown">
          {notifications.length === 0 ? (
            <p className="notifications-bell-empty">Yeni bildirim yok.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="notifications-bell-item">
                <p>{notification.message}</p>
                <time>{new Date(notification.createdAtUtc).toLocaleString("tr-TR")}</time>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
