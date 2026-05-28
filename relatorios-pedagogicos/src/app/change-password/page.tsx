// src/app/change-password/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { FiLock, FiAlertCircle } from 'react-icons/fi'

function isPasswordCompliant(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <ChangePasswordInner />
    </Suspense>
  )
}

function ChangePasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFirstAccess = searchParams.get('first') === '1'
  const [me, setMe] = useState<{ nome?: string; role?: string } | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.authenticated) {
          router.push('/login')
        } else {
          setMe(d)
        }
      })
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('As senhas nao conferem')
      return
    }
    if (!isPasswordCompliant(newPassword)) {
      toast.error('A senha precisa ter no minimo 8 caracteres, 1 letra maiuscula, 1 numero e 1 caractere especial')
      return
    }
    setBusy(true)
    try {
      const body: Record<string, string> = { newPassword }
      if (!isFirstAccess) body.currentPassword = currentPassword
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Senha alterada com sucesso!')
        if (me?.role === 'ADMIN') router.push('/admin')
        else if (me?.role === 'COORDENADOR') router.push('/coordenador')
        else router.push('/professor')
      } else {
        toast.error(data.error || 'Erro ao trocar senha')
      }
    } catch {
      toast.error('Falha de rede')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <FiLock size={32} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">
              {isFirstAccess ? 'Crie sua nova senha' : 'Alterar senha'}
            </h1>
            {me?.nome ? (
              <p className="text-sm text-gray-500">Ola, {me.nome}</p>
            ) : null}
          </div>
        </div>

        {isFirstAccess ? (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 p-3 rounded mb-4 flex items-start gap-2">
            <FiAlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              Este e seu primeiro acesso. Crie uma senha pessoal antes de continuar.
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-3">
          {!isFirstAccess ? (
            <div>
              <label className="block text-sm font-medium mb-1">Senha atual *</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full p-2 border rounded"
                data-testid="current-password"
              />
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium mb-1">Nova senha *</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full p-2 border rounded"
              data-testid="new-password"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimo 8 caracteres, 1 letra maiuscula, 1 numero e 1 caractere especial.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar nova senha *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-2 border rounded"
              data-testid="confirm-password"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-50"
            data-testid="submit-change-password"
          >
            {busy ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
