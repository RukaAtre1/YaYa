import { ChatPlayground } from "@/components/chat-playground";
import Link from "next/link";

export default function ChatPage() {
  return (
    <main className="session-shell">
      <header className="session-topbar">
        <div>
          <span className="setup-kicker">Live Session Mode</span>
          <h1>YaYa</h1>
        </div>
        <div className="session-topbar-actions">
          <Link className="setup-pill ghost" href="/">
            Back to setup
          </Link>
        </div>
      </header>

      <ChatPlayground />
    </main>
  );
}
