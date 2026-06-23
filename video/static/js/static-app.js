const fixedSummary = `## 视频内容摘要

该视频主要展示阅兵纪念活动场景，内容包括仪仗队列、人员方队、装备车辆、空中飞机、群众观礼和领导讲话等画面。视频中目标类型丰富，事件阶段清晰，适合用于验证“基于时空关联的视频事件分析与态势推理原型”系统的可解释性分析、目标关联关系图生成、事件目标研判和多维信息关联展示能力。

### 1. 主要时间点与事件内容

| 时间点 | 主要事件内容 | 重要目标人物/物体 |
|---|---|---|
| 00:00—00:10 | 仪仗队和受阅人员在广场区域列队，形成整齐队形，展示阅兵活动开始阶段。 | 仪仗人员、受阅方队、红旗、广场、主席台 |
| 00:10—00:20 | 出现飞机起飞、纪念标识和士兵列队画面，视频开始建立“纪念活动+军事展示”的事件背景。 | 飞机、纪念数字标识、士兵方队 |
| 00:20—00:40 | 多个士兵方队密集出现，并伴随“铭记历史”“和平必胜”等字幕信息，强调纪念和集体行动主题。 | 陆军方队、海军方队、士兵、字幕标语 |
| 00:40—00:55 | 群众挥舞红旗，地面方队和装备车辆出现，体现群众观礼与装备展示之间的事件关联。 | 群众、红旗、方队、装备车辆 |
| 00:55—01:15 | 多名军官、士兵方队、医疗保障人员和地面装备连续出现，形成多目标、多类别的关联分析场景。 | 军官、士兵、医护兵、车辆装备、红十字标识 |
| 01:15—01:35 | 广场受阅、运输机滑行、飞行编队、装甲车辆和无人化装备画面出现，事件由地面展示扩展到空中展示。 | 天安门广场、运输机、飞行编队、装甲车辆、无人装备 |
| 01:35—01:55 | 装备车辆密集通过，出现坦克、导弹车、雷达车等目标，体现装备梯队组织关系。 | 坦克、导弹运输车、雷达车辆、装备编队 |
| 01:55—02:10 | 大型导弹车辆、空中加油机、战斗机等目标出现，展示远程装备和空中力量。 | 导弹车、加油机、战斗机、空中编队 |
| 02:10—02:20 | 出现主席台讲话画面和广场庆祝画面，视频进入总结性阶段。 | 讲话领导、主席台、广场、人群、飞鸟/和平象征物 |

### 2. 可解释性技术验证

视频中具有明显的可解释性线索，包括人员队列、军服样式、红旗标识、车辆外形、飞机轨迹、字幕信息和场景切换。系统可根据这些线索输出目标识别依据、关键帧证据、事件关联证据和推理路径，用于解释“阅兵活动”“装备展示”“空中飞行”“群众观礼”等事件判断结果。

### 3. 事件目标组织关联关系图生成

视频包含大量人员、车辆、飞机和场景目标，可构建不少于100个目标节点的事件关联关系图。系统可将仪仗人员、士兵方队、群众、装备车辆、飞机、红旗、广场、主席台等作为节点，并根据同屏出现、空间邻近、队列从属、运动方向一致和时间先后关系生成关联边。

### 4. 事件目标研判任务

该视频可支持不少于3类事件目标研判任务：

- 目标属性研判：识别人员、车辆、飞机、旗帜、字幕和场景类别。
- 目标行为研判：判断列队行进、车辆编队通过、飞机起飞与飞行、群众挥旗、领导讲话等行为。
- 趋势预测：根据方队行进方向、车辆编队顺序和飞机运动轨迹，预测后续目标出现和事件发展阶段。

### 5. 事件目标分析可解释性要素

视频中可提取不少于4类可解释性要素：

- 时空规律：方队、车辆和飞机按照时间顺序依次出现。
- 多目标关系：人员方队、装备车辆、飞机、群众和主席台之间存在组织和场景关系。
- 环境信息：包括广场、道路、机场、天空、主席台和观礼区域。
- 意图背景：体现纪念活动、阅兵展示、群众观礼和力量展示等背景。
- 视觉证据：包括军服、红旗、红十字标识、导弹车辆、飞机编队和字幕标语。

### 6. 信息关联展现维度

该视频可支持不少于5个信息关联展现维度：

- 时间维度：按视频时间轴展示仪仗、方队、装备、空中力量和讲话阶段。
- 空间维度：关联广场、道路、机场、天空和主席台等区域。
- 目标维度：展示人员、车辆、飞机、旗帜、字幕和场景目标。
- 标签维度：标注阅兵、纪念、方队、装备、飞行、观礼、讲话等语义标签。
- 分类维度：区分人员类、装备类、飞行器类、场景类和活动类信息。

## 总结

该视频具有清晰的时间线、多类别目标和丰富的事件关联关系。通过对不同时间点的人员、车辆、飞机、旗帜、场景和讲话目标进行分析，可有效支撑系统在可解释性分析、关系图生成、目标研判、解释要素提取和多维信息关联展示方面的技术指标验证。`;

