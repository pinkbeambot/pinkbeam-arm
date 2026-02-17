import * as React from 'react';

interface DecisionEmailProps {
  userName: string;
  agentName: string;
  decisionTitle: string;
  proposedAction: string;
  reasoning: string;
  deadline?: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  actionUrl: string;
  unsubscribeUrl: string;
}

const URGENCY_COLORS: Record<string, string> = {
  low: '#6b7280',
  normal: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

export function DecisionEmail({
  userName,
  agentName,
  decisionTitle,
  proposedAction,
  reasoning,
  deadline,
  urgency,
  actionUrl,
  unsubscribeUrl,
}: DecisionEmailProps) {
  const urgencyColor = URGENCY_COLORS[urgency] || URGENCY_COLORS.normal;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', padding: '32px', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 600 }}>Pink Beam</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', fontSize: '14px' }}>Decision Requiring Approval</p>
      </div>
      <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        <p style={{ margin: '0 0 16px', fontSize: '15px', color: '#374151' }}>
          Hi {userName},
        </p>
        <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
          <strong>{agentName}</strong> has proposed a decision that requires your approval:
        </p>

        <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
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
            {deadline && (
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#92400e',
                backgroundColor: '#fef3c7',
              }}>
                Due: {deadline}
              </span>
            )}
          </div>
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#111827' }}>
            {decisionTitle}
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Proposed Action
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.5', backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              {proposedAction}
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reasoning
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.5', backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              {reasoning}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href={`${actionUrl}?action=approve`}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Approve
          </a>
          <a
            href={`${actionUrl}?action=reject`}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Reject
          </a>
          <a
            href={actionUrl}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Review Details
          </a>
        </div>
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
