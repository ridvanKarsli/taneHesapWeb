import { ChevronUp, LogIn, UserCog } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { businessApi } from "../../api/businessApi";
import { CrudPage } from "../../components/crud/CrudPage";
import type { FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../lib/format";
import type { BusinessDto } from "../../types/business";
import { BusinessAdminsPanel } from "./BusinessAdminsPanel";

const baseFields: FieldDef[] = [
  { name: "name", label: "İşletme adı", required: true, placeholder: "örn. Meydan Pilavcısı" },
  { name: "address", label: "Adres (opsiyonel)" },
];

function toRequest(values: FormValues) {
  return { name: formValue.text(values, "name"), address: formValue.optionalText(values, "address") };
}

/**
 * SUPER_ADMIN'in işletme açtığı/düzenlediği ve her işletmeye ADMIN (işletme sahibi) atadığı sayfa
 * (bkz. proje raporu bölüm 2, 10). Ortak `CrudPage` iskeletini kullanır; yöneticiler satır altında açılır.
 */
export function BusinessesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { enterBusiness } = useAuth();
  const navigate = useNavigate();

  async function enter(row: BusinessDto) {
    await enterBusiness(row.id);
    navigate("/");
  }

  return (
    <CrudPage<BusinessDto>
      load={businessApi.getAll}
      emptyText="Henüz işletme yok — sağ üstteki düğmeyle ekleyin."
      columns={[
        { header: "Ad", render: (row) => <span className="ui-cell-strong">{row.name}</span> },
        { header: "Adres", render: (row) => row.address || "—" },
        { header: "Oluşturulma", render: (row) => formatDateTime(row.createdAtUtc) },
        { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
      ]}
      rowActions={(row) => (
        <div className="ui-row-actions-inner">
          {row.isActive && (
            <button type="button" className="ui-button small" onClick={() => void enter(row)} title="Bu işletmeye işletme sahibi gibi gir">
              <LogIn size={14} aria-hidden="true" />
              İşletmeye gir
            </button>
          )}
          <button type="button" className="ui-button secondary small" onClick={() => setExpandedId((id) => (id === row.id ? null : row.id))}>
            {expandedId === row.id ? <ChevronUp size={14} aria-hidden="true" /> : <UserCog size={14} aria-hidden="true" />}
            {expandedId === row.id ? "Gizle" : "Yöneticiler"}
          </button>
        </div>
      )}
      renderExpanded={(row) => (expandedId === row.id ? <BusinessAdminsPanel businessId={row.id} businessName={row.name} /> : null)}
      createLabel="Yeni işletme"
      createFields={baseFields}
      createInitialValues={{ name: "", address: "" }}
      onCreate={(values) => businessApi.create(toRequest(values))}
      onDelete={(row) => businessApi.remove(row.id)}
      describeRow={(row) => row.name}
      editTitle={(row) => `${row.name} — düzenle`}
      editFields={[...baseFields, { name: "isActive", label: "Aktif", type: "checkbox" }]}
      toEditValues={(row) => ({ name: row.name, address: row.address ?? "", isActive: row.isActive })}
      onUpdate={(row, values) => businessApi.update(row.id, { ...toRequest(values), isActive: formValue.bool(values, "isActive") })}
    />
  );
}
