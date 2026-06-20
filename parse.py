# -*- coding: utf-8 -*-
"""
刷题题库解析脚本：把动物生理学的 Word 题库转成统一 JSON。
支持三种题型：single(单选) / multi(多选) / judge(判断)。

用法：
    python parse.py single "动物生理学单选题(1).doc"  single
    python parse.py multi  "动物生理学多选题(1).doc"  multi
    python parse.py judge  "生理判断.docx"            judge

输出：与脚本同目录的 <id>.json （单个材料），可再用 merge 合并进 questions.js
答案直接从原文括号内提取；解析字段(explanation)留空，待人工/AI补充。
"""
import sys, os, re, html, zipfile, json

def read_doc_text(path):
    """读取 .doc 或 .docx 的纯文本。.docx 直接解压；.doc 用 Word COM。"""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".docx":
        z = zipfile.ZipFile(path)
        xml = z.read("word/document.xml").decode("utf-8")
        xml = re.sub(r"</w:p>", "\n", xml)
        text = re.sub(r"<[^>]+>", "", xml)
        return html.unescape(text)
    elif ext == ".doc":
        import win32com.client
        w = win32com.client.Dispatch("Word.Application")
        w.Visible = False
        doc = w.Documents.Open(os.path.abspath(path), False, True)
        text = doc.Content.Text
        doc.Close(False)
        w.Quit()
        return text
    else:
        raise ValueError("仅支持 .doc / .docx：" + path)

CHAPTER_RE = re.compile(r"第[一二三四五六七八九十]+章\s*[^\d\n]*")

def split_chapters(text):
    """返回 [(chapter_title, body), ...]"""
    # 规范化空白
    text = text.replace("\r", "\n")
    parts = []
    matches = list(CHAPTER_RE.finditer(text))
    if not matches:
        return [("", text)]
    for i, m in enumerate(matches):
        title = m.group(0).strip()
        start = m.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        parts.append((title, text[start:end]))
    return parts

# 题号：1. 1． 1、 等，后跟题干
QNUM_RE = re.compile(r"(?:^|\s|　)(\d{1,3})[．.、](?!\d)")

def split_questions(body):
    """按题号切分一个章节内的题目，返回 [(num, qtext), ...]"""
    # 去掉参考答案块（单选题章节末）
    body = re.split(r"参考答案", body)[0]
    items = []
    matches = list(QNUM_RE.finditer(body))
    for i, m in enumerate(matches):
        num = int(m.group(1))
        start = m.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(body)
        qtext = body[start:end].strip()
        if qtext:
            items.append((num, qtext))
    return items

OPT_RE = re.compile(r"([A-EＡ-Ｅ])[．.、)）]?\s*")

def parse_choice_question(qtext, multi=False):
    """解析单选/多选题：返回 (stem, options_dict, answer_list)。"""
    # 提取括号内答案，如 （ D ）（ACD）（   A  ）
    ans = None
    def grab(m):
        nonlocal ans
        inner = m.group(1)
        letters = re.findall(r"[A-EＡ-Ｅ]", inner)
        if letters:
            ans = [normalize_letter(x) for x in letters]
            return "（  ）"  # 占位，去掉答案
        return m.group(0)
    body = re.sub(r"[（(]([^（）()]*)[)）]", grab, qtext, count=0)
    # 切出选项区：从第一个 "A" 选项开始
    opts = {}
    # 用 A. B. C. D. E. 切分（全角/半角，分隔符可有可无）
    optmatches = list(re.finditer(r"([A-EＡ-Ｅ])[．.、](?!\d)\s*", body))
    if optmatches:
        stem = body[:optmatches[0].start()].strip()
        for i, m in enumerate(optmatches):
            letter = normalize_letter(m.group(1))
            s = m.end()
            e = optmatches[i+1].start() if i+1 < len(optmatches) else len(body)
            opts[letter] = body[s:e].strip().rstrip("　 ")
    else:
        stem = body.strip()
    stem = clean_stem(stem)
    return stem, opts, (ans or [])

def normalize_letter(ch):
    full = "ＡＢＣＤＥ"
    half = "ABCDE"
    if ch in full:
        return half[full.index(ch)]
    return ch

def clean_stem(s):
    s = s.replace("答：", "").strip()
    s = re.sub(r"\s+", " ", s)
    return s.strip()

def parse_judge_question(qtext):
    """判断题：返回 (stem, answer_bool)。√=True ×=False"""
    ans = None
    def grab(m):
        nonlocal ans
        inner = m.group(1)
        if "√" in inner or "对" in inner or "T" in inner.upper():
            ans = True
            return ""
        if "×" in inner or "✕" in inner or "错" in inner or "F" in inner.upper():
            ans = False
            return ""
        return m.group(0)
    body = re.sub(r"[（(]([^（）()]*)[)）]", grab, qtext)
    stem = clean_stem(body)
    return stem, ans

def parse_file(qtype, path, mid, title):
    text = read_doc_text(path)
    chapters = split_chapters(text)
    questions = []
    for chap, body in chapters:
        for num, qtext in split_questions(body):
            if qtype == "judge":
                stem, ans = parse_judge_question(qtext)
                if ans is None or not stem:
                    continue
                questions.append({"num": num, "chapter": chap, "stem": stem,
                                   "answer": ans, "explanation": ""})
            else:
                multi = (qtype == "multi")
                stem, opts, ans = parse_choice_question(qtext, multi)
                if not opts or not ans:
                    continue
                questions.append({"num": num, "chapter": chap, "stem": stem,
                                  "options": opts, "answer": ans, "explanation": ""})
    return {"id": mid, "title": title, "type": qtype, "questions": questions}

if __name__ == "__main__":
    qtype, path, mid = sys.argv[1], sys.argv[2], sys.argv[3]
    title = sys.argv[4] if len(sys.argv) > 4 else mid
    material = parse_file(qtype, path, mid, title)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), mid + ".json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(material, f, ensure_ascii=False, indent=2)
    print(f"OK {mid}: {len(material['questions'])} questions -> {out}")
