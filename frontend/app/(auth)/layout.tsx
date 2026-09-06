'use client'

import { Notifications } from '@/components/shared/Notifications'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Notifications />
      {children}
    </>
  )
}
