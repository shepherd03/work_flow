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

### 1. 节点模板系统 (NodeTemplate)

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

### 数据节点
- **字符串节点** (`data-string`): 文本数据处理
- **数字节点** (`data-number`): 数值数据处理  
- **布尔值节点** (`data-boolean`): 逻辑值处理
- **数组节点** (`data-array`): 数组数据处理
- **对象节点** (`data-object`): 复杂对象处理

### 节点特性
- 统一的UI设计，使用GeneralNodeWrapper
- 类型验证和数据格式检查
- JSON格式编辑支持
- 实时数据预览（显示长度、属性数量等）

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

### 短期目标
- [ ] 实现更多基础节点类型（条件判断、循环、函数调用等）
- [ ] 添加工作流保存和加载功能
- [ ] 实现工作流执行引擎
- [ ] 添加节点分组和折叠功能

### 中期目标
- [ ] 支持自定义节点开发SDK
- [ ] 实现节点市场机制
- [ ] 添加工作流版本管理
- [ ] 支持并行执行和条件分支

### 长期目标
- [ ] 云端工作流存储和同步
- [ ] 实时协作编辑功能
- [ ] 工作流性能监控和分析
- [ ] AI辅助的节点推荐和优化

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