import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/router'
import { initNative } from '@/lib/native'
import '@/i18n'

export default function App() {
  useEffect(() => {
    void initNative()
  }, [])

  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
    </QueryProvider>
  )
}
