"use client";

import { useEffect } from "react";
import type { BoardSize, ExplorerSettings, FontChoice, TextSize } from "../settings";
import { DEFAULT_SETTINGS } from "../settings";
import { messages } from "../i18n";
import type { Locale } from "../i18n";

type SettingsPanelProps = {
  locale: Locale;
  settings: ExplorerSettings;
  onChange: (settings: ExplorerSettings) => void;
  onClose: () => void;
};

export function SettingsPanel({ locale, settings, onChange, onClose }: SettingsPanelProps) {
  const text = messages[locale];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const update = <Key extends keyof ExplorerSettings>(key: Key, value: ExplorerSettings[Key]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-head">
          <div>
            <h2 id="settings-title">{text.settings}</h2>
            <p>{text.settingsDescription}</p>
          </div>
          <button className="settings-close" type="button" onClick={onClose} aria-label={text.closeSettings}>×</button>
        </div>

        <div className="settings-body">
          <fieldset className="settings-group">
            <legend>{text.colors}</legend>
            <div className="color-settings">
              <ColorSetting label={text.accentColor} value={settings.accentColor} onChange={(value) => update("accentColor", value)} />
              <ColorSetting label={text.lightSquares} value={settings.lightSquareColor} onChange={(value) => update("lightSquareColor", value)} />
              <ColorSetting label={text.darkSquares} value={settings.darkSquareColor} onChange={(value) => update("darkSquareColor", value)} />
            </div>
          </fieldset>

          <fieldset className="settings-group">
            <legend>{text.sizes}</legend>
            <SettingChoices
              label={text.textSize}
              value={settings.textSize}
              options={[
                ["small", text.small],
                ["standard", text.standard],
                ["large", text.large],
              ]}
              onChange={(value) => update("textSize", value)}
            />
            <SettingChoices
              label={text.boardSize}
              value={settings.boardSize}
              options={[
                ["compact", text.compact],
                ["standard", text.standard],
                ["large", text.large],
              ]}
              onChange={(value) => update("boardSize", value)}
            />
          </fieldset>

          <fieldset className="settings-group">
            <legend>{text.font}</legend>
            <SettingChoices
              label={text.font}
              value={settings.font}
              options={[
                ["classic", text.classicFont],
                ["modern", text.modernFont],
                ["serif", text.serifFont],
              ]}
              onChange={(value) => update("font", value)}
            />
          </fieldset>
        </div>

        <div className="settings-footer">
          <button className="button" type="button" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>{text.resetSettings}</button>
          <button className="button primary" type="button" onClick={onClose}>{text.done}</button>
        </div>
      </section>
    </div>
  );
}

type ColorSettingProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function ColorSetting({ label, value, onChange }: ColorSettingProps) {
  return (
    <label className="color-setting">
      <span>{label}</span>
      <span className="color-control">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

type SettingChoicesProps<Value extends string> = {
  label: string;
  value: Value;
  options: ReadonlyArray<readonly [Value, string]>;
  onChange: (value: Value) => void;
};

function SettingChoices<Value extends TextSize | BoardSize | FontChoice>({ label, value, options, onChange }: SettingChoicesProps<Value>) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <div className="setting-choices" role="group" aria-label={label}>
        {options.map(([option, optionLabel]) => (
          <button
            key={option}
            className={option === value ? "active" : ""}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
