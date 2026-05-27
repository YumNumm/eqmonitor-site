import type * as React from 'react'

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="p-6 w-full max-w-[1024px] mx-auto">{children}</div>
}
