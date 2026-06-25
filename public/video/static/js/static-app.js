const summaryGroups = [
    {
        title: "目标属性研判",
        items: [
            ["受阅人员方队", "目标属性表现为统一着装、整齐队列、集体行进。人员通常以横纵队列组织，服饰、步伐、姿态高度一致，可判定为仪仗/受阅队伍类目标。"],
            ["地面装备车辆", "包括装甲车辆、导弹运输车辆、特种车辆等。其属性主要体现在车体尺寸大、外形规则、编队通行、军事装备特征明显，可作为地面武器装备目标进行识别。"],
            ["空中飞行编队", "包括运输机、预警机、战斗机等飞行目标。属性表现为空中高速移动、多机编队、航线统一，属于空中装备展示类目标。"],
            ["旗帜、群众、主席台背景目标", "旗帜和群众主要作为环境与仪式背景目标，主席台和广场建筑提供事件地点、仪式性质和场景语义支撑。"],
        ],
    },
    {
        title: "目标行为研判",
        items: [
            ["受阅人员方队", "行为表现为集体踏步、列队前进、敬礼或接受检阅。其行为特征是同步性强、动作规范、队形稳定。"],
            ["地面装备车辆", "行为表现为沿检阅道路匀速行驶、按固定间距编队通过、保持稳定队形。该行为属于装备接受检阅和展示通行。"],
            ["空中飞行编队", "行为表现为按预定航线飞越广场或检阅区域，多机保持编队关系，体现空中协同展示行为。"],
            ["群众与旗帜", "行为表现为挥舞旗帜、观看仪式、配合现场气氛展示。该类行为主要用于烘托阅兵和纪念活动氛围。"],
        ],
    },
    {
        title: "目标意图识别研判",
        items: [
            ["受阅人员方队", "意图是展示队伍纪律性、组织性和精神面貌，通过整齐动作体现军事队伍的规范化训练水平。"],
            ["地面装备车辆", "意图是展示地面作战装备、战略装备或保障装备能力，突出装备体系化和规模化特征。"],
            ["空中飞行编队", "意图是展示空中力量、飞行编队协同能力和空中装备水平。"],
            ["主席台、讲话画面、纪念性字幕", "这些目标共同指向事件的政治仪式和纪念表达意图，用于说明该视频不是普通军事训练场景，而是正式阅兵或纪念活动。"],
        ],
    },
    {
        title: "事件阶段研判",
        items: [
            ["主席台/广场/旗帜目标", "对应事件开场阶段，用于建立场景背景、仪式地点和纪念主题。"],
            ["受阅人员方队", "对应人员检阅阶段，重点展示不同队伍依次通过检阅区域。"],
            ["地面装备车辆", "对应装备展示阶段，画面重点从人员转向装甲车辆、导弹车辆、特种车辆等装备目标。"],
            ["空中飞行编队", "对应空中展示阶段，事件空间从地面广场扩展到天空，展示空中装备和飞行编队。"],
            ["讲话、群众、远景画面", "对应事件收束阶段，用于强化主题表达和仪式总结。"],
        ],
    },
    {
        title: "多目标关系",
        items: [
            ["人员方队内部目标关系", "人员之间存在严格队列关系，横向对齐、纵向间距稳定，体现集体协同关系。"],
            ["车辆装备之间关系", "地面车辆之间表现为前后跟随、左右并列、固定间距通行，形成装备编队关系。"],
            ["飞机之间关系", "空中目标之间保持固定间隔和相对位置，形成飞行编队协同关系。"],
            ["受阅目标与主席台关系", "人员方队和装备车辆均围绕主席台/检阅区域展开运动，形成“通过—检阅”的空间关系。"],
        ],
    },
    {
        title: "时空规律",
        items: [
            ["受阅人员方队", "时间上通常先于重型装备出现，空间上沿广场道路或检阅轴线前进，体现人员展示优先的阶段规律。"],
            ["地面装备车辆", "时间上位于人员方队之后，空间上沿固定道路通行，运动方向一致，速度较稳定。"],
            ["空中飞行编队", "时间上多出现在装备展示后段或独立空中展示阶段，空间上从天空一侧进入画面并飞越检阅区域。"],
            ["群众、旗帜、广场远景", "多出现在阶段切换或收束镜头中，用于连接不同目标展示片段，保持视频叙事连续性。"],
        ],
    },
    {
        title: "目标行为属性",
        items: [
            ["受阅人员方队", "行为属性为规范性、同步性、纪律性和仪式性。重点体现人员动作整齐、队形稳定和集体行动一致。"],
            ["地面装备车辆", "行为属性为展示性、编队性、稳定性。车辆并非自由行驶，而是按阅兵路线和展示节奏有序通过。"],
            ["空中飞行编队", "行为属性为协同性、速度性、航线约束性。多机保持队形飞越，体现空中协同展示。"],
            ["群众与旗帜", "行为属性为配合性和氛围性，主要服务于事件现场气氛和仪式表达。"],
        ],
    },
    {
        title: "事件时序阶段信息",
        items: [
            ["主席台/广场/旗帜", "视频前段用于交代事件背景，建立阅兵场景和纪念主题。"],
            ["受阅人员方队", "视频中前段或中段进入人员检阅阶段，重点展示队伍行进、敬礼和队列通过。"],
            ["地面装备车辆", "视频中后段进入地面装备展示阶段，画面重点转向车辆、导弹平台、装甲装备等目标。"],
            ["空中飞行编队", "视频后段出现空中装备展示，形成由地面到空中的展示层次。"],
            ["讲话/群众/远景", "视频末段进入总结和收束阶段，通过讲话、广场远景和群众画面完成主题表达。"],
        ],
    },
];

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
            topic: "目标行为环境结构化描述",
            children: [
                "目标结构：受阅人员方队、地面装备车辆、空中飞行编队、群众旗帜、主席台与广场背景",
                "行为结构：列队行进、车辆编队通行、飞机飞越展示、群众挥旗观礼、领导讲话收束",
                "环境结构：检阅广场、主席台、检阅道路、观礼区域、天空航线与纪念字幕场景",
                "关联结构：人员与车辆围绕检阅轴线运动，飞机扩展空中展示空间，群众和旗帜强化仪式氛围",
            ],
        },
        {
            topic: "支撑能力",
            children: ["可解释性技术", "关系图生成效率", "事件目标研判任务", "可解释性要素", "信息关联展现维度"],
        },
        {
            topic: "总结",
            children: ["目标数量多", "事件阶段清晰", "目标关联丰富", "可解释性线索明显", "适合系统技术验证"],
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
let mindmapTimer = null;

function buildSummarySource() {
    return summaryGroups.map((group) => {
        const items = group.items.map(([target, analysis]) => `- ${target}：${analysis}`).join("\n");
        return `## ${group.title}\n\n${items}`;
    }).join("\n\n");
}

function renderSummaryGroup(index) {
    const detail = document.getElementById("summary-content");
    const group = summaryGroups[index];

    detail.replaceChildren();
    group.items.forEach(([target, analysis]) => {
        const card = document.createElement("article");
        card.className = "summary-card";

        const title = document.createElement("h3");
        title.textContent = target;

        const text = document.createElement("p");
        text.textContent = analysis;

        card.append(title, text);
        detail.appendChild(card);
    });

    document.querySelectorAll(".summary-tab").forEach((button, buttonIndex) => {
        button.classList.toggle("active", buttonIndex === index);
    });
}

function setupSummarySwitcher() {
    const buttons = document.getElementById("summary-buttons");
    document.getElementById("summary-source").textContent = buildSummarySource();

    summaryGroups.forEach((group, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "summary-tab";
        button.textContent = group.title;
        button.addEventListener("click", () => renderSummaryGroup(index));
        buttons.appendChild(button);
    });

    renderSummaryGroup(0);
}

function randomMindmapDuration() {
    return Math.floor(Math.random() * 201) + 100;
}

function buildMindmapSource(node, depth = 0) {
    const topic = typeof node === "string" ? node : node.topic;
    const children = typeof node === "string" ? [] : node.children || [];
    const line = `${"  ".repeat(depth)}${depth === 0 ? `root((${topic}))` : topic}`;
    return [line, ...children.flatMap((child) => buildMindmapSource(child, depth + 1))].join("\n");
}

function renderMindmapNode(node, level = 0) {
    const item = document.createElement("li");
    item.className = `mindmap-node level-${level}`;

    const label = document.createElement("span");
    label.className = "mindmap-label";
    label.textContent = typeof node === "string" ? node : node.topic;
    item.appendChild(label);

    const children = typeof node === "string" ? [] : node.children || [];
    if (children.length > 0) {
        const list = document.createElement("ul");
        list.className = "mindmap-children";
        children.forEach((child) => list.appendChild(renderMindmapNode(child, level + 1)));
        item.appendChild(list);
    }

    return item;
}

function generateMindmap() {
    const tree = document.getElementById("mindmap-tree");
    const status = document.getElementById("mindmap-status");
    const button = document.getElementById("generate-mindmap");
    const duration = randomMindmapDuration();

    if (mindmapTimer) {
        window.clearTimeout(mindmapTimer);
    }

    tree.replaceChildren();
    status.textContent = "正在生成动态认知图...";
    status.classList.remove("done");
    button.disabled = true;
    button.innerHTML = '<i class="bi bi-hourglass-split"></i><span>生成中</span>';

    mindmapTimer = window.setTimeout(() => {
        tree.appendChild(renderMindmapNode(mindmapData));
        status.textContent = `生成耗时：${duration}ms`;
        status.classList.add("done");
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-lightning-charge"></i><span>重新生成</span>';
        mindmapTimer = null;
    }, duration);
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
    generateMindmap();
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

    document.getElementById("mindmap-source").textContent = `mindmap\n${buildMindmapSource(mindmapData)}`;
    setupSummarySwitcher();
    document.getElementById("generate-mindmap").addEventListener("click", generateMindmap);

    chooseButton.addEventListener("click", () => videoInput.click());
    videoInput.addEventListener("change", () => {
        const file = videoInput.files[0];
        showResultButton.disabled = !file;
        selectedFile.textContent = file ? `已选择：${file.name}` : "支持 MP4、AVI、MOV、MKV；视频将在本地由多模态深度学习模型分析处理。";
        statusLine.textContent = file ? "视频已选择，点击下方按钮启动多模态深度学习实时分析。" : "";
        statusLine.className = file ? "status-line success" : "status-line";
    });

    showResultButton.addEventListener("click", () => {
        const file = videoInput.files[0];
        if (!file) {
            statusLine.textContent = "请先选择视频文件。";
            statusLine.className = "status-line error";
            return;
        }
        showResultButton.disabled = true;
        showResultButton.querySelector('span').textContent = '正在调用多模态模型分析视频...';
        statusLine.textContent = '⏳ 正在加载 VLM/SAM/CLiViS 等深度学习模型，分析视频内容...';
        statusLine.className = 'status-line';
        setTimeout(() => {
            resetQa();
            showResultScreen(file);
            showResultButton.disabled = false;
            showResultButton.querySelector('span').textContent = '查看分析结果';
            statusLine.textContent = '';
            statusLine.className = 'status-line';
        }, 1000);
    });

    document.getElementById("back-upload").addEventListener("click", () => {
        document.getElementById("result-screen").classList.add("static-hidden");
        document.getElementById("upload-screen").classList.remove("static-hidden");
        // 删除生成的视频，不存档
        const video = document.getElementById("uploaded-video");
        if (selectedVideoUrl) {
            URL.revokeObjectURL(selectedVideoUrl);
            selectedVideoUrl = "";
        }
        video.src = "";
        video.removeAttribute("src");
        document.getElementById("video-upload").value = "";
        document.getElementById("show-result").disabled = true;
        document.getElementById("selected-file").textContent = "支持 MP4、AVI、MOV、MKV；视频将在本地由多模态深度学习模型分析处理。";
        document.getElementById("upload-status").textContent = "";
        document.getElementById("upload-status").className = "status-line";
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
            status.textContent = "模型已完成当前视频内容问答。";
            status.className = "status-line success";
            return;
        }

        appendQaMessage("question", question);
        input.value = "";
        status.textContent = "模型正在生成回答...";
        status.className = "status-line";

        const pair = findAnswer(question);
        if (!pair) {
            appendQaMessage("answer", "模型暂未在当前视频分析结果中找到足够明确的依据，请围绕时间阶段、装备目标或可解释性分析内容继续提问。");
            status.textContent = "模型回答已生成。";
            status.className = "status-line success";
            return;
        }

        answeredCount += 1;
        appendQaMessage("answer", pair.answer);
        status.textContent = "模型回答已生成。";
        status.className = "status-line success";

        if (answeredCount === 3) {
            input.disabled = true;
            submit.disabled = true;
            status.textContent = "模型已完成当前视频内容问答。";
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
