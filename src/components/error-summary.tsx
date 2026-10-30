export type FieldError = {
  field: string;
  message: string;
};

export const fieldIdFor = (field: string): string =>
  `field-${field.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

type ErrorSummaryProps = {
  errors: ReadonlyArray<FieldError>;
};

export function ErrorSummary({ errors }: ErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <section aria-labelledby="error-summary-title" role="alert">
      <h2 id="error-summary-title">Revise os campos indicados</h2>
      <ul>
        {errors.map((error) => (
          <li key={`${error.field}:${error.message}`}>
            <a href={`#${fieldIdFor(error.field)}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
