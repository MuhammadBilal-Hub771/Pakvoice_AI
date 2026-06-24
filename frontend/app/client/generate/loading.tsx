export default function Loading() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-72 bg-gray-100 rounded" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-xl border bg-card space-y-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-8 w-24 rounded-full bg-gray-100" />
                ))}
              </div>
              <div className="h-10 w-full bg-gray-100 rounded" />
              <div className="h-20 w-full bg-gray-100 rounded" />
            </div>
          ))}
          <div className="h-14 w-full bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="hidden lg:flex flex-col items-center justify-center h-[60vh]">
          <div className="w-48 h-48 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}
