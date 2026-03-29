import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getConfig } from "./config.js";
import { ServiceError } from "./errors.js";

let database;

function ensureColumn(db, tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function ensureDatabase() {
  if (database) {
    return database;
  }

  const config = getConfig();
  const databasePath = config.sqlitePath;
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS generated_sessions (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      import_format TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      source_text TEXT NOT NULL,
      normalized_messages_json TEXT NOT NULL,
      speakers_json TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      persona_json TEXT NOT NULL,
      avatar_json TEXT NOT NULL,
      avatar_model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generated_sessions_created_at ON generated_sessions (created_at DESC);
  `);
  ensureColumn(database, "generated_sessions", "discord_target_json", "TEXT");
  ensureColumn(database, "generated_sessions", "memory_summary", "TEXT");
  ensureColumn(database, "generated_sessions", "active_skills_json", "TEXT");
  ensureColumn(database, "generated_sessions", "live_messages_json", "TEXT");
  ensureColumn(database, "generated_sessions", "proactive_state_json", "TEXT");
  ensureColumn(database, "generated_sessions", "action_state_json", "TEXT");
  return database;
}

function mapRowToSession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    source: row.source,
    importFormat: row.import_format,
    threadId: row.thread_id,
    sourceText: row.source_text,
    normalizedMessages: JSON.parse(row.normalized_messages_json),
    speakers: JSON.parse(row.speakers_json),
    discordTarget: row.discord_target_json ? JSON.parse(row.discord_target_json) : null,
    profile: JSON.parse(row.profile_json),
    persona: JSON.parse(row.persona_json),
    avatar: JSON.parse(row.avatar_json),
    avatarModel: row.avatar_model,
    memorySummary: row.memory_summary ?? "",
    activeSkills: row.active_skills_json ? JSON.parse(row.active_skills_json) : [],
    liveMessages: row.live_messages_json ? JSON.parse(row.live_messages_json) : [],
    proactiveState: row.proactive_state_json ? JSON.parse(row.proactive_state_json) : null,
    actionState: row.action_state_json ? JSON.parse(row.action_state_json) : { items: [], channelContext: null },
    createdAt: row.created_at
  };
}

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveGeneratedSession(input) {
  try {
    const db = ensureDatabase();
    const now = new Date().toISOString();
    const id = input.id || createSessionId();
    const statement = db.prepare(`
      INSERT INTO generated_sessions (
        id, source, import_format, thread_id, source_text,
        normalized_messages_json, speakers_json, profile_json,
        persona_json, avatar_json, avatar_model, discord_target_json,
        memory_summary, active_skills_json, live_messages_json, proactive_state_json, action_state_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        source = excluded.source,
        import_format = excluded.import_format,
        thread_id = excluded.thread_id,
        source_text = excluded.source_text,
        normalized_messages_json = excluded.normalized_messages_json,
        speakers_json = excluded.speakers_json,
        profile_json = excluded.profile_json,
        persona_json = excluded.persona_json,
        avatar_json = excluded.avatar_json,
        avatar_model = excluded.avatar_model,
        discord_target_json = excluded.discord_target_json,
        memory_summary = excluded.memory_summary,
        active_skills_json = excluded.active_skills_json,
        live_messages_json = excluded.live_messages_json,
        proactive_state_json = excluded.proactive_state_json,
        action_state_json = excluded.action_state_json,
        updated_at = excluded.updated_at
    `);

    statement.run(
      id,
      input.source,
      input.importFormat,
      input.threadId,
      input.sourceText,
      JSON.stringify(input.normalizedMessages),
      JSON.stringify(input.speakers),
      JSON.stringify(input.profile),
      JSON.stringify(input.persona),
      JSON.stringify(input.avatar),
      input.avatarModel,
      input.discordTarget ? JSON.stringify(input.discordTarget) : null,
      input.memorySummary ?? "",
      JSON.stringify(input.activeSkills ?? []),
      JSON.stringify(input.liveMessages ?? []),
      JSON.stringify(input.proactiveState ?? null),
      JSON.stringify(input.actionState ?? { items: [], channelContext: null }),
      input.createdAt || now,
      now
    );

    return getGeneratedSessionById(id);
  } catch (error) {
    throw new ServiceError("Failed to save generated session.", {
      status: 500,
      code: "session_save_failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export function getGeneratedSessionById(id) {
  try {
    const db = ensureDatabase();
    const row = db
      .prepare("SELECT * FROM generated_sessions WHERE id = ?")
      .get(id);
    return mapRowToSession(row);
  } catch (error) {
    throw new ServiceError("Failed to read generated session.", {
      status: 500,
      code: "session_read_failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export function getLatestGeneratedSession() {
  try {
    const db = ensureDatabase();
    const row = db
      .prepare("SELECT * FROM generated_sessions ORDER BY created_at DESC LIMIT 1")
      .get();
    return mapRowToSession(row);
  } catch (error) {
    throw new ServiceError("Failed to read latest generated session.", {
      status: 500,
      code: "session_latest_failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export function getSessionStoreStatus() {
  try {
    const db = ensureDatabase();
    const countRow = db.prepare("SELECT COUNT(*) AS count FROM generated_sessions").get();
    return {
      ready: true,
      path: getConfig().sqlitePath,
      sessionCount: Number(countRow?.count ?? 0)
    };
  } catch (error) {
    return {
      ready: false,
      path: getConfig().sqlitePath,
      sessionCount: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
