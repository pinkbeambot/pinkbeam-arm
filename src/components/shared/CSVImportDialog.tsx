'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Loader2,
} from 'lucide-react';
import {
  parseCSV,
  validateCSVRows,
  type ColumnSchema,
  type CSVParseError,
  type ValidationResult,
} from '@/lib/csv-parser';

type ImportType = 'agents' | 'tasks';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
  columns: ColumnSchema[];
  onImport: (rows: Record<string, string>[]) => Promise<{ succeeded: number; failed: number }>;
  sampleData?: string;
}

type Step = 'upload' | 'preview' | 'importing' | 'complete';

export function CSVImportDialog({
  open,
  onOpenChange,
  type,
  columns,
  onImport,
  sampleData,
}: CSVImportDialogProps) {
  const [step, setStep] = React.useState<Step>('upload');
  const [fileName, setFileName] = React.useState('');
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [parseErrors, setParseErrors] = React.useState<CSVParseError[]>([]);
  const [validation, setValidation] = React.useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = React.useState<{ succeeded: number; failed: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const reset = React.useCallback(() => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setParseErrors([]);
    setValidation(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  }, [onOpenChange, reset]);

  const handleFileSelect = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setParseErrors([{ row: 0, message: 'Please select a CSV file' }]);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setParseErrors([{ row: 0, message: 'File size exceeds 5MB limit' }]);
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onerror = () => {
      setParseErrors([{ row: 0, message: 'Failed to read file' }]);
    };
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseCSV(text);

      setHeaders(result.headers);
      setParseErrors(result.errors);

      if (result.errors.length === 0 && result.rows.length > 0) {
        const validationResult = validateCSVRows(result.rows, columns);
        setValidation(validationResult);
        setStep('preview');
      } else if (result.rows.length === 0 && result.errors.length === 0) {
        setParseErrors([{ row: 0, message: 'CSV file contains no data rows' }]);
      }
    };
    reader.readAsText(file);
  }, [columns]);

  const handleImport = React.useCallback(async () => {
    if (!validation || validation.valid.length === 0) return;

    setStep('importing');
    try {
      const result = await onImport(validation.valid);
      setImportResult(result);
      setStep('complete');
    } catch {
      setImportResult({ succeeded: 0, failed: validation.valid.length });
      setStep('complete');
    }
  }, [validation, onImport]);

  const handleDownloadSample = React.useCallback(() => {
    if (!sampleData) return;
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample-${type}-import.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sampleData, type]);

  const requiredColumns = columns.filter(c => c.required).map(c => c.name);
  const optionalColumns = columns.filter(c => !c.required).map(c => c.name);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {type === 'agents' ? 'Agents' : 'Tasks'} from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import {type}. Max 100 rows per import.
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Expected columns info */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">Expected CSV columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {requiredColumns.map(col => (
                  <Badge key={col} variant="default" className="text-xs">{col} *</Badge>
                ))}
                {optionalColumns.map(col => (
                  <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">* Required columns</p>
            </div>

            {/* File drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
                'hover:border-primary/50 hover:bg-muted/30 transition-colors',
                parseErrors.length > 0 ? 'border-destructive' : 'border-border'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Click to select a CSV file</p>
              <p className="text-sm text-muted-foreground mt-1">
                or drag and drop (max 100 rows)
              </p>
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Parse Errors</span>
                </div>
                {parseErrors.map((err, i) => (
                  <p key={i} className="text-sm text-destructive/80">
                    {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
                  </p>
                ))}
              </div>
            )}

            {/* Sample download */}
            {sampleData && (
              <Button variant="outline" size="sm" onClick={handleDownloadSample} className="gap-2">
                <Download className="h-4 w-4" />
                Download Sample CSV
              </Button>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && validation && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                <X className="h-3 w-3" /> Change file
              </Button>
            </div>

            {/* Summary */}
            <div className="flex gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 flex-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {validation.valid.length} valid row{validation.valid.length !== 1 ? 's' : ''}
                </p>
              </div>
              {validation.invalid.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {validation.invalid.length} invalid row{validation.invalid.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="border rounded-lg overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-xs w-10">#</th>
                    {headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-xs whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {validation.valid.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-1.5 text-muted-foreground text-xs">{i + 1}</td>
                      {headers.map(h => (
                        <td key={h} className="px-3 py-1.5 max-w-40 truncate">{row[h] || '—'}</td>
                      ))}
                      <td className="px-3 py-1.5">
                        <Badge variant="secondary" className="text-xs text-emerald-600">Valid</Badge>
                      </td>
                    </tr>
                  ))}
                  {validation.valid.length > 10 && (
                    <tr>
                      <td colSpan={headers.length + 2} className="px-3 py-1.5 text-center text-muted-foreground text-xs">
                        ... and {validation.valid.length - 10} more valid rows
                      </td>
                    </tr>
                  )}
                  {validation.invalid.map((item, i) => (
                    <tr key={`invalid-${i}`} className="bg-red-50/50 dark:bg-red-950/10">
                      <td className="px-3 py-1.5 text-muted-foreground text-xs">{item.row}</td>
                      {headers.map(h => (
                        <td key={h} className="px-3 py-1.5 max-w-40 truncate">{item.data[h] || '—'}</td>
                      ))}
                      <td className="px-3 py-1.5">
                        <span className="text-xs text-destructive" title={item.errors.join('; ')}>
                          {item.errors[0]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validation.invalid.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Invalid rows will be skipped. Only valid rows will be imported.
              </p>
            )}
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Importing {validation?.valid.length || 0} {type}...
            </p>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && importResult && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              {importResult.succeeded > 0 ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              ) : (
                <AlertCircle className="h-12 w-12 text-destructive" />
              )}
              <div className="text-center">
                <p className="font-semibold text-lg">Import Complete</p>
                <p className="text-muted-foreground mt-1">
                  {importResult.succeeded} of {importResult.succeeded + importResult.failed} {type} imported successfully.
                </p>
                {importResult.failed > 0 && (
                  <p className="text-sm text-destructive mt-1">
                    {importResult.failed} failed — check for duplicate names or invalid data.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={!validation || validation.valid.length === 0}
              >
                Import {validation?.valid.length || 0} {type}
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sample CSV data generators

export const AGENT_SAMPLE_CSV = `name,role,description,capabilities,model
Research Assistant,worker,Handles research tasks and summarization,decide;access_external,gpt-4
Task Manager,manager,Coordinates work between agents,spawn;delegate;decide,claude-3-opus
Content Writer,specialist,Creates blog posts and marketing copy,access_external,gpt-4
Data Analyst,worker,Analyzes data and generates reports,decide;access_external,claude-3-sonnet`;

export const TASK_SAMPLE_CSV = `title,description,priority,type
Review Q1 metrics,Analyze and summarize Q1 performance data,high,analysis
Write blog post,Create a blog post about AI productivity,normal,content
Update documentation,Refresh API docs with new endpoints,low,documentation
Deploy staging build,Push latest changes to staging environment,urgent,deployment`;
