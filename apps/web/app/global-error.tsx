'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-white">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-500 max-w-md mb-8">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <Button variant="primary" size="lg" onClick={reset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </body>
    </html>
  );
}
