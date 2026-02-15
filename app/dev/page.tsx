"use client";

import { useState, useEffect, useRef } from "react";
import { ScenarioConfig, Exchange, DevConfig, ScorecardInsights } from "@/lib/types";
import { type ScenarioAssetManifest } from "@/lib/scenario-assets";
import { streamChildResponse } from "@/lib/stream-client";

const MODEL_OPTIONS = [
  "claude-haiku-4-5-20251001",
  "claude-3-haiku-20240307",
  "claude-sonnet-4-5-20250929",
];

interface SchemaField {
  name: string;
  type: string;
  description: string;
  enum?: string[];
  required: boolean;
}

export default function DevToolsPage() {
  const [scenarios, setScenarios] = useState<Record<string, ScenarioConfig>>(
    {}
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [promptDirty, setPromptDirty] = useState(false);
  const [configJson, setConfigJson] = useState("");
  const [configDirty, setConfigDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // LLM Config
  const [llmConfig, setLlmConfig] = useState<DevConfig>({
    model: "claude-haiku-4-5-20251001",
    temperature: 1,
    max_tokens: 1024,
    retry_count: 3,
    retry_base_delay_ms: 1000,
    max_exchanges: 15,
  });

  // Tool Schema
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  const [schemaRawJson, setSchemaRawJson] = useState("");
  const [schemaMode, setSchemaMode] = useState<"structured" | "raw">(
    "structured"
  );

  // Scorecard Insights
  const [scorecardInsights, setScorecardInsights] = useState<ScorecardInsights | null>(null);

  // Scenario Config mode
  const [scenarioMode, setScenarioMode] = useState<"structured" | "raw">("structured");
  const [scenarioStructured, setScenarioStructured] = useState<ScenarioConfig | null>(null);

  // Asset Manifest
  const [assetManifest, setAssetManifest] = useState<Record<string, ScenarioAssetManifest>>({});
  const [assetEditing, setAssetEditing] = useState<ScenarioAssetManifest>({});

  // Language toggles
  const [editorLang, setEditorLang] = useState<"en" | "hi">("en");
  const [testerLang, setTesterLang] = useState<"en" | "hi">("en");

  // Conversation tester
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [streamingDialogue, setStreamingDialogue] = useState("");
  const [streamingJson, setStreamingJson] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  async function fetchScenarios() {
    const res = await fetch("/api/dev/scenarios");
    const data = await res.json();
    setScenarios(data);
    const ids = Object.keys(data);
    if (ids.length > 0 && !selectedId) setSelectedId(ids[0]);
  }

  async function fetchPrompt(id: string, lang: "en" | "hi" = "en") {
    const res = await fetch(`/api/dev/prompts?id=${id}&lang=${lang}`);
    if (res.ok) {
      const data = await res.json();
      setPrompt(data.content);
      setPromptDirty(false);
    } else {
      setPrompt(`(no ${lang} prompt file found)`);
    }
  }

  async function fetchLlmConfig() {
    const res = await fetch("/api/dev/config");
    if (res.ok) {
      const data = await res.json();
      setLlmConfig(data);
    }
  }

  async function fetchToolSchema(lang: "en" | "hi" = "en") {
    const res = await fetch(`/api/dev/tool-schema?lang=${lang}`);
    if (res.ok) {
      const schema = await res.json();
      setSchemaRawJson(JSON.stringify(schema, null, 2));
      parseSchemaToFields(schema);
    }
  }

  async function fetchScorecardInsights() {
    const res = await fetch("/api/dev/scorecard-insights");
    if (res.ok) {
      const data = await res.json();
      setScorecardInsights(data);
    }
  }

  async function fetchAssets() {
    const res = await fetch("/api/dev/assets");
    if (res.ok) {
      const data = await res.json();
      setAssetManifest(data);
    }
  }

  async function saveAssets() {
    setSaveStatus("Saving assets...");
    const res = await fetch("/api/dev/assets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, manifest: assetEditing }),
    });
    if (res.ok) {
      const data = await res.json();
      setAssetManifest(data);
      setSaveStatus("Assets saved");
    } else {
      const err = await res.json();
      setSaveStatus(`Error: ${err.error}`);
    }
    setTimeout(() => setSaveStatus(""), 2000);
  }

  useEffect(() => {
    fetchScenarios();
    fetchLlmConfig();
    fetchToolSchema();
    fetchScorecardInsights();
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchPrompt(selectedId, editorLang);
      fetchToolSchema(editorLang);
      const config = scenarios[selectedId];
      if (config) {
        setConfigJson(JSON.stringify(config, null, 2));
        setScenarioStructured({ ...config });
      }
      setAssetEditing(assetManifest[selectedId] ?? {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, scenarios, assetManifest, editorLang]);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [exchanges, streamingDialogue, pendingMessage]);

  function parseSchemaToFields(schema: Record<string, unknown>) {
    const props = schema.properties as Record<
      string,
      Record<string, unknown>
    > | null;
    const required = (schema.required as string[]) || [];
    if (!props) return;

    const fields: SchemaField[] = Object.entries(props).map(([name, def]) => ({
      name,
      type: (def.type as string) || "string",
      description: (def.description as string) || "",
      enum: def.enum as string[] | undefined,
      required: required.includes(name),
    }));
    setSchemaFields(fields);
  }

  function fieldsToSchema(): Record<string, unknown> {
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];

    for (const f of schemaFields) {
      const prop: Record<string, unknown> = {
        type: f.type,
        description: f.description,
      };
      if (f.enum && f.enum.length > 0) {
        prop.enum = f.enum;
      }
      properties[f.name] = prop;
      if (f.required) required.push(f.name);
    }

    return { type: "object", properties, required };
  }

  async function savePrompt() {
    setSaveStatus("Saving prompt...");
    await fetch(`/api/dev/prompts?lang=${editorLang}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, content: prompt }),
    });
    setPromptDirty(false);
    setSaveStatus(`${editorLang.toUpperCase()} prompt saved`);
    setTimeout(() => setSaveStatus(""), 2000);
  }

  async function saveConfig() {
    let config: ScenarioConfig;
    if (scenarioMode === "raw") {
      try {
        config = JSON.parse(configJson);
      } catch {
        setSaveStatus("Invalid JSON in config");
        return;
      }
    } else {
      if (!scenarioStructured) return;
      config = scenarioStructured;
    }

    setSaveStatus("Saving config...");
    await fetch("/api/dev/scenarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, config }),
    });
    setConfigDirty(false);
    setSaveStatus("Config saved");
    fetchScenarios();
    setTimeout(() => setSaveStatus(""), 2000);
  }

  async function saveScorecardInsights() {
    if (!scorecardInsights) return;
    setSaveStatus("Saving scorecard insights...");
    const res = await fetch("/api/dev/scorecard-insights", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scorecardInsights),
    });
    if (res.ok) {
      const data = await res.json();
      setScorecardInsights(data);
      setSaveStatus("Scorecard insights saved");
    } else {
      const err = await res.json();
      setSaveStatus(`Error: ${err.error}`);
    }
    setTimeout(() => setSaveStatus(""), 2000);
  }

  async function saveLlmConfig() {
    setSaveStatus("Saving LLM config...");
    const res = await fetch("/api/dev/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(llmConfig),
    });
    if (res.ok) {
      setSaveStatus("LLM config saved");
    } else {
      const err = await res.json();
      setSaveStatus(`Error: ${err.error}`);
    }
    setTimeout(() => setSaveStatus(""), 2000);
  }

  async function saveToolSchema() {
    let schema: Record<string, unknown>;
    if (schemaMode === "raw") {
      try {
        schema = JSON.parse(schemaRawJson);
      } catch {
        setSaveStatus("Invalid JSON in schema");
        return;
      }
    } else {
      schema = fieldsToSchema();
    }

    setSaveStatus("Saving schema...");
    const res = await fetch(`/api/dev/tool-schema?lang=${editorLang}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schema),
    });
    if (res.ok) {
      const saved = await res.json();
      setSchemaRawJson(JSON.stringify(saved, null, 2));
      parseSchemaToFields(saved);
      setSaveStatus(`${editorLang.toUpperCase()} schema saved`);
    } else {
      const err = await res.json();
      setSaveStatus(`Error: ${err.error}`);
    }
    setTimeout(() => setSaveStatus(""), 2000);
  }

  async function sendTestMessage() {
    if (!testInput.trim() || testLoading) return;
    if (exchanges.length >= llmConfig.max_exchanges) return;

    const msg = testInput.trim();
    setTestInput("");
    setPendingMessage(msg);
    setTestLoading(true);
    setStreamingDialogue("");
    setStreamingJson("");

    await streamChildResponse(
      {
        scenario_id: selectedId,
        parent_message: msg,
        history: exchanges,
        ...(testerLang === "hi" && { voice_mode: "hindi" }),
      },
      {
        onJsonDelta(chunk) {
          setStreamingJson((prev) => prev + chunk);
        },
        onDialogueDelta(newText) {
          setStreamingDialogue((prev) => prev + newText);
        },
        onComplete(data) {
          setExchanges((prev) => [
            ...prev,
            {
              parent_message: msg,
              child_response: data as unknown as Exchange["child_response"],
            },
          ]);
          setPendingMessage(null);
          setStreamingDialogue("");
          setStreamingJson("");
          setTestLoading(false);
          inputRef.current?.focus();
        },
        onError(message) {
          setSaveStatus(`Error: ${message}`);
          setPendingMessage(null);
          setStreamingDialogue("");
          setStreamingJson("");
          setTestLoading(false);
          inputRef.current?.focus();
          setTimeout(() => setSaveStatus(""), 4000);
        },
      }
    );
  }

  function resetConversation() {
    setExchanges([]);
    setPendingMessage(null);
    setStreamingDialogue("");
    setStreamingJson("");
  }

  function addSchemaField() {
    setSchemaFields((prev) => [
      ...prev,
      { name: "new_field", type: "string", description: "", required: false },
    ]);
  }

  function removeSchemaField(index: number) {
    setSchemaFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSchemaField(
    index: number,
    updates: Partial<SchemaField>
  ) {
    setSchemaFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  }

  const scenarioIds = Object.keys(scenarios);
  const atMaxExchanges = exchanges.length >= llmConfig.max_exchanges;

  // Left panel tab state
  const [leftTab, setLeftTab] = useState<
    "prompt" | "scenario" | "llm" | "schema" | "scorecard"
  >("prompt");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-bold">Dev Tools</h1>
        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            resetConversation();
          }}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          {scenarioIds.map((id) => (
            <option key={id} value={id}>
              {scenarios[id].title}
            </option>
          ))}
        </select>
        <div className="flex rounded border border-zinc-300 p-0.5 dark:border-zinc-700">
          <button
            onClick={() => setEditorLang("en")}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              editorLang === "en"
                ? "bg-blue-500 text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setEditorLang("hi")}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              editorLang === "hi"
                ? "bg-blue-500 text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            HI
          </button>
        </div>
        <span className="text-xs text-zinc-400">
          {llmConfig.model} | T={llmConfig.temperature} | Max={llmConfig.max_tokens}
        </span>
        {saveStatus && (
          <span
            className={`text-sm ${saveStatus.startsWith("Error") ? "text-red-500" : "text-green-600 dark:text-green-400"}`}
          >
            {saveStatus}
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Tabbed editors */}
        <div className="flex w-1/2 flex-col border-r border-zinc-200 dark:border-zinc-800">
          {/* Tab bar */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            {(
              [
                ["prompt", "System Prompt"],
                ["scenario", "Scenario Config"],
                ["llm", "LLM Config"],
                ["schema", "Response Schema"],
                ["scorecard", "Scorecard"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLeftTab(key)}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
                  leftTab === key
                    ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {label}
                {key === "prompt" && promptDirty ? " *" : ""}
                {key === "scenario" && configDirty ? " *" : ""}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* System Prompt tab */}
            {leftTab === "prompt" && (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-end border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <button
                    onClick={savePrompt}
                    disabled={!promptDirty}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-opacity disabled:opacity-30"
                  >
                    Save {editorLang.toUpperCase()} Prompt
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setPromptDirty(true);
                  }}
                  className="flex-1 resize-none bg-white p-4 font-mono text-xs leading-relaxed focus:outline-none dark:bg-zinc-900"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Scenario Config tab */}
            {leftTab === "scenario" && (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setScenarioMode("structured")}
                      className={`rounded px-2 py-1 text-xs ${
                        scenarioMode === "structured"
                          ? "bg-zinc-200 dark:bg-zinc-700"
                          : "text-zinc-500"
                      }`}
                    >
                      Structured
                    </button>
                    <button
                      onClick={() => {
                        if (scenarioMode === "structured" && scenarioStructured) {
                          setConfigJson(JSON.stringify(scenarioStructured, null, 2));
                        }
                        setScenarioMode("raw");
                      }}
                      className={`rounded px-2 py-1 text-xs ${
                        scenarioMode === "raw"
                          ? "bg-zinc-200 dark:bg-zinc-700"
                          : "text-zinc-500"
                      }`}
                    >
                      Raw JSON
                    </button>
                  </div>
                  <button
                    onClick={saveConfig}
                    disabled={!configDirty}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-opacity disabled:opacity-30"
                  >
                    Save Config
                  </button>
                </div>

                {selectedId && (
                  <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Assets (public/scenarios/{selectedId}/)
                      </h4>
                      <button
                        onClick={saveAssets}
                        className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                      >
                        Save Assets
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <LabeledField label="Profile Image">
                          <input
                            value={assetEditing.profile ?? ""}
                            onChange={(e) =>
                              setAssetEditing((a) => ({
                                ...a,
                                profile: e.target.value || undefined,
                              }))
                            }
                            placeholder="profile.png"
                            className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </LabeledField>
                        <LabeledField label="Intro Video">
                          <input
                            value={assetEditing.intro ?? ""}
                            onChange={(e) =>
                              setAssetEditing((a) => ({
                                ...a,
                                intro: e.target.value || undefined,
                              }))
                            }
                            placeholder="intro.mp4"
                            className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </LabeledField>
                        <LabeledField label="Hindi Intro Video">
                          <input
                            value={assetEditing.introHi ?? ""}
                            onChange={(e) =>
                              setAssetEditing((a) => ({
                                ...a,
                                introHi: e.target.value || undefined,
                              }))
                            }
                            placeholder="intro-hi.mp4"
                            className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </LabeledField>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-zinc-500">
                          Emotion Assets (state range to image + video)
                        </p>
                        <div className="space-y-2">
                          {(assetEditing.emotionImages ?? []).map((ei, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={ei.range[0]}
                                onChange={(e) =>
                                  setAssetEditing((a) => {
                                    const eis = [...(a.emotionImages ?? [])];
                                    eis[i] = { ...eis[i], range: [parseInt(e.target.value) || 0, eis[i].range[1]] };
                                    return { ...a, emotionImages: eis };
                                  })
                                }
                                placeholder="Min"
                                className="w-14 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-center dark:border-zinc-700 dark:bg-zinc-800"
                              />
                              <span className="text-xs text-zinc-400">-</span>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={ei.range[1]}
                                onChange={(e) =>
                                  setAssetEditing((a) => {
                                    const eis = [...(a.emotionImages ?? [])];
                                    eis[i] = { ...eis[i], range: [eis[i].range[0], parseInt(e.target.value) || 0] };
                                    return { ...a, emotionImages: eis };
                                  })
                                }
                                placeholder="Max"
                                className="w-14 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-center dark:border-zinc-700 dark:bg-zinc-800"
                              />
                              <input
                                value={ei.image}
                                onChange={(e) =>
                                  setAssetEditing((a) => {
                                    const eis = [...(a.emotionImages ?? [])];
                                    eis[i] = { ...eis[i], image: e.target.value };
                                    return { ...a, emotionImages: eis };
                                  })
                                }
                                placeholder="filename.png"
                                className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                              />
                              <input
                                value={ei.video ?? ""}
                                onChange={(e) =>
                                  setAssetEditing((a) => {
                                    const eis = [...(a.emotionImages ?? [])];
                                    eis[i] = { ...eis[i], video: e.target.value || undefined };
                                    return { ...a, emotionImages: eis };
                                  })
                                }
                                placeholder="video.mp4"
                                className="w-28 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                              />
                              <button
                                onClick={() =>
                                  setAssetEditing((a) => ({
                                    ...a,
                                    emotionImages: (a.emotionImages ?? []).filter((_, j) => j !== i),
                                  }))
                                }
                                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                              >
                                X
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              setAssetEditing((a) => ({
                                ...a,
                                emotionImages: [...(a.emotionImages ?? []), { range: [0, 0], image: "" }],
                              }))
                            }
                            className="rounded border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:border-zinc-400 dark:border-zinc-600"
                          >
                            + Add Emotion Image
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {scenarioMode === "structured" && scenarioStructured ? (
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <LabeledField label="ID">
                      <input
                        value={scenarioStructured.id}
                        disabled
                        className="w-full rounded border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </LabeledField>
                    <LabeledField label="Title">
                      <input
                        value={scenarioStructured.title}
                        onChange={(e) => {
                          setScenarioStructured((s) => s ? { ...s, title: e.target.value } : s);
                          setConfigDirty(true);
                        }}
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </LabeledField>
                    <LabeledField label="Description">
                      <textarea
                        value={scenarioStructured.description}
                        onChange={(e) => {
                          setScenarioStructured((s) => s ? { ...s, description: e.target.value } : s);
                          setConfigDirty(true);
                        }}
                        rows={2}
                        className="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </LabeledField>
                    <div className="flex gap-4">
                      <LabeledField label="Child Name">
                        <input
                          value={scenarioStructured.child_name}
                          onChange={(e) => {
                            setScenarioStructured((s) => s ? { ...s, child_name: e.target.value } : s);
                            setConfigDirty(true);
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </LabeledField>
                      <LabeledField label="Child Age">
                        <input
                          type="number"
                          min="1"
                          max="18"
                          value={scenarioStructured.child_age}
                          onChange={(e) => {
                            setScenarioStructured((s) => s ? { ...s, child_age: parseInt(e.target.value) || 5 } : s);
                            setConfigDirty(true);
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </LabeledField>
                    </div>
                    <LabeledField label="Opening Line">
                      <textarea
                        value={scenarioStructured.opening_line}
                        onChange={(e) => {
                          setScenarioStructured((s) => s ? { ...s, opening_line: e.target.value } : s);
                          setConfigDirty(true);
                        }}
                        rows={2}
                        className="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </LabeledField>
                    <LabeledField label="Opening Line (Hindi)">
                      <textarea
                        value={scenarioStructured.opening_line_hindi}
                        onChange={(e) => {
                          setScenarioStructured((s) => s ? { ...s, opening_line_hindi: e.target.value } : s);
                          setConfigDirty(true);
                        }}
                        rows={2}
                        className="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </LabeledField>
                    <LabeledField label="Opening Inner Feeling">
                      <textarea
                        value={scenarioStructured.opening_inner_feeling}
                        onChange={(e) => {
                          setScenarioStructured((s) => s ? { ...s, opening_inner_feeling: e.target.value } : s);
                          setConfigDirty(true);
                        }}
                        rows={2}
                        className="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </LabeledField>
                    <LabeledField label="Opening Emotional State (0-10)">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={scenarioStructured.opening_emotional_state}
                        onChange={(e) => {
                          setScenarioStructured((s) => s ? { ...s, opening_emotional_state: parseInt(e.target.value) || 0 } : s);
                          setConfigDirty(true);
                        }}
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </LabeledField>
                  </div>
                ) : (
                  <textarea
                    value={configJson}
                    onChange={(e) => {
                      setConfigJson(e.target.value);
                      setConfigDirty(true);
                    }}
                    className="flex-1 resize-none bg-white p-4 font-mono text-xs leading-relaxed focus:outline-none dark:bg-zinc-900"
                    spellCheck={false}
                  />
                )}
              </div>
            )}

            {/* LLM Config tab */}
            {leftTab === "llm" && (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-end border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <button
                    onClick={saveLlmConfig}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                  >
                    Save LLM Config
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <LabeledField label="Model">
                    <select
                      value={llmConfig.model}
                      onChange={(e) =>
                        setLlmConfig((c) => ({ ...c, model: e.target.value }))
                      }
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </LabeledField>

                  <LabeledField label="Temperature (0.0 - 1.0)">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={llmConfig.temperature}
                      onChange={(e) =>
                        setLlmConfig((c) => ({
                          ...c,
                          temperature: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </LabeledField>

                  <LabeledField label="Max Tokens">
                    <input
                      type="number"
                      min="1"
                      max="8192"
                      value={llmConfig.max_tokens}
                      onChange={(e) =>
                        setLlmConfig((c) => ({
                          ...c,
                          max_tokens: parseInt(e.target.value) || 1024,
                        }))
                      }
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </LabeledField>

                  <LabeledField label="Retry Count">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={llmConfig.retry_count}
                      onChange={(e) =>
                        setLlmConfig((c) => ({
                          ...c,
                          retry_count: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </LabeledField>

                  <LabeledField label="Retry Base Delay (ms)">
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={llmConfig.retry_base_delay_ms}
                      onChange={(e) =>
                        setLlmConfig((c) => ({
                          ...c,
                          retry_base_delay_ms: parseInt(e.target.value) || 1000,
                        }))
                      }
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </LabeledField>

                  <LabeledField label="Max Exchanges">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={llmConfig.max_exchanges}
                      onChange={(e) =>
                        setLlmConfig((c) => ({
                          ...c,
                          max_exchanges: parseInt(e.target.value) || 15,
                        }))
                      }
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </LabeledField>
                </div>
              </div>
            )}

            {/* Response Schema tab */}
            {leftTab === "schema" && (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSchemaMode("structured")}
                      className={`rounded px-2 py-1 text-xs ${
                        schemaMode === "structured"
                          ? "bg-zinc-200 dark:bg-zinc-700"
                          : "text-zinc-500"
                      }`}
                    >
                      Structured
                    </button>
                    <button
                      onClick={() => {
                        if (schemaMode === "structured") {
                          setSchemaRawJson(
                            JSON.stringify(fieldsToSchema(), null, 2)
                          );
                        }
                        setSchemaMode("raw");
                      }}
                      className={`rounded px-2 py-1 text-xs ${
                        schemaMode === "raw"
                          ? "bg-zinc-200 dark:bg-zinc-700"
                          : "text-zinc-500"
                      }`}
                    >
                      Raw JSON
                    </button>
                  </div>
                  <button
                    onClick={saveToolSchema}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                  >
                    Save {editorLang.toUpperCase()} Schema
                  </button>
                </div>

                {schemaMode === "structured" ? (
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {schemaFields.map((field, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-700"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex gap-2">
                            <input
                              value={field.name}
                              onChange={(e) =>
                                updateSchemaField(i, { name: e.target.value })
                              }
                              className="w-40 rounded border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800"
                              placeholder="field_name"
                            />
                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateSchemaField(i, { type: e.target.value })
                              }
                              className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                            >
                              <option value="string">string</option>
                              <option value="number">number</option>
                              <option value="boolean">boolean</option>
                            </select>
                            <label className="flex items-center gap-1 text-xs text-zinc-500">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) =>
                                  updateSchemaField(i, {
                                    required: e.target.checked,
                                  })
                                }
                              />
                              req
                            </label>
                          </div>
                          <input
                            value={field.description}
                            onChange={(e) =>
                              updateSchemaField(i, {
                                description: e.target.value,
                              })
                            }
                            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                            placeholder="Description..."
                          />
                        </div>
                        <button
                          onClick={() => removeSchemaField(i)}
                          className="mt-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addSchemaField}
                      className="rounded border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:border-zinc-400 dark:border-zinc-600"
                    >
                      + Add Field
                    </button>
                  </div>
                ) : (
                  <textarea
                    value={schemaRawJson}
                    onChange={(e) => setSchemaRawJson(e.target.value)}
                    className="flex-1 resize-none bg-white p-4 font-mono text-xs leading-relaxed focus:outline-none dark:bg-zinc-900"
                    spellCheck={false}
                  />
                )}
              </div>
            )}

            {/* Scorecard Insights tab */}
            {leftTab === "scorecard" && scorecardInsights && (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-end border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <button
                    onClick={saveScorecardInsights}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                  >
                    Save Scorecard Insights
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Scenario AHA */}
                  <div>
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Scenario AHA Techniques
                    </h3>
                    <div className="space-y-4">
                      {Object.keys(scorecardInsights.scenarios).map((scenarioId) => {
                        const aha = scorecardInsights.scenarios[scenarioId];
                        return (
                        <div
                          key={scenarioId}
                          className="rounded border border-zinc-200 p-3 dark:border-zinc-700"
                        >
                          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {scenarioId}
                          </p>
                          <LabeledField label="Technique">
                            <input
                              value={aha?.technique ?? ""}
                              onChange={(e) =>
                                setScorecardInsights((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    scenarios: {
                                      ...prev.scenarios,
                                      [scenarioId]: {
                                        ...prev.scenarios[scenarioId],
                                        technique: e.target.value,
                                      },
                                    },
                                  };
                                })
                              }
                              className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                            />
                          </LabeledField>
                          <div className="mt-2">
                            <LabeledField label="Explanation">
                              <textarea
                                value={aha?.explanation ?? ""}
                                onChange={(e) =>
                                  setScorecardInsights((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      scenarios: {
                                        ...prev.scenarios,
                                        [scenarioId]: {
                                          ...prev.scenarios[scenarioId],
                                          explanation: e.target.value,
                                        },
                                      },
                                    };
                                  })
                                }
                                rows={2}
                                className="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                              />
                            </LabeledField>
                          </div>
                          <div className="mt-2">
                            <LabeledField label="Example">
                              <input
                                value={aha?.example ?? ""}
                                onChange={(e) =>
                                  setScorecardInsights((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      scenarios: {
                                        ...prev.scenarios,
                                        [scenarioId]: {
                                          ...prev.scenarios[scenarioId],
                                          example: e.target.value,
                                        },
                                      },
                                    };
                                  })
                                }
                                className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                              />
                            </LabeledField>
                          </div>

                          {/* References */}
                          <div className="mt-3">
                            <p className="mb-1 text-xs font-medium text-zinc-500">
                              References
                            </p>
                            <div className="space-y-2">
                              {(aha?.references ?? []).map((ref, ri) => (
                                <div key={ri} className="flex items-center gap-2">
                                  <input
                                    value={ref.label}
                                    onChange={(e) =>
                                      setScorecardInsights((prev) => {
                                        if (!prev) return prev;
                                        const refs = [...(prev.scenarios[scenarioId]?.references ?? [])];
                                        refs[ri] = { ...refs[ri], label: e.target.value };
                                        return {
                                          ...prev,
                                          scenarios: {
                                            ...prev.scenarios,
                                            [scenarioId]: {
                                              ...prev.scenarios[scenarioId],
                                              references: refs,
                                            },
                                          },
                                        };
                                      })
                                    }
                                    placeholder="Label"
                                    className="w-1/3 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                                  />
                                  <input
                                    value={ref.url}
                                    onChange={(e) =>
                                      setScorecardInsights((prev) => {
                                        if (!prev) return prev;
                                        const refs = [...(prev.scenarios[scenarioId]?.references ?? [])];
                                        refs[ri] = { ...refs[ri], url: e.target.value };
                                        return {
                                          ...prev,
                                          scenarios: {
                                            ...prev.scenarios,
                                            [scenarioId]: {
                                              ...prev.scenarios[scenarioId],
                                              references: refs,
                                            },
                                          },
                                        };
                                      })
                                    }
                                    placeholder="URL"
                                    className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                                  />
                                  <button
                                    onClick={() =>
                                      setScorecardInsights((prev) => {
                                        if (!prev) return prev;
                                        const refs = [...(prev.scenarios[scenarioId]?.references ?? [])];
                                        refs.splice(ri, 1);
                                        return {
                                          ...prev,
                                          scenarios: {
                                            ...prev.scenarios,
                                            [scenarioId]: {
                                              ...prev.scenarios[scenarioId],
                                              references: refs,
                                            },
                                          },
                                        };
                                      })
                                    }
                                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    X
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() =>
                                  setScorecardInsights((prev) => {
                                    if (!prev) return prev;
                                    const refs = [...(prev.scenarios[scenarioId]?.references ?? []), { label: "", url: "" }];
                                    return {
                                      ...prev,
                                      scenarios: {
                                        ...prev.scenarios,
                                        [scenarioId]: {
                                          ...prev.scenarios[scenarioId],
                                          references: refs,
                                        },
                                      },
                                    };
                                  })
                                }
                                className="rounded border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:border-zinc-400 dark:border-zinc-600"
                              >
                                + Add Reference
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ending Insights */}
                  <div>
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Ending Insights
                    </h3>
                    <div className="space-y-4">
                      {(["resolution", "meltdown", "limbo"] as const).map(
                        (ending) => (
                          <div
                            key={ending}
                            className="rounded border border-zinc-200 p-3 dark:border-zinc-700"
                          >
                            <p className="mb-2 text-xs font-medium capitalize text-zinc-600 dark:text-zinc-400">
                              {ending}
                            </p>
                            <LabeledField label="Headline">
                              <input
                                value={scorecardInsights.endings[ending]?.headline ?? ""}
                                onChange={(e) =>
                                  setScorecardInsights((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      endings: {
                                        ...prev.endings,
                                        [ending]: {
                                          ...prev.endings[ending],
                                          headline: e.target.value,
                                        },
                                      },
                                    };
                                  })
                                }
                                className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                              />
                            </LabeledField>
                            <div className="mt-2">
                              <LabeledField label="Insight">
                                <textarea
                                  value={scorecardInsights.endings[ending]?.insight ?? ""}
                                  onChange={(e) =>
                                    setScorecardInsights((prev) => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        endings: {
                                          ...prev.endings,
                                          [ending]: {
                                            ...prev.endings[ending],
                                            insight: e.target.value,
                                          },
                                        },
                                      };
                                    })
                                  }
                                  rows={3}
                                  className="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                />
                              </LabeledField>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Research References */}
                  <div>
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Research References
                    </h3>
                    <div className="space-y-4">
                      {Object.keys(scorecardInsights.research ?? {}).map((scenarioId) => {
                        const refs = scorecardInsights.research?.[scenarioId] ?? [];
                        return (
                          <div
                            key={scenarioId}
                            className="rounded border border-zinc-200 p-3 dark:border-zinc-700"
                          >
                            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              {scenarioId}
                            </p>
                            <div className="space-y-2">
                              {refs.map((ref, ri) => (
                                <div key={ri} className="space-y-1 rounded border border-zinc-100 p-2 dark:border-zinc-800">
                                  <div className="flex items-center gap-2">
                                    <input
                                      value={ref.title}
                                      onChange={(e) =>
                                        setScorecardInsights((prev) => {
                                          if (!prev) return prev;
                                          const updated = [...(prev.research?.[scenarioId] ?? [])];
                                          updated[ri] = { ...updated[ri], title: e.target.value };
                                          return { ...prev, research: { ...prev.research, [scenarioId]: updated } };
                                        })
                                      }
                                      placeholder="Title"
                                      className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                                    />
                                    <button
                                      onClick={() =>
                                        setScorecardInsights((prev) => {
                                          if (!prev) return prev;
                                          const updated = [...(prev.research?.[scenarioId] ?? [])];
                                          updated.splice(ri, 1);
                                          return { ...prev, research: { ...prev.research, [scenarioId]: updated } };
                                        })
                                      }
                                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                    >
                                      X
                                    </button>
                                  </div>
                                  <input
                                    value={ref.url}
                                    onChange={(e) =>
                                      setScorecardInsights((prev) => {
                                        if (!prev) return prev;
                                        const updated = [...(prev.research?.[scenarioId] ?? [])];
                                        updated[ri] = { ...updated[ri], url: e.target.value };
                                        return { ...prev, research: { ...prev.research, [scenarioId]: updated } };
                                      })
                                    }
                                    placeholder="URL"
                                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                                  />
                                  <textarea
                                    value={ref.snippet}
                                    onChange={(e) =>
                                      setScorecardInsights((prev) => {
                                        if (!prev) return prev;
                                        const updated = [...(prev.research?.[scenarioId] ?? [])];
                                        updated[ri] = { ...updated[ri], snippet: e.target.value };
                                        return { ...prev, research: { ...prev.research, [scenarioId]: updated } };
                                      })
                                    }
                                    placeholder="Snippet / context"
                                    rows={2}
                                    className="w-full resize-none rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                                  />
                                </div>
                              ))}
                              <button
                                onClick={() =>
                                  setScorecardInsights((prev) => {
                                    if (!prev) return prev;
                                    const updated = [...(prev.research?.[scenarioId] ?? []), { title: "", url: "", snippet: "" }];
                                    return { ...prev, research: { ...prev.research, [scenarioId]: updated } };
                                  })
                                }
                                className="rounded border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:border-zinc-400 dark:border-zinc-600"
                              >
                                + Add Research
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Conversation tester + History */}
        <div className="flex w-1/2 flex-col">
          {/* Controls */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Conversation Tester
            </h2>
            <span className="text-xs text-zinc-400">
              {exchanges.length}/{llmConfig.max_exchanges}
            </span>
            <div className="flex rounded border border-zinc-300 p-0.5 dark:border-zinc-700">
              <button
                onClick={() => {
                  setTesterLang("en");
                  resetConversation();
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  testerLang === "en"
                    ? "bg-green-500 text-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  setTesterLang("hi");
                  resetConversation();
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  testerLang === "hi"
                    ? "bg-green-500 text-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                HI
              </button>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
            >
              {showHistory ? "Hide" : "Show"} Raw History
            </button>
            <button
              onClick={resetConversation}
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 dark:border-red-800 dark:text-red-400"
            >
              Reset
            </button>
          </div>

          {/* Conversation display */}
          <div ref={conversationRef} className="flex-1 overflow-y-auto p-4">
            {selectedId && scenarios[selectedId] && (
              <div className="mb-3 rounded bg-amber-50 p-3 dark:bg-amber-950">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {scenarios[selectedId].child_name} (opening)
                </p>
                <p className="mt-1 text-sm">
                  {scenarios[selectedId].opening_line}
                </p>
              </div>
            )}

            {exchanges.map((ex, i) => (
              <div key={i} className="mb-3 space-y-2">
                <div className="rounded bg-blue-50 p-3 dark:bg-blue-950">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Parent
                  </p>
                  <p className="mt-1 text-sm">{ex.parent_message}</p>
                </div>
                <div className="rounded bg-amber-50 p-3 dark:bg-amber-950">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {scenarios[selectedId]?.child_name}
                  </p>
                  <p className="mt-1 text-sm">
                    {ex.child_response.child_dialogue}
                  </p>
                  <div className="mt-2 rounded bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-800">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(ex.child_response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming / pending message */}
            {pendingMessage && (
              <div className="mb-3 space-y-2">
                <div className="rounded bg-blue-50 p-3 dark:bg-blue-950">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Parent
                  </p>
                  <p className="mt-1 text-sm">{pendingMessage}</p>
                </div>
                <div className="rounded bg-amber-50 p-3 dark:bg-amber-950">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {scenarios[selectedId]?.child_name}
                  </p>
                  {streamingDialogue ? (
                    <p className="mt-1 text-sm">{streamingDialogue}</p>
                  ) : (
                    <p className="mt-1 animate-pulse text-sm text-zinc-400">
                      Thinking...
                    </p>
                  )}
                  {streamingJson && (
                    <div className="mt-2 rounded bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-800">
                      <pre className="whitespace-pre-wrap text-zinc-500">
                        {streamingJson}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            {atMaxExchanges && (
              <p className="mb-2 text-xs text-amber-600">
                Max exchanges reached ({llmConfig.max_exchanges}). Reset to
                continue.
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendTestMessage();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Type a parent message..."
                disabled={testLoading || atMaxExchanges}
                className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="submit"
                disabled={testLoading || !testInput.trim() || atMaxExchanges}
                className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>

          {/* Raw history drawer */}
          {showHistory && (
            <div className="max-h-64 overflow-y-auto border-t border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Full Message History (sent to Claude)
              </h3>
              <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {JSON.stringify(
                  buildHistoryPreview(
                    exchanges,
                    selectedId,
                    scenarios,
                    prompt.length,
                    llmConfig
                  ),
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function buildHistoryPreview(
  exchanges: Exchange[],
  scenarioId: string,
  scenarios: Record<string, ScenarioConfig>,
  promptLength: number,
  config: DevConfig
) {
  const messages: Array<{ role: string; content: string | object }> = [];
  const scenario = scenarios[scenarioId];

  for (const ex of exchanges) {
    messages.push({ role: "user", content: ex.parent_message });
    messages.push({
      role: "assistant",
      content: {
        type: "tool_use",
        name: "child_response",
        input: ex.child_response,
      },
    });
    messages.push({
      role: "user",
      content: {
        type: "tool_result",
        content: "Response delivered to parent. Awaiting next message.",
      },
    });
  }

  return {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    system: `[System prompt for ${scenario?.title || scenarioId}] (${promptLength} chars)`,
    messages,
  };
}