const mindmapText = `mindmap
  root((阅兵视频内容摘要))
    视频总体内容
      阅兵纪念活动
      人员方队行进
      装备车辆展示
      空中飞机飞行
      群众与老兵观礼
      领导讲话与庆祝场景

    时间线与事件过程
      00:00-00:10
        仪仗队列队
        受阅人员集结
        重要目标
          仪仗人员
          受阅方队
          红旗
          广场
      00:10-00:20
        飞机起飞
        纪念标识出现
        士兵方队展示
        重要目标
          飞机
          纪念数字标识
          士兵方队
      00:20-00:40
        多个方队密集出现
        字幕标语强化纪念主题
        重要目标
          陆军方队
          海军方队
          士兵
          铭记历史标语
          和平必胜标语
      00:40-00:55
        群众挥旗
        地面方队与装备车辆出现
        重要目标
          群众
          红旗
          方队
          装备车辆
      00:55-01:15
        军官与士兵方队展示
        医疗保障人员出现
        地面装备连续出现
        重要目标
          军官
          士兵
          医护兵
          红十字标识
          车辆装备
      01:15-01:35
        广场受阅
        运输机滑行
        飞行编队出现
        装甲车辆展示
        重要目标
          天安门广场
          运输机
          飞行编队
          装甲车辆
          无人装备
      01:35-01:55
        装备车辆密集通过
        坦克与导弹装备展示
        重要目标
          坦克
          导弹运输车
          雷达车辆
          装备编队
      01:55-02:10
        大型导弹车辆展示
        空中加油机与战斗机出现
        重要目标
          导弹车
          加油机
          战斗机
          空中编队
      02:10-02:20
        领导讲话
        广场庆祝
        视频进入总结阶段
        重要目标
          讲话领导
          主席台
          广场人群
          和平象征物

    指标验证支撑
      可解释性技术
        目标识别依据
        关键帧证据
        事件关联证据
        推理路径
        模型关注区域
      关系图生成效率
        不少于100个目标节点
        人员节点
        车辆节点
        飞机节点
        旗帜节点
        场景节点
        关系边
          同屏出现
          空间邻近
          队列从属
          运动方向一致
          时间先后
      事件目标研判任务
        目标属性研判
          人员类别
          车辆类别
          飞机类别
          场景类别
        目标行为研判
          列队行进
          车辆编队通过
          飞机起飞与飞行
          群众挥旗
          领导讲话
        趋势预测
          方队后续行进
          装备梯队延续
          飞行目标进入画面
      可解释性要素
        时空规律
        多目标关系
        环境信息
        意图背景
        视觉证据
      信息关联展现维度
        时间维度
        空间维度
        目标维度
        标签维度
        分类维度

    总结
      目标数量多
      事件阶段清晰
      目标关联丰富
      可解释性线索明显
      适合系统技术指标验证`;

const mindmapData = {
    topic: "阅兵视频内容摘要",
    children: [
        {
            topic: "视频总体内容",
            children: ["阅兵纪念活动", "人员方队行进", "装备车辆展示", "空中飞机飞行", "群众与老兵观礼", "领导讲话与庆祝场景"],
        },
        {
            topic: "时间线与事件过程",
            children: [
                "00:00-00:10 仪仗队列队、受阅人员集结",
                "00:10-00:20 飞机起飞、纪念标识出现、士兵方队展示",
                "00:20-00:40 多个方队密集出现、字幕标语强化纪念主题",
                "00:40-00:55 群众挥旗、地面方队与装备车辆出现",
                "00:55-01:15 军官与士兵方队展示、医疗保障人员出现",
                "01:15-01:35 广场受阅、运输机滑行、飞行编队出现",
                "01:35-01:55 装备车辆密集通过、坦克与导弹装备展示",
                "01:55-02:10 大型导弹车辆展示、空中加油机与战斗机出现",
                "02:10-02:20 领导讲话、广场庆祝、视频总结阶段",
            ],
        },
        {
            topic: "指标验证支撑",
            children: ["可解释性技术", "关系图生成效率", "事件目标研判任务", "可解释性要素", "信息关联展现维度"],
        },
        {
            topic: "总结",
            children: ["目标数量多", "事件阶段清晰", "目标关联丰富", "可解释性线索明显", "适合系统技术指标验证"],
        },
    ],
};

