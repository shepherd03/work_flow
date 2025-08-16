# 智能工作流编辑器 (Intelligent Workflow Editor)

一个基于React的可视化工作流编辑器，支持拖拽式节点编程，提供类型安全的节点模板系统和可扩展的插件架构。

## ✨ 核心特性

- 🎨 **可视化编辑**: 基于ReactFlow的拖拽式节点编辑器
- 🔒 **类型安全**: 完整的TypeScript类型定义和验证
- 🧩 **可扩展架构**: 插件化的节点模板系统
- 🎯 **现代化UI**: 基于Ant Design和Tailwind CSS的响应式界面
- ⚡ **实时验证**: 连接规则验证和节点数据验证
- 🔄 **简化设计**: 每个节点只有一个输入和一个输出端口，降低复杂度

## 🛠️ 技术栈

- **前端框架**: React 18.2.0
- **构建工具**: Vite 5.2.8  
- **类型系统**: TypeScript 5.3.3
- **UI组件库**: Ant Design 5.26.7
- **流程图引擎**: ReactFlow 11.11.4
- **样式框架**: Tailwind CSS 3.4.17
- **图标库**: Lucide React 0.534.0

## 📦 安装

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0 或 yarn >= 1.22.0

### 克隆并安装依赖

```bash
# 克隆仓库
git clone <repository-url>
cd work_flow

# 安装依赖
npm install

# 或使用yarn
yarn install
```

## 🚀 使用指南

### 开发模式

```bash
# 启动开发服务器
npm run dev

# 或使用yarn
yarn dev
```

开发服务器将在 `http://localhost:5173` 启动

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 代码检查

```bash
# 运行ESLint检查
npm run lint
```

## 🏗️ 项目架构

```
work_flow/
├── src/
│   ├── components/          # UI组件
│   │   ├── default/        # 默认节点组件
│   │   ├── editor/         # 编辑器组件
│   │   └── general/        # 通用组件
│   ├── core/               # 核心逻辑
│   │   └── NodeRegistry.ts # 节点注册表
│   ├── nodeTemplates/      # 节点模板
│   ├── types/              # 类型定义
│   └── utils/              # 工具函数
├── public/                 # 静态资源
└── docs/                   # 文档
```

## 🎯 核心概念

### 1. 新工作流设计架构

#### 工作流结构
新的工作流系统采用**开始-处理-结束**的线性结构：
- **开始节点**: 定义工作流的输入数据结构和初始值
- **处理节点**: 对数据进行各种处理和转换操作
- **结束节点**: 格式化输出最终结果

#### 数据传递机制
- **自动数据流**: 工作流执行引擎自动管理节点间的数据传递
- **上游数据访问**: 任何节点都可以通过 ExecutionContext 访问上游节点的输出
- **智能类型检查**: 连接时自动验证数据类型兼容性

#### 工作流执行流程
```
1. 工作流验证 → 检查开始/结束节点，验证连接合法性
2. 拓扑排序 → 确定节点执行顺序
3. 按序执行 → 依次执行每个节点，传递数据
4. 结果汇总 → 收集所有节点的执行结果
```

### 2. 节点模板系统 (NodeTemplate)

每个节点都基于统一的模板接口定义：

```typescript
interface NodeTemplate<T> {
    metadata: NodeMetadata;           // 节点元数据
    initialData: () => T;            // 初始数据生成器
    getPorts: (nodeData: T) => {     // 端口配置
        input: SimplePort;
        output: SimplePort;
    };
    validate?: (nodeData: T) => ValidationResult;    // 数据验证
    execute: (inputs: T, nodeData: T, context: ExecutionContext) => Promise<Record<string, any>>;
    renderInEditor?: (nodeData: T, isSelected: boolean, onDataChange: (data: T) => void, metadata: NodeMetadata) => ReactNode;
    behavior?: NodeBehavior;          // 行为配置
    hooks?: NodeHooks;               // 生命周期钩子
}
```

### 2. 节点注册表 (NodeRegistry)

集中管理所有可用的节点类型：

