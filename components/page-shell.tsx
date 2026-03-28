import Link from "next/link";
import { navItems } from "@/lib/navigation";

type PageShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
};

export function PageShell({ title, eyebrow, description, children }: PageShellProps) {
  return (
    <div className="page-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">Ya</span>
          <div>
            <strong>YaYa</strong>
            <p>Data-grown digital human</p>
          </div>
        </Link>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => (
            <Link key={item.href} className="nav-item" href={item.href}>
              <span>{item.label}</span>
              <small>{item.kicker}</small>
            </Link>
          ))}
        </nav>

        <div className="sidebar-note">
          <p>Model set</p>
          <strong>M2.7</strong>
          <strong>Gemini TTS</strong>
          <strong>Imagen 4</strong>
          <strong>Lyria 3 Clip</strong>
        </div>
      </aside>

      <main className="content">
        <header className="hero">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </main>
    </div>
  );
}
