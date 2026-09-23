import { ChevronUp, HandCoins } from "lucide-react";
import { useState } from "react";
import { employeeApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import type { FieldDef } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import { formatMoney } from "../../lib/format";
import type { EmployeeDto } from "../../types/employee";
import { EmployeeWalletPanel } from "./EmployeeWalletPanel";

const wageField: FieldDef = { name: "hourlyWage", label: "Saatlik ücret (₺)", type: "number", required: true, min: 0 };

/**
 * ADMIN kendi işletmesine çalışan ekler; ad soyad, kullanıcı adı, şifre ve saatlik ücreti ADMIN belirler.
 * Satır altında çalışanın cüzdanı (çalışma saati girişi, ödeme, bakiye) açılır (bkz. proje raporu 3.7).
 */
export function EmployeesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <CrudPage<EmployeeDto>
      title="Çalışanlar"
      description="Çalışanlar bu kullanıcı adı/şifre ile giriş yapıp gider girer ve kendi cüzdanını görür. Günlük çalışma saatini siz girersiniz; hak ediş cüzdanına işlenir."
      load={employeeApi.getAll}
      emptyText="Henüz çalışan yok — ilk çalışanı yukarıdan ekleyin."
      columns={[
        { header: "Ad soyad", render: (row) => row.fullName },
        { header: "Kullanıcı adı", render: (row) => row.username },
        { header: "Saatlik ücret", align: "right", render: (row) => formatMoney(row.hourlyWage) },
        { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
      ]}
      rowActions={(row) => (
        <button type="button" className="ui-button small" onClick={() => setExpandedId((id) => (id === row.id ? null : row.id))}>
          {expandedId === row.id ? <ChevronUp size={14} aria-hidden="true" /> : <HandCoins size={14} aria-hidden="true" />}
          {expandedId === row.id ? "Gizle" : "Cüzdan"}
        </button>
      )}
      renderExpanded={(row) =>
        expandedId === row.id ? <EmployeeWalletPanel employeeId={row.id} load={() => employeeApi.getWallet(row.id)} /> : null
      }
      createTitle="Yeni çalışan"
      createFields={[
        { name: "fullName", label: "Ad soyad", required: true },
        { name: "username", label: "Kullanıcı adı", required: true },
        { name: "password", label: "Şifre", type: "password", required: true },
        wageField,
      ]}
      createInitialValues={{ fullName: "", username: "", password: "", hourlyWage: "" }}
      onCreate={(values) =>
        employeeApi.create({
          fullName: formValue.text(values, "fullName"),
          username: formValue.text(values, "username"),
          password: String(values.password),
          hourlyWage: formValue.number(values, "hourlyWage"),
        })
      }
      onDelete={(row) => employeeApi.remove(row.id)}
      describeRow={(row) => row.fullName}
      editTitle={(row) => `${row.fullName} — düzenle`}
      editFields={[
        { name: "fullName", label: "Ad soyad", required: true },
        { name: "username", label: "Kullanıcı adı", required: true },
        { name: "password", label: "Yeni şifre (boş bırakılırsa değişmez)", type: "password" },
        wageField,
        { name: "isActive", label: "Aktif", type: "checkbox" },
      ]}
      toEditValues={(row) => ({ fullName: row.fullName, username: row.username, password: "", hourlyWage: String(row.hourlyWage), isActive: row.isActive })}
      onUpdate={(row, values) =>
        employeeApi.update(row.id, {
          fullName: formValue.optionalText(values, "fullName"),
          username: formValue.optionalText(values, "username"),
          password: formValue.optionalText(values, "password"),
          isActive: formValue.bool(values, "isActive"),
          hourlyWage: formValue.number(values, "hourlyWage"),
        })
      }
    />
  );
}
