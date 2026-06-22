# -*- coding: utf-8 -*-
"""生成4个深度学习模型可解释性功能测试表HTML"""

tables = []

# ==================== GN-011: GRU ====================
tables.append({
    'id': 'GN-011',
    'section': '5.1.7',
    'table_num': '表5-7',
    'title': '基于门控循环单元(GRU)的轨迹预测可解释性功能测试（GN-011）',
    'desc': '在船舶航迹可视化系统中，针对航迹预测任务，应用基于门控循环单元(GRU)的可解释性学习算法。GRU通过更新门和重置门控制信息流动来预测船舶未来位置，本测试验证系统如何通过GT/Pred对比、空间误差(RMSE Spatial)等可视化手段，直观解释GRU模型在空间维度上的预测依据和偏差分布',
    'indicator': '指标1：实现4类可解释性技术——GRU门控循环单元可解释性深度学习模型，支持可解释性规则的生成',
    'precondition': '船舶航迹可视化系统正常运行，航迹数据已加载',
    'steps': [
        ('打开船舶航迹可视化系统，确认"模型"下拉框默认选中"LSTM"', '系统正常加载，地图显示航迹线（绿色实际+橙色预测），右侧面板可见', '与期望测试结果一致'),
        ('在"模型"下拉框中选择"GRU"，观察地图航迹线变化', '地图航迹更新为GRU模型的预测结果，GT(绿)与Pred(橙)同时显示，两者空间位置差异可见', 'GRU模型可切换'),
        ('观察右侧面板RMSE字段中Spatial RMSE的数值', 'Spatial RMSE显示具体数值（如"0.02345"），反映GRU在空间维度上的预测误差', '空间误差有量化数值'),
        ('观察地图上GT与Pred之间的红色偏移连线', '偏移连线标注GRU预测点与对应实际点的空间偏差，连线越长偏差越大', '空间偏差可视化'),
        ('点击地图上绿色GT点和对应橙色Pred点，对比侧边栏详情', '详情面板分别显示GT点和Pred点的经纬度坐标，可直观对比GRU预测的空间位移', '点对点空间对比可用'),
        ('将模型切换至LSTM/RNN/DSTPP，对比GRU的Spatial RMSE', '不同模型的Spatial RMSE数值不同（GRU可能在某些轨迹上空间误差更小）', '模型间空间误差可对比'),
    ]
})

# ==================== GN-012: RNN ====================
tables.append({
    'id': 'GN-012',
    'section': '5.1.8',
    'table_num': '表5-8',
    'title': '基于循环神经网络(RNN)的轨迹预测可解释性功能测试（GN-012）',
    'desc': '在船舶航迹可视化系统中，针对航迹预测任务，应用基于循环神经网络(RNN)的可解释性学习算法。RNN通过建模航迹点的时间序列依赖关系来预测船舶未来位置，本测试验证系统如何通过动画回放、时间误差(RMSE Temporal)等可视化手段，直观解释RNN模型在时间维度上的预测依据和时序依赖关系',
    'indicator': '指标1：实现4类可解释性技术——RNN循环神经网络可解释性深度学习模型，支持可解释性规则的生成',
    'precondition': '船舶航迹可视化系统正常运行，航迹数据已加载',
    'steps': [
        ('在"模型"下拉框中选择"RNN"，观察地图航迹线', '地图航迹更新为RNN模型的预测结果，GT(绿)与Pred(橙)同时显示', 'RNN模型可切换'),
        ('观察右侧面板RMSE字段中Temporal RMSE的数值', 'Temporal RMSE显示具体数值，反映RNN在时间维度上的预测误差', '时间误差有量化数值'),
        ('点击"▶ 播放"按钮启动航迹动画', 'GT与Pred沿线推进，时间指示器实时更新，可观察RNN预测在时序上的偏离', '动画展示时序预测过程'),
        ('动画播放过程中观察GT与Pred在时间轴上的位置差异', '同一时间戳下GT点与Pred点位置不同时明显可见（红色偏移连线），体现RNN时序预测偏差', '时序偏差可视化'),
        ('点击"⏹"重置动画，切换轨迹#0→#25→#50，观察RNN在不同轨迹上的Temporal RMSE变化', '不同轨迹的Temporal RMSE数值不同，反映RNN对长短时序的适应性差异', '不同轨迹时序误差有区分'),
        ('将模型切换至GRU/LSTM/DSTPP，对比RNN的Temporal RMSE', '不同模型的Temporal RMSE数值不同（可判断哪个模型时序预测更准确）', '模型间时间误差可对比'),
    ]
})

