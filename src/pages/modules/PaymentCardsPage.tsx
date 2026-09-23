import { treasuryApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import type { FieldDef } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import { formatMoney } from "../../lib/format";
import type { PaymentCardDto } from "../../types/treasury";

const baseFields: FieldDef[] = [
  { name: "name", label: "Kart adı", required: true, placeholder: "örn. İş Bankası Ticari" },
  { name: "limit", label: "Limit (₺)", type: "number", required: true, min: 0 },
];

/**
 * Kartlarım: kredi kartı tanımları — ad, toplam limit (elle değiştirilebilir), kullanılan/kullanılabilir limit.
 * Giderlerde "Kredi kartı" seçilince bu kartlardan biri seçilir ve limit düşer (bkz. proje raporu 3.15).
 */
export function PaymentCardsPage() {
  return (
    <CrudPage<PaymentCardDto>
      load={treasuryApi.getAll}
      emptyText="Henüz kart tanımlı değil — giderleri kartla ödüyorsanız kartı sağ üstteki düğmeyle ekleyin."
      columns={[
        { header: "Kart", render: (row) => <span className="ui-cell-strong">{row.name}</span> },
        { header: "Limit", align: "right", render: (row) => formatMoney(row.limit) },
        { header: "Kullanılan", align: "right", render: (row) => formatMoney(row.usedAmount) },
        {
          header: "Kullanılabilir",
          align: "right",
          render: (row) => <span className={row.availableLimit < 0 ? "ui-text-negative" : undefined}>{formatMoney(row.availableLimit)}</span>,
        },
        { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
      ]}
      rowClassName={(row) => (row.availableLimit < 0 ? "warning" : undefined)}
      createLabel="Yeni kart"
      createFields={baseFields}
      createInitialValues={{ name: "", limit: "" }}
      onCreate={(values) => treasuryApi.create({ name: formValue.text(values, "name"), limit: formValue.number(values, "limit") })}
      onDelete={(row) => treasuryApi.remove(row.id)}
      describeRow={(row) => row.name}
      editTitle={(row) => `${row.name} — düzenle`}
      editFields={[...baseFields, { name: "isActive", label: "Aktif", type: "checkbox" }]}
      toEditValues={(row) => ({ name: row.name, limit: String(row.limit), isActive: row.isActive })}
      onUpdate={(row, values) =>
        treasuryApi.update(row.id, {
          name: formValue.text(values, "name"),
          limit: formValue.number(values, "limit"),
          isActive: formValue.bool(values, "isActive"),
        })
      }
    />
  );
}
