export function Loader({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 h-screen ${className}`}
    >
      <div className="h-2 w-2 animate-bounce rounded-full bg-black [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 animate-bounce rounded-full bg-black [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 animate-bounce rounded-full bg-black"></div>
    </div>
  );
}