# ==================== GN-013: LSTM ====================
tables.append({
    'id': 'GN-013',
    'section': '5.1.9',
    'table_num': '表5-9',
    'title': '基于长短期记忆网络(LSTM)的轨迹预测可解释性功能测试（GN-013）',
    'desc': '在船舶航迹可视化系统中，针对航迹预测任务，应用基于长短期记忆网络(LSTM)的可解释性学习算法。LSTM通过门控机制捕捉航迹中的长距离时序依赖关系，本测试验证系统如何通过Total RMSE、GT/Pred完整轨迹对比、意图分析等综合手段，直观解释LSTM模型的整体预测能力和可解释性依据',
    'indicator': '指标1：实现4类可解释性技术——LSTM长短期记忆网络可解释性深度学习模型，支持可解释性规则的生成',
    'precondition': '船舶航迹可视化系统正常运行，航迹数据已加载，意图数据已加载',
    'steps': [
        ('在"模型"下拉框中选择"LSTM"，观察地图航迹线和右侧面板', '地图显示LSTM预测结果，面板显示Total RMSE、Spatial RMSE、Temporal RMSE三项误差', 'LSTM模型可切换且显示三项误差'),
        ('对比LSTM的Total RMSE与GRU/RNN/DSTPP的Total RMSE', 'LSTM通常在Total RMSE上表现最优或次优，综合误差数值清晰可读', '综合误差可量化对比'),
        ('观察"🎯 航行属性与意图"面板中基于LSTM轨迹的意图分布', '意图面板显示5种意图的分布条形图和主导意图，该意图研判基于LSTM预测的轨迹', '预测结果关联意图研判'),
        ('点击地图上LSTM预测轨迹末端的Pred点，查看与对应GT点的偏移', '轨迹末端预测偏差通常最大，红色偏移连线清晰标注，侧边栏显示具体坐标差', '末端累积误差可视化'),
        ('点击"🌐 全局概览"，在全部100条轨迹中观察LSTM的预测效果', '全局视图中所有LSTM轨迹的GT线和Pred线同时显示，可宏观评估模型整体预测质量', '全局预测效果可评估'),
        ('切换轨迹至#0,#25,#50,#75,#90，记录LSTM在各轨迹上的Total RMSE', '不同轨迹的Total RMSE有差异，反映轨迹复杂度对LSTM预测的影响', '轨迹复杂度与误差关系可解释'),
    ]
})

