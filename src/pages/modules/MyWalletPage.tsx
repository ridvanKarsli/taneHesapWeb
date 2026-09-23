import { myWalletApi } from "../../api/moduleApis";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { EmployeeWalletPanel } from "./EmployeeWalletPanel";

/** EMPLOYEE'nin kendi cüzdanı — salt okunur (bkz. proje raporu 2, 3.7). */
export function MyWalletPage() {
  return (
    <div>
      <PageHeader />
      <Section>
        <EmployeeWalletPanel load={myWalletApi.get} />
      </Section>
    </div>
  );
}
