export default function StorefrontLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-gray-200">
            <div className="aspect-square w-full bg-gray-200" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
