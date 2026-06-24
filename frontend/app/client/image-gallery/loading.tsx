export default function Loading() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <div className="animate-pulse mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
      </div>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="h-10 w-full max-w-md bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
            <div style={{ aspectRatio: '1/1', background: '#f3f4f6' }} />
            <div className="p-3 space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded-full" />
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
