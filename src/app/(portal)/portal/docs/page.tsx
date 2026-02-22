'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, FileText } from 'lucide-react';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/docs/spec')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data) => { setSpec(data); setLoading(false); })
      .catch((err) => { setError(err.message || 'Failed to load'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6"/>API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin mr-2"/>Loading...
        </CardContent>
      </Card>
    </div>
  );

  if (error) return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader><CardTitle>API Documentation</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6"/>API Documentation
          </CardTitle>
          <CardDescription>
            Complete REST API reference for the ARM platform. All endpoints require Bearer token authentication.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="swagger-wrapper">
            {spec && (
              <SwaggerUI 
                spec={spec} 
                docExpansion="list"
                defaultModelExpandDepth={3}
                displayRequestDuration={true}
                tryItOutEnabled={true}
                supportedSubmitMethods={['get', 'post', 'put', 'delete', 'patch']}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
