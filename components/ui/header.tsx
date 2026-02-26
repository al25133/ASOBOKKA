import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
}

export function Header({ title, description, rightSlot }: HeaderProps) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      </div>
      {rightSlot}
    </header>
  );
}
