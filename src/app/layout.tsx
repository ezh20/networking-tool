import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/nav';

export const metadata: Metadata = {
  title: 'Nexus',
  description: 'AI-powered networking tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg">
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 ml-56 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
