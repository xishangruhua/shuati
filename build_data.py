# -*- coding: utf-8 -*-
"""把 single/multi/judge 三份 JSON 合并成网页用的 questions.js（含少量解析样例）。"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))

def load(name):
    return json.load(open(os.path.join(here, name), encoding="utf-8"))

single = load("single.json")
multi = load("multi.json")
judge = load("judge.json")

# —— 填入少量解析样例，作为模板示范（其余 explanation 留空） ——
sample = {
    ("single", 1): "答案 D。生理学研究健康动物机体的机能活动及其规律。A/B/C 只是机能活动的某些侧面，不够全面。",
    ("single", 2): "答案 A。细胞、分子水平最接近生命现象的本质规律；器官/系统/整体水平层次更高，不够本质。",
    ("multi", 1): "答案 ACD。神经调节短暂(A)、定位准确(C)、迅速(D)；持久(B)和作用广泛(E)是体液调节的特点。",
    ("judge", 1): "错误。内环境指细胞外液(血浆、组织液等)，不是细胞内的环境。",
    ("judge", 2): "正确。整体水平研究各系统功能联系及与环境的关系，是生理学的重要层次。",
}
for mid, mat in (("single", single), ("multi", multi), ("judge", judge)):
    for q in mat["questions"]:
        key = (mid, q["num"])
        # 注意：num 在不同章节会重复，这里样例仅命中第一次出现
        if key in sample and not q["explanation"]:
            q["explanation"] = sample.pop(key)

data = {"materials": [single, multi, judge]}
out = os.path.join(here, "questions.js")
with open(out, "w", encoding="utf-8") as f:
    f.write("// 题库数据。后续解析其他文件后，把材料对象追加进 materials 数组即可。\n")
    f.write("window.QUESTION_BANK = ")
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write(";\n")
print("OK ->", out)
total = sum(len(m["questions"]) for m in data["materials"])
print("materials:", [(m["id"], len(m["questions"])) for m in data["materials"]], "total:", total)
