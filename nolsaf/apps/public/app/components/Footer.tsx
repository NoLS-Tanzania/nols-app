export default function Footer(){
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div>Nolsaf &copy; {new Date().getFullYear()}</div>
          <div><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></div>
        </div>
      </div>
    </footer>
  )
}
