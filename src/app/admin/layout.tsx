import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/src/lib/auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();

  // If not logged in or not an admin, redirect to home page
  if (!currentUser || !currentUser.isAdmin) {
    redirect('/');
  }

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
