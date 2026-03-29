import {
  createDefaultVoiceApiConfig,
  getVoiceApiProviderDefinition,
  getVoiceApiProviderDefinitions,
  getVoiceApiStatusLabel,
  isProxyVoiceApiProvider,
} from "./voice-api-config.js";

function formatSpeakerLabel(speakerKey, charData) {
  if (!charData) {
    return speakerKey;
  }
  return charData.name ? `${charData.emoji || ""} ${charData.name}`.trim() : speakerKey;
}

function formatStatus(record) {
  return record ? "専用モデルあり" : "未設定";
}

export class SettingsPanel {
  constructor({
    assetStore,
    modal,
    list,
    summary,
    fallbackStatus,
    warningList,
    closeButton,
    backdrop,
    onModelChange,
    onSummaryChange,
    onVoiceTest,
    onOpen,
    onClose,
  }) {
    this.assetStore = assetStore;
    this.modal = modal;
    this.list = list;
    this.summary = summary;
    this.fallbackStatus = fallbackStatus;
    this.warningList = warningList;
    this.closeButton = closeButton;
    this.backdrop = backdrop;
    this.onModelChange = onModelChange;
    this.onSummaryChange = onSummaryChange;
    this.onVoiceTest = onVoiceTest;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.scenario = null;

    this.closeButton.addEventListener("click", () => this.close());
    this.backdrop.addEventListener("click", () => this.close());
  }

  setWarnings(warnings) {
    this.warningList.innerHTML = "";
    if (!warnings?.length) {
      return;
    }

    for (const warning of warnings) {
      const item = document.createElement("li");
      item.textContent = warning;
      this.warningList.appendChild(item);
    }
  }

  async setScenario(scenario) {
    this.scenario = scenario;
    this.setWarnings(scenario?.warnings || []);
    await this.render();
  }

  open() {
    this.onOpen?.();
    this.modal.hidden = false;
    requestAnimationFrame(() => {
      this.modal.classList.add("visible");
    });
  }

  close() {
    this.modal.classList.remove("visible");
    window.setTimeout(() => {
      this.modal.hidden = true;
      this.onClose?.();
    }, 160);
  }

