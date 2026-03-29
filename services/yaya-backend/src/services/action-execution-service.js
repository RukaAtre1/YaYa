const ACTION_ITEM_LIMIT = 14;

const INTENT_ALIASES = {
  plan_sprint: "plan_sprint",
  sprint_plan: "plan_sprint",
  study_plan: "study_plan",
  study_sprint: "study_plan",
  research_brief: "research_brief",
  resource_hunt: "research_brief",
  draft_reply: "draft_reply",
  draft_message: "draft_reply",
  follow_up_reminder: "follow_up_reminder",
  follow_up: "follow_up_reminder",
  drink_water: "drink_water",
  sleep_nudge: "sleep_nudge",
  discord_relay: "discord_relay"
};

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addMinutes(isoString, minutes) {
  return new Date(new Date(isoString).getTime() + minutes * 60 * 1000).toISOString();
}

function compactText(text, maxLength = 72) {
  const normalized = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "this";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function deriveTopic(userMessage, persona) {
  const raw = compactText(userMessage, 84);

  if (raw === "this") {
    return compactText(persona?.summary ?? "the next step", 48);
  }

  return raw;
}

export function normalizeActionIntent(intent) {
  const normalized = String(intent ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return (INTENT_ALIASES[normalized] ?? normalized) || null;
}

function buildPlanItem(intent, topic, nowIso) {
  const checklist =
    intent === "study_plan"
      ? [
          `Pick the narrowest concept inside "${topic}" that you can finish tonight.`,
          "Do one 25-minute study block with notes closed until the timer ends.",
          "Spend 5 minutes on recall or two practice questions before switching tasks."
        ]
      : [
          `Define the one shippable outcome for "${topic}".`,
          "Finish the smallest visible piece first and cut anything decorative.",
          "Send YaYa the blocker or the shipped result before starting a second task."
        ];

  return [
    {
      id: createId("action"),
      intent,
      kind: "plan",
      title: intent === "study_plan" ? "Study sprint ready" : "Sprint plan ready",
      summary:
        intent === "study_plan"
          ? `YaYa turned "${topic}" into a small study block instead of leaving it vague.`
          : `YaYa converted "${topic}" into a compact shippable sprint.`,
      status: "active",
      createdAt: nowIso,
      checklist
    },
    {
      id: createId("action"),
      intent: "follow_up_reminder",
      kind: "reminder",
      title: "Report back later",
      summary: `YaYa will check whether "${topic}" actually moved forward.`,
      status: "scheduled",
      createdAt: nowIso,
      dueAt: addMinutes(nowIso, intent === "study_plan" ? 45 : 60),
      followUpText:
        intent === "study_plan"
          ? `How did the ${topic} study block go? Send me the stuck point or the one thing that clicked.`
          : `Quick report: did ${topic} move, or do we need to cut scope again?`
    }
  ];
}

function buildResearchItem(topic, nowIso) {
  return [
    {
      id: createId("action"),
      intent: "research_brief",
      kind: "research",
      title: "Research lanes",
      summary: `YaYa prepared a tighter search brief for "${topic}".`,
      status: "active",
      createdAt: nowIso,
      queries: [
        `${topic} overview tutorial`,
        `${topic} best practices examples`,
        `${topic} common mistakes checklist`
      ]
    },
    {
      id: createId("action"),
      intent: "follow_up_reminder",
      kind: "reminder",
      title: "Research report-back",
      summary: `Come back with one useful source or one confusing gap about "${topic}".`,
      status: "scheduled",
      createdAt: nowIso,
      dueAt: addMinutes(nowIso, 90),
      followUpText: `Send me one source you found for ${topic}, or the gap that still feels fuzzy.`
    }
  ];
}

function buildDraftReplyItem(topic, assistantMessage, nowIso) {
  return [
    {
      id: createId("action"),
      intent: "draft_reply",
      kind: "draft",
      title: "Draft reply ready",
      summary: `YaYa prepared a sendable reply around "${topic}".`,
      status: "active",
      createdAt: nowIso,
      draftText: assistantMessage
    }
  ];
}

function buildReminderItem(intent, topic, assistantMessage, nowIso) {
  const reminderTextByIntent = {
    follow_up_reminder: `YaYa will ask for a real update about "${topic}" later.`,
    drink_water: "Hydration nudge queued.",
    sleep_nudge: "Wind-down reminder queued.",
    discord_relay: `Relay-ready note prepared for "${topic}".`
  };

  const followUpTextByIntent = {
    follow_up_reminder: `Checking back on ${topic}. What changed since we last talked?`,
    drink_water: "Water first. Tiny reset, then come back.",
    sleep_nudge: "It is late. Land the one remaining thing and get to sleep.",
    discord_relay: assistantMessageText =>
      assistantMessageText || `Quick relay from YaYa about ${topic}.`
  };

  const delayByIntent = {
    follow_up_reminder: 60,
    drink_water: 30,
    sleep_nudge: 20,
    discord_relay: 5
  };

  return [
    {
      id: createId("action"),
      intent,
      kind: intent === "discord_relay" ? "relay" : "reminder",
      title: intent === "discord_relay" ? "Discord relay pending" : "Report-back queued",
      summary: reminderTextByIntent[intent] ?? `Reminder queued for "${topic}".`,
      status: "scheduled",
      createdAt: nowIso,
      dueAt: addMinutes(nowIso, delayByIntent[intent] ?? 45),
      followUpText:
        typeof followUpTextByIntent[intent] === "function"
          ? followUpTextByIntent[intent](assistantMessage)
          : followUpTextByIntent[intent] ?? `Quick check-in about ${topic}.`
    }
  ];
}

function buildActionItems(intent, topic, assistantMessage, nowIso) {
  if (intent === "plan_sprint" || intent === "study_plan") {
    return buildPlanItem(intent, topic, nowIso);
  }

  if (intent === "research_brief") {
    return buildResearchItem(topic, nowIso);
  }

  if (intent === "draft_reply") {
    return buildDraftReplyItem(topic, assistantMessage, nowIso);
  }

  if (
    intent === "follow_up_reminder" ||
    intent === "drink_water" ||
    intent === "sleep_nudge" ||
    intent === "discord_relay"
  ) {
    return buildReminderItem(intent, topic, assistantMessage, nowIso);
  }

  return [];
}

function shouldSkipDuplicate(existingItem, nextItem) {
  if (!existingItem || !nextItem) {
    return false;
  }

  if (existingItem.intent !== nextItem.intent || existingItem.title !== nextItem.title) {
    return false;
  }

  const existingCreatedAt = new Date(existingItem.createdAt ?? 0).getTime();
  const nextCreatedAt = new Date(nextItem.createdAt ?? 0).getTime();

  return Math.abs(nextCreatedAt - existingCreatedAt) < 10 * 60 * 1000;
}

function mergeChannelContext(existingContext, incomingChannelContext) {
  if (!incomingChannelContext) {
    return existingContext ?? null;
  }

  return {
    ...existingContext,
    ...incomingChannelContext,
    lastInboundAt: incomingChannelContext.lastInboundAt ?? existingContext?.lastInboundAt ?? new Date().toISOString()
  };
}

export function ensureActionState(session, incomingChannelContext = null) {
  const currentState = session?.actionState ?? {};

  return {
    items: Array.isArray(currentState.items) ? currentState.items : [],
    channelContext: mergeChannelContext(currentState.channelContext ?? null, incomingChannelContext)
  };
}

export function applyActionIntent({
  session,
  reply,
  userMessage,
  nowIso = new Date().toISOString(),
  channelContext = null
}) {
  const actionState = ensureActionState(session, channelContext);
  const intent = normalizeActionIntent(reply?.actionIntent);

  if (!intent) {
    return {
      actionState,
      actionItems: []
    };
  }

  const topic = deriveTopic(userMessage, session?.persona);
  const nextItems = buildActionItems(intent, topic, reply?.message?.text ?? "", nowIso);
  const mergedItems = [...actionState.items];

  for (const item of nextItems) {
    const duplicate = mergedItems.find((existingItem) => shouldSkipDuplicate(existingItem, item));

    if (!duplicate) {
      mergedItems.push(item);
    }
  }

  return {
    actionState: {
      ...actionState,
      items: mergedItems.slice(-ACTION_ITEM_LIMIT)
    },
    actionItems: nextItems
  };
}

export function getDueScheduledActionItem(actionState, nowIso = new Date().toISOString()) {
  const items = Array.isArray(actionState?.items) ? actionState.items : [];
  const now = new Date(nowIso).getTime();

  return items.find((item) => {
    if (item?.status !== "scheduled" || !item?.dueAt) {
      return false;
    }

    return new Date(item.dueAt).getTime() <= now;
  }) ?? null;
}

export function updateActionItem(actionState, itemId, patch) {
  const baseState = ensureActionState({ actionState });

  return {
    ...baseState,
    items: baseState.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...patch
          }
        : item
    )
  };
}
