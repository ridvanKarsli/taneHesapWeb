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

interface PaymentCardsSectionProps {
  /** Kart eklenip düzenlenince Kasa özetinin (kullanılabilir limitler) yenilenmesi için. */
  onChanged: () => void;
}

/**
 * Kredi kartı tanımları: ad, toplam limit (elle değiştirilebilir), kullanılan/kullanılabilir limit.
 * Giderlerde "Kredi kartı" seçilince bu kartlardan biri seçilir ve limit düşer (bkz. proje raporu 3.15).
 */
export function PaymentCardsSection({ onChanged }: PaymentCardsSectionProps) {
  return (
    <CrudPage<PaymentCardDto>
      embedded
      title="Kartlar"
      listTitle="Kredi kartları"
      load={treasuryApi.getAll}
      emptyText="Henüz kart tanımlı değil — giderleri kartla ödüyorsanız kartı yukarıdan ekleyin."
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
      createTitle="Yeni kart"
      onCreateLabel="Kart ekle"
      createFields={baseFields}
      createInitialValues={{ name: "", limit: "" }}
      onCreate={async (values) => {
        const created = await treasuryApi.create({ name: formValue.text(values, "name"), limit: formValue.number(values, "limit") });
        onChanged();
        return created;
      }}
      onDelete={async (row) => {
        await treasuryApi.remove(row.id);
        onChanged();
      }}
      describeRow={(row) => row.name}
      editTitle={(row) => `${row.name} — düzenle`}
      editFields={[...baseFields, { name: "isActive", label: "Aktif", type: "checkbox" }]}
      toEditValues={(row) => ({ name: row.name, limit: String(row.limit), isActive: row.isActive })}
      onUpdate={async (row, values) => {
        const updated = await treasuryApi.update(row.id, {
          name: formValue.text(values, "name"),
          limit: formValue.number(values, "limit"),
          isActive: formValue.bool(values, "isActive"),
        });
        onChanged();
        return updated;
      }}
    />
  );
}
