import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav>
        <h2>Admin Panel</h2>
        {/* TODO: Add navigation links to admin pages */}
      </nav>
      <main>{children}</main>
    </div>
  );
}