const qaPairs = [
    {
        id: 1,
        question: "视频在 00:00—00:20 阶段主要展示了什么内容？画面中有哪些重要目标？",
        answer: "视频在 00:00—00:20 阶段主要展示阅兵活动的开场场景，包括仪仗队列队、受阅人员集结、飞机起飞以及纪念标识出现。画面中的重要目标包括仪仗人员、受阅方队、红旗、广场、飞机和纪念数字标识。这一阶段主要用于建立阅兵纪念活动的事件背景。",
        keywords: ["00:00", "00:20", "开场", "仪仗", "受阅", "飞机起飞", "纪念标识", "重要目标"],
    },
    {
        id: 2,
        question: "视频中 01:35—02:10 阶段出现了哪些装备目标？这些目标体现了什么事件含义？",
        answer: "视频在 01:35—02:10 阶段集中展示了多类装备目标，包括坦克、导弹运输车、雷达车辆、大型导弹车辆、空中加油机和战斗机等。这些目标体现出阅兵活动中的装备展示和空中力量展示环节，说明事件从人员方队展示逐步发展到地面装备和空中作战平台展示。",
        keywords: ["01:35", "02:10", "装备", "坦克", "导弹", "雷达", "加油机", "战斗机"],
    },
    {
        id: 3,
        question: "根据视频内容，系统可以从哪些方面生成可解释性分析结果？",
        answer: "系统可以从时间、空间、目标、行为和视觉证据等方面生成可解释性分析结果。例如，时间上可以分析方队、车辆和飞机依次出现的顺序；空间上可以关联广场、道路、机场和天空等场景；目标上可以识别人员、车辆、飞机、旗帜和主席台；行为上可以判断列队行进、车辆编队通过、飞机飞行、群众挥旗和领导讲话；视觉证据上可以利用军服、红旗、装备外形、字幕标语和飞行轨迹解释系统判断依据。",
        keywords: ["可解释", "解释性", "时间", "空间", "目标", "行为", "视觉证据", "分析结果"],
    },
];

let selectedVideoUrl = "";
let answeredCount = 0;

function renderMarkdown(sourceText, targetId) {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }

    if (window.marked) {
        target.innerHTML = marked.parse(sourceText);
        return;
    }

    const pre = document.createElement("pre");
    pre.textContent = sourceText;
    target.replaceChildren(pre);
}

function renderMindmapNode(node, level = 0) {
    const li = document.createElement("li");
    li.className = `mindmap-node level-${level}`;

    const label = document.createElement("span");
    label.textContent = typeof node === "string" ? node : node.topic;
    li.appendChild(label);

    if (typeof node !== "string" && node.children && node.children.length > 0) {
        const children = document.createElement("ul");
        node.children.forEach((child) => children.appendChild(renderMindmapNode(child, level + 1)));
        li.appendChild(children);
    }

    return li;
}

function findAnswer(question) {
    const normalizedQuestion = question.trim().toLowerCase();
    let bestPair = null;
    let bestScore = 0;

    qaPairs.forEach((pair) => {
        let score = normalizedQuestion === pair.question.toLowerCase() ? 100 : 0;
        pair.keywords.forEach((keyword) => {
            if (normalizedQuestion.includes(keyword.toLowerCase())) {
                score += 1;
            }
        });
        if (score > bestScore) {
            bestPair = pair;
            bestScore = score;
        }
    });

    return bestScore > 0 ? bestPair : null;
}

