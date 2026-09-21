import { useState, type FormEvent } from "react";
import { adminApi } from "../../api/adminApi";
import { extractErrorMessage } from "../../api/apiError";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { AdminDto } from "../../types/admin";

interface BusinessAdminsPanelProps {
  businessId: string;
}

interface EditDraft {
  username: string;
  fullName: string;
  isActive: boolean;
}

function toEditDraft(admin: AdminDto): EditDraft {
  return { username: admin.username, fullName: admin.fullName, isActive: admin.isActive };
}

/**
 * Bir işletmenin ADMIN (işletme sahibi) kullanıcılarını listeleyip yeni ADMIN eklediği panel —
 * `BusinessesPage`'te bir işletme satırı genişletildiğinde gösterilir. Bir işletme, ona giriş
 * yapabilecek bir ADMIN atanmadan kullanılamaz olduğu için (bkz. proje raporu bölüm 2, 10) bu,
 * `BusinessesPage`'in doğal bir devamıdır; ayrı bir dosyada tutulması `BusinessesPage.tsx`'in
 * şişmesini önler (Single Responsibility).
 */
export function BusinessAdminsPanel({ businessId }: BusinessAdminsPanelProps) {
  const { data: admins, error: loadError, setData: setAdmins } = useAsyncData(() => adminApi.getAll(businessId), businessId);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const created = await adminApi.create(businessId, {
        username: newUsername.trim(),
        password: newPassword,
        fullName: newFullName.trim(),
      });
      setAdmins((current) => [...(current ?? []), created]);
      setNewUsername("");
      setNewPassword("");
      setNewFullName("");
    } catch (error) {
      setCreateError(extractErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(admin: AdminDto) {
    setEditingId(admin.id);
    setEditDraft(toEditDraft(admin));
    setSaveError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft(null);
    setSaveError(null);
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !editDraft) {
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const updated = await adminApi.update(businessId, editingId, {
        username: editDraft.username.trim() || null,
        password: null,
        fullName: editDraft.fullName.trim() || null,
        isActive: editDraft.isActive,
      });
      setAdmins((current) => current?.map((a) => (a.id === updated.id ? updated : a)) ?? current);
      cancelEditing();
    } catch (error) {
      setSaveError(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="business-admins-panel">
      <form className="admin-create-form" onSubmit={handleCreate}>
        <div>
          <label htmlFor={`admin-username-${businessId}`}>Kullanıcı adı</label>
          <input
            id={`admin-username-${businessId}`}
            value={newUsername}
            onChange={(event) => setNewUsername(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor={`admin-fullname-${businessId}`}>Ad soyad</label>
          <input
            id={`admin-fullname-${businessId}`}
            value={newFullName}
            onChange={(event) => setNewFullName(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor={`admin-password-${businessId}`}>Şifre</label>
          <input
            id={`admin-password-${businessId}`}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>
        <button type="submit" disabled={isCreating}>
          {isCreating ? "Ekleniyor…" : "Yönetici ekle"}
        </button>
        {createError && <p className="business-form-error">{createError}</p>}
      </form>

      {loadError && <p className="business-form-error">{loadError}</p>}

      {admins === null && !loadError && <p className="businesses-empty">Yükleniyor…</p>}

      {admins !== null && admins.length === 0 && (
        <p className="businesses-empty">
          Bu işletmenin henüz bir yöneticisi yok — yukarıdaki formla ilk ADMIN'i ekleyin, aksi halde
          işletmeye kimse giriş yapamaz.
        </p>
      )}

      {admins !== null && admins.length > 0 && (
        <table className="businesses-table">
          <thead>
            <tr>
              <th>Kullanıcı adı</th>
              <th>Ad soyad</th>
              <th>Durum</th>
              <th aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) =>
              editingId === admin.id && editDraft ? (
                <tr key={admin.id}>
                  <td colSpan={4}>
                    <form className="business-edit-form" onSubmit={handleSaveEdit}>
                      <input
                        value={editDraft.username}
                        onChange={(event) => setEditDraft({ ...editDraft, username: event.target.value })}
                        required
                        aria-label="Kullanıcı adı"
                      />
                      <input
                        value={editDraft.fullName}
                        onChange={(event) => setEditDraft({ ...editDraft, fullName: event.target.value })}
                        required
                        aria-label="Ad soyad"
                      />
                      <label className="business-active-toggle">
                        <input
                          type="checkbox"
                          checked={editDraft.isActive}
                          onChange={(event) => setEditDraft({ ...editDraft, isActive: event.target.checked })}
                        />
                        Aktif
                      </label>
                      <div className="business-edit-actions">
                        <button type="submit" disabled={isSaving}>
                          {isSaving ? "Kaydediliyor…" : "Kaydet"}
                        </button>
                        <button type="button" onClick={cancelEditing} disabled={isSaving}>
                          Vazgeç
                        </button>
                      </div>
                      {saveError && <p className="business-form-error">{saveError}</p>}
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={admin.id}>
                  <td>{admin.username}</td>
                  <td>{admin.fullName}</td>
                  <td>
                    <span className={admin.isActive ? "business-status active" : "business-status inactive"}>
                      {admin.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td>
                    <button type="button" onClick={() => startEditing(admin)}>
                      Düzenle
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
