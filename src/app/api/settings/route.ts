import { NextResponse } from 'next/server';
import { execFile } from 'child_process';

export async function GET() {
  // Check if claude CLI is available and authenticated
  return new Promise<NextResponse>((resolve) => {
    execFile(
      'claude',
      ['--version'],
      { timeout: 5000, env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/Users/ericzhang/.local/bin' } },
      (err, stdout) => {
        if (err) {
          resolve(NextResponse.json({ cliAvailable: false, version: null }));
        } else {
          resolve(NextResponse.json({ cliAvailable: true, version: stdout.trim() }));
        }
      }
    );
  });
}
