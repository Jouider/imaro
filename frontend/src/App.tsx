import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/router'
import '@/i18n'

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
    </QueryProvider>
  )
}
