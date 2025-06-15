import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Galaxy AI - AI Assistant',
  description: 'A pixel-perfect Galaxy AI built with Next.js, featuring AI chat capabilities, file uploads, and more.',
  keywords: ['ChatGPT', 'AI', 'Assistant', 'OpenAI', 'Anthropic', 'Chat'],
  authors: [{ name: 'Galaxy.ai' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Galaxy AI - AI Assistant',
    description: 'Experience the power of AI with our Galaxy AI',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

// Check if we have valid Clerk keys
const hasValidClerkKeys = 
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'your_clerk_publishable_key_here' &&
  process.env.CLERK_SECRET_KEY &&
  process.env.CLERK_SECRET_KEY !== 'your_clerk_secret_key_here';

export default function RootLayout({ children }: RootLayoutProps) {
  if (!hasValidClerkKeys) {
    // Show app without authentication until keys are properly configured
    return (
      <html lang="en" suppressHydrationWarning className={inter.variable}>
        <head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        </head>
        <body className={`${inter.className} font-sans antialiased`}>
          <ThemeProvider defaultTheme="system" storageKey="chatgpt-theme">
            <div className="relative min-h-screen bg-background">
              <div className="fixed top-4 left-4 z-50">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 shadow-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ <strong>Setup Required:</strong> Add your Clerk API keys to <code>.env.local</code>
                  </p>
                </div>
              </div>
              {children}
            </div>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#10a37f',
          colorTextOnPrimaryBackground: '#ffffff',
          borderRadius: '0.5rem',
        },
        layout: {
          socialButtonsPlacement: 'bottom',
          socialButtonsVariant: 'iconButton',
        },
        elements: {
          formButtonPrimary: 'bg-[#10a37f] hover:bg-[#0d8f6e] text-white',
          card: 'shadow-lg border border-border',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning className={inter.variable}>
        <head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        </head>
        <body className={`${inter.className} font-sans antialiased`}>
          <ThemeProvider defaultTheme="system" storageKey="chatgpt-theme">
            <div className="relative min-h-screen bg-background">
              {children}
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
} 