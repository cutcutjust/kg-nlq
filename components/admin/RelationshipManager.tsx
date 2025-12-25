/**
 * 关系管理组件
 * 提供关系的查询、创建、编辑、删除功能
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import type { Neo4jRelationship } from "@/lib/types";

interface RelationshipWithNodes extends Neo4jRelationship {
  startNodeInfo?: {
    labels: string[];
    name?: string;
  };
  endNodeInfo?: {
    labels: string[];
    name?: string;
  };
}

export function RelationshipManager() {
  const [relationships, setRelationships] = useState<RelationshipWithNodes[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRelationship, setEditingRelationship] =
    useState<RelationshipWithNodes | null>(null);
  const [expandedRelationships, setExpandedRelationships] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<RelationshipWithNodes[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalRelationships, setTotalRelationships] = useState<number>(0);
  const [pageSize] = useState<number>(20); // 每页显示20条

  // 表单状态
  const [formStartNodeId, setFormStartNodeId] = useState<string>("");
  const [formEndNodeId, setFormEndNodeId] = useState<string>("");
  const [formType, setFormType] = useState<string>("");
  const [formProperties, setFormProperties] = useState<string>("");

  // 加载关系类型
  useEffect(() => {
    loadTypes();
  }, []);

  // 加载关系
  useEffect(() => {
    setCurrentPage(1); // 切换类型时重置到第一页
    loadRelationships();
  }, [selectedType]);

  // 页码变化时加载数据
  useEffect(() => {
    if (currentPage > 1) {
      loadRelationships();
    }
  }, [currentPage]);

  const loadTypes = async () => {
    try {
      const res = await fetch("/api/admin/relationship-types");
      const data = await res.json();
      if (data.types) {
        setTypes(data.types);
      }
    } catch (err) {
      console.error("加载关系类型失败:", err);
    }
  };

  const loadRelationships = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const skip = (currentPage - 1) * pageSize;
      const url =
        selectedType === "all"
          ? `/api/admin/relationships?limit=${pageSize}&skip=${skip}`
          : `/api/admin/relationships?type=${selectedType}&limit=${pageSize}&skip=${skip}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTotalRelationships(data.total || 0);

      // 获取关系及其节点信息
      const relsWithInfo = await Promise.all(
        (data.relationships || []).map(async (rel: Neo4jRelationship) => {
          try {
            // 获取起始和结束节点的信息
            const [startRes, endRes] = await Promise.all([
              fetch(`/api/admin/nodes/info?identity=${rel.startNodeId}`),
              fetch(`/api/admin/nodes/info?identity=${rel.endNodeId}`),
            ]);

            const startData = await startRes.json();
            const endData = await endRes.json();

            return {
              ...rel,
              startNodeInfo: startData.node || undefined,
              endNodeInfo: endData.node || undefined,
            };
          } catch (err) {
            console.error("获取节点信息失败:", err);
            return rel;
          }
        })
      );

      setRelationships(relsWithInfo);
    } catch (err: any) {
      setError(err.message || "加载关系失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formStartNodeId || !formEndNodeId || !formType) {
        alert("请填写起始节点ID、结束节点ID和关系类型");
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

      const res = await fetch("/api/admin/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startNodeId: formStartNodeId,
          endNodeId: formEndNodeId,
          type: formType,
          properties,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      alert("关系创建成功！");
      setShowCreateForm(false);
      setFormStartNodeId("");
      setFormEndNodeId("");
      setFormType("");
      setFormProperties("");
      loadRelationships();
      loadTypes();
    } catch (err: any) {
      alert("创建失败: " + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingRelationship) return;

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

      const res = await fetch("/api/admin/relationships", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: editingRelationship.identity,
          properties,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      alert("关系更新成功！");
      setEditingRelationship(null);
      setFormProperties("");
      loadRelationships();
    } catch (err: any) {
      alert("更新失败: " + err.message);
    }
  };

  const handleDelete = async (relationship: Neo4jRelationship) => {
    if (!confirm(`确定要删除关系 ${relationship.identity} 吗？`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/relationships?identity=${relationship.identity}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      alert("关系删除成功！");
      loadRelationships();
      loadTypes();
    } catch (err: any) {
      alert("删除失败: " + err.message);
    }
  };

  const openEditForm = (relationship: Neo4jRelationship) => {
    setEditingRelationship(relationship);
    setFormProperties(JSON.stringify(relationship.properties, null, 2));
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingRelationship(null);
    setFormProperties("");
  };

  const toggleRelationshipExpansion = (relId: string) => {
    setExpandedRelationships((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(relId)) {
        newSet.delete(relId);
      } else {
        newSet.add(relId);
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
      const res = await fetch("/api/admin/relationships/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSearchResults(data.relationships || []);
    } catch (err: any) {
      setError(err.message || "搜索失败");
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalRelationships / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalRelationships);

  const getNodeDisplayName = (nodeInfo: any) => {
    if (!nodeInfo) return "未知节点";
    const name = nodeInfo.name || nodeInfo.title || nodeInfo.label || nodeInfo.doc_id;
    const labels = nodeInfo.labels?.join(", ") || "";
    return name ? `${name} [${labels}]` : `[${labels}]`;
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const displayRelationships = isSearching ? searchResults : relationships;

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="搜索关系（按类型或属性）..."
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
            找到 {searchResults.length} 个匹配的关系
          </div>
        )}
      </Card>

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">按类型筛选：</span>
          <select
            className="rounded-md border px-3 py-2"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              clearSearch();
            }}
            disabled={isSearching}
          >
            <option value="all">所有类型</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRelationships}
            disabled={isLoading || isSearching}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingRelationship(null);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          创建关系
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center space-x-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* 创建表单对话框 */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogHeader onClose={() => setShowCreateForm(false)}>
          创建新关系
        </DialogHeader>
        <DialogContent>
          <div>
            <label className="mb-1 block text-sm font-medium">
              起始节点ID
            </label>
            <Input
              placeholder="例如: 123"
              value={formStartNodeId}
              onChange={(e) => setFormStartNodeId(e.target.value)}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              💡 提示：可以在节点管理页面查看节点ID
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              结束节点ID
            </label>
            <Input
              placeholder="例如: 456"
              value={formEndNodeId}
              onChange={(e) => setFormEndNodeId(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              关系类型
            </label>
            <Input
              placeholder="例如: KNOWS, WORKS_WITH"
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              建议使用全大写，单词间用下划线
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              属性（JSON格式，可选）
            </label>
            <textarea
              className="w-full rounded-md border px-3 py-2 font-mono text-sm"
              rows={6}
              placeholder='{"since": "2020", "weight": 0.8}'
              value={formProperties}
              onChange={(e) => setFormProperties(e.target.value)}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateForm(false)}>
            取消
          </Button>
          <Button onClick={handleCreate}>创建</Button>
        </DialogFooter>
      </Dialog>

      {/* 编辑表单对话框 */}
      <Dialog
        open={!!editingRelationship}
        onOpenChange={(open) => !open && cancelEdit()}
      >
        <DialogHeader onClose={cancelEdit}>编辑关系</DialogHeader>
        <DialogContent>
          {editingRelationship && (
            <>
              <div className="rounded bg-blue-50 p-3 text-sm">
                <div className="mb-2 flex items-center space-x-1 text-blue-900">
                  <Info className="h-4 w-4" />
                  <span className="font-semibold">关系信息</span>
                </div>
                <div className="space-y-1 text-blue-800">
                  <div>
                    关系ID: {editingRelationship.identity}
                  </div>
                  <div>
                    类型:{" "}
                    <span className="font-semibold">
                      {editingRelationship.type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>
                      起始: {getNodeDisplayName(editingRelationship.startNodeInfo)}
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span>
                      结束: {getNodeDisplayName(editingRelationship.endNodeInfo)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  💡 关系的类型和方向不能修改。如需更改，请删除此关系并创建新关系。
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  属性（JSON格式）
                </label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 font-mono text-sm"
                  rows={8}
                  value={formProperties}
                  onChange={(e) => setFormProperties(e.target.value)}
                />
              </div>
            </>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={cancelEdit}>
            取消
          </Button>
          <Button onClick={handleUpdate}>保存</Button>
        </DialogFooter>
      </Dialog>

      {/* 关系列表 */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            加载中...
          </div>
        ) : displayRelationships.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {isSearching ? "未找到匹配的关系" : "暂无关系数据"}
          </div>
        ) : (
          displayRelationships.map((rel) => {
            const isExpanded = expandedRelationships.has(rel.identity);
            
            return (
              <Card key={rel.identity} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* 关系头部 - 可点击展开/折叠 */}
                    <div
                      className="mb-2 flex items-center space-x-2 cursor-pointer"
                      onClick={() => toggleRelationshipExpansion(rel.identity)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="rounded bg-green-100 px-2 py-1 text-sm font-semibold text-green-700">
                        {rel.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (ID: {rel.identity})
                      </span>
                    </div>

                    {/* 节点关系显示 */}
                    <div className="ml-6 mb-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                          <div className="text-xs text-blue-600 mb-1">起始节点</div>
                          <div className="font-medium text-blue-900">
                            {getNodeDisplayName(rel.startNodeInfo)}
                          </div>
                          <div className="text-xs text-blue-500 mt-1">
                            ID: {rel.startNodeId}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-green-600 font-bold" />
                        <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2">
                          <div className="text-xs text-purple-600 mb-1">结束节点</div>
                          <div className="font-medium text-purple-900">
                            {getNodeDisplayName(rel.endNodeInfo)}
                          </div>
                          <div className="text-xs text-purple-500 mt-1">
                            ID: {rel.endNodeId}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 属性显示 */}
                    {Object.keys(rel.properties).length > 0 && (
                      <div className="ml-6">
                        {isExpanded ? (
                          <div className="rounded bg-gray-50 p-3">
                            <div className="text-xs font-semibold text-gray-600 mb-2">
                              关系属性:
                            </div>
                            <div className="space-y-2">
                              {Object.entries(rel.properties).map(([key, value]) => (
                                <div key={key} className="border-b pb-2 last:border-b-0">
                                  <div className="text-xs font-semibold text-gray-600">
                                    {key}:
                                  </div>
                                  <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                    {typeof value === "string" && value.length > 100
                                      ? value
                                      : JSON.stringify(value, null, 2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {Object.keys(rel.properties).length} 个属性
                            {Object.entries(rel.properties).slice(0, 1).map(([key, value]) => (
                              <span key={key} className="ml-2">
                                • {key}: {truncateText(String(value), 30)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="ml-4 flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRelationshipExpansion(rel.identity)}
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
                      onClick={() => openEditForm(rel)}
                      title="编辑属性"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(rel)}
                      title="删除关系"
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

      {/* 分页控件 */}
      {!isSearching && totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              显示 {startIndex} - {endIndex} / 共 {totalRelationships} 个关系
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                首页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                末页
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

