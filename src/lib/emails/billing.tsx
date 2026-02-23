import * as React from 'react';

interface BillingEmailProps {
  userName: string;
  emailType: 'invoice' | 'payment_success' | 'payment_failed' | 'subscription_updated' | 'usage_alert';
  amount?: string;
  currency?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  planName?: string;
  usagePercent?: number;
  paymentMethod?: string;
  failureReason?: string;
  actionUrl: string;
  unsubscribeUrl: string;
}

const EMAIL_CONFIG: Record<string, { title: string; subject: string; color: string; bgColor: string }> = {
  invoice: {
    title: 'New Invoice',
    subject: 'Your Invoice is Ready',
    color: '#3b82f6',
    bgColor: '#eff6ff',
  },
  payment_success: {
    title: 'Payment Successful',
    subject: 'Payment Confirmation',
    color: '#10b981',
    bgColor: '#ecfdf5',
  },
  payment_failed: {
    title: 'Payment Failed',
    subject: 'Payment Issue - Action Required',
    color: '#ef4444',
    bgColor: '#fef2f2',
  },
  subscription_updated: {
    title: 'Subscription Updated',
    subject: 'Your Subscription Has Been Updated',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
  },
  usage_alert: {
    title: 'Usage Alert',
    subject: 'Usage Limit Approaching',
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
};

export function BillingEmail({
  userName,
  emailType,
  amount,
  currency = 'USD',
  invoiceNumber,
  invoiceDate,
  dueDate,
  planName,
  usagePercent,
  paymentMethod,
  failureReason,
  actionUrl,
  unsubscribeUrl,
}: BillingEmailProps) {
  const config = EMAIL_CONFIG[emailType] || EMAIL_CONFIG.invoice;

  const formatCurrency = (value: string | undefined, curr: string) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(parseFloat(value));
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', padding: '32px', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 600 }}>Pink Beam</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', fontSize: '14px' }}>{config.title}</p>
      </div>
      <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        <p style={{ margin: '0 0 16px', fontSize: '15px', color: '#374151' }}>
          Hi {userName},
        </p>

        {/* Invoice Email */}
        {emailType === 'invoice' && (
          <>
            <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
              Your invoice is ready for payment. Here are the details:
            </p>
            <div style={{ padding: '20px', borderRadius: '8px', border: `1px solid ${config.color}30`, backgroundColor: config.bgColor, marginBottom: '24px' }}>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Invoice Number:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>{invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Invoice Date:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>{invoiceDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Due Date:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>{dueDate}</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 0 8px', color: '#374151', fontWeight: 600 }}>Total Amount:</td>
                    <td style={{ padding: '16px 0 8px', textAlign: 'right', fontWeight: 700, fontSize: '18px', color: config.color }}>
                      {formatCurrency(amount, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Payment Success */}
        {emailType === 'payment_success' && (
          <>
            <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
              Thank you! Your payment has been processed successfully.
            </p>
            <div style={{ padding: '20px', borderRadius: '8px', border: `1px solid ${config.color}30`, backgroundColor: config.bgColor, marginBottom: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>&#10003;</span>
              </div>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Amount Paid:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: config.color }}>
                      {formatCurrency(amount, currency)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Payment Method:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>{paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Invoice Number:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>{invoiceNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Payment Failed */}
        {emailType === 'payment_failed' && (
          <>
            <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
              We were unable to process your payment. Please update your payment method to avoid service interruption.
            </p>
            <div style={{ padding: '20px', borderRadius: '8px', border: `1px solid ${config.color}30`, backgroundColor: config.bgColor, marginBottom: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>&#10007;</span>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#374151', textAlign: 'center' }}>
                <strong>Reason:</strong> {failureReason || 'Your card was declined.'}
              </p>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Amount:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
                      {formatCurrency(amount, currency)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Invoice Number:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>{invoiceNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Subscription Updated */}
        {emailType === 'subscription_updated' && (
          <>
            <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
              Your subscription has been successfully updated.
            </p>
            <div style={{ padding: '20px', borderRadius: '8px', border: `1px solid ${config.color}30`, backgroundColor: config.bgColor, marginBottom: '24px' }}>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280' }}>Current Plan:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{planName}</td>
                  </tr>
                  {amount && (
                    <tr>
                      <td style={{ padding: '8px 0', color: '#6b7280' }}>New Amount:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
                        {formatCurrency(amount, currency)}/month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Usage Alert */}
        {emailType === 'usage_alert' && (
          <>
            <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#374151' }}>
              You&apos;ve used {usagePercent}% of your monthly quota. Consider upgrading your plan to avoid service interruption.
            </p>
            <div style={{ padding: '20px', borderRadius: '8px', border: `1px solid ${config.color}30`, backgroundColor: config.bgColor, marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#374151', fontWeight: 500 }}>Usage</span>
                  <span style={{ color: config.color, fontWeight: 600 }}>{usagePercent}%</span>
                </div>
                <div style={{ backgroundColor: '#e5e7eb', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                  <div style={{
                    backgroundColor: config.color,
                    height: '100%',
                    width: `${Math.min(usagePercent || 0, 100)}%`,
                    borderRadius: '4px',
                  }} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
                Current Plan: <strong>{planName}</strong>
              </p>
            </div>
          </>
        )}

        <a
          href={actionUrl}
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: emailType === 'payment_failed' ? '#ef4444' : '#ec4899',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {emailType === 'invoice' && 'Pay Invoice'}
          {emailType === 'payment_success' && 'View Receipt'}
          {emailType === 'payment_failed' && 'Update Payment Method'}
          {emailType === 'subscription_updated' && 'Manage Subscription'}
          {emailType === 'usage_alert' && 'Upgrade Plan'}
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
