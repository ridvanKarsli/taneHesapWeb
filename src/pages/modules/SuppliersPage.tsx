import { ChevronUp, PackageOpen, Scale } from "lucide-react";
import { useState } from "react";
import { supplierApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import { type FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatMoney } from "../../lib/format";
import type { SupplierDto } from "../../types/supplier";
import { SupplierPurchasesPanel } from "./SupplierPurchasesPanel";

const baseFields: FieldDef[] = [
  { name: "name", label: "Tedarikçi adı", required: true },
  { name: "contactInfo", label: "İletişim (telefon, adres…)" },
];

function toRequest(values: FormValues) {
  return { name: formValue.text(values, "name"), contactInfo: formValue.optionalText(values, "contactInfo") };
}

/** Tedarikçi kartları, alışlar ve (kısmi) ödemelerle borç takibi (bkz. proje raporu 3.12). */
export function SuppliersPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [debtVersion, setDebtVersion] = useState(0);
  const totalDebt = useAsyncData(supplierApi.getTotalDebt, String(debtVersion));

  return (
    <CrudPage<SupplierDto>
      title="Tedarikçiler"
      description="Alış girildiğinde malzemenin stoğu artar ve birim fiyatı güncellenir; ödemeler borçtan düşülür."
      summary={
        <StatGrid>
          <StatTile
            icon={Scale}
            iconTone="rose"
            label="Toplam açık borç"
            value={totalDebt.data === null ? "…" : formatMoney(totalDebt.data)}
            tone={totalDebt.data ? "negative" : undefined}
          />
        </StatGrid>
      }
      load={supplierApi.getAll}
      emptyText="Henüz tedarikçi yok — ilk tedarikçiyi yukarıdan ekleyin."
      columns={[
        { header: "Ad", render: (row) => row.name },
        { header: "İletişim", render: (row) => row.contactInfo || "—" },
        {
          header: "Açık borç",
          align: "right",
          render: (row) => <span className={row.totalOutstandingDebt > 0 ? "ui-text-negative" : undefined}>{formatMoney(row.totalOutstandingDebt)}</span>,
        },
        { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
      ]}
      rowActions={(row) => (
        <button type="button" className="ui-button small" onClick={() => setExpandedId((id) => (id === row.id ? null : row.id))}>
          {expandedId === row.id ? <ChevronUp size={14} aria-hidden="true" /> : <PackageOpen size={14} aria-hidden="true" />}
          {expandedId === row.id ? "Alışları gizle" : "Alışlar"}
        </button>
      )}
      renderExpanded={(row, helpers) =>
        expandedId === row.id ? (
          <SupplierPurchasesPanel
            supplierId={row.id}
            onChanged={() => {
              void helpers.reload();
              setDebtVersion((v) => v + 1);
            }}
          />
        ) : null
      }
      createTitle="Yeni tedarikçi"
      createFields={baseFields}
      createInitialValues={{ name: "", contactInfo: "" }}
      onCreate={(values) => supplierApi.create(toRequest(values))}
      editTitle={(row) => `${row.name} — düzenle`}
      editFields={[...baseFields, { name: "isActive", label: "Aktif", type: "checkbox" }]}
      toEditValues={(row) => ({ name: row.name, contactInfo: row.contactInfo ?? "", isActive: row.isActive })}
      onUpdate={(row, values) => supplierApi.update(row.id, { ...toRequest(values), isActive: formValue.bool(values, "isActive") })}
    />
  );
}
