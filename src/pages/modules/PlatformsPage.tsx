import { platformApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import { type FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import { formatPercent } from "../../lib/format";
import type { PlatformDto } from "../../types/platform";

const baseFields: FieldDef[] = [
  { name: "name", label: "Platform adı", required: true, placeholder: "örn. Yemeksepeti" },
  { name: "commissionPercentage", label: "Komisyon (%)", type: "number", required: true, min: 0 },
];

function toRequest(values: FormValues) {
  return { name: formValue.text(values, "name"), commissionPercentage: formValue.number(values, "commissionPercentage") };
}

/** Paket servis platformları; gün sonu içe aktarımında komisyon otomatik gidere dönüşür (bkz. proje raporu 3.4). */
export function PlatformsPage() {
  return (
    <CrudPage<PlatformDto>
      title="Paket Servis Platformları"
      description="Gün sonu satışlarında bu platformlardan gelen siparişlerin komisyonu otomatik olarak gider kaydına dönüşür."
      load={platformApi.getAll}
      emptyText="Henüz platform yok — ilk platformu yukarıdan ekleyin."
      columns={[
        { header: "Ad", render: (row) => row.name },
        { header: "Komisyon", align: "right", render: (row) => formatPercent(row.commissionPercentage) },
        { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
      ]}
      createTitle="Yeni platform"
      createFields={baseFields}
      createInitialValues={{ name: "", commissionPercentage: "" }}
      onCreate={(values) => platformApi.create(toRequest(values))}
      onDelete={(row) => platformApi.remove(row.id)}
      describeRow={(row) => row.name}
      editTitle={(row) => `${row.name} — düzenle`}
      editFields={[...baseFields, { name: "isActive", label: "Aktif", type: "checkbox" }]}
      toEditValues={(row) => ({ name: row.name, commissionPercentage: String(row.commissionPercentage), isActive: row.isActive })}
      onUpdate={(row, values) => platformApi.update(row.id, { ...toRequest(values), isActive: formValue.bool(values, "isActive") })}
    />
  );
}
