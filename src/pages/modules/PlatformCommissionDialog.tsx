import { Percent } from "lucide-react";
import { platformApi } from "../../api/moduleApis";
import { EntityForm } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { Modal } from "../../components/ui/Modal";
import { formatPercent } from "../../lib/format";
import type { PlatformDto } from "../../types/platform";

interface PlatformCommissionDialogProps {
  platform: PlatformDto;
  onClose: () => void;
  /** Kaydedilince platform listesi yeniden okunur (kartlardaki oran ve uyarı güncellenir). */
  onSaved: () => Promise<void>;
}

/**
 * Gün Sonu kartındaki "Komisyonu güncelle": platformun komisyon yüzdesini işletme sahibi de değiştirir
 * (platform ekleme/silme süper adminde kalır). Oran sonraki yüklemelerde geçerlidir; geçmiş komisyon giderleri değişmez.
 */
export function PlatformCommissionDialog({ platform, onClose, onSaved }: PlatformCommissionDialogProps) {
  return (
    <Modal title={`${platform.name} — komisyon oranı`} onClose={onClose}>
      <p className="ui-muted">
        Şu anki oran: <strong>{formatPercent(platform.commissionPercentage)}</strong>. Yeni oran bundan sonraki yüklemelerde geçerli olur;
        komisyon gideri her yüklemede satış tutarının bu yüzdesi kadar otomatik yazılır.
      </p>
      <EntityForm
        fields={[{ name: "commissionPercentage", label: "Komisyon (%)", type: "number", required: true, min: 0, step: "0.01", placeholder: "örn. 18" }]}
        initialValues={{ commissionPercentage: String(platform.commissionPercentage) }}
        submitLabel="Komisyonu kaydet"
        submitIcon={Percent}
        onCancel={onClose}
        onSubmit={async (values) => {
          await platformApi.updateCommission(platform.id, formValue.number(values, "commissionPercentage"));
          await onSaved();
          onClose();
        }}
      />
    </Modal>
  );
}
