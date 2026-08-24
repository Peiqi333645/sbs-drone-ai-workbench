import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, Bot, Box, Cable, Check, ChevronRight, CircleAlert, Cpu,
  Gauge, GraduationCap, HardDrive, Home, LayoutDashboard, Menu, Plane,
  PlugZap, Radio, Search, Settings, ShieldCheck, SlidersHorizontal,
  Sparkles, Wrench, X, Zap
} from 'lucide-react';
import './styles.css';
import './apple.css';

type Page = 'home' | 'aircraft' | 'build' | 'tune' | 'inspect' | 'learn';
type Tone = 'good' | 'warn' | 'bad' | 'muted';

const nav = [
  { id: 'home' as Page, label: '工作台', icon: LayoutDashboard },
  { id: 'aircraft' as Page, label: '我的飞机', icon: Plane },
  { id: 'build' as Page, label: '装机', icon: Wrench },
  { id: 'tune' as Page, label: '调试', icon: SlidersHorizontal },
  { id: 'inspect' as Page, label: '检测', icon: ShieldCheck },
  { id: 'learn' as Page, label: '学习', icon: GraduationCap }
];

const inspectionRows = [
  ['飞控与固件', 'SPEEDYBEEF405V4 · Betaflight 4.5.1', 'good'],
  ['陀螺仪', '识别正常 · 噪声待飞行日志验证', 'good'],
  ['串口资源', 'UART1 / UART2 / UART3 已规划', 'good'],
  ['接收机', '未检测到 CRSF 数据', 'warn'],
  ['OSD', 'HD DisplayPort 已启用', 'good'],
  ['GPS 救机', '未配置返航高度', 'bad']
] as const;

const steps = [
  '确认配件与兼容性', '生成接线与串口规划', '焊接电源线与电容', '连接飞控和四合一电调',
  '连接接收机与图传', '短路检查与限流通电', '飞控基础配置', '拆桨电机测试', '首飞前检查'
];

function StatusDot({ tone }: { tone: Tone }) {
  return <span className={`status-dot ${tone}`} />;
}

function Card({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <section className={`card ${className}`}>{children}</section>;
}

function App() {
  const [page, setPage] = useState<Page>('home');
  const [connected, setConnected] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [inspectRunning, setInspectRunning] = useState(false);
  const [inspectProgress, setInspectProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('sbs-build-steps') || '[0,1,2]'); } catch { return [0,1,2]; }
  });

  useEffect(() => localStorage.setItem('sbs-build-steps', JSON.stringify(completedSteps)), [completedSteps]);
  useEffect(() => {
    if (!inspectRunning) return;
    const timer = window.setInterval(() => setInspectProgress(p => {
      if (p >= 100) { setInspectRunning(false); return 100; }
      return Math.min(100, p + 4);
    }), 100);
    return () => window.clearInterval(timer);
  }, [inspectRunning]);

  const title = useMemo(() => nav.find(n => n.id === page)?.label || '工作台', [page]);
  const startInspect = () => { setPage('inspect'); setInspectProgress(0); setInspectRunning(true); };

  return <div className={`app ${assistantOpen ? 'with-assistant' : ''}`}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><img src="./icon.png" alt="SBS"/></div><div><strong>SBS</strong><span>无人机 AI 工作台</span></div></div>
      <div className="edition">穿越机工程版 <span>v0.2</span></div>
      <nav>{nav.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><item.icon size={19}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button><Settings size={18}/>设置</button><div className="safe-note"><ShieldCheck size={17}/><span>安全辅助模式<br/><small>写入前必须确认</small></span></div></div>
    </aside>

    <main>
      <header>
        <div><button className="icon-btn mobile-menu"><Menu size={20}/></button><h1>{title}</h1><span className="crumb">/ 5寸自由式</span></div>
        <div className="header-actions"><button className={`connection ${connected ? 'online' : ''}`} onClick={() => setConnected(v => !v)}><StatusDot tone={connected ? 'good' : 'muted'}/>{connected ? '飞控已连接' : '未连接飞控'}</button><button className="icon-btn"><Search size={19}/></button><button className="ai-toggle" onClick={() => setAssistantOpen(v => !v)}><Sparkles size={17}/>AI 助手</button></div>
      </header>

      <div className="content">
        {page === 'home' && <HomePage connected={connected} setConnected={setConnected} startInspect={startInspect} setPage={setPage}/>} 
        {page === 'aircraft' && <AircraftPage/>}
        {page === 'build' && <BuildPage completed={completedSteps} setCompleted={setCompletedSteps}/>} 
        {page === 'tune' && <TunePage connected={connected}/>} 
        {page === 'inspect' && <InspectPage progress={inspectProgress} running={inspectRunning} start={startInspect}/>} 
        {page === 'learn' && <LearnPage/>}
      </div>
    </main>

    {assistantOpen && <aside className="assistant">
      <div className="assistant-head"><div><span className="ai-orb"><Bot size={18}/></span><div><strong>AI 工程助手</strong><small>基于当前机体信息</small></div></div><button className="icon-btn" onClick={() => setAssistantOpen(false)}><X size={18}/></button></div>
      <div className="assistant-body"><div className="ai-message"><strong>当前建议</strong><p>{connected ? '已识别飞控。建议先运行整机自检，再应用任何参数修改。' : '先连接飞控，或继续完善机体配件档案。未连接时不会执行任何写入。'}</p></div><div className="context-box"><span>当前机体</span><strong>5寸自由式 · 6S</strong><span>固件</span><strong>{connected ? 'Betaflight 4.5.1' : '等待连接'}</strong></div></div>
      <div className="assistant-input"><textarea placeholder="描述问题，例如：解锁后电机转速不一致…"/><button><ChevronRight size={18}/></button><small>AI建议仅供辅助，危险操作需人工确认</small></div>
    </aside>}
  </div>;
}

