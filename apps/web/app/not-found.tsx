import Link from 'next/link';
import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <FileX className="w-10 h-10 text-gray-400" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-gray-500 max-w-md mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/">
        <Button variant="primary" size="lg">
          Go Home
        </Button>
      </Link>
    </div>
  );
}
