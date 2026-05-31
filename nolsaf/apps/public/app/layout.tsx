import './globals.css'
import Header from './components/Header'
import Footer from './components/Footer'
import SuspendedAccessOverlay from './components/SuspendedAccessOverlay'
import { CurrencyProvider } from '../contexts/CurrencyContext'

export const metadata = {
  title: 'Nolsaf — Public listings',
  description: 'Browse and book quality properties across Tanzania.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CurrencyProvider>
          <Header />
          <main className="container content">{children}</main>
          <Footer />
          <SuspendedAccessOverlay />
        </CurrencyProvider>
      </body>
    </html>
  )
}
