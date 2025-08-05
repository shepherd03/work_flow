import type { Node } from 'reactflow';

/**
 * 根据节点信息生成独一无二的字符串
 * @param node 节点对象
 * @returns 唯一的字符串标识符
 */
export function generateNodeIdByNodeInfo(node: Node): string {
    const { id, type, position, data } = node;

    // 基础信息
    const baseInfo = `${id}-${type}-${position.x}-${position.y}`;

    // 数据内容的哈希
    const dataHash = hashObject(data);

    // 时间戳（如果数据中包含）
    const timestamp = data.timestamp || data.createdAt || Date.now();

    // 组合所有信息
    const uniqueString = `${baseInfo}-${dataHash}-${timestamp}`;

    return uniqueString;
}

/**
 * 简单的对象哈希函数
 * @param obj 要哈希的对象
 * @returns 哈希字符串
 */
function hashObject(obj: any): string {
    try {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }

        return Math.abs(hash).toString(36);
    } catch (error) {
        // 如果序列化失败，返回时间戳
        return Date.now().toString(36);
    }
}