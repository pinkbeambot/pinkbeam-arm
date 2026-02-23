import * as React from 'react';

interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
  unsubscribeUrl: string;
}

export function WelcomeEmail({
  userName,
  loginUrl,
  unsubscribeUrl,
}: WelcomeEmailProps) {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', padding: '32px', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 600 }}>Pink Beam</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', fontSize: '14px' }}>Welcome to ARM</p>
      </div>
      <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        <p style={{ margin: '0 0 16px', fontSize: '15px', color: '#374151' }}>
          Hi {userName},
        </p>
        <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
          Welcome to <strong>Pink Beam ARM</strong> — your AI Workforce Command Center! We&apos;re excited to help you manage and orchestrate your AI agent workforce.
        </p>

        <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#111827' }}>
            What you can do with ARM:
          </h3>
          <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '8px' }}>Deploy and manage AI agents with hierarchical spawning</li>
            <li style={{ marginBottom: '8px' }}>Assign tasks and track progress in real-time</li>
            <li style={{ marginBottom: '8px' }}>Review decisions and handle escalations</li>
            <li style={{ marginBottom: '8px' }}>Monitor costs and performance analytics</li>
            <li>Collaborate with your team in a multi-tenant workspace</li>
          </ul>
        </div>

        <a
          href={loginUrl}
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#ec4899',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Go to Dashboard
        </a>

        <p style={{ margin: '24px 0 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
          Need help getting started? Check out our <a href="https://docs.pinkbeam.ai" style={{ color: '#ec4899', textDecoration: 'none' }}>documentation</a> or reply to this email.
        </p>
      </div>
      <div style={{ padding: '16px 32px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
        <p style={{ margin: '0 0 8px' }}>Pink Beam ARM — Your AI Workforce Command Center</p>
        <a href={unsubscribeUrl} style={{ color: '#9ca3af', textDecoration: 'underline' }}>
          Unsubscribe from email notifications
        </a>
      </div>
    </div>
  );
}
