'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/docs/spec')
      .then((res) => res.json())
      .then((data) => {
        setSpec(data);
      })
      .catch((err) => {
        setError('Failed to load API documentation');
        console.error(err);
      });
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="mt-4">{error}</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Loading API Documentation...</h1>
      </div>
    );
  }

  return (
    <div className="swagger-wrapper">
      <SwaggerUI spec={spec} docExpansion="list" />
      <style jsx global>{`
        .swagger-wrapper {
          padding: 20px;
          background: #fff;
          min-height: 100vh;
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui .info .title {
          font-size: 32px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
