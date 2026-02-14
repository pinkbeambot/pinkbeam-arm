import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/docs
 * Redirects to the Swagger UI documentation page
 * 
 * @openapi
 * /docs:
 *   get:
 *     summary: API Documentation
 *     description: Redirects to the Swagger UI documentation page
 *     tags:
 *       - Documentation
 *     responses:
 *       307:
 *         description: Redirects to /api-docs
 */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/api-docs', request.url), 307);
}
