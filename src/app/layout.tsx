import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sync-up',
  description: 'Sync-up Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

