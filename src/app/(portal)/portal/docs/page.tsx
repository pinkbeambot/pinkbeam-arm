'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, FileText } from 'lucide-react';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/docs/spec')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setSpec(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load API documentation');
        setLoading(false);
        console.error('Failed to load API spec:', err);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              API Documentation
            </CardTitle>
            <CardDescription>
              ARM Platform REST API Reference
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading API specification...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              API Documentation
            </CardTitle>
            <CardDescription>
              ARM Platform REST API Reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Documentation</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            API Documentation
          </CardTitle>
          <CardDescription>
            Complete REST API reference for the ARM (Agent Relationship Management) platform.
            All endpoints require Bearer token authentication.
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

      <style jsx global>{`
        .swagger-wrapper {
          background: #fff;
        }
        .swagger-wrapper .swagger-ui {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .swagger-wrapper .swagger-ui .topbar {
          display: none;
        }
        .swagger-wrapper .swagger-ui .info {
          margin: 0;
          padding: 20px;
        }
        .swagger-wrapper .swagger-ui .info .title {
          font-size: 28px;
          font-weight: 700;
          color: hsl(var(--foreground));
        }
        .swagger-wrapper .swagger-ui .scheme-container {
          background: hsl(var(--card));
          box-shadow: none;
          padding: 20px;
        }
        .swagger-wrapper .swagger-ui .auth-wrapper .authorize {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .swagger-wrapper .swagger-ui .btn.execute {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .swagger-wrapper .swagger-ui .opblock.opblock-get {
          background: rgba(59, 130, 246, 0.05);
          border-color: rgba(59, 130, 246, 0.3);
        }
        .swagger-wrapper .swagger-ui .opblock.opblock-post {
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.3);
        }
        .swagger-wrapper .swagger-ui .opblock.opblock-put {
          background: rgba(245, 158, 11, 0.05);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .swagger-wrapper .swagger-ui .opblock.opblock-delete {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .swagger-wrapper .swagger-ui .opblock.opblock-patch {
          background: rgba(168, 85, 247, 0.05);
          border-color: rgba(168, 85, 247, 0.3);
        }
        .swagger-wrapper .swagger-ui .opblock .opblock-summary-method {
          font-weight: 600;
          min-width: 80px;
        }
        .swagger-wrapper .swagger-ui section.models {
          margin: 20px;
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius);
        }
        .swagger-wrapper .swagger-ui section.models .model-container {
          margin: 0;
          padding: 10px 20px;
        }
        .swagger-wrapper .swagger-ui .model-box {
          background: hsl(var(--muted));
          padding: 10px;
          border-radius: var(--radius);
        }
        .swagger-wrapper .swagger-ui table thead tr th {
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        .swagger-wrapper .swagger-ui .parameter__name {
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        .swagger-wrapper .swagger-ui .response-col_status {
          font-weight: 700;
        }
        .swagger-wrapper .swagger-ui .responses-inner h4,
        .swagger-wrapper .swagger-ui .responses-inner h5 {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
