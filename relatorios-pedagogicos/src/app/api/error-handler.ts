import { NextResponse } from 'next/server'

export function handleApiError(error: unknown) {
  console.error(error)
  return NextResponse.json(
    { error: 'Ocorreu um erro no servidor' },
    { status: 500 }
  )
}