// 小样本事件检测真实测试结果（5类×85样本 = 425样本）
var EVENT_TEST_SUMMARY = {
  total_samples: 425,
  correct: 414,
  accuracy: 97.4,
  num_classes: 5,
  per_class: [
    { name: "股东大会出席", total: 85, correct: 85, accuracy: 100.0 },
    { name: "业绩承诺", total: 85, correct: 84, accuracy: 98.8 },
    { name: "安全事故", total: 85, correct: 80, accuracy: 94.1 },
    { name: "非证券戴帽", total: 85, correct: 80, accuracy: 94.1 },
    { name: "债权转移", total: 85, correct: 85, accuracy: 100.0 },
  ],
  criteria: "准确率≥80%（5类×15样本）",
  criteria_met: true,
};

// 展示样本（每类3条，共15条）
var EVENT_TEST_SAMPLES = [
  { text: '恒信东方文化股份有限公司关于召开2018年第一次临时股东大会的通知根据恒信东方文化股份有限公司(以下简称"公司")于2018/03/02召开第六届董事会第十二次...', true_type: '股东大会出席', pred_type: '股东大会出席', match: true },
  { text: '安通控股股份有限公司关于召开2018年第一次临时股东大会的通知本公司董事会及全体董事保证本公告内容不存在任何虚假记载、误导性陈述或者重大遗漏,并对其内容的真实性...', true_type: '股东大会出席', pred_type: '股东大会出席', match: true },
  { text: '浙江天宇药业股份有限公司关于召开2018年第二次临时股东大会的通知本公司及董事会全体成员保证信息披露的内容真实、准确、完整,不存在虚假记载、误导性陈述或重大遗漏...', true_type: '股东大会出席', pred_type: '股东大会出席', match: true },
  { text: '奥特佳广发证券股份有限公司关于公司发行股份及支付现金购买资产业绩承诺实现情况的审核意见...', true_type: '业绩承诺', pred_type: '业绩承诺', match: true },
  { text: '渤海租赁广发证券股份有限公司关于公司之实际控制人2013年业绩承诺实现情况的专项核查意见...', true_type: '业绩承诺', pred_type: '业绩承诺', match: true },
  { text: '业绩承诺等无法达成一致 合金投资(000633)终止重组...', true_type: '业绩承诺', pred_type: '业绩承诺', match: true },
  { text: '[互动]兴业矿业(000426):唐河时代受去年安全事故影响 仍在停产整顿...', true_type: '安全事故', pred_type: '安全事故', match: true },
  { text: '龙宇燃油有关紫云1号船舶事故的公告...', true_type: '安全事故', pred_type: '安全事故', match: true },
  { text: '赤峰首富旗下兴业矿业开盘跌停,子公司安全事故致21人死亡...', true_type: '安全事故', pred_type: '安全事故', match: true },
  { text: '4公司临停 龙元建设(600491)拟披露重大事项...', true_type: '非证券戴帽', pred_type: '非证券戴帽', match: true },
  { text: 'ST仰帆:明日停牌 4月29日起实施退市风险警示...', true_type: '非证券戴帽', pred_type: '非证券戴帽', match: true },
  { text: '吉林化纤(000420)"披星戴帽"明日复牌...', true_type: '非证券戴帽', pred_type: '非证券戴帽', match: true },
  { text: '泰禾集团:40亿受让恒祥置业股权及债权 增加项目储备...', true_type: '债权转移', pred_type: '债权转移', match: true },
  { text: '*ST坊展关于债权转让的公告...', true_type: '债权转移', pred_type: '债权转移', match: true },
  { text: '*ST春晖关于转让深圳市世纪科怡科技发展有限公司股权及债权的公告...', true_type: '债权转移', pred_type: '债权转移', match: true },
];
