'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, MessageSquare, Zap, Settings, Upload } from 'lucide-react';
import { clsx } from 'clsx';

const links = [
  { href: '/', label: 'Dashboard', icon: Zap },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/campaigns', label: 'Campaigns', icon: Zap },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 h-screen w-56 bg-surface border-r border-border flex flex-col py-6 px-3">
      <div className="px-3 mb-8">
        <h1 className="text-lg font-semibold tracking-tight">Nexus</h1>
        <p className="text-xs text-muted mt-0.5">Networking AI</p>
      </div>
      <div className="flex flex-col gap-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-primary hover:bg-gray-50'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
