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
    this.modal.hidden = false;
    requestAnimationFrame(() => {
      this.modal.classList.add("visible");
    });
  }

  close() {
    this.modal.classList.remove("visible");
    window.setTimeout(() => {
      this.modal.hidden = true;
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

      const status = document.createElement("span");
      status.className = `settings-row-status${record ? " has-model" : ""}`;
      status.textContent = formatStatus(record);

      header.appendChild(title);
      header.appendChild(status);

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
