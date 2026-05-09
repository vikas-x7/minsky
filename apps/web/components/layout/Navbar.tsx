'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Asterisk, Ticket } from 'lucide-react';
import { useState } from 'react';

const navLinks = [{ href: '/my-bookings', label: 'My Bookings' }];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className=" mb-5 sticky top-0 z-50 bg-white border-b border-white/20 w-full md:mb-1">
      <nav className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 ">
          <div className="flex justify-center items-center gap-2">
            <Link
              href="/events"
              className="flex items-center  group"
              onClick={() => setMobileOpen(false)}
            >
              <span className="text-[#DC354B] ">
                <Ticket size={28} />
              </span>
            </Link>

            <h1 className="text-[1px] md:text-[20px] font-medium text-black -tracking-[1px] mt-1">
              Ticket Flow
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-5 ">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-3 py-2 rounded-[5px]  text-sm font-medium transition-all duration-200 -tracking-[1px] text-white bg-[#DC354B]
                    ${isActive ? 'ring-2 ring-[#DD41C6]/20' : ''}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden   border-t border-gray-100 py-4 space-y-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                pathname.startsWith(link.href + '/events');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    block px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </header>
  );
}
