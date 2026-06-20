# 刷题网页 1.0

给谭美琪的动物生理学刷题工具。纯静态网页，手机 / 平板 / 电脑浏览器打开网址即可使用，无需后端。

## 文件说明

```
刷题/
├── index.html      首页 + 答题页结构
├── style.css       样式（干净简洁、自适应）
├── app.js          全部交互逻辑
├── questions.js    题库数据（所有题目 + 答案 + 解析都在这里）
├── parse.py        Word 题库解析脚本
└── build_data.py   把解析结果合并成 questions.js
```

## 功能

- **首页**：标题「刷题」、资料卡片（每个 Word 一张，显示进度%）、错题集入口。
- **复习模式**：把该资料的题过一遍，正确答案红色高亮；鼠标左键点击或键盘 ↓ 键换下一题，↑ 键上一题。
- **测试模式**：滑条选题数（默认 20）→ 随机抽题、打乱选项。答对自动下一题；答错提示错误、上方小字标出原题号（方便定位）、下方显示解析，可上一道/下一道。结束给分数。
- **进度**：某资料进度到 100% 需「连续 3 次测试满分」且「已测试题目 ≥ 50%」，否则显示一个 <100 的百分比。
- **错题集**：做错的题自动收集，首页可进入再刷；答对后自动移出错题集。

进度和错题集存在浏览器本地（localStorage），换设备不互通。

## 如何补充其余题库 / 解析

题目、选项、答案都能从 Word 自动提取，**只有解析（explanation）需要你补充**。

### 1. 解析一个新 Word 文件

```powershell
# 在 题库_tools 目录下，三种题型分别用 single / multi / judge
python parse.py single "C:\路径\某单选文件.doc"  myid  "显示标题"
```

会生成 `myid.json`。每道题的 `explanation` 字段是空字符串，填上解析即可：
- 选择题解析：先说正确选项及原因，再简要说错误选项为什么不对。
- 判断题解析：说明对/错的原因。
- 解析尽量简短。

### 2. 合并进网页

把新材料加入 `build_data.py` 的加载列表，重新运行：

```powershell
python build_data.py
copy questions.js ..\刷题\questions.js
```

或直接手动编辑 `questions.js`：在 `materials` 数组里追加一个材料对象即可。

材料对象格式：

```js
{
  "id": "single",                  // 唯一英文 id
  "title": "动物生理学单选题",      // 首页显示名
  "type": "single",                // single 单选 / multi 多选 / judge 判断
  "questions": [
    { "num": 1, "chapter": "第一章 绪论",
      "stem": "题干（ ）。",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "answer": ["D"],             // 多选写多个字母；判断题改为 "answer": true/false 且无 options
      "explanation": "答案 D。..." }
  ]
}
```

## 本地预览

```powershell
cd 刷题
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 部署到你的域名

把 `刷题` 文件夹里的 4 个文件（index.html / style.css / app.js / questions.js）上传到任意静态空间：

- **虚拟主机 / 服务器**：上传到网站根目录即可。
- **GitHub Pages / Vercel / Netlify**：把文件夹推上去，绑定你的域名。

无需数据库、无需后端，传上去就能用。
