const queryPanel = document.querySelector(".query-panel");
const resultPanel = document.querySelector(".result-panel");
const symptomInput = document.querySelector("#symptomInput");
const symptomError = document.querySelector("#symptomError");
const form = document.querySelector("#recommendationForm");
const techGrid = document.querySelector(".tech-grid");
const activeSymptoms = document.querySelector("#activeSymptoms");
const gatExplainer = document.querySelector("#gatExplainer");
const metaPathSvg = document.querySelector("#metaPathSvg");
const heatmap = document.querySelector("#heatmap");
const llmReasoning = document.querySelector("#llmReasoning");
const algorithmTabs = document.querySelectorAll(".algorithm-tab");
const techPanels = document.querySelectorAll(".tech-panel");
const minSymptomCount = 4;

function parseSymptoms(rawInput) {
  return rawInput
    .split(/[，,、\s\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mockRecommendationModel(symptoms) {
  const baseHerbs = [
    { id: 116, name: "白术", latin: "Atractylodes macrocephala", score: 0.447938 },
    { id: 15, name: "甘草", latin: "Glycyrrhiza uralensis", score: 0.446374 },
    { id: 27, name: "茯苓", latin: "Poria cocos", score: 0.382186 },
    { id: 41, name: "人参", latin: "Ginseng", score: 0.338494 },
    { id: 78, name: "木香", latin: "Aucklandia lappa", score: 0.334147 },
    { id: 9, name: "半夏", latin: "Pinellia ternata", score: 0.329801 },
  ];

  if (symptoms.includes("呕吐") || symptoms.includes("恶心")) {
    return [
      { id: 9, name: "半夏", latin: "Pinellia ternata", score: 0.468201 },
      ...baseHerbs.slice(0, 5),
    ];
  }

  return baseHerbs;
}

function mockGatModel(symptoms, herbs) {
  const symptomScores = symptoms.slice(0, 4);
  while (symptomScores.length < 4) {
    symptomScores.push(["胃热", "呕吐", "乏力", "痰湿"][symptomScores.length]);
  }

  return {
    symptoms: symptomScores,
    candidates: herbs.slice(0, 6).map((herb, index) => ({
      ...herb,
      scores: symptomScores.map((symptom, symptomIndex) => {
        const seed = (index + 2) * (symptomIndex + 3);
        const value = 0.08 + ((seed * 17) % 43) / 100;
        return Number(value.toFixed(2));
      }),
      focusIndex: index % symptomScores.length,
    })),
    groundTruth: ["白术", "甘草", "人参", "陈皮", "茯苓", "半夏"],
  };
}

function mockMetaPathModel(symptoms, herbs) {
  const sourceSymptom = symptoms.includes("呕吐") ? "呕吐" : symptoms[1] || symptoms[0] || "恶心";
  const targetHerb = herbs[0]?.name || "半夏";

  return {
    sourceSymptom,
    targetHerb,
    upperPaths: [
      { label: "外感病因\n在胃", left: 0.03, right: 0.295 },
      { label: "胃热", left: 0.026, right: 0.108 },
      { label: "胃气虚", left: 0.027, right: 0.236 },
      { label: "肝热", left: 0.031, right: 0.145 },
    ],
    methodNode: "降逆止呕",
    lowerPaths: [
      { label: "呕吐", left: 0.082, right: 0.027 },
      { label: "干呕", left: 0.079, right: 0.045 },
    ],
    compoundNode: "SMIT03300",
  };
}

function mockAttentionMapModel(herbs) {
  const labels = herbs.slice(0, 5).map((herb) => herb.name);
  const matrix = [
    [0.203004, 0.097217, 0.136706, 0.208861, 0.354212],
    [0.143142, 0.109657, 0.126049, 0.273848, 0.347304],
    [0.165917, 0.105381, 0.131492, 0.252284, 0.344926],
    [0.16795, 0.106331, 0.135305, 0.255593, 0.33482],
    [0.207672, 0.087828, 0.133228, 0.207151, 0.36412],
  ];

  return { labels, matrix };
}

function mockLlmReasoningModel() {
  const answerHerbs = [
    "人参",
    "甘草",
    "茯苓",
    "白术",
    "陈皮",
    "半夏",
    "藿香",
    "厚朴",
    "白芍",
    "枳壳",
    "防风",
    "当归",
    "川芎",
    "麦门冬",
    "桑白皮",
    "杏仁",
    "杏",
    "木香",
    "砂仁",
    "桔梗",
    "柴胡",
    "黄芩",
    "葛根",
    "芍药",
    "知母",
    "黄连",
    "细辛",
    "丁香",
    "地骨皮",
    "紫菀",
    "枳壳",
  ];

  const herbClass = (herb, index) => {
    if (["人参", "甘草", "茯苓", "白术"].includes(herb)) return "llm-herb-priority";
    if (["藿香", "陈皮", "厚朴", "砂仁"].includes(herb)) return "llm-herb-damp";
    if (["白芍", "当归", "川芎", "麦门冬"].includes(herb)) return "llm-herb-support";
    if (herb === "枳壳" && index === answerHerbs.length - 1) return "llm-herb-duplicate";
    return "";
  };

  const answerChain = answerHerbs
    .map((herb, index) => {
      const className = herbClass(herb, index);
      return `<span class="llm-answer-herb ${className}">${herb}</span>`;
    })
    .join('<span class="llm-separator">&gt;</span>');

  return [
    `<div class="llm-tag">&lt;think&gt;</div>`,
    `好的，我需要根据<span class="llm-key-treatment">“化湿、益气”</span>的治法从给定的50味中药中挑选出30味最相关的。`,
    `首先，<span class="llm-key-damp">化湿</span>常用的有<span class="llm-herb-damp">藿香、佩兰、白术、茯苓、陈皮、厚朴、砂仁、紫苏</span>等；<span class="llm-key-qi">益气</span>常用的有<span class="llm-herb-priority">人参、甘草、黄芪、白术、大枣、党参</span>等。`,
    `结合两者，筛选出与这两种治法相关的中药，排除不相关的如<span class="llm-excluded">麻黄、石膏、生姜、干姜</span>等温燥品。`,
    `再检查是否有<span class="llm-warning">重复或冲突</span>，确保30味。最后按相关性排序，如<span class="llm-herb-priority">人参、茯苓、白术、甘草</span>等优先。`,
    `<div class="llm-tag">&lt;/think&gt;</div>`,
    `<div class="llm-tag">&lt;answer&gt;</div><div class="llm-answer-chain">${answerChain}</div><div class="llm-note">提示：末尾 <span class="llm-herb-duplicate">枳壳</span> 与前文重复，已用特殊颜色标出。</div><div class="llm-tag">&lt;/answer&gt;</div>`,
  ];
}

function renderActiveSymptoms(symptoms) {
  activeSymptoms.innerHTML = symptoms
    .map((symptom) => `<span class="symptom-pill">${symptom}</span>`)
    .join("");
}

function renderGatExplainer(gatResult) {
  const allAttentionScores = gatResult.candidates.flatMap((herb) => herb.scores);
  const minAttention = Math.min(...allAttentionScores);
  const maxAttention = Math.max(...allAttentionScores);

  const matrixColumns = `minmax(104px, 0.9fr) repeat(${gatResult.symptoms.length}, minmax(76px, 1fr))`;
  const matrixCells = [
    `<div class="gat-corner">推荐中药</div>`,
    ...gatResult.symptoms.map((symptom) => `<div class="gat-axis">${symptom}</div>`),
    ...gatResult.candidates.flatMap((herb) => {
      const topScore = Math.max(...herb.scores);
      return [
        `<div class="gat-herb-axis"><strong>${herb.name}</strong><small>${herb.score.toFixed(6)}</small></div>`,
        ...herb.scores.map((score) => {
          const normalized = (score - minAttention) / (maxAttention - minAttention || 1);
          const background = `rgba(${248 - normalized * 30}, ${244 - normalized * 120}, ${228 - normalized * 170}, ${0.72 + normalized * 0.22})`;
          const isFocus = score === topScore;
          return `
            <div class="gat-attention-cell${isFocus ? " is-focus" : ""}" style="background: ${background}">
              <span class="gat-cell-score">${score.toFixed(2)}</span>
            </div>
          `;
        }),
      ];
    }),
  ].join("");

  gatExplainer.innerHTML = `
    <div class="gat-matrix">
      <div class="gat-matrix-grid" style="grid-template-columns: ${matrixColumns}">
        ${matrixCells}
      </div>
    </div>
  `;
}

function svgElement(name, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function appendText(parent, lines, x, y, className, lineHeight = 22) {
  const text = svgElement("text", { x, y, class: className });
  String(lines)
    .split("\n")
    .forEach((line, index) => {
      const tspan = svgElement("tspan", {
        x,
        dy: index === 0 ? 0 : lineHeight,
      });
      tspan.textContent = line;
      text.appendChild(tspan);
    });
  parent.appendChild(text);
  return text;
}

function appendNode(parent, { id, x, y, r, color, label, className = "" }) {
  const group = svgElement("g", {
    class: `path-node draggable-node ${className}`.trim(),
    "data-node-id": id,
    "data-x": x,
    "data-y": y,
    "data-label-offset-y": label.includes("\n") ? -11 : 0,
  });
  const circle = svgElement("circle", { cx: x, cy: y, r, fill: color });
  group.appendChild(circle);
  appendText(group, label, x, y - (label.includes("\n") ? 11 : 0), "node-label");
  parent.appendChild(group);
  return group;
}

function appendEdge(parent, { x1, y1, x2, y2, from, to, label, className, flow = true }) {
  const id = `edge-${from}-${to}-${String(label).replace(/\W/g, "")}`;
  const weight = Number(label) || 0.1;
  const line = svgElement("line", {
    x1,
    y1,
    x2,
    y2,
    class: `edge ${className}${flow ? " flow-edge" : ""}`,
    "data-from": from,
    "data-to": to,
    "data-edge-id": id,
    style: `stroke-width: ${Math.max(2, Math.min(4.6, 2 + weight * 6)).toFixed(2)}`,
  });
  parent.appendChild(line);
  if (label) {
    const labelText = appendText(parent, label, (x1 + x2) / 2 - 8, (y1 + y2) / 2 - 8, "edge-label");
    labelText.dataset.edgeLabelFor = id;
  }
  return line;
}

function setNodePosition(node, x, y) {
  node.dataset.x = x;
  node.dataset.y = y;

  const circle = node.querySelector("circle");
  const text = node.querySelector("text");
  const labelOffsetY = Number(node.dataset.labelOffsetY || 0);

  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
  text.setAttribute("x", x);
  text.setAttribute("y", y + labelOffsetY);
  text.querySelectorAll("tspan").forEach((tspan) => tspan.setAttribute("x", x));
}

function updateMetaPathEdges() {
  metaPathSvg.querySelectorAll(".edge[data-from][data-to]").forEach((line) => {
    const fromNode = metaPathSvg.querySelector(`[data-node-id="${line.dataset.from}"]`);
    const toNode = metaPathSvg.querySelector(`[data-node-id="${line.dataset.to}"]`);
    if (!fromNode || !toNode) return;

    const x1 = Number(fromNode.dataset.x);
    const y1 = Number(fromNode.dataset.y);
    const x2 = Number(toNode.dataset.x);
    const y2 = Number(toNode.dataset.y);

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);

    const label = metaPathSvg.querySelector(`[data-edge-label-for="${line.dataset.edgeId}"]`);
    if (label) {
      const x = (x1 + x2) / 2 - 8;
      const y = (y1 + y2) / 2 - 8;
      label.setAttribute("x", x);
      label.setAttribute("y", y);
      label.querySelectorAll("tspan").forEach((tspan) => tspan.setAttribute("x", x));
    }
  });
}

function enableMetaPathDragging() {
  let activeDrag = null;

  function pointerToSvgPoint(event) {
    const point = metaPathSvg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(metaPathSvg.getScreenCTM().inverse());
  }

  metaPathSvg.querySelectorAll(".draggable-node").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      const point = pointerToSvgPoint(event);
      activeDrag = {
        node,
        offsetX: point.x - Number(node.dataset.x),
        offsetY: point.y - Number(node.dataset.y),
      };
      node.classList.add("is-dragging");
      node.setPointerCapture(event.pointerId);
    });

    node.addEventListener("pointermove", (event) => {
      if (!activeDrag || activeDrag.node !== node) return;
      const point = pointerToSvgPoint(event);
      const nextX = Math.min(680, Math.max(36, point.x - activeDrag.offsetX));
      const nextY = Math.min(300, Math.max(34, point.y - activeDrag.offsetY));
      setNodePosition(node, nextX, nextY);
      updateMetaPathEdges();
    });

    node.addEventListener("pointerup", () => {
      node.classList.remove("is-dragging");
      activeDrag = null;
    });

    node.addEventListener("pointercancel", () => {
      node.classList.remove("is-dragging");
      activeDrag = null;
    });
  });
}

