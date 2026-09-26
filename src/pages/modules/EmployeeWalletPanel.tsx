import { Banknote, Clock, HandCoins, Plus, Scale } from "lucide-react";
import { useState } from "react";
import { employeeApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { ConfirmDialog, DeleteButton } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { ModalFormButton } from "../../components/ui/ModalFormButton";
import { formValue } from "../../components/ui/formValues";
import { Money } from "../../components/ui/Money";
import { paymentFields, paymentInitialValues, readPayment } from "../../components/ui/paymentFields";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { usePaymentCards } from "../../hooks/usePaymentCards";
import { formatDate, formatMoney, formatNumber, todayIso } from "../../lib/format";
import type { EmployeeWalletDto, EmployeeWorkLogDto } from "../../types/employee";
import { PAYMENT_METHOD_LABELS } from "../../types/enums";
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
  const { cards } = usePaymentCards();
  const [deletingLog, setDeletingLog] = useState<EmployeeWorkLogDto | null>(null);
  const canEdit = Boolean(employeeId);

  return (
    <AsyncState {...wallet}>
      {(data) => (
        <div className="wallet-panel">
          <StatGrid>
            <StatTile icon={Clock} iconTone="blue" label="Toplam çalışma" value={`${formatNumber(data.totalHours, 1)} saat`} />
            <StatTile icon={HandCoins} iconTone="green" label="Hak ediş" value={<Money value={data.totalEarned} />} />
            <StatTile icon={Banknote} iconTone="rose" label="Ödenen" value={<Money value={data.totalPaid} />} />
            <StatTile
              icon={Scale}
              iconTone="amber"
              label={data.balance >= 0 ? "Alacağı (bakiye)" : "Fazla ödenen"}
              value={<Money value={Math.abs(data.balance)} />}
              tone={data.balance > 0 ? "positive" : data.balance < 0 ? "negative" : undefined}
            />
          </StatGrid>
          <div className="wallet-toolbar">
            <p className="ui-muted">Saatlik ücret: <Money value={data.hourlyWage} /></p>
            {canEdit && (
              <div className="ui-page-header-actions">
                <ModalFormButton
                  label="Çalışma saati ekle"
                  icon={Plus}
                  buttonClassName="ui-button secondary small"
                  fields={[
                    { name: "workDate", label: "Tarih", type: "date", required: true },
                    { name: "hours", label: "Çalışılan saat", type: "number", required: true, min: 0, step: "0.5" },
                    { name: "note", label: "Not" },
                  ]}
                  initialValues={{ workDate: todayIso(), hours: "", note: "" }}
                  submitLabel="Ekle"
                  onSubmit={async (values) => {
                    await employeeApi.addWorkLog(employeeId!, {
                      workDate: formValue.text(values, "workDate"),
                      hours: formValue.number(values, "hours"),
                      note: formValue.optionalText(values, "note"),
                    });
                    await wallet.reload();
                  }}
                />
                <ModalFormButton
                  label="Ödeme yap"
                  title={`${data.fullName} — ödeme`}
                  icon={Banknote}
                  buttonClassName="ui-button small"
                  intro={<p className="ui-muted">Ödeme, Personel kategorisinde bir gider olarak kaydedilir; seçilen kasadan/karttan ve çalışanın cüzdanından düşer.</p>}
                  fields={[
                    { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
                    { name: "date", label: "Tarih", type: "date", required: true },
                    ...paymentFields(cards),
                    { name: "note", label: "Not" },
                  ]}
                  initialValues={{ amount: data.balance > 0 ? String(data.balance) : "", date: todayIso(), ...paymentInitialValues, note: "" }}
                  submitLabel="Ödemeyi kaydet"
                  onSubmit={async (values) => {
                    await employeeApi.pay(employeeId!, {
                      amount: formValue.number(values, "amount"),
                      date: formValue.text(values, "date"),
                      ...readPayment(values),
                      note: formValue.optionalText(values, "note"),
                    });
                    await wallet.reload();
                  }}
                />
              </div>
            )}
          </div>

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
                    { header: "Ücret", align: "right", render: (row) => <Money value={row.hourlyWage} /> },
                    { header: "Hak ediş", align: "right", render: (row) => <Money value={row.amount} /> },
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
                    { header: "Tutar", align: "right", render: (row) => <Money value={row.amount} /> },
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
