import React, { useEffect, useState } from "react";
import "./styles/Settings.css";

type ToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (val: boolean) => void;
};

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row-left">
        <div className="settings-row-label">{label}</div>
        {description ? (
          <div className="settings-row-description">{description}</div>
        ) : null}
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="slider" />
      </label>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      <div className="settings-section-body">{children}</div>
    </div>
  );
}

const STORAGE_KEY = "digicover_settings_v1";

const DEFAULTS = {
  accessibility: {
    highContrast: false,
    reduceMotion: false,
    largerText: false,
  },
  privacySecurity: {
    rememberMe: true,
    hideEmail: false,
    twoFactor: false,
  },
};

export default function Settings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [savedMsg, setSavedMsg] = useState("");

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      setSettings({
        accessibility: {
          ...DEFAULTS.accessibility,
          ...(parsed?.accessibility || {}),
        },
        privacySecurity: {
          ...DEFAULTS.privacySecurity,
          ...(parsed?.privacySecurity || {}),
        },
      });
    } catch {
      setSettings(DEFAULTS);
    }
  }, []);

  // Apply basic accessibility classes (safe)
  useEffect(() => {
    window.scrollTo(0, 0);
    }, []);

  
  
  useEffect(() => {
    document.body.classList.toggle("a11y-high-contrast", settings.accessibility.highContrast);
    document.body.classList.toggle("a11y-reduce-motion", settings.accessibility.reduceMotion);
    document.body.classList.toggle("a11y-larger-text", settings.accessibility.largerText);

    return () => {
      document.body.classList.remove("a11y-high-contrast", "a11y-reduce-motion", "a11y-larger-text");
    };
  }, [
    settings.accessibility.highContrast,
    settings.accessibility.reduceMotion,
    settings.accessibility.largerText,
  ]);

  const onToggle =
    (category: "accessibility" | "privacySecurity", key: string) => (val: boolean) => {
      setSavedMsg("");
      setSettings((prev) => ({
        ...prev,
        [category]: {
          ...(prev as any)[category],
          [key]: val,
        },
      }));
    };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 1200);
    } catch {
      setSavedMsg("Could not save.");
      setTimeout(() => setSavedMsg(""), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div className="settings-page">
      <div className="settings-red">
        <div className="settings-card">
          <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">
          Manage your preferences.
        </p>

        <Section title="Accessibility">
          <ToggleRow
            label="High contrast"
            description="Increase contrast for easier readability."
            value={settings.accessibility.highContrast}
            onChange={onToggle("accessibility", "highContrast")}
          />
          <ToggleRow
            label="Reduce motion"
            description="Minimize animations and transitions."
            value={settings.accessibility.reduceMotion}
            onChange={onToggle("accessibility", "reduceMotion")}
          />
          <ToggleRow
            label="Larger text"
            description="Slightly increase text size across the app."
            value={settings.accessibility.largerText}
            onChange={onToggle("accessibility", "largerText")}
          />
        </Section>

        <Section title="Privacy & Security">
          <ToggleRow
            label="Remember me"
            description="Keep you signed in on this device."
            value={settings.privacySecurity.rememberMe}
            onChange={onToggle("privacySecurity", "rememberMe")}
          />
          <ToggleRow
            label="Hide email"
            description="Mask your email address in profile views."
            value={settings.privacySecurity.hideEmail}
            onChange={onToggle("privacySecurity", "hideEmail")}
          />
          <ToggleRow
            label="Two-factor authentication"
            description="Require a verification code when signing in."
            value={settings.privacySecurity.twoFactor}
            onChange={onToggle("privacySecurity", "twoFactor")}
          />
        </Section>

        <div className="settings-actions">
          <button className="primary-btn" type="button" onClick={handleSave}>
            Save Changes
          </button>
          {savedMsg ? <span className="save-msg">{savedMsg}</span> : null}
        </div>

        <div className="settings-divider" />

        <Section title="Log Out">
          <p className="settings-muted">This will log you out on this device.</p>
          <button className="danger-btn" type="button" onClick={handleLogout}>
            Log Out
          </button>
        </Section>
        </div>
      </div>
    </div>
  );
}
