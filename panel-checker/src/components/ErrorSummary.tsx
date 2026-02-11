interface ErrorItem {
  id: string;
  message: string;
}

interface Props {
  heading?: string;
  errors: ErrorItem[];
}

export default function ErrorSummary({ heading = 'Please fix the following errors', errors }: Props) {
  if (!errors.length) return null;

  return (
    <section className="alert alert-danger" role="alert" aria-live="assertive" tabIndex={-1}>
      <h2 className="h4 mrgn-tp-0">{heading}</h2>
      <ul>
        {errors.map((error) => (
          <li key={error.id}>
            <a href={`#${error.id}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
