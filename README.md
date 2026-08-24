# SBS 无人机 AI 工作台

穿越机工程版第一阶段原型。项目目标是把穿越机的“建档、选型、装机、配置、自检、调参、维修、学习”整合到一个简洁桌面工作台中。

## 当前版本 v0.2

- 六大主入口：工作台、我的飞机、装机、调试、检测、学习
- 模拟飞控连接和状态展示
- 机体档案与配件信息页面
- 可保存进度的九步装机向导
- 串口、接收机、电机、OSD、PID、CLI 调试入口
- 一键自检交互和分级结果
- AI 工程助手侧栏
- 安全辅助模式：原型不执行真实飞控写入
- Electron 桌面应用外壳
- GitHub Actions 自动生成 Windows x64 和 Mac M1 安装包
- 黑黄四块品牌图标与 Apple 风格界面

## 本地运行

需要 Node.js 20 或更高版本：

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址即可。

生产构建：

```bash
npm run build
```

桌面调试：

```bash
npm run desktop:dev
```

生成当前系统安装包：

```bash
npm run desktop:build
```

## GitHub 自动打包

推送版本标签（例如 `v0.2.0`）后，`.github/workflows/desktop-release.yml` 会自动构建：

- Windows x64 `.exe`
- Mac Apple Silicon `.dmg`

构建完成后安装包会出现在 GitHub Release 页面。未配置 Apple 开发者签名时，Mac 首次打开可能需要在系统“隐私与安全性”中手动允许。

## 后续开发

1. Electron/Tauri 桌面壳与 Windows、macOS 安装包
2. Web Serial / native serialport 设备层
3. Betaflight MSP 读取适配器
4. 参数规则库、差异确认和自动回滚
5. CLI Diff/All 导入、对比与恢复
6. OSD 可视化编辑器与 UART 自动规划
7. Blackbox 日志分析与 PID 建议
8. 带来源的知识库与多模型 API

## 安全原则

任何电机测试、固件刷写、PID、失控保护及 GPS 救机配置都必须经过设备识别、配置备份、差异预览、用户确认、写入验证和失败回滚。AI 不直接绕过规则引擎写入飞控。
