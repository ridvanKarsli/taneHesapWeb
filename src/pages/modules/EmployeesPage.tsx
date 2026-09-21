import { employeeApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import { formValue } from "../../components/ui/formValues";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import type { EmployeeDto } from "../../types/employee";

/** ADMIN kendi işletmesine çalışan ekler; ad soyad, kullanıcı adı ve şifreyi ADMIN belirler (bkz. proje raporu 3.7). */
export function EmployeesPage() {
  return (
    <CrudPage<EmployeeDto>
      title="Çalışanlar"
      description="Çalışanlar bu kullanıcı adı/şifre ile giriş yapıp sadece gider girebilir."
      load={employeeApi.getAll}
      emptyText="Henüz çalışan yok — ilk çalışanı yukarıdan ekleyin."
      columns={[
        { header: "Ad soyad", render: (row) => row.fullName },
        { header: "Kullanıcı adı", render: (row) => row.username },
        { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
      ]}
      createTitle="Yeni çalışan"
      createFields={[
        { name: "fullName", label: "Ad soyad", required: true },
        { name: "username", label: "Kullanıcı adı", required: true },
        { name: "password", label: "Şifre", type: "password", required: true },
      ]}
      createInitialValues={{ fullName: "", username: "", password: "" }}
      onCreate={(values) =>
        employeeApi.create({
          fullName: formValue.text(values, "fullName"),
          username: formValue.text(values, "username"),
          password: String(values.password),
        })
      }
      editTitle={(row) => `${row.fullName} — düzenle`}
      editFields={[
        { name: "fullName", label: "Ad soyad", required: true },
        { name: "username", label: "Kullanıcı adı", required: true },
        { name: "password", label: "Yeni şifre (boş bırakılırsa değişmez)", type: "password" },
        { name: "isActive", label: "Aktif", type: "checkbox" },
      ]}
      toEditValues={(row) => ({ fullName: row.fullName, username: row.username, password: "", isActive: row.isActive })}
      onUpdate={(row, values) =>
        employeeApi.update(row.id, {
          fullName: formValue.optionalText(values, "fullName"),
          username: formValue.optionalText(values, "username"),
          password: formValue.optionalText(values, "password"),
          isActive: formValue.bool(values, "isActive"),
        })
      }
    />
  );
}
