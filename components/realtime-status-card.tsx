import type { BackendHealth, RuntimeCapability } from "@/types/yaya";

const statusOrder: Array<keyof BackendHealth["realtime"]> = [
  "backend",
  "discordHistory",
  "discordBridge",
  "discordRelay",
  "wechatImport"
];

type RealtimeStatusCardProps = {
  health: BackendHealth | null;
};

function renderCapability(capability: RuntimeCapability, key: string) {
  return (
    <li key={key} className={`status-row status-${capability.state}`}>
      <div>
        <strong>{capability.label}</strong>
        <p>{capability.detail}</p>
      </div>
      <span>{capability.state}</span>
    </li>
  );
}

export function RealtimeStatusCard({ health }: RealtimeStatusCardProps) {
  const capabilities = health?.realtime;

  return (
    <article className="setup-card">
      <div className="setup-card-head">
        <span>03</span>
        <h2>Discord connection status</h2>
      </div>
      <p>
        Discord is the main channel route. OpenClaw stays behind the product surface as relay infrastructure.
      </p>

      {capabilities ? (
        <ul className="status-list">
          {statusOrder.map((key) => renderCapability(capabilities[key], key))}
        </ul>
      ) : (
        <div className="setup-summary">
          <strong>Checking local runtime</strong>
          <p>YaYa is waiting for backend and bridge status.</p>
        </div>
      )}
    </article>
  );
}
