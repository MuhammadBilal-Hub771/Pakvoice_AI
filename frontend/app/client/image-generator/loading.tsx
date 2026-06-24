export default function Loading() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="animate-pulse mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
      </div>
      <div className="space-y-6">
        <div className="flex gap-2">
          <div className="h-10 w-36 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-10 w-36 rounded-lg bg-gray-100 animate-pulse" />
        </div>
        <div className="h-48 w-full bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
        <div className="p-6 rounded-xl border bg-card animate-pulse">
          <div className="w-[400px] h-[400px] max-w-full bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