function HomePage({connected,setConnected,startInspect,setPage}:{connected:boolean;setConnected:(v:boolean)=>void;startInspect:()=>void;setPage:(p:Page)=>void}) {
  return <><div className="hero"><div><span className="eyebrow">晚上好，欢迎回来</span><h2>5寸自由式 <span className="pill">主力机</span></h2><p>{connected ? '飞控连接正常，可以开始自检或继续调试。' : '连接飞控后可读取固件、参数与设备状态。'}</p></div><div className="hero-actions"><button className="primary" onClick={() => setConnected(!connected)}><PlugZap size={18}/>{connected ? '断开飞控' : '连接飞控'}</button><button className="secondary" onClick={startInspect}><ShieldCheck size={18}/>一键自检</button></div></div>
    <div className="metric-grid"><Metric icon={Activity} label="整机健康度" value="82" suffix="分" tone="good"/><Metric icon={Cpu} label="飞控" value={connected?'F405':'--'} suffix={connected?'在线':'未连接'} tone={connected?'good':'muted'}/><Metric icon={CircleAlert} label="待处理" value="2" suffix="项" tone="warn"/><Metric icon={HardDrive} label="最近备份" value="今天" suffix="21:16" tone="muted"/></div>
    <div className="two-col"><Card><div className="card-head"><div><h3>当前状态</h3><p>只显示需要关注的项目</p></div><button className="text-btn" onClick={() => setPage('inspect')}>查看完整检测 <ChevronRight size={15}/></button></div><div className="status-list">{inspectionRows.slice(3).map(([a,b,t])=><div key={a}><StatusDot tone={t}/><div><strong>{a}</strong><span>{b}</span></div><ChevronRight size={17}/></div>)}</div></Card><Card><div className="card-head"><div><h3>继续工作</h3><p>最近进行的任务</p></div></div><div className="continue-task"><div className="task-icon"><Cable/></div><div><strong>装机流程 · 串口与接线</strong><span>已完成 3 / 9 步</span><div className="progress"><i style={{width:'33%'}}/></div></div><button className="secondary compact" onClick={()=>setPage('build')}>继续</button></div></Card></div>
    <Card><div className="card-head"><div><h3>快捷工具</h3><p>常用工程功能</p></div></div><div className="quick-grid"><Quick icon={Cable} title="串口规划" sub="自动分配 UART"/><Quick icon={Radio} title="接收机向导" sub="通道与失控保护"/><Quick icon={Gauge} title="OSD 编辑" sub="可视化布局"/><Quick icon={Activity} title="PID 分析" sub="参数建议与回滚"/><Quick icon={Box} title="兼容检查" sub="电机、电调与电池"/></div></Card></>;
}

function Metric({icon:Icon,label,value,suffix,tone}:{icon:any;label:string;value:string;suffix:string;tone:Tone}) { return <Card className="metric"><div className={`metric-icon ${tone}`}><Icon size={20}/></div><span>{label}</span><div><strong>{value}</strong><small>{suffix}</small></div></Card>; }
function Quick({icon:Icon,title,sub}:{icon:any;title:string;sub:string}) { return <button className="quick"><Icon size={21}/><div><strong>{title}</strong><span>{sub}</span></div><ChevronRight size={16}/></button>; }

function AircraftPage(){return <><div className="page-title"><div><h2>我的飞机</h2><p>为每架飞机保存硬件、固件、参数与维修记录。</p></div><button className="primary">+ 新建飞机</button></div><div className="aircraft-grid"><Card className="aircraft-card"><div className="drone-visual"><Plane size={48}/><span>主力机</span></div><h3>5寸自由式</h3><p>6S · F405 · 2207 1950KV</p><div className="specs"><span>飞控<strong>SpeedyBee F405 V4</strong></span><span>图传<strong>DJI O4</strong></span><span>接收机<strong>ELRS 2.4G</strong></span><span>重量<strong>612 g</strong></span></div><button className="secondary full">打开档案</button></Card><button className="add-card"><span>+</span><strong>添加另一架飞机</strong><small>创建独立档案与配置历史</small></button></div></>}

