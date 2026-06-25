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
  return {
    symptoms: ["壮热", "恶心", "咳嗽", "自汗"],
    candidates: [
      {
        id: 375,
        name: "甘草",
        latin: "Glycyrrhiza uralensis",
        score: 0.39206791,
        scores: [0.79818451, 0.05514135, 0.0580365, 0.08863764],
      },
      {
        id: 295,
        name: "紫菀",
        latin: "Aster tataricus",
        score: 0.28554741,
        scores: [0.2205164, 0.15201902, 0.02871577, 0.59874886],
      },
      {
        id: 41,
        name: "人参",
        latin: "Ginseng",
        score: 0.26014486,
        scores: [0.4781743, 0.20350735, 0.12981886, 0.18849941],
      },
      {
        id: 65,
        name: "西洋参",
        latin: "Panax quinquefolius",
        score: 0.2595163,
        scores: [0.310177, 0.15651022, 0.14001802, 0.39329478],
      },
      {
        id: 85,
        name: "半夏",
        latin: "Pinellia ternata",
        score: 0.22934653,
        scores: [0.26312587, 0.43523842, 0.14176349, 0.15987217],
      },
    ].map((herb) => ({
      ...herb,
      focusIndex: herb.scores.indexOf(Math.max(...herb.scores)),
    })),
    groundTruth: ["甘草", "紫菀", "人参", "西洋参", "半夏"],
  };
}

function mockMetaPathModel(symptoms, herbs) {
  return {
    sourceSymptom: "咳嗽",
    targetHerb: "白术",
    upperPaths: [
      { label: "风邪侵袭肌表", left: 0.02640971, right: 0.02715251 },
      { label: "颧红盗汗", left: 0.0276687, right: 0.0541076 },
    ],
    methodNode: "阴虚火炎证",
    methodToHerb: 0.10855415,
  };
}

function mockAttentionMapModel() {
  const labels = ["甘草", "人参", "茯苓", "半夏", "白术"];
  const matrix = [
    [0.104312, 0.260502, 0.119906, 0.379114, 0.136166],
    [0.104305, 0.250723, 0.132727, 0.347495, 0.16475],
    [0.106578, 0.25515, 0.132986, 0.337482, 0.167803],
    [0.10956, 0.244631, 0.137808, 0.341595, 0.166406],
    [0.112001, 0.240625, 0.157496, 0.256, 0.233877],
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
              <span class="gat-cell-score">${score.toFixed(6)}</span>
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
  const weight = Number(label) || 0.1;
  const displayLabel = Number.isFinite(Number(label)) ? Number(label).toFixed(3) : label;
  const id = `edge-${from}-${to}-${String(displayLabel).replace(/\W/g, "")}`;
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
    const labelText = appendText(parent, displayLabel, (x1 + x2) / 2 - 8, (y1 + y2) / 2 - 8, "edge-label");
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

  appendNode(nodeLayer, { id: "m1-source", x: 88, y: 132, r: 42, color: "#dd2d25", label: pathResult.sourceSymptom });
  appendNode(nodeLayer, { id: "m1-path-0", x: 282, y: 92, r: 40, color: "#abcbe4", label: pathResult.upperPaths[0].label });
  appendNode(nodeLayer, { id: "m1-path-1", x: 282, y: 172, r: 40, color: "#abcbe4", label: pathResult.upperPaths[1].label });
  appendNode(nodeLayer, { id: "m1-method", x: 500, y: 132, r: 48, color: "#f4b713", label: pathResult.methodNode });
  appendNode(nodeLayer, { id: "m1-target", x: 650, y: 132, r: 40, color: "#68ad22", label: pathResult.targetHerb });

  appendEdge(edgeLayer, { x1: 88, y1: 132, x2: 282, y2: 92, from: "m1-source", to: "m1-path-0", label: pathResult.upperPaths[0].left, className: "edge-blue" });
  appendEdge(edgeLayer, { x1: 88, y1: 132, x2: 282, y2: 172, from: "m1-source", to: "m1-path-1", label: pathResult.upperPaths[1].left, className: "edge-blue" });
  appendEdge(edgeLayer, { x1: 282, y1: 92, x2: 500, y2: 132, from: "m1-path-0", to: "m1-method", label: pathResult.upperPaths[0].right, className: "edge-amber" });
  appendEdge(edgeLayer, { x1: 282, y1: 172, x2: 500, y2: 132, from: "m1-path-1", to: "m1-method", label: pathResult.upperPaths[1].right, className: "edge-amber" });
  appendEdge(edgeLayer, { x1: 500, y1: 132, x2: 650, y2: 132, from: "m1-method", to: "m1-target", label: pathResult.methodToHerb, className: "edge-amber" });
  appendText(edgeLayer, "semantic_metapath: 咳嗽 → {风邪侵袭肌表, 颧红盗汗} → 阴虚火炎证 → 白术", 104, 232, "edge-label", 18);
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
  const attentionResult = mockAttentionMapModel();
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
