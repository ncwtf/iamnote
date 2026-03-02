# iamnote

跨平台桌面便签应用，支持 Windows / macOS。基于 Tauri 2 + React 18 + TypeScript 构建。

---

## 功能特性

- **分组管理**：任务按分组组织，侧边栏可收起/拉宽
- **任务状态**：待办 / 进行中 / 已完成，左键正向切换，右键反向切换
- **任务置顶**：重要任务固定在分组顶部
- **收藏分组**：收藏任意任务，统一在收藏视图查看，修改双向同步
- **任务备注**：每个任务支持 Markdown 备注，悬停预览，点击打开编辑浮窗（左侧编辑 + 右侧实时预览）
- **归档功能**：每月 1 日自动归档上月已完成任务，也可手动归档，按月份查看
- **导入 / 导出**：一键将所有分组和任务导出为 JSON，支持从 JSON 恢复
- **云端同步**：指定本地云盘文件夹（Google Drive / OneDrive 等），自动写入同步文件，启动时以最后修改时间为准合并数据
- **快捷键**：可自定义「添加任务」本地快捷键 和「显示 / 隐藏窗口」全局快捷键
- **开机自启**：可选开机自动启动
- **窗口置顶**：可选始终显示在最前
- **4K 友好**：UI 针对高分辨率屏幕优化

---

## 开发环境

### 前置依赖

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) (rustup)
- Windows：需安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- Windows 推荐使用 GNU 工具链：`rustup target add x86_64-pc-windows-gnu`

### 安装依赖

```powershell
npm install
```

### 启动开发模式（热重载）

```powershell
npm run tauri dev
```

---

## 编译 & 打包

### 类型检查（不启动应用）

```powershell
npx tsc --noEmit
```

### 编译前端

```powershell
npm run build
```

### 打包安装包

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
npm run tauri build
```

打包完成后安装包路径：

```
src-tauri/target/release/bundle/nsis/iamnote_0.1.0_x64-setup.exe
```

> 首次打包需下载 Rust 依赖，耗时约 5~10 分钟；后续增量编译较快。

### 常用打包选项

```powershell
# 只重新编译 Rust，跳过前端重建（前端未改动时节省时间）
npm run tauri build -- --no-bundle

# 指定打包格式
npm run tauri build -- --bundles nsis
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.0 (Rust) |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand |
| Markdown | react-markdown + remark-gfm + remark-breaks |
| 图标 | lucide-react |
| 数据持久化 | tauri-plugin-store |
| 全局快捷键 | tauri-plugin-global-shortcut |
| 开机自启 | tauri-plugin-autostart |
| 窗口状态 | tauri-plugin-window-state |
| 文件对话框 | tauri-plugin-dialog |
| 文件读写 | tauri-plugin-fs + 自定义 Rust 命令 |
