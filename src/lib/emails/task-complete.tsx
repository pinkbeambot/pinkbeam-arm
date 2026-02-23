import * as React from 'react';

interface TaskCompleteEmailProps {
  userName: string;
  taskTitle: string;
  agentName: string;
  completedAt: string;
  duration?: string;
  actionUrl: string;
  unsubscribeUrl: string;
}

export function TaskCompleteEmail({
  userName,
  taskTitle,
  agentName,
  completedAt,
  duration,
  actionUrl,
  unsubscribeUrl,
}: TaskCompleteEmailProps) {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', padding: '32px', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 600 }}>Pink Beam</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', fontSize: '14px' }}>Task Completed</p>
      </div>
      <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        <p style={{ margin: '0 0 16px', fontSize: '15px', color: '#374151' }}>
          Hi {userName},
        </p>
        <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
          A task has been completed by <strong>{agentName}</strong>:
        </p>

        <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #d1fae5', backgroundColor: '#ecfdf5', marginBottom: '20px' }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#10b981',
            }}>
              COMPLETED
            </span>
          </div>
          <h3 style={{ margin: '8px 0', fontSize: '16px', color: '#111827' }}>
            {taskTitle}
          </h3>
          <table style={{ fontSize: '13px', color: '#6b7280' }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: '12px', fontWeight: 500 }}>Agent:</td>
                <td>{agentName}</td>
              </tr>
              <tr>
                <td style={{ paddingRight: '12px', fontWeight: 500 }}>Completed:</td>
                <td>{completedAt}</td>
              </tr>
              {duration && (
                <tr>
                  <td style={{ paddingRight: '12px', fontWeight: 500 }}>Duration:</td>
                  <td>{duration}</td>
                </tr>
              )}
            </tbody>
          </table>
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
          View Task
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
