import { ArrowRight, BellRing, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { ingredientApi, recurringExpenseApi } from "../../api/moduleApis";
import { Section } from "../../components/ui/Section";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, formatNumber } from "../../lib/format";

/** İşletme sahibinin panelinde "dikkat edilmesi gerekenler": düşük stok ve ödeme dönemi gelmiş sabit giderler. */
export function AdminAlerts() {
  const lowStock = useAsyncData(ingredientApi.getBelowThreshold);
  const dueExpenses = useAsyncData(recurringExpenseApi.getDueForReminder);

  const lowStockItems = lowStock.data ?? [];
  const dueItems = dueExpenses.data ?? [];
  if (lowStockItems.length === 0 && dueItems.length === 0) {
    return null;
  }

  return (
    <div className="ui-two-columns">
      {lowStockItems.length > 0 && (
        <Section title="Stoğu azalan malzemeler" icon={TriangleAlert} actions={<AlertLink to="/mutfak/malzemeler" />}>
          {lowStockItems.map((i) => (
            <p key={i.id} className="dashboard-alert-row">
              <strong>{i.name}</strong>
              <span>
                {formatNumber(i.currentStockQuantity)} / {formatNumber(i.minimumStockThreshold)} {i.unit}
              </span>
            </p>
          ))}
        </Section>
      )}
      {dueItems.length > 0 && (
        <Section title="Ödenmemiş düzenli giderler" icon={BellRing} actions={<AlertLink to="/finans/duzenli-giderler" />}>
          {dueItems.map((e) => (
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

function AlertLink({ to }: { to: string }) {
  return (
    <Link to={to} className="dashboard-alert-link">
      Görüntüle <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}
