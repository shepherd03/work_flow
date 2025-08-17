import type { NodeTemplate, NodeRegistry as INodeRegistry, NodeEvent, NodeEventListener } from '../types/workflow';

/**
 * 节点注册表 - 管理所有可用的节点类型
 */
export class NodeRegistry implements INodeRegistry {
    private templates: Map<string, NodeTemplate<any>> = new Map();
    private eventListeners: Set<NodeEventListener> = new Set();

    /**
     * 注册节点模板
     */
    register<T extends Record<string, any>>(template: NodeTemplate<T>): void {
        if (this.templates.has(template.metadata.type)) {
            console.warn(`节点类型 "${template.metadata.type}" 已存在，将被覆盖`);
        }

        // 验证节点模板
        this.validateTemplate(template);

        this.templates.set(template.metadata.type, template);
        console.log(`节点类型 "${template.metadata.type}" 注册成功`);
    }

    /**
     * 批量注册节点模板
     */
    registerBatch(templates: NodeTemplate<any>[]): void {
        let registeredCount = 0;

        templates.forEach(template => {
            if (!this.templates.has(template.metadata.type)) {
                this.register(template);
                registeredCount++;
            }
        });

        if (registeredCount > 0) {
            console.log(`批量注册完成，共注册 ${registeredCount} 个新节点模板`);
        } else {
            console.log('所有节点模板已存在，跳过重复注册');
        }
    }

    /**
     * 重置注册表状态（主要用于测试）
     */
    reset(): void {
        this.templates.clear();
        this.eventListeners.clear();
        console.log('节点注册表已重置');
    }

    /**
     * 取消注册节点模板
     */
    unregister(type: string): void {
        if (this.templates.delete(type)) {
            console.log(`节点类型 "${type}" 取消注册成功`);
        } else {
            console.warn(`节点类型 "${type}" 不存在`);
        }
    }

    /**
     * 获取节点模板
     */
    get(type: string): NodeTemplate<any> | undefined {
        return this.templates.get(type);
    }

    /**
     * 获取所有节点模板
     */
    getAll(): NodeTemplate<any>[] {
        return Array.from(this.templates.values());
    }

    /**
     * 根据分类获取节点模板
     */
    getByCategory(category: string): NodeTemplate<any>[] {
        return this.getAll().filter(template => template.metadata.category === category);
    }

    /**
     * 检查节点类型是否存在
     */
    has(type: string): boolean {
        return this.templates.has(type);
    }

    /**
     * 获取所有分类
     */
    getCategories(): string[] {
        const categories = new Set<string>();
        this.templates.forEach(template => {
            categories.add(template.metadata.category);
        });
        return Array.from(categories).sort();
    }

    /**
     * 搜索节点模板
     */
    search(query: string): NodeTemplate<any>[] {
        const lowercaseQuery = query.toLowerCase();
        return this.getAll().filter(template =>
            template.metadata.name.toLowerCase().includes(lowercaseQuery) ||
            template.metadata.description.toLowerCase().includes(lowercaseQuery) ||
            template.metadata.type.toLowerCase().includes(lowercaseQuery)
        );
    }

    /**
     * 添加事件监听器
     */
    addEventListener(listener: NodeEventListener): void {
        this.eventListeners.add(listener);
    }

    /**
     * 移除事件监听器
     */
    removeEventListener(listener: NodeEventListener): void {
        this.eventListeners.delete(listener);
    }

    /**
     * 触发事件
     */
    emitEvent(event: NodeEvent): void {
        this.eventListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('节点事件监听器执行失败:', error);
            }
        });
    }

    /**
     * 验证节点模板
     */
    private validateTemplate(template: NodeTemplate<any>): void {
        if (!template.metadata.type) {
            throw new Error('节点模板必须有metadata.type属性');
        }

        if (!template.metadata.name) {
            throw new Error('节点模板必须有metadata.name属性');
        }

        if (!template.metadata.category) {
            throw new Error('节点模板必须有metadata.category属性');
        }

        if (typeof template.execute !== 'function') {
            throw new Error('节点模板的execute必须是函数');
        }
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        totalNodes: number;
        categories: Record<string, number>;
    } {
        const templates = this.getAll();
        const categories: Record<string, number> = {};

        templates.forEach(template => {
            // 统计分类
            categories[template.metadata.category] = (categories[template.metadata.category] || 0) + 1;
        });

        return {
            totalNodes: templates.length,
            categories
        };
    }
}

// 全局单例实例
export const nodeRegistry = new NodeRegistry();