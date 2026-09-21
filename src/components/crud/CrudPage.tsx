import { Pencil, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAsyncData } from "../../hooks/useAsyncData";
import { AsyncState } from "../ui/AsyncState";
import { DataTable, type Column } from "../ui/DataTable";
import { EntityForm, type FieldDef } from "../ui/EntityForm";
import { type FormValues } from "../ui/formValues";
import { Modal } from "../ui/Modal";
import { PageHeader } from "../ui/PageHeader";
import { Section } from "../ui/Section";

export interface CrudRowHelpers<T> {
  replaceRow: (row: T) => void;
  reload: () => Promise<void>;
}

interface CrudPageProps<T extends { id: string }> {
  title: string;
  description?: string;
  load: () => Promise<T[]>;
  columns: Column<T>[];
  emptyText: string;

  createTitle?: string;
  createFields?: FieldDef[];
  createInitialValues?: FormValues;
  onCreate?: (values: FormValues) => Promise<T>;

  editTitle?: (row: T) => string;
  editFields?: FieldDef[];
  toEditValues?: (row: T) => FormValues;
  onUpdate?: (row: T, values: FormValues) => Promise<T>;

  rowActions?: (row: T, helpers: CrudRowHelpers<T>) => ReactNode;
  renderExpanded?: (row: T, helpers: CrudRowHelpers<T>) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
  /** Başlığın altında, tablonun üstünde gösterilecek ek içerik (örn. toplam borç kutusu). */
  summary?: ReactNode;
}

/**
 * "Liste + oluştur + düzenle" deseni izleyen tüm modül sayfalarının ortak iskeleti (Gider Türleri,
 * Malzemeler, Platformlar, Çalışanlar, Tedarikçiler, Düzenli Giderler). Sayfalar yalnızca kolonları,
 * form alanlarını ve form değerlerinin backend isteğine nasıl çevrileceğini tanımlar — veri yükleme,
 * hata gösterimi, düzenleme diyaloğu burada tek kez yazılır (DRY, Open/Closed).
 */
export function CrudPage<T extends { id: string }>(props: CrudPageProps<T>) {
  const { data, error, isLoading, reload, setData } = useAsyncData(props.load);
  const [editing, setEditing] = useState<T | null>(null);

  function replaceRow(row: T) {
    setData((current) => current?.map((item) => (item.id === row.id ? row : item)) ?? current);
  }

  const helpers: CrudRowHelpers<T> = { replaceRow, reload };
  const canEdit = props.editFields && props.toEditValues && props.onUpdate;

  function renderRowActions(row: T) {
    return (
      <>
        {props.rowActions?.(row, helpers)}
        {canEdit && (
          <button type="button" className="ui-button secondary small" onClick={() => setEditing(row)}>
            <Pencil size={14} aria-hidden="true" />
            Düzenle
          </button>
        )}
      </>
    );
  }

  return (
    <div>
      <PageHeader title={props.title} description={props.description} />

      {props.summary}

      {props.createFields && props.onCreate && (
        <Section title={props.createTitle ?? "Yeni kayıt"} icon={Plus}>
          <EntityForm
            layout="inline"
            fields={props.createFields}
            initialValues={props.createInitialValues ?? {}}
            submitLabel="Ekle"
            submitIcon={Plus}
            resetOnSuccess
            onSubmit={async (values) => {
              const created = await props.onCreate!(values);
              setData((current) => [...(current ?? []), created]);
            }}
          />
        </Section>
      )}

      <Section>
        <AsyncState data={data} error={error} isLoading={isLoading} isEmpty={(rows) => rows.length === 0} emptyText={props.emptyText}>
          {(rows) => (
            <DataTable
              columns={props.columns}
              rows={rows}
              rowKey={(row) => row.id}
              rowActions={props.rowActions || canEdit ? renderRowActions : undefined}
              renderExpanded={props.renderExpanded ? (row) => props.renderExpanded!(row, helpers) : undefined}
              rowClassName={props.rowClassName}
            />
          )}
        </AsyncState>
      </Section>

      {editing && canEdit && (
        <Modal title={props.editTitle?.(editing) ?? "Düzenle"} onClose={() => setEditing(null)}>
          <EntityForm
            fields={props.editFields!}
            initialValues={props.toEditValues!(editing)}
            submitLabel="Kaydet"
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              replaceRow(await props.onUpdate!(editing, values));
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
