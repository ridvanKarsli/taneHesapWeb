import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { auditLogApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { DateFilter } from "../../components/ui/DateFilter";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { addDaysIso, formatDateTime, todayIso } from "../../lib/format";
import type { AuditLogDto } from "../../types/auditLog";

/** Backend'in entity adlarını (C# sınıf adı) kullanıcıya Türkçe gösterir. */
const ENTITY_LABELS: Record<string, string> = {
  Business: "İşletme",
  Expense: "Gider",
  ExpenseType: "Gider türü",
  Ingredient: "Malzeme",
  Dish: "Ürün",
  DishSize: "Tabak boyu",
  DishRecipeItem: "Reçete kalemi",
  StockMovement: "Stok hareketi",
  Supplier: "Tedarikçi",
  SupplierPurchase: "Tedarikçi alışı",
  SupplierPayment: "Tedarikçi ödemesi",
  RecurringExpense: "Düzenli gider",
  RecurringExpensePayment: "Düzenli gider ödemesi",
  Platform: "Platform",
  DailySalesEntry: "Gün sonu satışı",
  ExcelImportLog: "İçe aktarım",
  DailyActualEntry: "Gün sonu gerçek giriş",
  DailyActualConsumptionItem: "Gerçek tüketim kalemi",
  DailyLossReport: "Fire raporu",
  DailyLossReportItem: "Fire raporu kalemi",
};

// Backend EF Core `EntityState` adını yazar (Added/Modified/Deleted).
const ACTION_TONES: Record<string, "success" | "warning" | "danger"> = { Added: "success", Modified: "warning", Deleted: "danger" };
const ACTION_LABELS: Record<string, string> = { Added: "Oluşturma", Modified: "Güncelleme", Deleted: "Silme" };

function prettyJson(json: string | null): string {
  if (!json) {
    return "—";
  }
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

/** Değiştirilemez denetim kaydı: kim, ne zaman, hangi kaydı nasıl değiştirdi (bkz. proje raporu 3.6). */
export function AuditLogsPage() {
  const [entityName, setEntityName] = useState("");
  const [fromDate, setFromDate] = useState(addDaysIso(todayIso(), -7));
  const [toDate, setToDate] = useState(todayIso());
  const [openId, setOpenId] = useState<string | null>(null);

  const logs = useAsyncData(
    () =>
      auditLogApi.getLogs({
        entityName: entityName || undefined,
        fromUtc: new Date(`${fromDate}T00:00:00`).toISOString(),
        toUtc: new Date(`${toDate}T23:59:59`).toISOString(),
      }),
    `${entityName}|${fromDate}|${toDate}`,
  );

  return (
    <div>
      <PageHeader
        description="Sistemdeki her kayıt değişikliği otomatik loglanır; kayıtlar değiştirilemez."
        actions={
          <>
            <div className="ui-filter">
              <label htmlFor="audit-entity">Kayıt türü</label>
              <select id="audit-entity" value={entityName} onChange={(e) => setEntityName(e.target.value)}>
                <option value="">Tümü</option>
                {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <DateFilter id="audit-from" label="Başlangıç" value={fromDate} onChange={setFromDate} />
            <DateFilter id="audit-to" label="Bitiş" value={toDate} onChange={setToDate} />
          </>
        }
      />

      <Section>
        <AsyncState {...logs} isEmpty={(rows) => rows.length === 0} emptyText="Bu aralıkta kayıt yok.">
          {(rows) => (
            <DataTable<AuditLogDto>
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                { header: "Zaman", render: (row) => formatDateTime(row.timestampUtc) },
                {
                  header: "İşlem",
                  render: (row) => (
                    <StatusBadge tone={ACTION_TONES[row.actionType] ?? "neutral"}>{ACTION_LABELS[row.actionType] ?? row.actionType}</StatusBadge>
                  ),
                },
                { header: "Kayıt türü", render: (row) => ENTITY_LABELS[row.entityName] ?? row.entityName },
              ]}
              rowActions={(row) => (
                <button type="button" className="ui-button secondary small" onClick={() => setOpenId((id) => (id === row.id ? null : row.id))}>
                  {openId === row.id ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                  {openId === row.id ? "Gizle" : "Detay"}
                </button>
              )}
              renderExpanded={(row) =>
                openId === row.id ? (
                  <div className="ui-two-columns">
                    <div>
                      <p className="ui-subheading">Eski değerler</p>
                      <pre className="ui-pre">{prettyJson(row.oldValuesJson)}</pre>
                    </div>
                    <div>
                      <p className="ui-subheading">Yeni değerler</p>
                      <pre className="ui-pre">{prettyJson(row.newValuesJson)}</pre>
                    </div>
                  </div>
                ) : null
              }
            />
          )}
        </AsyncState>
      </Section>
    </div>
  );
}
