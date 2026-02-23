'use client';

import { useState, useCallback } from 'react';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface UseExportOptions {
  chatId: string | null;
  showBookmarkedOnly: boolean;
}

export function useExport({ chatId, showBookmarkedOnly }: UseExportOptions) {
  const [exporting, setExporting] = useState(false);

  const exportChat = useCallback(
    async (format: 'markdown' | 'json' | 'text') => {
      if (!chatId) return;
      setExporting(true);

      try {
        const params = new URLSearchParams({
          format,
          bookmarked_only: showBookmarkedOnly ? 'true' : 'false',
        });
        const response = await fetch(`/api/chats/${chatId}/export?${params}`);

        if (!response.ok) throw new Error('Export failed');

        if (format === 'json') {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          downloadBlob(blob, `chat-export.json`);
        } else {
          const text = await response.text();
          const mimeType = format === 'markdown' ? 'text/markdown' : 'text/plain';
          const ext = format === 'markdown' ? 'md' : 'txt';
          const blob = new Blob([text], { type: mimeType });
          downloadBlob(blob, `chat-export.${ext}`);
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setExporting(false);
      }
    },
    [chatId, showBookmarkedOnly]
  );

  return { exporting, exportChat };
}
