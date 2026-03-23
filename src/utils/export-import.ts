import type { RequestConfig, CollectionItem } from '../types';

export interface ExportData {
  version: string;
  timestamp: number;
  collections: CollectionItem[];
  environments?: Record<string, Record<string, string>>;
}

export async function exportToFile(data: ExportData, filename: string): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importFromFile(): Promise<ExportData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as ExportData;
          resolve(data);
        } catch (error) {
          console.error('Failed to parse import file:', error);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };

    input.oncancel = () => resolve(null);

    input.click();
  });
}

export function exportRequestToCurl(request: RequestConfig): string {
  let curl = `curl -X ${request.method}`;

  // Add headers
  if (request.headers && request.headers.length > 0) {
    request.headers.forEach((header) => {
      if (header.enabled) {
        curl += ` \\\n  -H "${header.key}: ${header.value}"`;
      }
    });
  }

  // Add body
  if (request.body) {
    if (request.bodyType === 'json' && request.body.json) {
      curl += ` \\\n  -d '${request.body.json}'`;
    } else if (request.bodyType === 'raw' && request.body.raw) {
      curl += ` \\\n  -d '${request.body.raw}'`;
    } else if (request.bodyType === 'urlencoded' && request.body.urlencoded) {
      const params = request.body.urlencoded
        .filter((p) => p.enabled)
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      curl += ` \\\n  -d '${params}'`;
    } else if (request.bodyType === 'form-data' && request.body.form) {
      request.body.form.forEach((field) => {
        if (field.enabled) {
          curl += ` \\\n  -F "${field.key}=${field.value}"`;
        }
      });
    }
  }

  // Add URL with query parameters
  let url = request.url;
  if (request.queryParams && request.queryParams.length > 0) {
    const params = request.queryParams
      .filter((p) => p.enabled)
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    if (params) {
      url += (url.includes('?') ? '&' : '?') + params;
    }
  }

  curl += ` \\\n  "${url}"`;

  return curl;
}

export async function exportToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
