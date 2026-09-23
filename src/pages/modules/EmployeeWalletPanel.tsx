import { Banknote, Clock, HandCoins, Plus, Scale } from "lucide-react";
import { useState } from "react";
import { employeeApi, treasuryApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { ConfirmDialog, DeleteButton } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { EntityForm } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, formatNumber, todayIso } from "../../lib/format";
import type { EmployeeWalletDto, EmployeeWorkLogDto } from "../../types/employee";
import { EXPENSE_PAYMENT_METHOD_LABELS, PAYMENT_METHOD_LABELS, PaymentMethod, toOptions } from "../../types/enums";
import "./modules.css";

interface EmployeeWalletPanelProps {
  /** Cüzdanı yükleyen fonksiyon — ADMIN çalışan Id'siyle, EMPLOYEE kendi uç noktasıyla verir. */
  load: () => Promise<EmployeeWalletDto>;
  /** ADMIN için çalışma saati girişi ve ödeme; EMPLOYEE'de verilmez (salt okunur, bkz. proje raporu 2). */
  employeeId?: string;
}

/**
 * Çalışan cüzdanı: hak ediş (saat × saatlik ücret), ödemeler ve bakiye. Aynı panel hem ADMIN'in Çalışanlar
 * sayfasında (satır altında, yazma yetkili) hem EMPLOYEE'nin "Cüzdanım" sayfasında (salt okunur) kullanılır.
 */
