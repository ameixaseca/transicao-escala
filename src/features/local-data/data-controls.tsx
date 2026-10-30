"use client";

type DataControlsProps = {
  canSave: boolean;
  hasSavedData: boolean;
  savedAt: string | null;
  statusMessage: string | null;
  storageError: string | null;
  storageNotice: string | null;
  onSave: () => void;
  onDelete: () => void;
};

export function DataControls({
  canSave,
  hasSavedData,
  savedAt,
  statusMessage,
  storageError,
  storageNotice,
  onSave,
  onDelete,
}: DataControlsProps) {
  return (
    <section aria-label="Dados salvos neste navegador">
      <p>Salve suas premissas de diagnóstico somente quando desejar.</p>
      <button disabled={!canSave} onClick={onSave} type="button">
        Salvar neste navegador
      </button>
      {hasSavedData && (
        <button onClick={onDelete} type="button">
          Excluir dados salvos
        </button>
      )}
      {statusMessage && (
        <p aria-live="polite" role="status">
          {statusMessage}
          {savedAt && (
            <>
              {" "}
              <time dateTime={savedAt}>
                {new Date(savedAt).toLocaleString("pt-BR")}
              </time>
            </>
          )}
        </p>
      )}
      {storageNotice && (
        <p aria-live="polite" role="status">
          {storageNotice}
        </p>
      )}
      {storageError && (
        <p aria-live="assertive" role="alert">
          {storageError}
        </p>
      )}
    </section>
  );
}
