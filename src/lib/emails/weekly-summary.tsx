import * as React from 'react';

interface WeeklySummaryEmailProps {
  userName: string;
  weekRange: string;
  tasksCompleted: number;
  tasksCompletedChange: number;
  activeAgents: number;
  totalEscalations: number;
  avgResolutionTime: string;
  topPerformer?: { name: string; tasksCompleted: number };
  actionUrl: string;
  unsubscribeUrl: string;
}

export function WeeklySummaryEmail({
  userName,
  weekRange,
  tasksCompleted,
  tasksCompletedChange,
  activeAgents,
  totalEscalations,
  avgResolutionTime,
  topPerformer,
  actionUrl,
  unsubscribeUrl,
}: WeeklySummaryEmailProps) {
  const changeText = tasksCompletedChange > 0
    ? `+${tasksCompletedChange}% vs last week`
    : tasksCompletedChange < 0
      ? `${tasksCompletedChange}% vs last week`
      : 'Same as last week';
  const changeColor = tasksCompletedChange > 0 ? '#10b981' : tasksCompletedChange < 0 ? '#ef4444' : '#6b7280';

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', padding: '32px', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 600 }}>Pink Beam</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', fontSize: '14px' }}>Weekly Performance Summary — {weekRange}</p>
      </div>
      <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#374151' }}>
          Hi {userName}, here&apos;s how your AI workforce performed this week:
        </p>

        {/* Key Metrics */}
        <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '16px', verticalAlign: 'top' }}>
                <div style={{ padding: '20px', backgroundColor: '#fdf2f8', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: '#ec4899' }}>{tasksCompleted}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Tasks Completed</div>
                  <div style={{ fontSize: '12px', color: changeColor, marginTop: '4px', fontWeight: 500 }}>{changeText}</div>
                </div>
              </td>
              <td style={{ width: '50%', padding: '16px', verticalAlign: 'top' }}>
                <div style={{ padding: '20px', backgroundColor: '#f5f3ff', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: '#8b5cf6' }}>{activeAgents}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Active Agents</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ width: '50%', padding: '16px', verticalAlign: 'top' }}>
                <div style={{ padding: '20px', backgroundColor: totalEscalations > 0 ? '#fef2f2' : '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: totalEscalations > 0 ? '#ef4444' : '#6b7280' }}>{totalEscalations}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Escalations</div>
                </div>
              </td>
              <td style={{ width: '50%', padding: '16px', verticalAlign: 'top' }}>
                <div style={{ padding: '20px', backgroundColor: '#ecfdf5', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{avgResolutionTime}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Avg Resolution</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Top Performer */}
        {topPerformer && (
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fffbeb', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
              Top Performer
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#111827' }}>
              <strong>{topPerformer.name}</strong> completed {topPerformer.tasksCompleted} tasks this week
            </p>
          </div>
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
          View Full Report
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
