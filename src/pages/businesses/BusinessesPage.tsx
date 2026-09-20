import { Fragment, useEffect, useState, type FormEvent } from "react";
import { businessApi } from "../../api/businessApi";
import { extractErrorMessage } from "../../api/authApi";
import type { BusinessDto } from "../../types/business";
import { BusinessAdminsPanel } from "./BusinessAdminsPanel";
import "./BusinessesPage.css";

interface EditDraft {
  name: string;
  address: string;
  isActive: boolean;
}

function toEditDraft(business: BusinessDto): EditDraft {
  return { name: business.name, address: business.address ?? "", isActive: business.isActive };
}

/**
 * SUPER_ADMIN'in işletme (Business) listeleyip yeni işletme açtığı ve mevcutları düzenlediği sayfa
 * (bkz. proje raporu bölüm 2, 10 — backend `BusinessesController` zaten hazırdı, bu sayfa eksik olan
 * arayüz parçasıydı). Rota koruması zaten `RequireAuth`/`navigation.ts` üzerinden SUPER_ADMIN'e
 * kısıtlı — burada ayrıca rol kontrolü tekrar edilmez (DRY).
 */
export function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);

  function toggleAdminsPanel(businessId: string) {
    setExpandedBusinessId((current) => (current === businessId ? null : businessId));
  }

  async function loadBusinesses() {
    try {
      setBusinesses(await businessApi.getAll());
      setLoadError(null);
    } catch (error) {
      setLoadError(extractErrorMessage(error));
    }
  }

  useEffect(() => {
    void loadBusinesses();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const created = await businessApi.create({ name: newName.trim(), address: newAddress.trim() || null });
      setBusinesses((current) => [...(current ?? []), created]);
      setNewName("");
      setNewAddress("");
    } catch (error) {
      setCreateError(extractErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(business: BusinessDto) {
    setEditingId(business.id);
    setEditDraft(toEditDraft(business));
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
      const updated = await businessApi.update(editingId, {
        name: editDraft.name.trim(),
        address: editDraft.address.trim() || null,
        isActive: editDraft.isActive,
      });
      setBusinesses((current) => current?.map((b) => (b.id === updated.id ? updated : b)) ?? current);
      cancelEditing();
    } catch (error) {
      setSaveError(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="businesses-page">
      <h1>İşletmeler</h1>

      <form className="business-create-form" onSubmit={handleCreate}>
        <div>
          <label htmlFor="new-business-name">İşletme adı</label>
          <input
            id="new-business-name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="new-business-address">Adres (opsiyonel)</label>
          <input
            id="new-business-address"
            value={newAddress}
            onChange={(event) => setNewAddress(event.target.value)}
          />
        </div>
        <button type="submit" disabled={isCreating}>
          {isCreating ? "Ekleniyor…" : "İşletme ekle"}
        </button>
        {createError && <p className="business-form-error">{createError}</p>}
      </form>

      {loadError && <p className="business-form-error">{loadError}</p>}

      {businesses === null && !loadError && <p className="businesses-empty">Yükleniyor…</p>}

      {businesses !== null && businesses.length === 0 && (
        <p className="businesses-empty">Henüz işletme yok — yukarıdaki formla ilk işletmeyi ekleyin.</p>
      )}

      {businesses !== null && businesses.length > 0 && (
        <table className="businesses-table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Adres</th>
              <th>Durum</th>
              <th aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {businesses.map((business) => (
              <Fragment key={business.id}>
                {editingId === business.id && editDraft ? (
                  <tr>
                    <td colSpan={4}>
                      <form className="business-edit-form" onSubmit={handleSaveEdit}>
                        <input
                          value={editDraft.name}
                          onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                          required
                          aria-label="İşletme adı"
                        />
                        <input
                          value={editDraft.address}
                          onChange={(event) => setEditDraft({ ...editDraft, address: event.target.value })}
                          aria-label="Adres"
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
                  <tr>
                    <td>{business.name}</td>
                    <td>{business.address || "—"}</td>
                    <td>
                      <span className={business.isActive ? "business-status active" : "business-status inactive"}>
                        {business.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="business-row-actions">
                      <button type="button" onClick={() => toggleAdminsPanel(business.id)}>
                        {expandedBusinessId === business.id ? "Yöneticileri gizle" : "Yöneticiler"}
                      </button>
                      <button type="button" onClick={() => startEditing(business)}>
                        Düzenle
                      </button>
                    </td>
                  </tr>
                )}

                {expandedBusinessId === business.id && (
                  <tr>
                    <td colSpan={4} className="business-admins-cell">
                      <h2>{business.name} — Yöneticiler (ADMIN)</h2>
                      <BusinessAdminsPanel businessId={business.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
