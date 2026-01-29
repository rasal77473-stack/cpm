import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes pattern
const protectedRoutes = ['/dashboard', '/admin', '/special-pass', '/history']

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value
    const { pathname } = request.nextUrl

    // 1. If accessing a protected route without token -> Redirect to Login
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
        if (!token) {
            const loginUrl = new URL('/login', request.url)
            // loginUrl.searchParams.set('from', pathname) // Optional: Redirect back after login
            return NextResponse.redirect(loginUrl)
        }
    }

    // 2. If accessing Login page while logged in -> Redirect to Dashboard
    if (pathname === '/login' && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 3. If accessing root '/' -> Redirect to Dashboard if logged in, else Login
    if (pathname === '/') {
        if (token) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        } else {
            return NextResponse.redirect(new URL('/login', request.url))
        }
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
