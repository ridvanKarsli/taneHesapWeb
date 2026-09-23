import { useState } from "react";
import { activityApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { DateFilter } from "../../components/ui/DateFilter";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { addDaysIso, formatDateTime, formatMoney, todayIso } from "../../lib/format";
import type { ActivityQuery } from "../../types/activity";

const ACTION_TONE: Record<string, "success" | "danger" | "neutral"> = { Ekledi: "success", Sildi: "danger", Değiştirdi: "neutral" };

/**
 * İşlem geçmişi: elle girilen her gider/satış/ödeme/saat kaydı için kim, ne zaman, ne yaptı — kullanıcıya,
 * türe ve tarihe göre süzülebilir. Kaynak, sistemin otomatik tuttuğu değiştirilemez denetim kaydıdır (3.6).
 */
export function ActivityPage() {
  const [query, setQuery] = useState<ActivityQuery>({ fromDate: addDaysIso(todayIso(), -6), toDate: todayIso() });
  const entries = useAsyncData(() => activityApi.get(query), JSON.stringify(query));
  const users = useAsyncData(activityApi.getUsers);
  const kinds = useAsyncData(activityApi.getKinds);

  function update(patch: Partial<ActivityQuery>) {
    setQuery((current) => ({ ...current, ...patch }));
  }

  return (
    <div>
      <PageHeader />
      <Section
        actions={
          <>
            <DateFilter id="activity-from" label="Başlangıç" value={query.fromDate ?? ""} onChange={(fromDate) => update({ fromDate })} />
            <DateFilter id="activity-to" label="Bitiş" value={query.toDate ?? ""} onChange={(toDate) => update({ toDate })} />
            <div className="ui-filter">
              <label htmlFor="activity-user">Kullanıcı</label>
              <select id="activity-user" value={query.userId ?? ""} onChange={(e) => update({ userId: e.target.value || undefined })}>
                <option value="">Herkes</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="ui-filter">
              <label htmlFor="activity-kind">Kayıt türü</label>
              <select id="activity-kind" value={query.entityName ?? ""} onChange={(e) => update({ entityName: e.target.value || undefined })}>
                <option value="">Tümü</option>
                {(kinds.data ?? []).map((k) => (
                  <option key={k.entityName} value={k.entityName}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        }
      >
        <AsyncState {...entries} isEmpty={(rows) => rows.length === 0} emptyText="Bu aralıkta kayıt yok.">
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                { header: "Zaman", render: (row) => formatDateTime(row.timestampUtc) },
                { header: "Kullanıcı", render: (row) => <span className="ui-cell-strong">{row.userName}</span> },
                { header: "İşlem", render: (row) => <StatusBadge tone={ACTION_TONE[row.action] ?? "neutral"}>{row.action}</StatusBadge> },
                { header: "Kayıt", render: (row) => row.kind },
                { header: "Tutar", align: "right", render: (row) => (row.amount === null ? "—" : formatMoney(row.amount)) },
                { header: "Detay", render: (row) => row.summary || "—" },
              ]}
            />
          )}
        </AsyncState>
      </Section>
    </div>
  );
}