```typescript
class NodeRegistry {
    register(template: NodeTemplate): void;           // 注册节点模板
    get(type: string): NodeTemplate | undefined;      // 获取节点模板
    getAll(): NodeTemplate[];                         // 获取所有模板
    getByCategory(category: string): NodeTemplate[];  // 按分类获取
    search(query: string): NodeTemplate[];            // 搜索节点
}
```

### 3. 简化端口设计

每个节点只有一个输入端口和一个输出端口，通过数据类型进行连接验证：

```typescript
interface SimplePort {
    id: string;           // 端口ID
    dataType: string;     // 数据类型
    connectionRules?: PortConnectionRule; // 自定义连接规则
}
```

## 📝 使用示例

### 新工作流使用示例

以下是一个完整的工作流示例，演示如何处理用户输入的文本数据：

#### 1. 创建开始节点
```typescript
// 配置工作流的输入数据
开始节点配置:
- 字段名: "userText"
- 类型: "string"  
- 默认值: "Hello World"
- 描述: "用户输入的文本"
```

#### 2. 添加处理节点
```typescript
// 文本处理节点：转换为大写
文本处理节点配置:
- 操作类型: "uppercase"
- 输入: 来自开始节点的 userText

// 条件判断节点：检查文本长度
条件判断节点配置:
- 条件类型: "greater"
- 比较值: 5
- 真值输出: "长文本"
- 假值输出: "短文本"
```

#### 3. 配置结束节点
```typescript
// 结束节点配置
结束节点配置:
- 输出格式: "custom"
- 自定义模板: "处理结果: {{output}}, 文本类型: {{condition}}"
- 保存到文件: true
- 文件名: "text_processing_result.txt"
```

#### 4. 工作流执行
```typescript
执行流程:
1. 开始节点输出: { userText: "Hello World" }
2. 文本处理节点输出: { output: "HELLO WORLD" }
3. 条件判断节点输出: { output: "长文本", condition: true }
4. 结束节点最终输出: "处理结果: 长文本, 文本类型: true"
```

### 高级特性

#### 访问上游节点数据
```typescript
// 在任何处理节点中，都可以访问上游数据
export const advancedProcessingNode = {
    execute: async (inputs, nodeData, context) => {
        // 获取指定节点的输出
        const startNodeData = context.getUpstreamData('start-node-id');
        
        // 获取所有上游节点的数据
        const allUpstreamData = context.getAllUpstreamData();
        
        // 根据节点类型获取数据
        const textProcessors = context.getUpstreamDataByType('text-processor');
        
        // 基于上游数据进行处理...
    }
};
```

### 创建自定义节点

```typescript
import { NodeTemplate } from './types/workflow';

// 创建一个简单的字符串处理节点
const stringProcessorTemplate: NodeTemplate<{
    operation: 'uppercase' | 'lowercase' | 'trim';
    input: string;
}> = {
    metadata: {
        type: 'string-processor',
        name: '字符串处理器',
        description: '处理字符串数据',
        category: '文本处理',
    },
    initialData: () => ({
        operation: 'uppercase',
        input: ''
    }),
    getPorts: (nodeData) => ({
        input: { id: 'input', dataType: 'string' },
        output: { id: 'output', dataType: 'string' }
    }),
    validate: (nodeData) => ({
        isValid: nodeData.input.length > 0,
        errors: nodeData.input.length === 0 ? ['输入不能为空'] : []
    }),
    execute: async (inputs, nodeData, context) => {
        const { operation, input } = nodeData;
        let result = input;
        
        switch (operation) {
            case 'uppercase':
                result = input.toUpperCase();
                break;
            case 'lowercase':
                result = input.toLowerCase();
                break;
            case 'trim':
                result = input.trim();
                break;
        }
        
        return { output: result };
    }
};

// 注册节点
nodeRegistry.register(stringProcessorTemplate);
```

### 工作流编辑器使用

```typescript
import { WorkflowEditor } from './components/WorkflowEditor';

function App() {
    return (
        <div className="w-full h-screen">
            <WorkflowEditor />
        </div>
    );
}
```

