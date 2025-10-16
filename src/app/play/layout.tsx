import { ReactNode } from 'react';

export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav>
        <h2>Play</h2>
        {/* TODO: Add navigation links to play pages */}
      </nav>
      <main>{children}</main>
    </div>
  );
}
