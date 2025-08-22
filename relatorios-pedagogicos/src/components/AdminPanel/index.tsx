// src/components/AdminPanel/index.tsx
import LogoutButton from '../LogoutButton';

export default function AdminPanel() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-center">Painel Administrativo</h1>
      <p className="text-center text-gray-500 mt-2">
        Gerencie usuários, permissões e configurações.
      </p>

      <div className="text-center mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
