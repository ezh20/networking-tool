#!/usr/bin/env npx tsx
/**
 * WeChat iOS Backup Exporter
 *
 * Extracts WeChat chat history from an unencrypted iPhone backup
 * (created via Finder/iTunes) and outputs JSON compatible with
 * the networking-tool import API.
 *
 * Usage:
 *   pnpm wechat-export                          # auto-detect backup
 *   pnpm wechat-export -- --backup /path/to/backup
 *   pnpm wechat-export -- --list-backups         # list available backups
 *   pnpm wechat-export -- --list-accounts        # list WeChat accounts in backup
 *   pnpm wechat-export -- --out ./export.json    # save to file
 *   pnpm wechat-export -- --import               # import directly into networking-tool DB
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Types ──────────────────────────────────────────────────────────

interface ExportedChat {
  contactName: string;
  contactId: string; // WeChat username
  messages: {
    sender: 'me' | 'them';
    content: string;
    timestamp: string; // ISO
  }[];
}

interface ManifestRow {
  fileID: string;
  domain: string;
  relativePath: string;
}

// ── Backup discovery ───────────────────────────────────────────────

const BACKUP_DIRS = [
  path.join(os.homedir(), 'Library/Application Support/MobileSync/Backup'),
  // Relocated backups (external drives, etc.)
];

function findBackups(): { id: string; path: string; date: Date }[] {
  const results: { id: string; path: string; date: Date }[] = [];

  for (const dir of BACKUP_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      const backupPath = path.join(dir, entry);
      const manifestPath = path.join(backupPath, 'Manifest.db');
      if (fs.existsSync(manifestPath)) {
        const stat = fs.statSync(manifestPath);
        results.push({ id: entry, path: backupPath, date: stat.mtime });
      }
    }
  }

  return results.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ── Manifest parsing ───────────────────────────────────────────────

function openManifest(backupPath: string): Database.Database {
  const manifestPath = path.join(backupPath, 'Manifest.db');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest.db not found at ${manifestPath}`);
  }
  return new Database(manifestPath, { readonly: true });
}

function findWeChatFiles(manifest: Database.Database): ManifestRow[] {
  const rows = manifest.prepare(`
    SELECT fileID, domain, relativePath
    FROM Files
    WHERE domain = 'AppDomain-com.tencent.xin'
    AND relativePath LIKE '%/DB/MM.sqlite'
  `).all() as ManifestRow[];
  return rows;
}

function findWeChatContactDB(manifest: Database.Database): ManifestRow[] {
  const rows = manifest.prepare(`
    SELECT fileID, domain, relativePath
    FROM Files
    WHERE domain = 'AppDomain-com.tencent.xin'
    AND (relativePath LIKE '%/DB/WCDB_Contact.sqlite' OR relativePath LIKE '%/DB/wccontact_new2.db')
  `).all() as ManifestRow[];
  return rows;
}

function listWeChatAccounts(manifest: Database.Database): string[] {
  const rows = manifest.prepare(`
    SELECT DISTINCT relativePath
    FROM Files
    WHERE domain = 'AppDomain-com.tencent.xin'
    AND relativePath LIKE '%/DB/MM.sqlite'
  `).all() as { relativePath: string }[];

  return rows.map(r => {
    const parts = r.relativePath.split('/');
    // Documents/<hash>/DB/MM.sqlite -> extract <hash>
    const docIdx = parts.indexOf('Documents');
    return docIdx >= 0 && parts.length > docIdx + 1 ? parts[docIdx + 1] : r.relativePath;
  });
}

// ── Database file resolution ───────────────────────────────────────

function resolveFile(backupPath: string, fileID: string): string {
  // iOS backups store files as <first2chars>/<fileID>
  const subdir = fileID.substring(0, 2);
  const filePath = path.join(backupPath, subdir, fileID);
  if (fs.existsSync(filePath)) return filePath;

  // Some backups store flat
  const flatPath = path.join(backupPath, fileID);
  if (fs.existsSync(flatPath)) return flatPath;

  throw new Error(`Backup file not found: ${fileID} (tried ${filePath} and ${flatPath})`);
}

// ── Contact name resolution ────────────────────────────────────────

function loadContactNames(backupPath: string, manifest: Database.Database): Map<string, string> {
  const names = new Map<string, string>();

  const contactFiles = findWeChatContactDB(manifest);
  for (const cf of contactFiles) {
    try {
      const dbPath = resolveFile(backupPath, cf.fileID);
      const db = new Database(dbPath, { readonly: true });

      // Try WCDB_Contact.sqlite schema
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const tableNames = tables.map(t => t.name);

      if (tableNames.includes('Friend')) {
        const friends = db.prepare(`
          SELECT UsrName, NickName, ConRemark
          FROM Friend
          WHERE NickName IS NOT NULL AND NickName != ''
        `).all() as { UsrName: string; NickName: string; ConRemark: string | null }[];

        for (const f of friends) {
          names.set(f.UsrName, f.ConRemark || f.NickName);
        }
      }

      if (tableNames.includes('WCContact')) {
        const contacts = db.prepare(`
          SELECT m_nsUsrName, m_nsNickName, m_nsRemark
          FROM WCContact
          WHERE m_nsNickName IS NOT NULL AND m_nsNickName != ''
        `).all() as { m_nsUsrName: string; m_nsNickName: string; m_nsRemark: string | null }[];

        for (const c of contacts) {
          names.set(c.m_nsUsrName, c.m_nsRemark || c.m_nsNickName);
        }
      }

      db.close();
    } catch {
      // Contact DB might be encrypted or different format, skip
    }
  }

  return names;
}

// ── Message extraction ─────────────────────────────────────────────

function extractMessages(backupPath: string, mmFileID: string, contactNames: Map<string, string>): ExportedChat[] {
  const dbPath = resolveFile(backupPath, mmFileID);
  const db = new Database(dbPath, { readonly: true });

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const chatTables = tables
    .map(t => t.name)
    .filter(n => n.startsWith('Chat_'));

  const chats: ExportedChat[] = [];

  for (const tableName of chatTables) {
    try {
      // Chat_ tables have: CreateTime, Message, Des (0=sent, 1=received), Type
      const columns = db.prepare(`PRAGMA table_info('${tableName}')`).all() as { name: string }[];
      const colNames = columns.map(c => c.name);

      // Need at minimum CreateTime, Message, Des
      if (!colNames.includes('CreateTime') || !colNames.includes('Message')) continue;

      const hasDesColumn = colNames.includes('Des');
      const hasMesSvrIDColumn = colNames.includes('MesSvrID');

      const rows = db.prepare(`
        SELECT
          CreateTime,
          Message,
          ${hasDesColumn ? 'Des' : '0 as Des'},
          Type
        FROM '${tableName}'
        WHERE Type = 1 AND Message IS NOT NULL AND Message != ''
        ORDER BY CreateTime ASC
      `).all() as { CreateTime: number; Message: string; Des: number; Type: number }[];

      if (rows.length === 0) continue;

      // Extract contact ID from table name: Chat_<hash>
      // The hash corresponds to a chatroom or contact
      const chatHash = tableName.replace('Chat_', '');

      // Try to find the contact name from messages or contact DB
      let contactName = contactNames.get(chatHash) || '';

      // If no name from contacts DB, try to find from the chat table's metadata
      if (!contactName) {
        // Check if there's a corresponding entry in any identifiable way
        // Fall back to the hash
        contactName = `WeChat Contact (${chatHash.substring(0, 8)})`;
      }

      // Skip group chats (chatroom IDs contain @chatroom)
      // We can detect them by checking if the hash resolves to a chatroom
      // For now, include all and let the user filter

      const messages = rows.map(row => ({
        sender: (row.Des === 0 ? 'me' : 'them') as 'me' | 'them',
        content: row.Message,
        timestamp: new Date(row.CreateTime * 1000).toISOString(),
      }));

      chats.push({
        contactName,
        contactId: chatHash,
        messages,
      });
    } catch {
      // Some tables might have different schemas, skip
    }
  }

  db.close();

  // Sort by message count descending
  return chats.sort((a, b) => b.messages.length - a.messages.length);
}

// ── Import into networking-tool ────────────────────────────────────

async function importToNetworkingTool(chats: ExportedChat[], myName: string) {
  const apiBase = 'http://127.0.0.1:3000';

  let imported = 0;
  let skipped = 0;

  for (const chat of chats) {
    if (chat.messages.length === 0) continue;

    // Format as the import API expects
    const formatted = chat.messages.map(m => {
      const date = new Date(m.timestamp);
      const dateStr = date.toISOString().replace('T', ' ').substring(0, 19);
      const sender = m.sender === 'me' ? myName : chat.contactName;
      return `[${dateStr}] ${sender}: ${m.content}`;
    }).join('\n');

    try {
      const res = await fetch(`${apiBase}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'wechat',
          content: formatted,
          myName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`  Imported: ${chat.contactName} (${data.messagesCreated} new messages)`);
        imported++;
      } else {
        console.log(`  Failed: ${chat.contactName} - ${res.status}`);
        skipped++;
      }
    } catch (err) {
      console.log(`  Error: ${chat.contactName} - ${err}`);
      skipped++;
    }
  }

  console.log(`\nDone: ${imported} contacts imported, ${skipped} skipped`);
}

// ── CLI ────────────────────────────────────────────────────────────

function printUsage() {
  console.log(`
WeChat iOS Backup Exporter

Usage:
  pnpm wechat-export                             Auto-detect backup, export JSON to stdout
  pnpm wechat-export -- --list-backups            List available iPhone backups
  pnpm wechat-export -- --list-accounts           List WeChat accounts found in backup
  pnpm wechat-export -- --backup /path/to/backup  Use specific backup directory
  pnpm wechat-export -- --out ./export.json       Save export to file
  pnpm wechat-export -- --import --my-name "Eric" Import directly into networking-tool

Options:
  --backup <path>     Path to iPhone backup directory
  --out <path>        Output file path (default: stdout)
  --import            Import directly into networking-tool (requires dev server running)
  --my-name <name>    Your name as it appears in chats (required for --import)
  --list-backups      List available backups and exit
  --list-accounts     List WeChat accounts in the backup
  --min-messages <n>  Only export chats with at least n messages (default: 1)
  --help              Show this help
`);
}

async function main() {
  const args = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { printUsage(); process.exit(0); }
    if (arg === '--list-backups') { flags.listBackups = true; continue; }
    if (arg === '--list-accounts') { flags.listAccounts = true; continue; }
    if (arg === '--import') { flags.import = true; continue; }
    if (arg === '--backup' && args[i + 1]) { flags.backup = args[++i]; continue; }
    if (arg === '--out' && args[i + 1]) { flags.out = args[++i]; continue; }
    if (arg === '--my-name' && args[i + 1]) { flags.myName = args[++i]; continue; }
    if (arg === '--min-messages' && args[i + 1]) { flags.minMessages = args[++i]; continue; }
  }

  // List backups
  if (flags.listBackups) {
    const backups = findBackups();
    if (backups.length === 0) {
      console.log('No iPhone backups found.');
      console.log('Create one: open Finder, connect iPhone, click "Back Up Now" (unencrypted).');
      console.log(`Expected location: ~/Library/Application Support/MobileSync/Backup/`);
    } else {
      console.log('Available iPhone backups:\n');
      for (const b of backups) {
        console.log(`  ${b.id}`);
        console.log(`    Path: ${b.path}`);
        console.log(`    Date: ${b.date.toLocaleString()}`);
        console.log();
      }
    }
    process.exit(0);
  }

  // Resolve backup path
  let backupPath: string;
  if (flags.backup) {
    backupPath = flags.backup as string;
    if (!fs.existsSync(path.join(backupPath, 'Manifest.db'))) {
      console.error(`Error: No Manifest.db found in ${backupPath}`);
      console.error('Make sure this is an iPhone backup directory.');
      process.exit(1);
    }
  } else {
    const backups = findBackups();
    if (backups.length === 0) {
      console.error('No iPhone backups found.');
      console.error('');
      console.error('To create one:');
      console.error('  1. Connect your iPhone to your Mac via USB');
      console.error('  2. Open Finder and select your iPhone in the sidebar');
      console.error('  3. Under "Backups", select "Back up all of the data on your iPhone to this Mac"');
      console.error('  4. UNCHECK "Encrypt local backup" (required for WeChat access)');
      console.error('  5. Click "Back Up Now" and wait');
      console.error('');
      console.error(`Backups will appear in: ~/Library/Application Support/MobileSync/Backup/`);
      process.exit(1);
    }
    backupPath = backups[0].path;
    console.error(`Using most recent backup: ${backups[0].id} (${backups[0].date.toLocaleString()})`);
  }

  // Open manifest
  const manifest = openManifest(backupPath);

  // List accounts
  if (flags.listAccounts) {
    const accounts = listWeChatAccounts(manifest);
    if (accounts.length === 0) {
      console.log('No WeChat accounts found in this backup.');
      console.log('Make sure WeChat is installed on the iPhone and the backup is unencrypted.');
    } else {
      console.log('WeChat accounts found:\n');
      accounts.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    }
    manifest.close();
    process.exit(0);
  }

  // Find WeChat message databases
  const mmFiles = findWeChatFiles(manifest);
  if (mmFiles.length === 0) {
    console.error('No WeChat message databases (MM.sqlite) found in this backup.');
    console.error('');
    console.error('Possible reasons:');
    console.error('  - The backup is encrypted. Re-create it with "Encrypt local backup" UNCHECKED.');
    console.error('  - WeChat is not installed on the iPhone.');
    console.error('  - The backup is from a very old iOS version with a different WeChat data layout.');
    manifest.close();
    process.exit(1);
  }

  console.error(`Found ${mmFiles.length} WeChat account(s)`);

  // Load contact names
  console.error('Loading contacts...');
  const contactNames = loadContactNames(backupPath, manifest);
  console.error(`Loaded ${contactNames.size} contact names`);

  // Extract messages from all accounts
  const allChats: ExportedChat[] = [];
  for (const mmFile of mmFiles) {
    console.error(`Extracting messages from ${mmFile.relativePath}...`);
    try {
      const chats = extractMessages(backupPath, mmFile.fileID, contactNames);
      allChats.push(...chats);
    } catch (err) {
      console.error(`  Error reading ${mmFile.relativePath}: ${err}`);
      if (String(err).includes('encrypted') || String(err).includes('not a database')) {
        console.error('  This database appears to be encrypted. The iPhone backup must be UNENCRYPTED.');
      }
    }
  }

  manifest.close();

  const minMessages = Number(flags.minMessages) || 1;
  const filtered = allChats.filter(c => c.messages.length >= minMessages);

  console.error(`\nExtracted ${filtered.length} chats (${allChats.reduce((n, c) => n + c.messages.length, 0)} total messages)`);

  if (filtered.length === 0) {
    console.error('No chats found. The database may be empty or in an unexpected format.');
    process.exit(1);
  }

  // Print summary
  console.error('\nTop chats by message count:');
  for (const chat of filtered.slice(0, 20)) {
    console.error(`  ${chat.contactName}: ${chat.messages.length} messages`);
  }

  // Import mode
  if (flags.import) {
    if (!flags.myName) {
      console.error('\nError: --my-name is required for import mode.');
      console.error('Usage: pnpm wechat-export -- --import --my-name "Your Name"');
      process.exit(1);
    }
    console.error(`\nImporting ${filtered.length} chats into networking-tool...`);
    await importToNetworkingTool(filtered, flags.myName as string);
    process.exit(0);
  }

  // Output mode
  const output = JSON.stringify(filtered, null, 2);
  if (flags.out) {
    fs.writeFileSync(flags.out as string, output);
    console.error(`\nExported to ${flags.out}`);
  } else {
    console.log(output);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err}`);
  process.exit(1);
});
