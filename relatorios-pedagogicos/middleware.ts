import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/', '/login', '/api/login', '/api/warm', '/favicon.ico']

function unauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

function forbidden(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Acesso negado' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value
  if (!token) return unauthorized(request)

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    const role = payload.role

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return forbidden(request)
    }

    if (pathname.startsWith('/coordenador') && role !== 'COORDENADOR' && role !== 'ADMIN') {
      return forbidden(request)
    }

    if (pathname.startsWith('/professor') && role !== 'PROFESSOR') {
      return forbidden(request)
    }

    if (pathname.startsWith('/api/admin') && role !== 'ADMIN') {
      return forbidden(request)
    }

    const response = NextResponse.next()
    if (pathname.startsWith('/api/')) {
      response.headers.set('Cache-Control', 'no-store')
    }
    return response
  } catch (error) {
    console.error('Erro ao verificar token JWT:', error)
    return unauthorized(request)
  }
}

export const config = {
  matcher: ['/admin/:path*', '/coordenador/:path*', '/professor/:path*', '/api/:path*'],
}
