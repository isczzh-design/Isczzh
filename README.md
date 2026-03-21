# 记忆曲线背单词 App

一个浏览器端背单词应用，重点是**复习优先 + 记忆曲线复习计划**，并支持安卓 APK 打包流水线。

## 功能

- 联网词库（IELTS / TOEFL），加载失败自动回退内置词库
- 语境学习：单词嵌入句子并高亮红色
- 初次学习时显示句子中文对照
- 复习时可通过“句子提示”按钮显示句子中文释义
- 两种背诵模式（每个词都需通过）：
  1. 显示句子和红色单词，输入中文意思
  2. 显示中文意思，在英文句子空格中填写单词
- 支持“下一个（略过）”
- 记忆曲线复习：`1, 2, 4, 7, 15, 30` 天
- 每日先复习后新词
- 学习统计：
  - 今日待复习
  - 今日新词
  - 今日计划总量
  - 今日已记住数量
  - 正确率、错误次数、总作答次数
- 语音朗读（美式英语）：单词朗读、句子朗读
- 句子逐词点击查义（内置词典 + 在线查询回退）
- 本地持久化（localStorage）

## 本地运行

```bash
python3 -m http.server 4173
# 然后打开 http://localhost:4173
```

## 测试

```bash
npm test
```

## Android APK 集成

本项目已提供 GitHub Actions 工作流：`.github/workflows/android-apk.yml`，会先把网页资源整理到 `www/`（Capacitor 的 `webDir`）、在 CI 中强制写入有效的 `capacitor.config.json`，并配置 Java 17 + npm cache。若仓库已包含 `android/` 工程，workflow 会先检测目录是否存在；存在时直接跳过 `cap add android`，只执行 `cap sync android`，避免再次触发 “android platform already exists” 报错。

使用方式：

1. 推送到 GitHub 仓库。
2. 在 Actions 页面手动触发 **Build Android APK**（workflow_dispatch）。
3. 构建完成后，在 Artifacts 下载 `vocab-debug-apk`，其中包含 `app-debug.apk`。

> 说明：本地直接打包 APK 需要 Android SDK/Gradle 环境。仓库内已集成自动化工作流，便于下载 APK 构建产物。