# ==================== GN-014: DSTPP ====================
tables.append({
    'id': 'GN-014',
    'section': '5.1.10',
    'table_num': '表5-10',
    'title': '基于时空点过程模型(DSTPP)的轨迹预测可解释性功能测试（GN-014）',
    'desc': '在船舶航迹可视化系统中，针对航迹预测任务，应用基于时空点过程模型(DSTPP)的可解释性学习算法。DSTPP通过联合建模空间和时间维度的点过程强度来预测船舶轨迹，本测试验证系统如何通过空间+时间双维度误差可视化、模型间横向对比等手段，直观解释DSTPP模型的时空联合预测机制和可解释性',
    'indicator': '指标1：实现4类可解释性技术——DSTPP时空点过程可解释性深度学习模型，支持可解释性规则的生成',
    'precondition': '船舶航迹可视化系统正常运行，航迹数据已加载',
    'steps': [
        ('在"模型"下拉框中选择"DSTPP"，观察地图航迹线和面板RMSE', '地图显示DSTPP预测结果，面板同时显示Spatial RMSE和Temporal RMSE', 'DSTPP模型可切换'),
        ('对比DSTPP与GRU的空间误差：Spatial RMSE', '两个模型Spatial RMSE数值不同，可判断哪个模型空间建模更优', '空间维度模型对比可解释'),
        ('对比DSTPP与RNN的时间误差：Temporal RMSE', '两个模型Temporal RMSE数值不同，可判断哪个模型时间建模更优', '时间维度模型对比可解释'),
        ('同时观察DSTPP在地图上的空间偏差（红色偏移线）和动画中的时序偏差', 'DSTPP的时空双维度偏差同时可视化——空间偏差=偏移线、时间偏差=动画中GT/Pred位置差', '时空联合偏差可视化'),
        ('在DSTPP模型下播放动画，观察预测轨迹在转弯/变向处与GT的偏差', 'DSTPP在轨迹转弯/变向处的预测偏差通常较GRU和LSTM更小（因其时空联合建模）', '复杂轨迹段预测优势可解释'),
        ('将4个模型(GRU/RNN/LSTM/DSTPP)的Total RMSE并列对比', '4个模型的综合误差横向对比，验收人可判断各模型在不同轨迹上的适用性', '4模型综合可解释性对比'),
    ]
})


# ==================== 生成HTML ====================
css = '''<style>
  body { font-family: "Times New Roman","宋体",SimSun,serif; font-size: 10.5pt; margin: 20px auto; color: #000; max-width: 660px; }
  h1 { font-family: "Times New Roman","宋体",SimSun,serif; font-size: 14pt; text-align: justify; margin: 20px 0; font-weight: bold; }
  h2 { font-family: "Times New Roman","宋体",SimSun,serif; font-size: 14pt; margin: 30px 0 4px 0; text-align: justify; font-weight: bold; }
  p.note { font-family: "Times New Roman","宋体",SimSun,serif; font-size: 12pt; margin: 0 0 8px 0; text-align: center; }
  table.w { border-collapse: collapse; width: 100%; margin-bottom: 28px; }
  table.w td, table.w th { border: 1px solid #000; padding: 2px 5px; vertical-align: top; font-size: 9pt; line-height: 1.35; font-family: "Times New Roman","宋体",SimSun,serif; word-break: break-all; }
  table.w td.ka { width: 58px; text-align: center; font-weight: bold; vertical-align: middle; }
  table.w td.v4 { text-align: left; }
  table.w td.sec { text-align: center; font-weight: bold; }
  table.w th { text-align: center; font-weight: bold; }
  table.w td.c1 { width: 36px; text-align: center; }
  table.w td.c4 { text-align: center; }
  table.w td.c5 { text-align: center; }
  table.w td.cka { width: 58px; text-align: center; font-weight: bold; vertical-align: middle; }
  table.w td.note-row { font-size: 8.5pt; color: #444; padding: 6px 8px; line-height: 1.5; text-align: justify; }
  @media print { body { margin: 0; max-width: none; } h2 { page-break-before: always; } h2:first-of-type { page-break-before: avoid; } }
</style>'''

rows = []
rows.append('<!DOCTYPE html>')
rows.append('<html lang="zh-CN">')
rows.append('<head><meta charset="UTF-8">')
rows.append('<title>深度学习可解释性功能测试</title>')
rows.append(css)
rows.append('</head><body>')
rows.append('<h1>5.1 功能测试</h1>')

