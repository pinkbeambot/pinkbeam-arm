'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice } from '@/types/billing';

interface InvoiceTableProps {
  invoices: Invoice[];
}

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'Paid', variant: 'default' },
  open: { label: 'Open', variant: 'secondary' },
  draft: { label: 'Draft', variant: 'outline' },
  uncollectible: { label: 'Uncollectible', variant: 'destructive' },
  void: { label: 'Void', variant: 'outline' },
};

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No invoices yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const status = STATUS_STYLES[invoice.status] || { label: invoice.status, variant: 'outline' as const };
          return (
            <TableRow key={invoice.id}>
              <TableCell className="text-sm">
                {formatDate(invoice.paidAt || invoice.createdAt)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {invoice.periodStart && invoice.periodEnd
                  ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`
                  : '—'}
              </TableCell>
              <TableCell className="text-sm font-medium">
                {formatCurrency(invoice.amountDue / 100)}
              </TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {invoice.invoicePdfUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={invoice.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {invoice.hostedInvoiceUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