function BuildPage({completed,setCompleted}:{completed:number[];setCompleted:(v:number[])=>void}) { const toggle=(i:number)=>setCompleted(completed.includes(i)?completed.filter(x=>x!==i):[...completed,i]); return <><div className="page-title"><div><h2>智能装机</h2><p>从配件确认到首飞前检查，按步骤完成并保存记录。</p></div><button className="secondary"><Box size={17}/>兼容性检查</button></div><div className="build-layout"><Card><div className="card-head"><div><h3>5寸自由式装机流程</h3><p>完成 {completed.length} / {steps.length} 步</p></div><span className="score">{Math.round(completed.length/steps.length*100)}%</span></div><div className="progress large"><i style={{width:`${completed.length/steps.length*100}%`}}/></div><div className="step-list">{steps.map((s,i)=><button key={s} onClick={()=>toggle(i)} className={completed.includes(i)?'done':''}><span>{completed.includes(i)?<Check size={16}/>:i+1}</span><div><strong>{s}</strong><small>{i===5?'建议使用防炸烟插头，禁止安装桨叶':'查看图示、注意事项和检查清单'}</small></div><ChevronRight size={17}/></button>)}</div></Card><div className="side-stack"><Card><h3>接线规划</h3><div className="wire-row"><span>UART1</span><strong>DJI O4 · MSP</strong><StatusDot tone="good"/></div><div className="wire-row"><span>UART2</span><strong>ELRS · CRSF</strong><StatusDot tone="good"/></div><div className="wire-row"><span>UART3</span><strong>GPS · UBLOX</strong><StatusDot tone="warn"/></div><button className="secondary full">打开接线图</button></Card><Card className="warning-card"><Zap size={22}/><div><strong>首次通电安全提醒</strong><p>先测量电源正负极阻值，再使用限流设备上电。</p></div></Card></div></div></>}

function TunePage({connected}:{connected:boolean}) { const tools=[['端口与串口','UART 分配、协议和冲突检查',Cable],['接收机','通道范围、模式与失控保护',Radio],['电机与电调','顺序、方向、DShot 与 RPM',Zap],['OSD 编辑器','拖放布局与关键告警检查',Gauge],['PID 与滤波','预设、日志分析、差异与回滚',Activity],['CLI 与备份','配置导出、对比和恢复',HardDrive]]; return <><div className="page-title"><div><h2>调试中心</h2><p>新手模式只显示必要设置；所有写入均先预览差异。</p></div><span className={`mode-chip ${connected?'ready':''}`}>{connected?'已连接 · 辅助模式':'离线预览模式'}</span></div><div className="tool-grid">{tools.map(([a,b,I]:any)=><Card className="tool-card" key={a}><div className="tool-icon"><I size={22}/></div><h3>{a}</h3><p>{b}</p><button className="text-btn">打开工具 <ChevronRight size={15}/></button></Card>)}</div><Card className="change-preview"><div><CircleAlert size={21}/><div><h3>安全写入规则已启用</h3><p>读取当前配置 → 自动备份 → 显示修改差异 → 人工确认 → 写入验证 → 失败回滚</p></div></div></Card></> }

function InspectPage({progress,running,start}:{progress:number;running:boolean;start:()=>void}) { return <><div className="page-title"><div><h2>一键自检</h2><p>检查飞控、串口、接收机、OSD、GPS 与安全设置。</p></div><button className="primary" onClick={start} disabled={running}>{running?'正在检测…':'开始自检'}</button></div><Card className="inspect-summary"><div className="health-ring" style={{'--p':`${progress || 82}%`} as any}><div><strong>{running?progress:82}</strong><span>健康分</span></div></div><div><h3>{running?'正在读取设备状态':'发现 2 项需要处理'}</h3><p>{running?'检测过程中不会修改任何飞控参数。':'GPS救机设置和接收机状态需要确认。'}</p><div className="progress large"><i style={{width:`${running?progress:100}%`}}/></div></div></Card><Card><div className="inspection-table">{inspectionRows.map(([a,b,t])=><div key={a}><StatusDot tone={t}/><strong>{a}</strong><span>{b}</span><button>查看</button></div>)}</div></Card></>}

function LearnPage(){const topics=[['从零认识穿越机','结构、飞行原理和安全基础',Home],['电机、电调与桨叶','KV、尺寸、电流与搭配关系',Zap],['飞控与传感器','陀螺仪、加速度计和滤波',Cpu],['Betaflight 入门','端口、模式、OSD和CLI',SlidersHorizontal],['装机焊接规范','焊盘、线材、绝缘和通电',Wrench],['故障排查手册','从症状到测量验证',CircleAlert]];return <><div className="page-title"><div><h2>知识与学习</h2><p>结构化课程、硬件说明书和带来源的AI问答。</p></div><button className="secondary">导入说明书</button></div><div className="topic-grid">{topics.map(([a,b,I]:any)=><Card className="topic" key={a}><I size={24}/><div><h3>{a}</h3><p>{b}</p></div><ChevronRight size={18}/></Card>)}</div></>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
