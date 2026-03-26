import { ParsedChat } from '../types';

/**
 * Parse LinkedIn messages export (CSV format from data download).
 * LinkedIn exports messages as CSV with columns:
 *   CONVERSATION ID, CONVERSATION TITLE, FROM, SENDER PROFILE URL, DATE, SUBJECT, CONTENT
 */
export function parseLinkedInMessages(csvText: string, myName: string): ParsedChat[] {
  const contacts = new Map<string, ParsedChat>();
  const lines = csvText.split('\n');

  // Skip header
  const header = lines[0];
  if (!header) return [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length < 7) continue;

    const [, , from, profileUrl, date, , content] = row;
    if (!from || !content) continue;

    const senderName = from.trim();
    const isMe = senderName === myName;
    const contactName = isMe ? '' : senderName;

    if (!contactName && !isMe) continue;

    if (!isMe) {
      if (!contacts.has(contactName)) {
        contacts.set(contactName, {
          contactName,
          platformId: profileUrl?.trim(),
          messages: [],
        });
      }
      contacts.get(contactName)!.messages.push({
        sender: 'them',
        content: content.trim(),
        timestamp: new Date(date),
      });
    } else {
      // Find the contact in this conversation
      // For simplicity, attach to the last non-me contact seen
      const lastContact = Array.from(contacts.values()).pop();
      if (lastContact) {
        lastContact.messages.push({
          sender: 'me',
          content: content.trim(),
          timestamp: new Date(date),
        });
      }
    }
  }

  return Array.from(contacts.values());
}

/**
 * Parse a LinkedIn profile page (text dump or JSON).
 * Returns partial contact info.
 */
export function parseLinkedInProfile(text: string): {
  name: string;
  headline?: string;
  company?: string;
  location?: string;
  summary?: string;
} {
  // Try JSON format first
  try {
    const data = JSON.parse(text);
    return {
      name: data.name || data.firstName + ' ' + data.lastName || '',
      headline: data.headline || data.title,
      company: data.company || data.positions?.[0]?.companyName,
      location: data.location || data.locationName,
      summary: data.summary,
    };
  } catch {
    // Fall back to text parsing
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  return {
    name: lines[0] || 'Unknown',
    headline: lines[1],
    company: lines.find(l => /company|at\s/i.test(l)),
    location: lines.find(l => /location|area|city/i.test(l)),
    summary: lines.slice(2).join(' ').substring(0, 500),
  };
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