  async render() {
    if (!this.scenario) {
      return;
    }

    const { chars } = this.scenario;
    const speakerKeys = Object.keys(chars);
    const nonNarratorKeys = speakerKeys.filter((speakerKey) => speakerKey !== "narrator");
    const modelRecords = await this.assetStore.getSpeakerModels(speakerKeys);
    const voiceConfigs = await this.assetStore.getSpeakerVoiceConfigs(speakerKeys);
    const fallbackRecord = await this.assetStore.getSharedFallbackModel();
    const dedicatedCount = nonNarratorKeys.filter((speakerKey) => Boolean(modelRecords[speakerKey])).length;

    this.summary.textContent = `専用モデル ${dedicatedCount} / ${nonNarratorKeys.length}`;
    this.fallbackStatus.textContent = fallbackRecord
      ? `共有フォールバック: ${fallbackRecord.fileName}`
      : "共有フォールバック: 未設定";

    this.onSummaryChange({
      dedicatedCount,
      relevantCount: nonNarratorKeys.length,
      fallbackRecord,
    });

    this.list.innerHTML = "";
    const orderedKeys = [...nonNarratorKeys, ...(chars.narrator ? ["narrator"] : [])];

    for (const speakerKey of orderedKeys) {
      const charData = chars[speakerKey];
      const record = modelRecords[speakerKey] || null;
      const row = document.createElement("section");
      row.className = `settings-row${speakerKey === "narrator" ? " narrator-row" : ""}`;
      row.dataset.speakerKey = speakerKey;

      const header = document.createElement("div");
      header.className = "settings-row-header";

      const title = document.createElement("div");
      title.className = "settings-row-title";
      title.textContent = formatSpeakerLabel(speakerKey, charData);

      const statusGroup = document.createElement("div");
      statusGroup.className = "settings-row-meta";

      const status = document.createElement("span");
      status.className = `settings-row-status${record ? " has-model" : ""}`;
      status.textContent = formatStatus(record);

      const voiceStatus = document.createElement("span");
      voiceStatus.className = `settings-row-status${voiceConfigs[speakerKey] ? " has-model" : ""}`;
      voiceStatus.textContent = `音声API: ${getVoiceApiStatusLabel(voiceConfigs[speakerKey])}`;

      header.appendChild(title);
      statusGroup.appendChild(status);
      statusGroup.appendChild(voiceStatus);
      header.appendChild(statusGroup);

      const controls = document.createElement("div");
      controls.className = "settings-row-controls";

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".vrm";
      input.hidden = true;
      input.dataset.speakerFile = speakerKey;
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          return;
        }
        await this.assetStore.saveSpeakerModel(speakerKey, file);
        await this.render();
        await this.onModelChange(speakerKey);
      });

      const chooseButton = document.createElement("button");
      chooseButton.type = "button";
      chooseButton.className = "settings-btn";
      chooseButton.textContent = record ? "置換" : "ファイル選択";
      chooseButton.addEventListener("click", () => input.click());

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "settings-btn secondary";
      deleteButton.textContent = "削除";
      deleteButton.disabled = !record;
      deleteButton.addEventListener("click", async () => {
        await this.assetStore.deleteSpeakerModel(speakerKey);
        await this.render();
        await this.onModelChange(speakerKey);
      });

      const fallbackButton = document.createElement("button");
      fallbackButton.type = "button";
      fallbackButton.className = "settings-btn secondary";
      fallbackButton.textContent = "共有化";
      fallbackButton.disabled = !record;
      fallbackButton.addEventListener("click", async () => {
        await this.assetStore.saveSharedFallbackFromSpeaker(speakerKey);
        await this.render();
        await this.onModelChange(null);
      });

      const scaleLabel = document.createElement("label");
      scaleLabel.className = "settings-inline-field";
      scaleLabel.textContent = "scale";

      const scaleInput = document.createElement("input");
      scaleInput.type = "number";
      scaleInput.step = "0.1";
      scaleInput.min = "0.1";
      scaleInput.max = "4";
      scaleInput.value = record?.scale ?? 1;
      scaleInput.disabled = !record;
      scaleInput.addEventListener("change", async () => {
        await this.assetStore.updateSpeakerModelTuning(speakerKey, {
          scale: Number(scaleInput.value),
          yOffset: record?.yOffset ?? 0,
        });
        await this.render();
        await this.onModelChange(speakerKey);
      });
      scaleLabel.appendChild(scaleInput);

      const yOffsetLabel = document.createElement("label");
      yOffsetLabel.className = "settings-inline-field";
      yOffsetLabel.textContent = "yOffset";

      const yOffsetInput = document.createElement("input");
      yOffsetInput.type = "number";
      yOffsetInput.step = "0.05";
      yOffsetInput.min = "-2";
      yOffsetInput.max = "2";
      yOffsetInput.value = record?.yOffset ?? 0;
      yOffsetInput.disabled = !record;
      yOffsetInput.addEventListener("change", async () => {
        await this.assetStore.updateSpeakerModelTuning(speakerKey, {
          scale: record?.scale ?? 1,
          yOffset: Number(yOffsetInput.value),
        });
        await this.render();
        await this.onModelChange(speakerKey);
      });
      yOffsetLabel.appendChild(yOffsetInput);

      controls.appendChild(chooseButton);
      controls.appendChild(deleteButton);
      controls.appendChild(fallbackButton);
      controls.appendChild(scaleLabel);
      controls.appendChild(yOffsetLabel);

      row.appendChild(header);
      row.appendChild(controls);
      row.appendChild(input);

      const voiceSection = document.createElement("div");
      voiceSection.className = "settings-voice-section";

      const voiceHeading = document.createElement("div");
      voiceHeading.className = "settings-section-heading";
      voiceHeading.textContent = "音声出力API";

      const activeVoiceConfig = voiceConfigs[speakerKey] || null;
      const activeProvider = getVoiceApiProviderDefinition(activeVoiceConfig?.provider || "browser");

      const voiceControls = document.createElement("div");
      voiceControls.className = "settings-row-controls";

      const providerLabel = document.createElement("label");
      providerLabel.className = "settings-inline-field";
      providerLabel.textContent = "provider";

      const providerSelect = document.createElement("select");
      providerSelect.dataset.speakerVoiceProvider = speakerKey;
      for (const provider of getVoiceApiProviderDefinitions()) {
        const option = document.createElement("option");
        option.value = provider.key;
        option.textContent = provider.label;
        option.selected = provider.key === activeProvider.key;
        providerSelect.appendChild(option);
      }
      providerSelect.addEventListener("change", async () => {
        await this.assetStore.saveSpeakerVoiceConfig(
          speakerKey,
          createDefaultVoiceApiConfig(providerSelect.value)
        );
        await this.render();
      });
      providerLabel.appendChild(providerSelect);
      voiceControls.appendChild(providerLabel);

      const testButton = document.createElement("button");
      testButton.type = "button";
      testButton.className = "settings-btn secondary";
      testButton.textContent = "音声テスト";
      testButton.addEventListener("click", async () => {
        const config =
          (await this.assetStore.getSpeakerVoiceConfig(speakerKey)) ||
          createDefaultVoiceApiConfig(providerSelect.value);
        await this.onVoiceTest?.({
          speakerKey,
          speakerLabel: formatSpeakerLabel(speakerKey, charData),
          config,
        });
      });
      voiceControls.appendChild(testButton);

      const clearVoiceButton = document.createElement("button");
      clearVoiceButton.type = "button";
      clearVoiceButton.className = "settings-btn secondary";
      clearVoiceButton.textContent = "音声設定削除";
      clearVoiceButton.disabled = !activeVoiceConfig;
      clearVoiceButton.addEventListener("click", async () => {
        await this.assetStore.deleteSpeakerVoiceConfig(speakerKey);
        await this.render();
      });
      voiceControls.appendChild(clearVoiceButton);

      voiceSection.appendChild(voiceHeading);
      voiceSection.appendChild(voiceControls);

      const providerNote = document.createElement("p");
      providerNote.className = "settings-provider-note";
      providerNote.textContent = isProxyVoiceApiProvider(activeProvider.key)
        ? "OpenAI / Azure / VOICEVOX はローカルの /api/tts プロキシ経由で発話します。"
        : "Browser TTS はこのブラウザの speechSynthesis を使います。";
      voiceSection.appendChild(providerNote);

      const providerFields = document.createElement("div");
      providerFields.className = "settings-field-grid";

      const sourceConfig = activeVoiceConfig || createDefaultVoiceApiConfig(activeProvider.key);
      for (const field of activeProvider.fields) {
        const fieldLabel = document.createElement("label");
        fieldLabel.className = `settings-inline-field${
          field.type === "textarea" ? " is-block" : ""
        }`;
        fieldLabel.textContent = field.label;

        let fieldInput = null;
        if (field.type === "select") {
          fieldInput = document.createElement("select");
          for (const optionDef of field.options || []) {
            const option = document.createElement("option");
            option.value = optionDef.value;
            option.textContent = optionDef.label;
            option.selected = optionDef.value === sourceConfig.settings[field.key];
            fieldInput.appendChild(option);
          }
        } else if (field.type === "textarea") {
          fieldInput = document.createElement("textarea");
          fieldInput.rows = 3;
          fieldInput.value = String(sourceConfig.settings[field.key] ?? "");
        } else {
          fieldInput = document.createElement("input");
          fieldInput.type = field.type;
          fieldInput.value = String(sourceConfig.settings[field.key] ?? "");
          if (field.min !== undefined) {
            fieldInput.min = String(field.min);
          }
          if (field.max !== undefined) {
            fieldInput.max = String(field.max);
          }
          if (field.step !== undefined) {
            fieldInput.step = String(field.step);
          }
        }

        if (field.placeholder) {
          fieldInput.placeholder = field.placeholder;
        }
        fieldInput.dataset.speakerVoiceField = `${speakerKey}:${field.key}`;
        fieldInput.addEventListener("change", async () => {
          const current =
            (await this.assetStore.getSpeakerVoiceConfig(speakerKey)) ||
            createDefaultVoiceApiConfig(activeProvider.key);
          const nextSettings = {
            ...current.settings,
            [field.key]:
              field.type === "number" ? Number(fieldInput.value) : String(fieldInput.value),
          };
          await this.assetStore.saveSpeakerVoiceConfig(speakerKey, {
            provider: activeProvider.key,
            settings: nextSettings,
          });
          await this.render();
        });

        fieldLabel.appendChild(fieldInput);
        providerFields.appendChild(fieldLabel);
      }

      voiceSection.appendChild(providerFields);
      row.appendChild(voiceSection);
      this.list.appendChild(row);
    }

    const fallbackActions = document.createElement("div");
    fallbackActions.className = "settings-fallback-actions";
    const clearFallbackButton = document.createElement("button");
    clearFallbackButton.type = "button";
    clearFallbackButton.className = "settings-btn secondary";
    clearFallbackButton.textContent = "共有フォールバック削除";
    clearFallbackButton.disabled = !fallbackRecord;
    clearFallbackButton.addEventListener("click", async () => {
      await this.assetStore.deleteSharedFallbackModel();
      await this.render();
      await this.onModelChange(null);
    });
    fallbackActions.appendChild(clearFallbackButton);
    this.list.appendChild(fallbackActions);
  }
}
