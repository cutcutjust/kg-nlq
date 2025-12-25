/**
 * 节点管理组件
 * 提供节点的查询、创建、编辑、删除功能
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Neo4jNode } from "@/lib/types";

export function NodeManager() {
  const [nodes, setNodes] = useState<Neo4jNode[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNode, setEditingNode] = useState<Neo4jNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Neo4jNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 表单状态
  const [formLabels, setFormLabels] = useState<string>("");
  const [formProperties, setFormProperties] = useState<string>("");

  // 加载标签
  useEffect(() => {
    loadLabels();
  }, []);

  // 加载节点
  useEffect(() => {
    loadNodes();
  }, [selectedLabel]);

  const loadLabels = async () => {
    try {
      const res = await fetch("/api/admin/labels");
      const data = await res.json();
      if (data.labels) {
        setLabels(data.labels);
      }
    } catch (err) {
      console.error("加载标签失败:", err);
    }
  };

  const loadNodes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url =
        selectedLabel === "all"
          ? "/api/admin/nodes?limit=100"
          : `/api/admin/nodes?label=${selectedLabel}&limit=100`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setNodes(data.nodes || []);
    } catch (err: any) {
      setError(err.message || "加载节点失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // 解析标签（逗号分隔）
      const labelsArray = formLabels
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l);

      if (labelsArray.length === 0) {
        alert("请输入至少一个标签");
        return;
      }

      // 解析属性（JSON格式）
      let properties = {};
      if (formProperties.trim()) {
        try {
          properties = JSON.parse(formProperties);
        } catch {
          alert("属性格式错误，请使用有效的JSON格式");
          return;
        }
      }

      const res = await fetch("/api/admin/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labels: labelsArray,
          properties,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      alert("节点创建成功！");
      setShowCreateForm(false);
      setFormLabels("");
      setFormProperties("");
      loadNodes();
      loadLabels();
    } catch (err: any) {
      alert("创建失败: " + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingNode) return;

    try {
      // 解析属性
      let properties = {};
      if (formProperties.trim()) {
        try {
          properties = JSON.parse(formProperties);
        } catch {
          alert("属性格式错误，请使用有效的JSON格式");
          return;
        }
      }

      const res = await fetch("/api/admin/nodes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: editingNode.identity,
          properties,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      alert("节点更新成功！");
      setEditingNode(null);
      setFormProperties("");
      loadNodes();
    } catch (err: any) {
      alert("更新失败: " + err.message);
    }
  };

  const handleDelete = async (node: Neo4jNode) => {
    const confirmMsg = `确定要删除节点 ${node.identity} 吗？\n\n如果节点有关联关系，请选择：\n- 确定：强制删除（同时删除关系）\n- 取消：放弃删除`;

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/nodes?identity=${node.identity}&detachDelete=true`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      alert("节点删除成功！");
      loadNodes();
      loadLabels();
    } catch (err: any) {
      alert("删除失败: " + err.message);
    }
  };

  const openEditForm = (node: Neo4jNode) => {
    setEditingNode(node);
    setFormProperties(JSON.stringify(node.properties, null, 2));
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingNode(null);
    setFormProperties("");
  };

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // 使用 Cypher 查询搜索节点（模糊匹配任何属性）
      const res = await fetch("/api/admin/nodes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSearchResults(data.nodes || []);
    } catch (err: any) {
      setError(err.message || "搜索失败");
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  // 截断长文本
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // 渲染属性值（处理长文本）
  const renderPropertyValue = (key: string, value: any, isExpanded: boolean) => {
    if (typeof value === "string" && value.length > 100) {
      return isExpanded ? value : truncateText(value);
    }
    return JSON.stringify(value);
  };

  // 获取节点显示名称
  const getNodeDisplayName = (node: Neo4jNode) => {
    // 尝试从常见属性中获取名称
    const nameProps = ["name", "title", "label", "doc_id", "id"];
    for (const prop of nameProps) {
      if (node.properties[prop]) {
        return String(node.properties[prop]);
      }
    }
    return `节点 ${node.identity}`;
  };

  const displayNodes = isSearching ? searchResults : nodes;

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="搜索节点（按名称、ID或其他属性）..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
            搜索
          </Button>
          {isSearching && (
            <Button variant="outline" onClick={clearSearch}>
              清除
            </Button>
          )}
        </div>
        {isSearching && (
          <div className="mt-2 text-sm text-muted-foreground">
            找到 {searchResults.length} 个匹配的节点
          </div>
        )}
      </Card>

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">按标签筛选：</span>
          <select
            className="rounded-md border px-3 py-2"
            value={selectedLabel}
            onChange={(e) => {
              setSelectedLabel(e.target.value);
              clearSearch();
            }}
            disabled={isSearching}
          >
            <option value="all">所有标签</option>
            {labels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadNodes}
            disabled={isLoading || isSearching}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingNode(null);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          创建节点
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center space-x-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* 创建/编辑表单 */}
      {(showCreateForm || editingNode) && (
        <Card className="p-4">
          <h3 className="mb-3 text-lg font-semibold">
            {editingNode ? "编辑节点" : "创建新节点"}
          </h3>

          {editingNode && (
            <div className="mb-3 text-sm text-muted-foreground">
              <div>节点ID: {editingNode.identity}</div>
              <div>标签: {editingNode.labels.join(", ")}</div>
            </div>
          )}

          <div className="space-y-3">
            {!editingNode && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  标签（逗号分隔）
                </label>
                <Input
                  placeholder="例如: Person,Researcher"
                  value={formLabels}
                  onChange={(e) => setFormLabels(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">
                属性（JSON格式）
              </label>
              <textarea
                className="w-full rounded-md border px-3 py-2 font-mono text-sm"
                rows={6}
                placeholder='{"name": "张三", "age": 30}'
                value={formProperties}
                onChange={(e) => setFormProperties(e.target.value)}
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={editingNode ? handleUpdate : handleCreate}
              >
                {editingNode ? "保存" : "创建"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  cancelEdit();
                }}
              >
                取消
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 节点列表 */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            加载中...
          </div>
        ) : displayNodes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {isSearching ? "未找到匹配的节点" : "暂无节点数据"}
          </div>
        ) : (
          displayNodes.map((node) => {
            const isExpanded = expandedNodes.has(node.identity);
            const displayName = getNodeDisplayName(node);
            
            return (
              <Card key={node.identity} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* 节点头部 - 可点击展开/折叠 */}
                    <div
                      className="mb-2 flex items-center space-x-2 cursor-pointer"
                      onClick={() => toggleNodeExpansion(node.identity)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-base">{displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        (ID: {node.identity})
                      </span>
                      <div className="flex space-x-1">
                        {node.labels.map((label) => (
                          <span
                            key={label}
                            className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 节点属性 - 简略或完整显示 */}
                    {isExpanded ? (
                      <div className="ml-6">
                        <div className="rounded bg-gray-50 p-3">
                          <div className="space-y-2">
                            {Object.entries(node.properties).map(([key, value]) => (
                              <div key={key} className="border-b pb-2 last:border-b-0">
                                <div className="text-xs font-semibold text-gray-600 mb-1">
                                  {key}:
                                </div>
                                <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                  {typeof value === "string" && value.length > 200
                                    ? value
                                    : JSON.stringify(value, null, 2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="ml-6 text-sm text-muted-foreground">
                        {Object.keys(node.properties).length} 个属性
                        {Object.entries(node.properties).slice(0, 2).map(([key, value]) => (
                          <span key={key} className="ml-2">
                            • {key}: {truncateText(String(value), 30)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="ml-4 flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleNodeExpansion(node.identity)}
                      title={isExpanded ? "折叠" : "展开"}
                    >
                      {isExpanded ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(node)}
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(node)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

