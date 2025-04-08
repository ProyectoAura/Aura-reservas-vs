// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const autorizado = request.cookies.get('adminAutorizado');

  if (isAdminRoute && autorizado?.value !== 'true') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}
export const config = {
  matcher: ['/admin/:path*'],
};