function renderMetaPath(pathResult) {
  metaPathSvg.innerHTML = "";
  metaPathSvg.setAttribute("viewBox", "0 0 720 320");

  const defs = svgElement("defs");
  const marker = svgElement("marker", {
    id: "arrowHead",
    markerWidth: 10,
    markerHeight: 10,
    refX: 8,
    refY: 3,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  marker.appendChild(svgElement("path", { d: "M0,0 L0,6 L9,3 z", fill: "#4f7f9f" }));
  defs.appendChild(marker);
  metaPathSvg.appendChild(defs);

  const edgeLayer = svgElement("g", { class: "path-edge-layer" });
  const nodeLayer = svgElement("g", { class: "path-node-layer" });
  metaPathSvg.appendChild(edgeLayer);
  metaPathSvg.appendChild(nodeLayer);

  appendNode(nodeLayer, { id: "m1-source", x: 64, y: 104, r: 38, color: "#dd2d25", label: pathResult.sourceSymptom });
  appendNode(nodeLayer, { id: "m1-target", x: 638, y: 104, r: 38, color: "#68ad22", label: pathResult.targetHerb });
  appendNode(nodeLayer, { id: "m1-method", x: 480, y: 104, r: 48, color: "#f4b713", label: pathResult.methodNode });

  pathResult.upperPaths.forEach((path, index) => {
    const y = 42 + index * 38;
    const nodeId = `m1-path-${index}`;
    appendNode(nodeLayer, { id: nodeId, x: 260, y, r: 34, color: "#abcbe4", label: path.label });
    appendEdge(edgeLayer, { x1: 64, y1: 104, x2: 260, y2: y, from: "m1-source", to: nodeId, label: path.left, className: "edge-blue" });
    appendEdge(edgeLayer, { x1: 260, y1: y, x2: 480, y2: 104, from: nodeId, to: "m1-method", label: path.right, className: "edge-amber" });
  });

  appendEdge(edgeLayer, { x1: 480, y1: 104, x2: 638, y2: 104, from: "m1-method", to: "m1-target", label: "0.108", className: "edge-amber" });
  appendText(edgeLayer, "M1: symptom → path concept → treatment → herb", 170, 190, "edge-label", 18);

  appendNode(nodeLayer, { id: "m2-target", x: 86, y: 258, r: 36, color: "#68ad22", label: pathResult.targetHerb });
  appendNode(nodeLayer, { id: "m2-compound", x: 250, y: 258, r: 36, color: "#914318", label: pathResult.compoundNode });
  appendNode(nodeLayer, { id: "m2-path-0", x: 412, y: 226, r: 34, color: "#ec7c1b", label: pathResult.lowerPaths[0].label });
  appendNode(nodeLayer, { id: "m2-path-1", x: 412, y: 290, r: 34, color: "#ec7c1b", label: pathResult.lowerPaths[1].label });
  appendNode(nodeLayer, { id: "m2-source", x: 604, y: 258, r: 36, color: "#dd2d25", label: pathResult.sourceSymptom });

  appendEdge(edgeLayer, { x1: 86, y1: 258, x2: 250, y2: 258, from: "m2-target", to: "m2-compound", label: "0.108", className: "edge-amber" });
  appendEdge(edgeLayer, { x1: 250, y1: 258, x2: 412, y2: 226, from: "m2-compound", to: "m2-path-0", label: pathResult.lowerPaths[0].left, className: "edge-amber" });
  appendEdge(edgeLayer, { x1: 250, y1: 258, x2: 412, y2: 290, from: "m2-compound", to: "m2-path-1", label: pathResult.lowerPaths[1].left, className: "edge-amber" });
  appendEdge(edgeLayer, { x1: 412, y1: 226, x2: 604, y2: 258, from: "m2-path-0", to: "m2-source", label: pathResult.lowerPaths[0].right, className: "edge-red" });
  appendEdge(edgeLayer, { x1: 412, y1: 290, x2: 604, y2: 258, from: "m2-path-1", to: "m2-source", label: pathResult.lowerPaths[1].right, className: "edge-red" });
  appendText(edgeLayer, "M2: herb → compound → symptom evidence", 196, 315, "edge-label", 18);
  enableMetaPathDragging();
}

function renderHeatmap(attentionResult) {
  const { labels, matrix } = attentionResult;
  heatmap.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "heatmap-grid";
  grid.style.gridTemplateColumns = `96px repeat(${labels.length}, minmax(86px, 1fr))`;

  grid.appendChild(cell("heat-corner", ""));
  labels.forEach((label) => grid.appendChild(cell("heat-label", label)));

  matrix.forEach((row, rowIndex) => {
    grid.appendChild(cell("heat-label", labels[rowIndex]));
    row.forEach((value) => {
      const normalized = Math.min(1, Math.max(0, (value - 0.08) / 0.29));
      const background = `rgba(${239 - normalized * 30}, ${244 - normalized * 158}, ${235 - normalized * 180}, ${0.68 + normalized * 0.28})`;
      const item = cell("heat-cell", `<span>${value.toFixed(6)}</span>`);
      item.style.background = background;
      grid.appendChild(item);
    });
  });

  heatmap.appendChild(grid);
}

function cell(className, content) {
  const element = document.createElement("div");
  element.className = className;
  element.innerHTML = content;
  return element;
}

function renderReasoning(lines) {
  llmReasoning.innerHTML = lines
    .map((line) => `<div class="reasoning-step">${line}</div>`)
    .join("");
}

function setActiveAlgorithm(tech) {
  algorithmTabs.forEach((tab) => {
    const isActive = tab.dataset.tech === tech;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  techPanels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tech;
  });
}

function lockPanelHeights() {
  if (window.matchMedia("(max-width: 1100px)").matches) {
    queryPanel.style.height = "";
    resultPanel.style.height = "";
    return;
  }

  queryPanel.style.height = "";
  resultPanel.style.height = "";
  const expandedHeight = Math.round(queryPanel.getBoundingClientRect().height * 1.2);
  queryPanel.style.height = `${expandedHeight}px`;
  resultPanel.style.height = `${expandedHeight}px`;
}

function renderDashboard(symptoms) {
  const herbs = mockRecommendationModel(symptoms);
  const gatResult = mockGatModel(symptoms, herbs);
  const pathResult = mockMetaPathModel(symptoms, herbs);
  const attentionResult = mockAttentionMapModel(herbs);
  const reasoning = mockLlmReasoningModel(symptoms, herbs);

  renderActiveSymptoms(symptoms);
  renderGatExplainer(gatResult);
  renderMetaPath(pathResult);
  renderHeatmap(attentionResult);
  renderReasoning(reasoning);
}

document.querySelectorAll(".preset-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const existing = parseSymptoms(symptomInput.value);
    const symptom = chip.dataset.symptom;
    if (!existing.includes(symptom)) {
      symptomInput.value = [...existing, symptom].join("、");
    }
    if (parseSymptoms(symptomInput.value).length >= minSymptomCount) {
      symptomInput.classList.remove("input-error");
      symptomError.hidden = true;
    }
  });
});

algorithmTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveAlgorithm(tab.dataset.tech);
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const symptoms = parseSymptoms(symptomInput.value);
  if (symptoms.length < minSymptomCount) {
    techGrid.hidden = true;
    activeSymptoms.innerHTML = "";
    symptomInput.classList.add("input-error");
    symptomError.hidden = false;
    symptomInput.focus();
    return;
  }

  symptomInput.classList.remove("input-error");
  symptomError.hidden = true;

  // 模拟深度学习模型计算延迟
  const runButton = form.querySelector(".run-button");
  const originalText = runButton.innerHTML;
  runButton.disabled = true;
  runButton.innerHTML = '<span aria-hidden="true">⏳</span> 正在调用 GAT/Meta-path/Attention/LLM 深度学习模型分析...';
  techGrid.hidden = true;
  activeSymptoms.innerHTML = '<span style="color:#8870a8;font-size:13px">⏳ 模型推理中，请稍候...</span>';

  setTimeout(() => {
    lockPanelHeights();
    renderDashboard(symptoms);
    techGrid.hidden = false;
    runButton.disabled = false;
    runButton.innerHTML = originalText;
  }, 2000);
});

symptomInput.addEventListener("input", () => {
  if (parseSymptoms(symptomInput.value).length >= minSymptomCount) {
    symptomInput.classList.remove("input-error");
    symptomError.hidden = true;
  }
});

window.addEventListener("resize", lockPanelHeights);

renderDashboard(parseSymptoms(symptomInput.value));
setActiveAlgorithm("gat");
lockPanelHeights();
