const VISUAL_KINDS = new Set(["line-chart", "vector-diagram", "step-animation"]);
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function safeParseConfig(node) {
  const raw = node.getAttribute("data-config");
  if (!raw) {
    throw new Error("data-config is required");
  }
  return JSON.parse(raw);
}

function ensureViewport(node) {
  let viewport = node.querySelector(".study-visual__viewport");
  if (!viewport) {
    viewport = document.createElement("div");
    viewport.className = "study-visual__viewport";
    const fallback = node.querySelector(".study-visual__fallback");
    if (fallback) {
      fallback.before(viewport);
    } else {
      node.appendChild(viewport);
    }
  }
  return viewport;
}

function ensureControls(node) {
  let controls = node.querySelector(".study-visual__controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "study-visual__controls";
    const fallback = node.querySelector(".study-visual__fallback");
    if (fallback) {
      fallback.before(controls);
    } else {
      node.appendChild(controls);
    }
  }
  return controls;
}

function createSvg(width = 420, height = 240) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.classList.add("study-visual__svg");
  return svg;
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function createTextElement(tagName, text, className) {
  const node = document.createElement(tagName);
  node.textContent = text;
  if (className) {
    node.className = className;
  }
  return node;
}

function renderLineChart(node, config) {
  const points = Array.isArray(config.points) ? config.points : [];
  if (points.length < 2) {
    throw new Error("line-chart requires at least two points");
  }

  const viewport = ensureViewport(node);
  const controls = ensureControls(node);
  clearNode(viewport);
  clearNode(controls);

  const svg = createSvg();
  const width = 420;
  const height = 240;
  const margin = { top: 24, right: 24, bottom: 52, left: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xs = points.map((point) => Number(point.x));
  const ys = points.map((point) => Number(point.y));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;

  function mapX(value) {
    return margin.left + ((value - minX) / xRange) * plotWidth;
  }

  function mapY(value) {
    return margin.top + plotHeight - ((value - minY) / yRange) * plotHeight;
  }

  for (let step = 0; step < 5; step += 1) {
    const y = margin.top + (plotHeight / 4) * step;
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", String(margin.left));
    gridLine.setAttribute("x2", String(width - margin.right));
    gridLine.setAttribute("y1", String(y));
    gridLine.setAttribute("y2", String(y));
    gridLine.setAttribute("class", "study-visual__grid-line");
    svg.appendChild(gridLine);
  }

  const axisX = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisX.setAttribute("x1", String(margin.left));
  axisX.setAttribute("x2", String(width - margin.right));
  axisX.setAttribute("y1", String(height - margin.bottom));
  axisX.setAttribute("y2", String(height - margin.bottom));
  axisX.setAttribute("class", "study-visual__axis");
  svg.appendChild(axisX);

  const axisY = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisY.setAttribute("x1", String(margin.left));
  axisY.setAttribute("x2", String(margin.left));
  axisY.setAttribute("y1", String(margin.top));
  axisY.setAttribute("y2", String(height - margin.bottom));
  axisY.setAttribute("class", "study-visual__axis");
  svg.appendChild(axisY);

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute(
    "points",
    points.map((point) => `${mapX(point.x)},${mapY(point.y)}`).join(" ")
  );
  polyline.setAttribute("class", "study-visual__line");
  svg.appendChild(polyline);

  const markers = points.map((point) => {
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("cx", String(mapX(point.x)));
    marker.setAttribute("cy", String(mapY(point.y)));
    marker.setAttribute("r", "4.5");
    marker.setAttribute("class", "study-visual__point");
    svg.appendChild(marker);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(mapX(point.x)));
    label.setAttribute("y", String(height - margin.bottom + 20));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "study-visual__tick");
    label.textContent = point.label || String(point.x);
    svg.appendChild(label);

    return marker;
  });

  const highlight = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  highlight.setAttribute("r", "8");
  highlight.setAttribute("class", "study-visual__highlight");
  svg.appendChild(highlight);

  const xAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xAxisLabel.setAttribute("x", String(width / 2));
  xAxisLabel.setAttribute("y", String(height - 12));
  xAxisLabel.setAttribute("text-anchor", "middle");
  xAxisLabel.setAttribute("class", "study-visual__axis-label");
  xAxisLabel.textContent = config.xLabel || "x";
  svg.appendChild(xAxisLabel);

  const yAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yAxisLabel.setAttribute("x", "18");
  yAxisLabel.setAttribute("y", String(height / 2));
  yAxisLabel.setAttribute("text-anchor", "middle");
  yAxisLabel.setAttribute("transform", `rotate(-90 18 ${height / 2})`);
  yAxisLabel.setAttribute("class", "study-visual__axis-label");
  yAxisLabel.textContent = config.yLabel || "y";
  svg.appendChild(yAxisLabel);

  viewport.appendChild(svg);

  const label = createTextElement("label", "注目点", "study-visual__label");
  const range = document.createElement("input");
  range.type = "range";
  range.min = "0";
  range.max = String(points.length - 1);
  range.step = "1";
  range.value = String(Math.max(0, Math.min(points.length - 1, Number(config.highlightIndex) || 0)));
  range.className = "study-visual__range";
  label.appendChild(range);

  const output = createTextElement("output", "", "study-visual__output");
  controls.append(label, output);

  function updateHighlight(index) {
    const point = points[index];
    const cx = mapX(point.x);
    const cy = mapY(point.y);
    highlight.setAttribute("cx", String(cx));
    highlight.setAttribute("cy", String(cy));
    markers.forEach((marker, markerIndex) => {
      marker.classList.toggle("is-active", markerIndex === index);
    });
    output.textContent = `${point.label || point.x}: ${point.y}`;
    node.dataset.studyHighlightIndex = String(index);
  }

  range.addEventListener("input", () => {
    updateHighlight(Number(range.value));
  });

  updateHighlight(Number(range.value));
}

