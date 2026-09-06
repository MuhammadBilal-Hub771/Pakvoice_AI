import { type ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[1.65rem] font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function PageShell({
  children,
  narrow,
}: {
  children: ReactNode
  narrow?: boolean
}) {
  return (
    <div className={`mx-auto px-4 py-7 pb-24 md:px-6 md:pb-8 lg:px-8 ${narrow ? 'max-w-4xl' : 'max-w-7xl'}`}>
      {children}
    </div>
  )
}
