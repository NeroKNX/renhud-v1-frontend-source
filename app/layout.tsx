import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'REN',
  description: 'Una presencia que aprende contigo. Documentos, ideas, decisiones — procesa lo que le tires y devuelve criterio.',
  generator: 'Renhud',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  width: 'device-width',
  initialScale: 1,
}

const themeScript = `
  try {
    var prefs = JSON.parse(sessionStorage.getItem('ren_preferences') || '{}');
    var theme = prefs.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (theme !== 'dark') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0c' : '#f8fafc');
  } catch(e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased ren-bg-primary`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
