export const SUPERPOWER_SKILLS = [
  {
    id: "hackathon_copilot",
    label: "Hackathon copilot",
    description: "Break ideas into shippable tasks, unblock implementation, and keep momentum."
  },
  {
    id: "research_scout",
    label: "Research scout",
    description: "Turn a vague question into a concrete research plan, comparison, or summary."
  },
  {
    id: "planner_operator",
    label: "Planner operator",
    description: "Convert goals into checklists, next actions, and execution order."
  },
  {
    id: "accountability_friend",
    label: "Accountability friend",
    description: "Follow up on deadlines, meals, sleep, and promises without sounding robotic."
  },
  {
    id: "discord_relay",
    label: "Discord relay",
    description: "Keep context across Discord and YaYa, and decide when a channel reply should trigger action."
  }
];

export function selectAgentSkills(_input = {}) {
  return SUPERPOWER_SKILLS;
}

export function formatSkillsForPrompt(skills = []) {
  return skills
    .map((skill) => `- ${skill.id}: ${skill.label}. ${skill.description}`)
    .join("\n");
}
