import { Pencil, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAsyncData } from "../../hooks/useAsyncData";
import { AsyncState } from "../ui/AsyncState";
import { ConfirmDialog, DeleteButton } from "../ui/ConfirmDialog";
import { DataTable, type Column } from "../ui/DataTable";
import { EntityForm, type FieldDef } from "../ui/EntityForm";
import { type FormValues } from "../ui/formValues";
import { Modal } from "../ui/Modal";
import { ModalFormButton } from "../ui/ModalFormButton";
import { PageHeader } from "../ui/PageHeader";
import { Section } from "../ui/Section";

export interface CrudRowHelpers<T> {
  replaceRow: (row: T) => void;
  reload: () => Promise<void>;
}

interface CrudPageProps<T extends { id: string }> {
  /** Sayfa açıklaması; verilmezse `navigation.ts`'teki sayfa açıklaması kullanılır. */
  description?: string;
  load: () => Promise<T[]>;
  columns: Column<T>[];
  emptyText: string;

  /** "+ {createLabel}" düğmesi sayfa girişinde durur ve formu bir pencerede açar. */
  createLabel?: string;
  createFields?: FieldDef[];
  createInitialValues?: FormValues;
  onCreate?: (values: FormValues) => Promise<T>;

  editTitle?: (row: T) => string;
  editFields?: FieldDef[];
  toEditValues?: (row: T) => FormValues;
  onUpdate?: (row: T, values: FormValues) => Promise<T>;

  /** Verilirse her satırda "Sil" butonu çıkar; onaydan sonra çağrılır, başarılıysa satır listeden düşer. */
  onDelete?: (row: T) => Promise<void>;
  /** Onay penceresinde gösterilecek kayıt adı (örn. malzeme adı). */
  describeRow?: (row: T) => string;

  rowActions?: (row: T, helpers: CrudRowHelpers<T>) => ReactNode;
  renderExpanded?: (row: T, helpers: CrudRowHelpers<T>) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
  /** Girişin altında, tablonun üstünde gösterilecek ek içerik (örn. toplam borç kutusu). */
  summary?: ReactNode;
  /** Sayfa girişindeki ek eylemler (oluştur düğmesinin yanında). */
  extraActions?: ReactNode;
  /** Liste bölümünün başlığı. */
  listTitle?: string;
  /** true ise sayfa girişi (açıklama + düğme) basılmaz; düğme `listTitle` yanında durur — başka bir sayfaya gömülü kullanım. */
  embedded?: boolean;
  /** Değişince liste sunucudan yeniden yüklenir (başka bir bölümdeki işlem bu listeyi etkilediğinde). */
  reloadKey?: string;
}

/**
 * "Liste + oluştur + düzenle + sil" deseni izleyen tüm modül sayfalarının ortak iskeleti. Sayfalar yalnızca
 * kolonları, form alanlarını ve form değerlerinin backend isteğine nasıl çevrileceğini tanımlar — veri
 * yükleme, hata gösterimi, oluşturma/düzenleme pencereleri ve silme onayı burada tek kez yazılır.
 * Oluşturma formu sayfada sürekli açık durmaz; "+ Yeni" düğmesiyle pencerede açılır (derli toplu görünüm).
 */
export function CrudPage<T extends { id: string }>(props: CrudPageProps<T>) {
  const { data, error, isLoading, reload, setData } = useAsyncData(props.load, props.reloadKey);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  function replaceRow(row: T) {
    setData((current) => current?.map((item) => (item.id === row.id ? row : item)) ?? current);
  }

  const helpers: CrudRowHelpers<T> = { replaceRow, reload };
  const canEdit = props.editFields && props.toEditValues && props.onUpdate;

  const createButton = props.createFields && props.onCreate && (
    <ModalFormButton
      label={props.createLabel ?? "Yeni"}
      icon={Plus}
      fields={props.createFields}
      initialValues={props.createInitialValues ?? {}}
      onSubmit={async (values) => {
        const created = await props.onCreate!(values);
        setData((current) => [...(current ?? []), created]);
      }}
    />
  );

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
        {props.onDelete && <DeleteButton onClick={() => setDeleting(row)} />}
      </>
    );
  }

  return (
    <div>
      {!props.embedded && (
        <PageHeader
          description={props.description}
          actions={
            createButton || props.extraActions ? (
              <>
                {props.extraActions}
                {createButton}
              </>
            ) : undefined
          }
        />
      )}

      {props.summary}

      <Section title={props.listTitle} actions={props.embedded ? createButton : undefined}>
        <AsyncState data={data} error={error} isLoading={isLoading} isEmpty={(rows) => rows.length === 0} emptyText={props.emptyText}>
          {(rows) => (
            <DataTable
              columns={props.columns}
              rows={rows}
              rowKey={(row) => row.id}
              rowActions={props.rowActions || canEdit || props.onDelete ? renderRowActions : undefined}
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
      {deleting && props.onDelete && (
        <ConfirmDialog
          title="Silinsin mi?"
          message={`"${props.describeRow?.(deleting) ?? "Bu kayıt"}" kalıcı olarak silinecek. Geçmiş kayıtlarda kullanılıyorsa silinemez; o durumda pasif yapabilirsiniz.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await props.onDelete!(deleting);
            setData((current) => current?.filter((item) => item.id !== deleting.id) ?? current);
          }}
        />
      )}
    </div>
  );
}
