import { ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

export default function InfoBubble({ label, children }: Props) {
  return (
    <details className="wb-details">
      <summary>{label}</summary>
      <div>{children}</div>
    </details>
  );
}
