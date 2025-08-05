/**
 * 应用程序主组件
 * 
 * 这是整个工作流编辑器的入口组件，负责：
 * - 配置Ant Design主题
 * - 管理工作流状态
 * - 提供工作流编辑器容器
 * - 处理工作流变更事件
 * 
 * 主要功能：
 * - 主题配置
 * - 工作流状态管理
 * - 编辑器集成
 * - 事件处理
 */
import React, { useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import WorkflowEditor from './components/WorkflowEditor';
import type { Workflow } from './types/workflow';
import './App.css';

function App() {
  const [workflow, setWorkflow] = useState<Workflow>({
    id: 'workflow_1',
    name: '示例工作流',
    description: '展示输入节点功能的工作流示例',
    nodes: [],
    edges: [],
    variables: {}, // 现在用输入节点代替传统的全局变量
  });

  const handleWorkflowChange = (updatedWorkflow: Workflow) => {
    setWorkflow(updatedWorkflow);
    // 这里可以添加保存逻辑，比如保存到本地存储或发送到服务器
    console.log('工作流已更新:', updatedWorkflow);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 32,
          },
          Card: {
            borderRadius: 12,
          },
          Input: {
            borderRadius: 6,
          },
          Select: {
            borderRadius: 6,
          },
          Tag: {
            borderRadius: 16,
          },
        },
      }}
    >
      <div className="App">
        <WorkflowEditor
          workflow={workflow}
          onWorkflowChange={handleWorkflowChange}
        />
      </div>
    </ConfigProvider>
  );
}

export default App;