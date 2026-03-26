import { ParsedChat } from '../types';

/**
 * Parse WeChat exported chat history.
 * Supports the standard WeChat export format:
 *   2024-01-15 10:30:22 ContactName
 *   Message content here
 *
 * Also supports the format:
 *   [2024-01-15 10:30:22] ContactName: Message content
 */
export function parseWeChatExport(text: string, myName: string): ParsedChat[] {
  const contacts = new Map<string, ParsedChat>();

  // Try format 1: bracketed timestamps
  const bracketPattern = /\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+(.+?):\s+([\s\S]*?)(?=\[\d{4}|$)/g;
  let match;
  let matchCount = 0;

  while ((match = bracketPattern.exec(text)) !== null) {
    matchCount++;
    const timestamp = new Date(match[1]);
    const senderName = match[2].trim();
    const content = match[3].trim();
    if (!content) continue;

    const isMe = senderName === myName;
    const contactName = isMe ? '' : senderName;

    if (!contactName && !isMe) continue;

    // For messages I sent, we need to figure out who the contact is from context
    // For now, skip "me" messages that don't have a clear contact
    if (!isMe) {
      if (!contacts.has(contactName)) {
        contacts.set(contactName, {
          contactName,
          messages: [],
        });
      }
      contacts.get(contactName)!.messages.push({
        sender: 'them',
        content,
        timestamp,
      });
    }
  }

  // Try format 2: line-based (WeChat desktop export)
  if (matchCount === 0) {
    const lines = text.split('\n');
    let currentSender = '';
    let currentTimestamp = new Date();
    let currentContact = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match timestamp + sender line: "2024-01-15 10:30:22 SenderName"
      const headerMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.+)$/);
      if (headerMatch) {
        currentTimestamp = new Date(headerMatch[1]);
        currentSender = headerMatch[2].trim();
        const isMe = currentSender === myName;
        if (!isMe) {
          currentContact = currentSender;
        }
        continue;
      }

      // Content line
      if (line && currentSender && currentContact) {
        const isMe = currentSender === myName;
        if (!contacts.has(currentContact)) {
          contacts.set(currentContact, {
            contactName: currentContact,
            messages: [],
          });
        }
        contacts.get(currentContact)!.messages.push({
          sender: isMe ? 'me' : 'them',
          content: line,
          timestamp: currentTimestamp,
        });
      }
    }
  }

  // Try format 3: simple "Name: message" per line
  if (contacts.size === 0) {
    const simpleLines = text.split('\n');
    for (const line of simpleLines) {
      const simpleMatch = line.match(/^(.+?):\s+(.+)$/);
      if (simpleMatch) {
        const senderName = simpleMatch[1].trim();
        const content = simpleMatch[2].trim();
        const isMe = senderName === myName;
        const contactName = isMe ? '__pending__' : senderName;

        if (!isMe && contactName) {
          if (!contacts.has(contactName)) {
            contacts.set(contactName, {
              contactName,
              messages: [],
            });
          }
          contacts.get(contactName)!.messages.push({
            sender: 'them',
            content,
            timestamp: new Date(),
          });
        } else if (isMe && contacts.size > 0) {
          // Attach to the last known contact
          const lastContact = Array.from(contacts.values()).pop()!;
          lastContact.messages.push({
            sender: 'me',
            content,
            timestamp: new Date(),
          });
        }
      }
    }
  }

  contacts.delete('__pending__');
  return Array.from(contacts.values());
}
