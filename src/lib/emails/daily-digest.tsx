import * as React from 'react';

interface AgentSummary {
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
  escalations: number;
  status: string;
}

interface DailyDigestEmailProps {
  userName: string;
  date: string;
  totalTasksCompleted: number;
  totalTasksInProgress: number;
  totalEscalations: number;
  agents: AgentSummary[];
  actionUrl: string;
  unsubscribeUrl: string;
}

export function DailyDigestEmail({
  userName,
  date,
  totalTasksCompleted,
  totalTasksInProgress,
  totalEscalations,
  agents,
  actionUrl,
  unsubscribeUrl,
}: DailyDigestEmailProps) {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', padding: '32px', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 600 }}>Pink Beam</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', fontSize: '14px' }}>Daily Digest — {date}</p>
      </div>
      <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
          Hi {userName}, here&apos;s your daily summary:
        </p>

        {/* Stats Row */}
        <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '8px 0 0 8px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{totalTasksCompleted}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Completed</div>
              </td>
              <td style={{ textAlign: 'center', padding: '16px', backgroundColor: '#eff6ff' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{totalTasksInProgress}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>In Progress</div>
              </td>
              <td style={{ textAlign: 'center', padding: '16px', backgroundColor: totalEscalations > 0 ? '#fef2f2' : '#f9fafb', borderRadius: '0 8px 8px 0' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: totalEscalations > 0 ? '#ef4444' : '#6b7280' }}>{totalEscalations}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Escalations</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Agent Breakdown */}
        {agents.length > 0 && (
          <>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Agent Activity
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Agent</th>
                  <th style={{ textAlign: 'center', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Done</th>
                  <th style={{ textAlign: 'center', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Active</th>
                  <th style={{ textAlign: 'center', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Esc.</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0', fontWeight: 500, color: '#111827' }}>{agent.name}</td>
                    <td style={{ textAlign: 'center', padding: '10px 0', color: '#10b981' }}>{agent.tasksCompleted}</td>
                    <td style={{ textAlign: 'center', padding: '10px 0', color: '#3b82f6' }}>{agent.tasksInProgress}</td>
                    <td style={{ textAlign: 'center', padding: '10px 0', color: agent.escalations > 0 ? '#ef4444' : '#6b7280' }}>{agent.escalations}</td>
                    <td style={{ textAlign: 'right', padding: '10px 0' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        backgroundColor: agent.status === 'active' ? '#d1fae5' : '#f3f4f6',
                        color: agent.status === 'active' ? '#065f46' : '#6b7280',
                      }}>
                        {agent.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

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
          Open Dashboard
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
