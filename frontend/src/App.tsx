import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/router'
import { initNative } from '@/lib/native'
import { initDeepLinks } from '@/lib/deep-links'
import '@/i18n'

export default function App() {
  useEffect(() => {
    void initNative()
    void initDeepLinks((path) => void router.navigate(path))
  }, [])

  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster
        richColors
        position="top-center"
        offset="calc(env(safe-area-inset-top) + 8px)"
      />
    </QueryProvider>
  )
}
