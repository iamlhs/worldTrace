# -*- coding: utf-8 -*-
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

DOC_PATH = r'd:\华东师大计科\6月事件文件\新系统\file_source\四.测试内容表.docx'

doc = Document(DOC_PATH)
tbl = doc.tables[1]._tbl
rows = tbl.findall(qn('w:tr'))

module_labels = {
    1: '认知图', 2: '认知图', 3: '认知图',
    4: '可解释性模型测试', 5: '可解释性模型测试', 6: '可解释性模型测试',
    7: '可解释性模型测试', 8: '可解释性模型测试', 9: '可解释性模型测试',
    10: '可解释性模型测试',
    11: '典型场景应用', 12: '典型场景应用', 13: '典型场景应用',
    14: '典型场景应用', 15: '典型场景应用', 16: '典型场景应用',
}

for i in range(1, len(rows)):
    cells = rows[i].findall(qn('w:tc'))

    # Remove vMerge from C0 (序号)
    tcPr0 = cells[0].find(qn('w:tcPr'))
    if tcPr0 is not None:
        vm = tcPr0.find(qn('w:vMerge'))
        if vm is not None:
            tcPr0.remove(vm)

    # Set C0 text to sequence number
    for p in cells[0].findall(qn('w:p')):
        for r in p.findall(qn('w:r')):
            p.remove(r)
    fp = cells[0].find(qn('w:p'))
    if fp is None:
        fp = OxmlElement('w:p'); cells[0].insert(0, fp)
    r = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    rf = OxmlElement('w:rFonts'); rf.set(qn('w:eastAsia'), '宋体'); rPr.append(rf)
    sz = OxmlElement('w:sz'); sz.set(qn('w:val'), '20'); rPr.append(sz)
    r.append(rPr)
    t = OxmlElement('w:t'); t.set(qn('xml:space'), 'preserve'); t.text = str(i); r.append(t)
    fp.append(r)

    # Check C1 (模块) - if blank, restore label
    if i in module_labels:
        c1_text = ''
        for p in cells[1].findall(qn('w:p')):
            for r2 in p.findall(qn('w:r')):
                c1_text += r2.text or ''
        if not c1_text.strip():
            for p in cells[1].findall(qn('w:p')):
                for r2 in p.findall(qn('w:r')):
                    p.remove(r2)
            fp2 = cells[1].find(qn('w:p'))
            if fp2 is None:
                fp2 = OxmlElement('w:p'); cells[1].insert(0, fp2)
            r2 = OxmlElement('w:r')
            rPr2 = OxmlElement('w:rPr')
            rf2 = OxmlElement('w:rFonts'); rf2.set(qn('w:eastAsia'), '宋体'); rPr2.append(rf2)
            sz2 = OxmlElement('w:sz'); sz2.set(qn('w:val'), '20'); rPr2.append(sz2)
            r2.append(rPr2)
            t2 = OxmlElement('w:t'); t2.set(qn('xml:space'), 'preserve'); t2.text = module_labels[i]; r2.append(t2)
            fp2.append(r2)

doc.save(DOC_PATH)
print('Done!')
