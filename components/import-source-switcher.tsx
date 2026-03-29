"use client";

import type { SupportedSource } from "@/types/yaya";

type ImportSource = Extract<SupportedSource, "discord" | "wechat">;

const sourceOptions: Array<{
  id: ImportSource;
  label: string;
}> = [
  {
    id: "discord",
    label: "Discord"
  },
  {
    id: "wechat",
    label: "WeChat"
  }
];

type ImportSourceSwitcherProps = {
  value: ImportSource;
  onChange: (source: ImportSource) => void;
};

export function ImportSourceSwitcher({ value, onChange }: ImportSourceSwitcherProps) {
  return (
    <div className="source-switcher">
      {sourceOptions.map((option) => (
        <button
          key={option.id}
          className={option.id === value ? "source-option active" : "source-option"}
          onClick={() => onChange(option.id)}
          type="button"
        >
          <strong>{option.label}</strong>
        </button>
      ))}
    </div>
  );
}
