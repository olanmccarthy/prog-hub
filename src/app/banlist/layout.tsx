import { ReactNode } from 'react';

export default function BanlistLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav>
        <h2>Banlist Management</h2>
        {/* TODO: Add navigation links to banlist pages */}
      </nav>
      <main>{children}</main>
    </div>
  );
}
