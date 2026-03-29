import argparse
import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone


def normalize_timestamp(value):
    if value is None:
        return datetime.now(timezone.utc).isoformat()

    try:
        numeric = int(value)
        if numeric > 10_000_000_000:
            numeric = numeric / 1000
        return datetime.fromtimestamp(numeric, tz=timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def read_friends(cursor):
    cursor.execute("select * from friend where type != 4 and type != 6")
    friends = []
    for row in cursor.fetchall():
        user_name = row[1]
        nick_name = row[2] or ""
        remark_name = row[8] or ""
        display_name = nick_name
        if remark_name and not remark_name.startswith("\n\0"):
            marker_index = remark_name.find(chr(0x12))
            if marker_index > 2:
                display_name = remark_name[2:marker_index]
        elif remark_name and len(remark_name.strip("\x00")) > 0:
            display_name = remark_name.strip("\x00")

        friends.append(
            {
                "user_name": user_name,
                "display_name": display_name or nick_name or user_name,
            }
        )

    return friends


def choose_friend(friends, contact_name=None, contact_id=None):
    if contact_id:
        for friend in friends:
            if friend["user_name"] == contact_id:
                return friend

    if contact_name:
        lowered = contact_name.lower()
        for friend in friends:
            if friend["display_name"].lower() == lowered or friend["user_name"].lower() == lowered:
                return friend

    if len(friends) == 1:
        return friends[0]

    raise SystemExit(
        json.dumps(
            {
                "error": "contact_not_resolved",
                "message": "Multiple WeChat contacts were found. Pass --contact-name or --contact-id.",
                "contacts": friends,
            }
        )
    )


def extract_messages(connection, friend):
    cursor = connection.cursor()
    table = "Chat_" + hashlib.md5(friend["user_name"].encode("utf-8")).hexdigest()
    cursor.execute(f"select CreateTime, MesLocalID, Message, Type, Des from {table} order by CreateTime asc")

    rows = []
    for create_time, local_id, message, message_type, direction in cursor.fetchall():
        if message_type != 1:
            continue

        speaker_name = "Me" if int(direction) == 0 else friend["display_name"]
        speaker_id = "me" if int(direction) == 0 else friend["user_name"]
        rows.append(
            {
                "id": f"{table}-{local_id}",
                "threadId": table,
                "speakerId": speaker_id,
                "speakerName": speaker_name,
                "timestamp": normalize_timestamp(create_time),
                "text": message or "",
                "source": "wechat",
            }
        )

    return {
        "source": "wechat",
        "detectedFormat": "wechat_history_sqlite",
        "threadId": table,
        "transcript": "\n".join(f"{row['speakerName']}: {row['text']}" for row in rows),
        "rows": rows,
        "speakers": list(dict.fromkeys(row["speakerName"] for row in rows)),
        "warnings": [],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--contact-name")
    parser.add_argument("--contact-id")
    parser.add_argument("--list-contacts", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        raise SystemExit(
            json.dumps({"error": "db_missing", "message": f"WeChatHistory database not found: {args.db}"})
        )

    connection = sqlite3.connect(args.db)
    try:
        cursor = connection.cursor()
        friends = read_friends(cursor)
        if not friends:
            raise SystemExit(json.dumps({"error": "friend_table_empty", "message": "No WeChat contacts were found."}))
        if args.list_contacts:
            print(json.dumps({"contacts": friends}, ensure_ascii=False))
            return
        friend = choose_friend(friends, args.contact_name, args.contact_id)
        result = extract_messages(connection, friend)
        if not result["rows"]:
            raise SystemExit(
                json.dumps(
                    {
                        "error": "wechat_history_empty",
                        "message": "The selected WeChatHistory conversation did not contain any text messages."
                    }
                )
            )
        print(json.dumps(result, ensure_ascii=False))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