export function EmployeeWalletPanel({ load, employeeId }: EmployeeWalletPanelProps) {
  const wallet = useAsyncData(load, employeeId ?? "me");
  const cards = useAsyncData(() => (employeeId ? treasuryApi.getAll() : Promise.resolve([])), employeeId ?? "");
  const [deletingLog, setDeletingLog] = useState<EmployeeWorkLogDto | null>(null);
  const canEdit = Boolean(employeeId);

  const cardOptions = (cards.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }));

  return (
    <AsyncState {...wallet}>
      {(data) => (
        <div className="wallet-panel">
          <StatGrid>
            <StatTile icon={Clock} iconTone="blue" label="Toplam çalışma" value={`${formatNumber(data.totalHours, 1)} saat`} />
            <StatTile icon={HandCoins} iconTone="green" label="Hak ediş" value={formatMoney(data.totalEarned)} />
            <StatTile icon={Banknote} iconTone="rose" label="Ödenen" value={formatMoney(data.totalPaid)} />
            <StatTile
              icon={Scale}
              iconTone="amber"
              label={data.balance >= 0 ? "Alacağı (bakiye)" : "Fazla ödenen"}
              value={formatMoney(Math.abs(data.balance))}
              tone={data.balance > 0 ? "positive" : data.balance < 0 ? "negative" : undefined}
            />
          </StatGrid>
          <p className="ui-muted">Saatlik ücret: {formatMoney(data.hourlyWage)}</p>

          {canEdit && (
            <div className="ui-two-columns">
              <div>
                <p className="ui-subheading">Çalışma saati ekle</p>
                <EntityForm
                  layout="inline"
                  fields={[
                    { name: "workDate", label: "Tarih", type: "date", required: true },
                    { name: "hours", label: "Saat", type: "number", required: true, min: 0, step: "0.5" },
                    { name: "note", label: "Not" },
                  ]}
                  initialValues={{ workDate: todayIso(), hours: "", note: "" }}
                  submitLabel="Ekle"
                  submitIcon={Plus}
                  resetOnSuccess
                  onSubmit={async (values) => {
                    await employeeApi.addWorkLog(employeeId!, {
                      workDate: formValue.text(values, "workDate"),
                      hours: formValue.number(values, "hours"),
                      note: formValue.optionalText(values, "note"),
                    });
                    await wallet.reload();
                  }}
                />
              </div>
              <div>
                <p className="ui-subheading">Ödeme yap</p>
                <EntityForm
                  layout="inline"
                  fields={[
                    { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
                    { name: "date", label: "Tarih", type: "date", required: true },
                    { name: "paymentMethod", label: "Ödeme şekli", type: "select", required: true, options: toOptions(EXPENSE_PAYMENT_METHOD_LABELS) },
                    {
                      name: "paymentCardId",
                      label: "Hangi kart",
                      type: "select",
                      required: true,
                      options: cardOptions,
                      visibleWhen: (values: FormValues) => String(values.paymentMethod) === String(PaymentMethod.Card),
                    },
                    { name: "note", label: "Not" },
                  ]}
                  initialValues={{ amount: "", date: todayIso(), paymentMethod: String(PaymentMethod.Cash), paymentCardId: "", note: "" }}
                  submitLabel="Ödeme kaydet"
                  submitIcon={Banknote}
                  resetOnSuccess
                  onSubmit={async (values) => {
                    const paymentMethod = formValue.number(values, "paymentMethod") as PaymentMethod;
                    await employeeApi.pay(employeeId!, {
                      amount: formValue.number(values, "amount"),
                      date: formValue.text(values, "date"),
                      paymentMethod,
                      paymentCardId: paymentMethod === PaymentMethod.Card ? formValue.optionalText(values, "paymentCardId") : null,
                      note: formValue.optionalText(values, "note"),
                    });
                    await wallet.reload();
                  }}
                />
              </div>
            </div>
          )}

          <div className="ui-two-columns">
            <div>
              <p className="ui-subheading">Çalışma kayıtları</p>
              {data.workLogs.length === 0 ? (
                <p className="ui-muted">Henüz çalışma saati girilmedi.</p>
              ) : (
                <DataTable
                  rows={data.workLogs}
                  rowKey={(row) => row.id}
                  columns={[
                    { header: "Tarih", render: (row) => formatDate(row.workDate) },
                    { header: "Saat", align: "right", render: (row) => formatNumber(row.hours, 1) },
                    { header: "Ücret", align: "right", render: (row) => formatMoney(row.hourlyWage) },
                    { header: "Hak ediş", align: "right", render: (row) => formatMoney(row.amount) },
                    { header: "Not", render: (row) => row.note || "—" },
                  ]}
                  rowActions={canEdit ? (row) => <DeleteButton onClick={() => setDeletingLog(row)} /> : undefined}
                />
              )}
            </div>
            <div>
              <p className="ui-subheading">Ödemeler</p>
              {data.payments.length === 0 ? (
                <p className="ui-muted">Henüz ödeme yapılmadı.</p>
              ) : (
                <DataTable
                  rows={data.payments}
                  rowKey={(row) => row.expenseId}
                  columns={[
                    { header: "Tarih", render: (row) => formatDate(row.date) },
                    { header: "Tutar", align: "right", render: (row) => formatMoney(row.amount) },
                    {
                      header: "Ödeme",
                      render: (row) =>
                        row.paymentMethod === null
                          ? "—"
                          : `${PAYMENT_METHOD_LABELS[row.paymentMethod]}${row.paymentCardName ? ` · ${row.paymentCardName}` : ""}`,
                    },
                    { header: "Açıklama", render: (row) => row.description || "—" },
                  ]}
                />
              )}
              {canEdit && data.payments.length > 0 && <p className="ui-muted">Yanlış ödeme kaydını Giderler sayfasından silebilirsiniz.</p>}
            </div>
          </div>

          {deletingLog && (
            <ConfirmDialog
              title="Çalışma kaydı silinsin mi?"
              message={`${formatDate(deletingLog.workDate)} tarihli ${formatNumber(deletingLog.hours, 1)} saatlik kayıt (${formatMoney(deletingLog.amount)}) silinecek.`}
              onClose={() => setDeletingLog(null)}
              onConfirm={async () => {
                await employeeApi.removeWorkLog(employeeId!, deletingLog.id);
                await wallet.reload();
              }}
            />
          )}
        </div>
      )}
    </AsyncState>
  );
}
