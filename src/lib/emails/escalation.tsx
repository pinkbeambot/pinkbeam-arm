import * as React from 'react';

interface EscalationEmailProps {
  userName: string;
  agentName: string;
  escalationTitle: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  message: string;
  actionUrl: string;
  unsubscribeUrl: string;
}

const URGENCY_COLORS: Record<string, string> = {
  low: '#6b7280',
  normal: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

export function EscalationEmail({
  userName,
  agentName,
  escalationTitle,
  urgency,
  message,
  actionUrl,
  unsubscribeUrl,
}: EscalationEmailProps) {
  const urgencyColor = URGENCY_COLORS[urgency] || URGENCY_COLORS.normal;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', padding: '32px', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 600 }}>Pink Beam</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', fontSize: '14px' }}>Escalation Alert</p>
      </div>
      <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        <p style={{ margin: '0 0 16px', fontSize: '15px', color: '#374151' }}>
          Hi {userName},
        </p>
        <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
          <strong>{agentName}</strong> has escalated an issue that requires your attention:
        </p>

        <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: urgencyColor,
              textTransform: 'uppercase',
            }}>
              {urgency}
            </span>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#111827' }}>
            {escalationTitle}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
            {message}
          </p>
        </div>

        <a
          href={actionUrl}
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
          View Escalation
        </a>
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
