import "./globals.css";
import NavAuth from "./components/NavAuth";

export const metadata = {
  title: "Velvet — the next line, found",
  description: "Paste the conversation you're already having. Get one good line back.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-nav">
          <nav className="nav-inner wrap">
            <a href="/" className="brand">Velvet</a>
            <div className="nav-links">
              <a href="/#how">How it works</a>
              <a href="/#features">Why</a>
              <a href="/#pricing">Pricing</a>
            </div>
            <NavAuth />
          </nav>
        </header>

        <div className="wrap">
          {children}
        </div>

        <footer className="site-footer">
          <div className="wrap footer-inner">
            <span className="footer-brand">Velvet</span>
            <span className="footer-tag">written between the lines, sent as your own</span>
            <div className="footer-links">
              <a href="/#how">How it works</a>
              <a href="/#pricing">Pricing</a>
              <a href="/dashboard?mode=login">Log in</a>
              <a href="/dashboard?mode=signup">Create account</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