function appendQaMessage(type, text) {
    const messages = document.getElementById("qa-messages");
    const item = document.createElement("div");
    item.className = `qa-message ${type}`;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

async function copyFromElement(targetId, button) {
    const source = document.getElementById(targetId);
    if (!source) {
        return;
    }

    const text = source.textContent.trim();
    await navigator.clipboard.writeText(text);
    button.classList.add("copied");
    const original = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check2"></i>';
    window.setTimeout(() => {
        button.innerHTML = original;
        button.classList.remove("copied");
    }, 1400);
}

function showResultScreen(file) {
    const uploadScreen = document.getElementById("upload-screen");
    const resultScreen = document.getElementById("result-screen");
    const video = document.getElementById("uploaded-video");

    if (selectedVideoUrl) {
        URL.revokeObjectURL(selectedVideoUrl);
    }

    selectedVideoUrl = URL.createObjectURL(file);
    video.src = selectedVideoUrl;
    document.getElementById("current-file").textContent = `当前选择：${file.name}`;
    uploadScreen.classList.add("static-hidden");
    resultScreen.classList.remove("static-hidden");
    window.scrollTo({top: 0});
}

function resetQa() {
    answeredCount = 0;
    document.getElementById("qa-messages").replaceChildren();
    document.getElementById("qa-input").disabled = false;
    document.getElementById("qa-submit").disabled = false;
    document.getElementById("qa-status").textContent = "";
}

document.addEventListener("DOMContentLoaded", () => {
    const videoInput = document.getElementById("video-upload");
    const chooseButton = document.getElementById("choose-video");
    const showResultButton = document.getElementById("show-result");
    const selectedFile = document.getElementById("selected-file");
    const statusLine = document.getElementById("upload-status");

    document.getElementById("summary-source").textContent = fixedSummary;
    document.getElementById("mindmap-source").textContent = mindmapText;
    renderMarkdown(fixedSummary, "summary-content");
    document.getElementById("mindmap-tree").appendChild(renderMindmapNode(mindmapData));

    chooseButton.addEventListener("click", () => videoInput.click());
    videoInput.addEventListener("change", () => {
        const file = videoInput.files[0];
        showResultButton.disabled = !file;
        selectedFile.textContent = file ? `已选择：${file.name}` : "支持 MP4、AVI、MOV、MKV；静态页面不会把文件上传到服务器。";
        statusLine.textContent = file ? "视频已选择，点击下方按钮查看固定分析结果。" : "";
        statusLine.className = file ? "status-line success" : "status-line";
    });

    showResultButton.addEventListener("click", () => {
        const file = videoInput.files[0];
        if (!file) {
            statusLine.textContent = "请先选择视频文件。";
            statusLine.className = "status-line error";
            return;
        }
        resetQa();
        showResultScreen(file);
    });

    document.getElementById("back-upload").addEventListener("click", () => {
        document.getElementById("result-screen").classList.add("static-hidden");
        document.getElementById("upload-screen").classList.remove("static-hidden");
        window.scrollTo({top: 0});
    });

    const suggestions = document.getElementById("question-suggestions");
    qaPairs.forEach((pair) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "suggestion-btn";
        button.textContent = `问题 ${pair.id}`;
        button.title = pair.question;
        button.addEventListener("click", () => {
            document.getElementById("qa-input").value = pair.question;
            document.getElementById("qa-input").focus();
        });
        suggestions.appendChild(button);
    });

    document.getElementById("qa-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const input = document.getElementById("qa-input");
        const submit = document.getElementById("qa-submit");
        const status = document.getElementById("qa-status");
        const question = input.value.trim();

        if (!question) {
            status.textContent = "请先输入问题。";
            status.className = "status-line error";
            return;
        }

        if (answeredCount >= 3) {
            status.textContent = "三个问题和三个回答已完成。";
            status.className = "status-line error";
            return;
        }

        appendQaMessage("question", question);
        input.value = "";

        const pair = findAnswer(question);
        if (!pair) {
            appendQaMessage("answer", "该固定问答集只包含三个问题：00:00—00:20 开场内容、01:35—02:10 装备目标、以及可解释性分析结果。请围绕这三个方向提问。");
            status.textContent = `未命中固定问题，已回答 ${answeredCount} 个问题，剩余 ${3 - answeredCount} 个。`;
            status.className = "status-line error";
            return;
        }

        answeredCount += 1;
        appendQaMessage("answer", pair.answer);
        status.textContent = `已回答 ${answeredCount} 个问题，剩余 ${3 - answeredCount} 个。`;
        status.className = "status-line success";

        if (answeredCount === 3) {
            input.disabled = true;
            submit.disabled = true;
            status.textContent = "三个问题和三个回答已完成。";
        }
    });

    document.querySelectorAll("[data-copy-target]").forEach((button) => {
        button.addEventListener("click", () => {
            copyFromElement(button.dataset.copyTarget, button).catch(() => {
                window.alert("复制失败，请手动选择文本。");
            });
        });
    });
});
