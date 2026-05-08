import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-14">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">
          <div>
            <h2 className="text-6xl md:text-5xl font-bold -tracking-[1px] text-black">
              Tickflow
            </h2>
          </div>

          <div className="flex flex-wrap gap-8 md:gap-12 text-[14px] text-gray-700 font-medium">
            <Link href="/events" className="hover:text-black transition-colors">
              Events
            </Link>

            <Link
              href="/my-bookings"
              className="hover:text-black transition-colors"
            >
              Bookings
            </Link>

            <Link
              href="/pricing"
              className="hover:text-black transition-colors"
            >
              Pricing
            </Link>

            <Link href="/about" className="hover:text-black transition-colors">
              About
            </Link>

            <Link
              href="/support"
              className="hover:text-black transition-colors"
            >
              Help center
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-sm text-gray-700">
          <p>© {new Date().getFullYear()} Tickflow. All rights reserved.</p>

          <div className="flex items-center gap-8">
            <Link href="/terms" className="hover:text-black transition-colors">
              Terms of Service
            </Link>

            <Link
              href="/privacy"
              className="hover:text-black transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
