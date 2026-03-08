import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/login']

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value
    const { pathname } = request.nextUrl

    const isPublic = publicRoutes.some(route => pathname.startsWith(route))

    // 1. If NOT logged in and NOT on a public route -> strictly redirect to login
    if (!token && !isPublic) {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    // 2. If logged in and on root '/' -> go to dashboard
    if (token && pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 3. If already logged in and trying to access login -> go to dashboard
    if (token && pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
