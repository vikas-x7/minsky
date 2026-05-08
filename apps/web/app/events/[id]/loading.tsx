import { Loader } from '@/components/Loader';

export default function EventDetailLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader />
    </div>
  );
}