function renderVectorDiagram(node, config) {
  const vectors = Array.isArray(config.vectors) ? config.vectors : [];
  if (!vectors.length) {
    throw new Error("vector-diagram requires at least one vector");
  }

  const viewport = ensureViewport(node);
  const controls = ensureControls(node);
  clearNode(viewport);
  clearNode(controls);

  const width = 420;
  const height = 240;
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Number(config.scale) || 18;
  const active = new Set(vectors.map((_, index) => index));
  let showResultant = config.showResultant !== false;

  function makeLine(x1, y1, x2, y2, className) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));
    line.setAttribute("class", className);
    return line;
  }

  function makeText(x, y, text, className) {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(y));
    label.setAttribute("class", className);
    label.textContent = text;
    return label;
  }

  function render() {
    clearNode(viewport);
    const stage = createSvg();

    stage.appendChild(makeLine(30, centerY, width - 30, centerY, "study-visual__axis"));
    stage.appendChild(makeLine(centerX, 24, centerX, height - 24, "study-visual__axis"));

    let sumX = 0;
    let sumY = 0;
    vectors.forEach((vector, index) => {
      if (!active.has(index)) {
        return;
      }
      const x = centerX + Number(vector.x) * scale;
      const y = centerY - Number(vector.y) * scale;
      const line = makeLine(centerX, centerY, x, y, "study-visual__vector");
      line.style.setProperty("--study-vector-color", vector.color || "#9fe7ff");
      stage.appendChild(line);

      const tip = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      tip.setAttribute("cx", String(x));
      tip.setAttribute("cy", String(y));
      tip.setAttribute("r", "5");
      tip.setAttribute("class", "study-visual__vector-tip");
      tip.style.setProperty("--study-vector-color", vector.color || "#9fe7ff");
      stage.appendChild(tip);

      stage.appendChild(makeText(x + 8, y - 8, vector.label || `v${index + 1}`, "study-visual__tick"));
      sumX += Number(vector.x);
      sumY += Number(vector.y);
    });

    if (showResultant && active.size > 0) {
      const rx = centerX + sumX * scale;
      const ry = centerY - sumY * scale;
      const resultant = makeLine(centerX, centerY, rx, ry, "study-visual__vector study-visual__vector--resultant");
      stage.appendChild(resultant);
      const tip = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      tip.setAttribute("cx", String(rx));
      tip.setAttribute("cy", String(ry));
      tip.setAttribute("r", "5");
      tip.setAttribute("class", "study-visual__vector-tip study-visual__vector-tip--resultant");
      stage.appendChild(tip);
      stage.appendChild(makeText(rx + 8, ry - 8, "resultant", "study-visual__tick"));
    }

    viewport.appendChild(stage);
    node.dataset.studyActiveVectors = String(active.size);
    node.dataset.studyShowResultant = showResultant ? "true" : "false";
  }

  vectors.forEach((vector, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "study-visual__button";
    button.textContent = vector.label || `v${index + 1}`;
    button.setAttribute("aria-pressed", "true");
    button.addEventListener("click", () => {
      if (active.has(index)) {
        active.delete(index);
        button.setAttribute("aria-pressed", "false");
      } else {
        active.add(index);
        button.setAttribute("aria-pressed", "true");
      }
      render();
    });
    controls.appendChild(button);
  });

  const resultantButton = document.createElement("button");
  resultantButton.type = "button";
  resultantButton.className = "study-visual__button";
  resultantButton.textContent = "resultant";
  resultantButton.setAttribute("aria-pressed", showResultant ? "true" : "false");
  resultantButton.addEventListener("click", () => {
    showResultant = !showResultant;
    resultantButton.setAttribute("aria-pressed", showResultant ? "true" : "false");
    render();
  });
  controls.appendChild(resultantButton);

  render();
}