## 🔧 已实现的节点类型

### 工作流控制节点
- **开始节点** (`workflow-start`): 工作流的起始点，配置初始输入数据
- **结束节点** (`workflow-end`): 工作流的终点，处理最终输出数据

### 数据处理节点
- **文本处理节点** (`text-processor`): 字符串操作（大小写转换、替换、分割等）
- **数学计算节点** (`math-processor`): 数值运算（加减乘除、幂运算、开方等）
- **条件判断节点** (`conditional`): 根据条件返回不同的值

### 新设计理念
- **明确的开始和结束**: 每个工作流必须有唯一的开始节点和结束节点
- **数据流导向**: 取消单纯的数据存储节点，所有节点都有处理功能
- **上下游数据访问**: 下游节点可以访问任意上游节点的输出数据
- **智能数据传递**: 工作流执行引擎自动管理节点间的数据传递

## 🎨 UI设计规范

### 核心原则
- **优先使用Ant Design组件**: 保持UI风格统一
- **使用Tailwind CSS**: 原子化CSS类名，避免内联样式
- **响应式设计**: 支持桌面端使用
- **简洁为主**: 避免复杂动画，适配ReactFlow渲染环境

### 组件层次
```
WorkflowEditor (主编辑器)
├── NodePalette (节点面板)
├── ReactFlow (流程图区域)
│   ├── DefaultNode (默认节点)
│   └── GeneralNodeWrapper (通用节点包装器)
├── ContextMenu (上下文菜单)
└── MetadataModal (元数据编辑)
```

## 🔄 扩展开发

### 添加新节点类型

1. **创建节点模板**: 实现 `NodeTemplate` 接口
2. **注册模板**: 调用 `nodeRegistry.register()`
3. **自动发现**: 编辑器自动识别新节点类型

### 自定义渲染

节点模板支持自定义渲染函数：
- `renderInPalette`: 在节点面板中的渲染
- `renderInEditor`: 在编辑器中的渲染
- 支持节点级别的样式定制

## 📋 开发路线图

### ✅ 已完成 (v2.0)
- [x] **重构工作流架构**: 实现开始-处理-结束的新架构
- [x] **移除数据存储节点**: 所有节点都具备处理功能
- [x] **智能数据传递**: 下游节点可访问上游节点数据
- [x] **工作流执行引擎**: 自动管理节点执行顺序和数据流
- [x] **类型安全的连接验证**: 防止不兼容的节点连接

### 短期目标 (v2.1)
- [ ] 实现更多处理节点类型（数组操作、对象处理、日期时间等）
- [ ] 添加工作流模板和预设
- [ ] 实现工作流保存和加载功能
- [ ] 添加节点执行状态可视化
- [ ] 支持工作流参数化运行

### 中期目标 (v2.2)
- [ ] 支持循环和条件分支控制结构
- [ ] 实现并行执行能力
- [ ] 添加工作流调试和断点功能
- [ ] 支持外部API调用节点
- [ ] 实现节点性能监控

### 长期目标 (v3.0)
- [ ] 云端工作流存储和同步
- [ ] 实时协作编辑功能
- [ ] AI辅助的节点推荐和优化
- [ ] 工作流市场和分享机制
- [ ] 企业级权限管理和审批流程

## 🤝 贡献指南

1. Fork 这个仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

### 代码规范
- 使用 TypeScript 进行开发
- 遵循 ESLint 规范
- 组件优先使用 Ant Design
- 样式使用 Tailwind CSS 类名
- 添加适当的注释和文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [架构设计文档](./架构设计文档.md)
- [设计思路分析](./基于接口定义的设计思路分析.md)
- [系统流程图](./工作流编辑器系统流程图.md)
- [架构汇报文档](./架构汇报文档.md)

## 📞 联系方式

如果你有任何问题或建议，请通过以下方式联系：

- 创建 Issue
- 发送 Pull Request
- 项目讨论区

---

⭐ 如果这个项目对你有帮助，请给它一个星标！