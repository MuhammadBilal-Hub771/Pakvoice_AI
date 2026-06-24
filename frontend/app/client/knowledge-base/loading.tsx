export default function Loading() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <div className="animate-pulse mb-8">
        <div className="h-8 w-56 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
      </div>
      <div className="mb-6">
        <div className="h-32 w-full border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 animate-pulse" />
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-xl border bg-card animate-pulse">
            <div className="h-8 w-8 rounded bg-gray-200 mb-3" />
            <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
            <div className="flex gap-1">
              <div className="h-5 w-16 rounded-full bg-gray-200" />
              <div className="h-5 w-12 rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