function renderStepAnimation(node, config, reducedMotion) {
  const steps = Array.isArray(config.steps) ? config.steps : [];
  if (!steps.length) {
    throw new Error("step-animation requires at least one step");
  }

  const viewport = ensureViewport(node);
  const controls = ensureControls(node);
  clearNode(viewport);
  clearNode(controls);

  const svg = createSvg();
  const width = 420;
  const height = 220;
  const left = 48;
  const right = width - 48;
  const y = height / 2;
  const duration = Math.max(160, Number(config.intervalMs) || 700);
  let currentIndex = 0;
  let timer = null;
  let playing = !reducedMotion;

  const track = document.createElementNS("http://www.w3.org/2000/svg", "line");
  track.setAttribute("x1", String(left));
  track.setAttribute("x2", String(right));
  track.setAttribute("y1", String(y));
  track.setAttribute("y2", String(y));
  track.setAttribute("class", "study-visual__axis");
  svg.appendChild(track);

  const stepDots = steps.map((step, index) => {
    const x = left + ((right - left) / Math.max(steps.length - 1, 1)) * index;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(y));
    dot.setAttribute("r", "5");
    dot.setAttribute("class", "study-visual__point");
    svg.appendChild(dot);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(y + 32));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "study-visual__tick");
    label.textContent = step.label || `step ${index + 1}`;
    svg.appendChild(label);

    return { x, dot };
  });

  const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  marker.setAttribute("r", "11");
  marker.setAttribute("class", "study-visual__highlight");
  svg.appendChild(marker);

  viewport.appendChild(svg);

  const note = createTextElement("p", "", "study-visual__output");
  controls.appendChild(note);

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.className = "study-visual__button";
  controls.appendChild(playButton);

  const stepButton = document.createElement("button");
  stepButton.type = "button";
  stepButton.className = "study-visual__button";
  stepButton.textContent = "step";
  controls.appendChild(stepButton);

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "study-visual__button";
  resetButton.textContent = "reset";
  controls.appendChild(resetButton);

  function stopTimer() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function update() {
    const step = steps[currentIndex];
    const dot = stepDots[currentIndex];
    marker.setAttribute("cx", String(dot.x));
    marker.setAttribute("cy", String(y));
    stepDots.forEach((entry, index) => {
      entry.dot.classList.toggle("is-active", index === currentIndex);
    });
    note.textContent = step.note || step.label || `step ${currentIndex + 1}`;
    playButton.textContent = playing ? "pause" : "play";
    playButton.setAttribute("aria-pressed", playing ? "true" : "false");
    node.dataset.studyCurrentStep = String(currentIndex);
    node.dataset.studyPlaying = playing ? "true" : "false";
  }

  function advance() {
    currentIndex = (currentIndex + 1) % steps.length;
    update();
  }

  function setPlaying(nextPlaying) {
    playing = nextPlaying;
    stopTimer();
    if (playing) {
      timer = window.setInterval(advance, duration);
    }
    update();
  }

  playButton.addEventListener("click", () => {
    setPlaying(!playing);
  });

  stepButton.addEventListener("click", () => {
    stopTimer();
    playing = false;
    advance();
  });

  resetButton.addEventListener("click", () => {
    stopTimer();
    playing = false;
    currentIndex = 0;
    update();
  });

  node.dataset.studyMotion = reducedMotion ? "reduced" : "full";
  setPlaying(playing);
}

function initStudyVisual(node) {
  const kind = node.getAttribute("data-kind");
  if (!VISUAL_KINDS.has(kind)) {
    throw new Error(`Unsupported visual kind: ${kind}`);
  }

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const config = safeParseConfig(node);

  if (kind === "line-chart") {
    renderLineChart(node, config);
  } else if (kind === "vector-diagram") {
    renderVectorDiagram(node, config);
  } else if (kind === "step-animation") {
    renderStepAnimation(node, config, reducedMotion);
  }

  node.dataset.studyVisualReady = "true";
}

function bootStudyVisuals() {
  document.querySelectorAll(".study-visual").forEach((node) => {
    try {
      initStudyVisual(node);
    } catch (error) {
      node.dataset.studyVisualReady = "error";
      node.dataset.studyVisualError = error.message;
      console.error(error);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootStudyVisuals, { once: true });
} else {
  bootStudyVisuals();
}
