import { Link } from "react-router-dom";
import { ingredientApi, recurringExpenseApi } from "../../api/moduleApis";
import { Section } from "../../components/ui/Section";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, formatNumber } from "../../lib/format";

/** İşletme sahibinin panelinde "dikkat edilmesi gerekenler": düşük stok ve ödeme dönemi gelmiş sabit giderler. */
export function AdminAlerts() {
  const lowStock = useAsyncData(ingredientApi.getBelowThreshold);
  const dueExpenses = useAsyncData(recurringExpenseApi.getDueForReminder);

  const hasLowStock = (lowStock.data?.length ?? 0) > 0;
  const hasDue = (dueExpenses.data?.length ?? 0) > 0;
  if (!hasLowStock && !hasDue) {
    return null;
  }

  return (
    <div className="ui-two-columns dashboard-alerts">
      {hasLowStock && (
        <Section title="⚠️ Stoğu azalan malzemeler" actions={<Link to="/malzemeler">Malzemeler →</Link>}>
          {lowStock.data!.map((i) => (
            <p key={i.id} className="dashboard-alert-row">
              <strong>{i.name}</strong>
              <span>
                {formatNumber(i.currentStockQuantity)} / {formatNumber(i.minimumStockThreshold)} {i.unit}
              </span>
            </p>
          ))}
        </Section>
      )}
      {hasDue && (
        <Section title="🔔 Ödenmemiş düzenli giderler" actions={<Link to="/duzenli-giderler">Düzenli Giderler →</Link>}>
          {dueExpenses.data!.map((e) => (
            <p key={e.id} className="dashboard-alert-row">
              <strong>{e.name}</strong>
              <span>
                {formatMoney(e.amount)} · son gün {formatDate(e.currentPeriodEndDate)}
              </span>
            </p>
          ))}
        </Section>
      )}
    </div>
  );
}
