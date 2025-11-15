import './globals.css'
import Header from './components/Header'
import Footer from './components/Footer'

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
      </body>
    </html>
  )
}
