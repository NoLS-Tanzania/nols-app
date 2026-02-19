import './globals.css'
import Header from './components/Header'
import Footer from './components/Footer'
import SuspendedAccessOverlay from './components/SuspendedAccessOverlay'

export const metadata = {
  title: 'Nolsaf — Public listings',
  description: 'Browse and book quality properties across Tanzania.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
  <main className="container content">{children}</main>
        <Footer />
        <SuspendedAccessOverlay />
      </body>
    </html>
  )
}
