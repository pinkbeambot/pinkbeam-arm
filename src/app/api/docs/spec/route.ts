import { NextRequest, NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger';

/**
 * GET /api/docs/spec
 * Returns the OpenAPI specification as JSON
 * 
 * @openapi
 * /api/docs/spec:
 *   get:
 *     summary: Get OpenAPI specification
 *     description: Returns the complete OpenAPI 3.0 specification for the ARM API
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: OpenAPI specification JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET(request: NextRequest) {
  try {
    const spec = await getApiDocs();
    return NextResponse.json(spec);
  } catch (error) {
    console.error('Error generating OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}