for t in tables:
    rows.append(f'<h2>{t["title"]}</h2>')
    rows.append(f'<p class="note">{t["table_num"]} {t["id"]}测试用例</p>')
    rows.append('<table class="w">')
    rows.append('<colgroup><col style="width:36px"><col style="width:58px"><col style="width:112px"><col style="width:180px"><col style="width:74px"><col style="width:82px"></colgroup>')

    meta = [
        ('测试用例名称', t['title'].split('（')[0]),
        ('测试用例标识', t['id']),
        ('测试用例描述', t['desc']),
        ('涉及的指标', t['indicator']),
        ('前提和约束', t['precondition']),
        ('测试终止条件', '所有测试步骤执行完毕而终止，或因软件运行错误终止'),
    ]
    for k, v in meta:
        rows.append(f'<tr><td class="ka" colspan="2">{k}</td><td class="v4" colspan="4">{v}</td></tr>')

    rows.append('<tr><td class="sec" colspan="6">测试过程</td></tr>')
    rows.append('<tr><th>序号</th><th colspan="2">输入及操作步骤</th><th>期望测试结果</th><th>评估准则</th><th>符合性判定<br>（√或×或测试结果）</th></tr>')

    for i, (step, expect, criteria) in enumerate(t['steps'], 1):
        rows.append(f'<tr><td class="c1">{i}</td><td colspan="2">{step}</td><td>{expect}</td><td class="c4">{criteria}</td><td class="c5"></td></tr>')

    rows.append('<tr><td class="cka" colspan="2">测试结论</td><td class="v4" colspan="4">&nbsp;&nbsp;□ 通过&nbsp;&nbsp;&nbsp;&nbsp;□ 未通过&nbsp;&nbsp;&nbsp;&nbsp;□ 未测试</td></tr>')
    rows.append('<tr><td class="cka" colspan="2">操作人员</td><td class="v4" colspan="4"></td></tr>')
    rows.append('<tr><td class="cka" colspan="2">测试时间</td><td class="v4" colspan="4"></td></tr>')

    notes = {
        'GN-011': 'GRU（门控循环单元）是一种通过更新门和重置门控制信息流动的深度学习模型，参数更少、训练更快，在捕捉航迹时序依赖关系的同时保持较高的计算效率。本测试用例通过对比GT实际轨迹与GRU预测轨迹的空间偏差（Spatial RMSE）、红色偏移连线等可视化手段，解释GRU模型在空间维度上的预测依据——即哪些空间区域的预测更准确、哪些存在较大偏差，从而为GRU的预测结果提供直观的可解释性。',
        'GN-012': 'RNN（循环神经网络）是一种通过隐藏状态递归传递时序信息的深度学习模型，擅长捕捉航迹中的短期时序依赖关系。本测试用例通过动画回放、时间误差（Temporal RMSE）等可视化手段，解释RNN在时间维度上的预测机制——即预测如何随时间推进逐步偏离实际轨迹，以及时序依赖长度对预测精度的影响。',
        'GN-013': 'LSTM（长短期记忆网络）是一种通过输入门、遗忘门、输出门控制信息流动的深度学习模型，能够捕捉航迹中的长距离时序依赖关系。本测试用例通过Total RMSE综合误差、全局概览、意图分析关联等综合手段，解释LSTM模型的整体预测能力和可解释性——即综合空间+时间两个维度的预测质量，以及预测结果如何支撑上层的意图研判任务。',
        'GN-014': 'DSTPP（时空点过程模型）是一种联合建模空间和时间维度的点过程强度函数的深度学习模型，通过时空耦合的方式预测船舶轨迹。本测试用例通过空间误差+时间误差双维度对比、4模型横向综合分析等手段，解释DSTPP的时空联合预测优势——即在空间和时间两个维度上同时实现较高的预测精度，尤其在轨迹转弯/变向等复杂场景下表现更优。',
    }
    note = notes.get(t['id'], '')
    if note:
        rows.append(f'<tr><td class="ka" colspan="2">备&nbsp;&nbsp;&nbsp;&nbsp;注</td><td class="note-row" colspan="4">{note}</td></tr>')

    rows.append('</table>')

rows.append('</body></html>')

out = r'd:\华东师大计科\6月事件文件\新系统\深度学习可解释性测试表.html'
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(rows))
print(f'Generated: {out}  ({len(tables)} tables)')
