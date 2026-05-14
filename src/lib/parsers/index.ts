import { parseXmlBatch } from './xmlParser';
import { parseJsonBatch } from './jsonParser';

export type BatchFormat = 'xml' | 'json';

export function detectFormat(filename: string, content: string): BatchFormat {
  if (filename.toLowerCase().endsWith('.xml')) return 'xml';
  if (filename.toLowerCase().endsWith('.json')) return 'json';
  // Fallback: sniff content
  return content.trimStart().startsWith('<') ? 'xml' : 'json';
}

export { parseXmlBatch, parseJsonBatch };
