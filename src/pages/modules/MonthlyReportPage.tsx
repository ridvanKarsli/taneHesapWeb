import { Coins, Sigma, TriangleAlert, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { reportApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDateTime, formatMoney, formatNumber } from "../../lib/format";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function monthOptions(): { year: number; month: number; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  });
}

/**
 * Aylık rapor (bkz. proje raporu 3.16): tüm giderler ÷ satılan tabak = tabak başı genel maliyet; malzeme başına
 * gelir (örn. ₺/kg pirinç) ve önceki aya göre düşüş uyarısı. Ay bitince aynı rapor otomatik üretilip bildirilir.
 */
export function MonthlyReportPage() {
  const options = monthOptions();
  const [selected, setSelected] = useState(options[0]);
  const report = useAsyncData(() => reportApi.getMonthly(selected.year, selected.month), `${selected.year}-${selected.month}`);

  return (
    <div>
      <PageHeader
        actions={
          <div className="ui-filter">
          <label htmlFor="monthly-report-month">Ay</label>
          <select
            id="monthly-report-month"
            value={`${selected.year}-${selected.month}`}
            onChange={(e) => setSelected(options.find((o) => `${o.year}-${o.month}` === e.target.value) ?? options[0])}
          >
            {options.map((o) => (
              <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        }
      />
      <AsyncState {...report}>
        {(data) => (
          <Section>
            <StatGrid>
              <StatTile icon={UtensilsCrossed} label="Satılan tabak" value={formatNumber(data.platesSold, 0)} />
              <StatTile icon={Sigma} iconTone="rose" label="Tabak başı genel maliyet" value={formatMoney(data.costPerPlate)} />
              <StatTile icon={Coins} iconTone="green" label="Tabak başı gelir" value={formatMoney(data.revenuePerPlate)} />
              <StatTile
                icon={Sigma}
                iconTone="slate"
                label="Önceki ay tabak maliyeti"
                value={formatMoney(data.previousCostPerPlate)}
                tone={data.previousCostPerPlate > 0 && data.costPerPlate > data.previousCostPerPlate ? "negative" : undefined}
              />
            </StatGrid>
            <p className="ui-muted">
              Toplam gider {formatMoney(data.totalExpense)} ÷ {formatNumber(data.platesSold, 0)} tabak. Net kâr: {formatMoney(data.netProfit)}.
              {data.closedAtUtc ? ` Ay sonu raporu ${formatDateTime(data.closedAtUtc)} tarihinde oluşturuldu ve bildirildi.` : " Ay bitince rapor otomatik kapatılıp bildirilir."}
            </p>

            {data.warnings.length > 0 && (
              <div className="ui-error" role="alert">
                <TriangleAlert size={18} aria-hidden="true" />
                <div>
                  <strong>Verimlilik uyarısı</strong>
                  {data.warnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            {data.ingredients.length === 0 ? (
              <p className="ui-muted">Bu ay reçeteye göre tüketilen malzeme yok (satış girildikçe oluşur).</p>
            ) : (
              <DataTable
                rows={data.ingredients}
                rowKey={(row) => row.ingredientId}
                rowClassName={(row) => (row.isWarning ? "warning" : undefined)}
                columns={[
                  { header: "Malzeme", render: (row) => <span className="ui-cell-strong">{row.ingredientName}</span> },
                  { header: "Bu ay tüketim", align: "right", render: (row) => `${formatNumber(row.quantityUsed)} ${row.unit}` },
                  { header: "Gelir / birim", align: "right", render: (row) => `${formatMoney(row.revenuePerUnit)} / ${row.unit}` },
                  { header: "Geçen ay tüketim", align: "right", render: (row) => `${formatNumber(row.previousQuantityUsed)} ${row.unit}` },
                  { header: "Geçen ay gelir / birim", align: "right", render: (row) => `${formatMoney(row.previousRevenuePerUnit)} / ${row.unit}` },
                  {
                    header: "Değişim",
                    align: "right",
                    render: (row) =>
                      row.changePercent === null ? (
                        "—"
                      ) : (
                        <span className={row.changePercent < 0 ? "ui-text-negative" : "ui-text-positive"}>%{formatNumber(row.changePercent, 1)}</span>
                      ),
                  },
                ]}
              />
            )}
          </Section>
        )}
      </AsyncState>
    </div>
  );
}
