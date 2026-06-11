import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
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
  themeColor: '#0B0E14',
  width: 'device-width',
  initialScale: 1,
}

const themeScript = `
  try {
    var raw = localStorage.getItem('ren_preferences') || sessionStorage.getItem('ren_preferences') || '{}';
    var prefs = JSON.parse(raw);
    var theme = prefs.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (theme !== 'dark') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0E14' : '#f8fafc');
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased ren-bg-primary`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
