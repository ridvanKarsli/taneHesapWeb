import { Pencil, UserPlus } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/adminApi";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { EntityForm } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { Modal } from "../../components/ui/Modal";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { AdminDto } from "../../types/admin";

interface BusinessAdminsPanelProps {
  businessId: string;
  businessName: string;
}

/**
 * Bir işletmenin ADMIN (işletme sahibi) kullanıcıları: listeleme, ekleme, düzenleme/şifre sıfırlama.
 * Bir işletme ona giriş yapabilecek bir ADMIN atanmadan kullanılamaz (bkz. proje raporu bölüm 2, 10).
 */
export function BusinessAdminsPanel({ businessId, businessName }: BusinessAdminsPanelProps) {
  const admins = useAsyncData(() => adminApi.getAll(businessId), businessId);
  const [editing, setEditing] = useState<AdminDto | null>(null);

  return (
    <div>
      <p className="ui-subheading">{businessName} — yeni yönetici</p>
      <EntityForm
        layout="inline"
        fields={[
          { name: "fullName", label: "Ad soyad", required: true },
          { name: "username", label: "Kullanıcı adı", required: true },
          { name: "password", label: "Şifre", type: "password", required: true },
        ]}
        initialValues={{ fullName: "", username: "", password: "" }}
        submitLabel="Yönetici ekle"
        submitIcon={UserPlus}
        resetOnSuccess
        onSubmit={async (values) => {
          const created = await adminApi.create(businessId, {
            fullName: formValue.text(values, "fullName"),
            username: formValue.text(values, "username"),
            password: String(values.password),
          });
          admins.setData((current) => [...(current ?? []), created]);
        }}
      />

      <p className="ui-subheading">Yöneticiler</p>
      <AsyncState
        {...admins}
        isEmpty={(rows) => rows.length === 0}
        emptyText="Bu işletmenin henüz yöneticisi yok — ilk yöneticiyi ekleyin, aksi halde işletmeye kimse giriş yapamaz."
      >
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            columns={[
              { header: "Ad soyad", render: (row) => row.fullName },
              { header: "Kullanıcı adı", render: (row) => row.username },
              { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
            ]}
            rowActions={(row) => (
              <button type="button" className="ui-button secondary small" onClick={() => setEditing(row)}>
                <Pencil size={14} aria-hidden="true" />
                Düzenle
              </button>
            )}
          />
        )}
      </AsyncState>

      {editing && (
        <Modal title={`${editing.fullName} — düzenle`} onClose={() => setEditing(null)}>
          <EntityForm
            fields={[
              { name: "fullName", label: "Ad soyad", required: true },
              { name: "username", label: "Kullanıcı adı", required: true },
              { name: "password", label: "Yeni şifre (boş bırakılırsa değişmez)", type: "password" },
              { name: "isActive", label: "Aktif", type: "checkbox" },
            ]}
            initialValues={{ fullName: editing.fullName, username: editing.username, password: "", isActive: editing.isActive }}
            submitLabel="Kaydet"
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              const updated = await adminApi.update(businessId, editing.id, {
                fullName: formValue.optionalText(values, "fullName"),
                username: formValue.optionalText(values, "username"),
                password: formValue.optionalText(values, "password"),
                isActive: formValue.bool(values, "isActive"),
              });
              admins.setData((current) => current?.map((a) => (a.id === updated.id ? updated : a)) ?? current);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
