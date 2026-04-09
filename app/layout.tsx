import type { Metadata } from 'next'
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Locus — AI Life OS',
  description: 'Your AI-native life operating system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${plusJakarta.variable} h-full`}>
      <head>
        {/* Prevent flash: set theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('locus-theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  )
}
