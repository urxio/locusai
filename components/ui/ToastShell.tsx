'use client'

import { ToastProvider } from './ToastContext'
import Toaster from './Toaster'

export default function ToastShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <Toaster />
    </ToastProvider>
  )
}
