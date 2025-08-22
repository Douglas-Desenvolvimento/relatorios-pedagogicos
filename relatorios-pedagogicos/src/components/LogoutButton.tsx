// src/components/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';

export async function handleLogout(router: ReturnType<typeof useRouter>) {
  await fetch('/api/logout', { method: 'POST' });
  router.push('/');
}

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => handleLogout(router)}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Sair
    </button>
  );
}
