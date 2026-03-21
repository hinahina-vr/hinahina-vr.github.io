const PROVIDER_DEFINITIONS = [
  {
    key: "browser",
    label: "Browser TTS",
    proxyRequired: false,
    fields: [
      {
        key: "lang",
        label: "lang",
        type: "text",
        defaultValue: "ja-JP",
        placeholder: "ja-JP",
      },
      {
        key: "rate",
        label: "rate",
        type: "number",
        defaultValue: 1,
        min: 0.25,
        max: 4,
        step: 0.1,
      },
      {
        key: "pitch",
        label: "pitch",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 2,
        step: 0.1,
      },
    ],
  },
  {
    key: "voicevox",
    label: "VOICEVOX",
    proxyRequired: true,
    fields: [
      {
        key: "serverUrl",
        label: "server",
        type: "url",
        defaultValue: "http://127.0.0.1:50021",
        placeholder: "http://127.0.0.1:50021",
      },
      {
        key: "speaker",
        label: "speaker",
        type: "number",
        defaultValue: 1,
        min: 0,
        step: 1,
      },
      {
        key: "speed",
        label: "speed",
        type: "number",
        defaultValue: 1,
        min: 0.5,
        max: 2,
        step: 0.1,
      },
      {
        key: "pitch",
        label: "pitch",
        type: "number",
        defaultValue: 0,
        min: -0.15,
        max: 0.15,
        step: 0.01,
      },
      {
        key: "intonation",
        label: "intonation",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 2,
        step: 0.1,
      },
    ],
  },
  {
    key: "openai",
    label: "OpenAI TTS",
    proxyRequired: true,
    fields: [
      {
        key: "apiKey",
        label: "apiKey",
        type: "password",
        defaultValue: "",
        placeholder: "sk-...",
      },
      {
        key: "baseUrl",
        label: "baseUrl",
        type: "url",
        defaultValue: "https://api.openai.com/v1",
        placeholder: "https://api.openai.com/v1",
      },
      {
        key: "model",
        label: "model",
        type: "text",
        defaultValue: "gpt-4o-mini-tts",
        placeholder: "gpt-4o-mini-tts",
      },
      {
        key: "voice",
        label: "voice",
        type: "text",
        defaultValue: "shimmer",
        placeholder: "shimmer",
      },
      {
        key: "speed",
        label: "speed",
        type: "number",
        defaultValue: 1,
        min: 0.25,
        max: 4,
        step: 0.1,
      },
      {
        key: "format",
        label: "format",
        type: "select",
        defaultValue: "mp3",
        options: [
          { value: "mp3", label: "mp3" },
          { value: "wav", label: "wav" },
        ],
      },
    ],
  },
  {
    key: "azure",
    label: "Azure OpenAI TTS",
    proxyRequired: true,
    fields: [
      {
        key: "apiKey",
        label: "apiKey",
        type: "password",
        defaultValue: "",
        placeholder: "azure-openai-key",
      },
      {
        key: "endpoint",
        label: "endpoint",
        type: "url",
        defaultValue: "",
        placeholder: "https://your-resource.openai.azure.com",
      },
      {
        key: "deployment",
        label: "deployment",
        type: "text",
        defaultValue: "tts",
        placeholder: "tts",
      },
      {
        key: "apiVersion",
        label: "apiVersion",
        type: "text",
        defaultValue: "2025-04-01-preview",
        placeholder: "2025-04-01-preview",
      },
      {
        key: "model",
        label: "model",
        type: "text",
        defaultValue: "tts-1",
        placeholder: "tts-1",
      },
      {
        key: "voice",
        label: "voice",
        type: "text",
        defaultValue: "alloy",
        placeholder: "alloy",
      },
      {
        key: "speed",
        label: "speed",
        type: "number",
        defaultValue: 1,
        min: 0.25,
        max: 4,
        step: 0.1,
      },
      {
        key: "format",
        label: "format",
        type: "select",
        defaultValue: "mp3",
        options: [
          { value: "mp3", label: "mp3" },
          { value: "wav", label: "wav" },
        ],
      },
    ],
  },
  {
    key: "openai_compatible",
    label: "OpenAI互換TTS",
    proxyRequired: true,
    fields: [
      {
        key: "apiKey",
        label: "apiKey",
        type: "password",
        defaultValue: "",
        placeholder: "optional",
      },
      {
        key: "baseUrl",
        label: "baseUrl",
        type: "url",
        defaultValue: "http://127.0.0.1:8000/v1",
        placeholder: "http://127.0.0.1:8000/v1",
      },
      {
        key: "model",
        label: "model",
        type: "text",
        defaultValue: "tts-1",
        placeholder: "tts-1",
      },
      {
        key: "voice",
        label: "voice",
        type: "text",
        defaultValue: "alloy",
        placeholder: "alloy",
      },
      {
        key: "speed",
        label: "speed",
        type: "number",
        defaultValue: 1,
        min: 0.25,
        max: 4,
        step: 0.1,
      },
      {
        key: "format",
        label: "format",
        type: "select",
        defaultValue: "mp3",
        options: [
          { value: "mp3", label: "mp3" },
          { value: "wav", label: "wav" },
        ],
      },
      {
        key: "headersJson",
        label: "headersJson",
        type: "textarea",
        defaultValue: "",
        placeholder: "{\"X-API-Key\":\"...\"}",
      },
    ],
  },
];

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getVoiceApiProviderDefinitions() {
  return PROVIDER_DEFINITIONS.map((definition) => cloneValue(definition));
}

export function getVoiceApiProviderDefinition(providerKey) {
  return (
    PROVIDER_DEFINITIONS.find((definition) => definition.key === providerKey) ||
    PROVIDER_DEFINITIONS[0]
  );
}

export function isProxyVoiceApiProvider(providerKey) {
  return Boolean(getVoiceApiProviderDefinition(providerKey)?.proxyRequired);
}

export function createDefaultVoiceApiConfig(providerKey = "browser") {
  const provider = getVoiceApiProviderDefinition(providerKey);
  const settings = {};
  for (const field of provider.fields) {
    settings[field.key] = cloneValue(field.defaultValue);
  }
  return {
    provider: provider.key,
    settings,
  };
}

function coerceValue(field, value) {
  if (field.type === "number") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : field.defaultValue;
  }
  return typeof value === "string" ? value : field.defaultValue;
}

export function normalizeVoiceApiConfig(config) {
  if (!config || typeof config !== "object") {
    return null;
  }

  const provider = getVoiceApiProviderDefinition(config.provider);
  const sourceSettings =
    config.settings && typeof config.settings === "object" && !Array.isArray(config.settings)
      ? config.settings
      : {};
  const settings = {};

  for (const field of provider.fields) {
    settings[field.key] = coerceValue(field, sourceSettings[field.key]);
  }

  return {
    provider: provider.key,
    settings,
  };
}

export function getVoiceApiStatusLabel(config) {
  if (!config) {
    return "未設定";
  }
  return getVoiceApiProviderDefinition(config.provider).label;
}
