"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, FileText, User, Users, Zap, Flame, BookOpen, Lightbulb } from "lucide-react";
import type { OutlineNode, OutlineNodeKind } from "@/types/product";

interface OutlineEditorProps {
  nodes: OutlineNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onUpdateNode: (id: string, updates: Partial<OutlineNode>) => void;
  onAddNode: (node: OutlineNode) => void;
  onDeleteNode: (id: string) => void;
}

const kindIcons: Record<OutlineNodeKind, typeof FileText> = {
  world: BookOpen,
  protagonist: User,
  antagonist: Users,
  goldenFinger: Zap,
  conflict: Flame,
  act: FileText,
  foreshadowing: Lightbulb
};

const kindLabels: Record<OutlineNodeKind, string> = {
  world: "世界观",
  protagonist: "主角",
  antagonist: "反派",
  goldenFinger: "金手指",
  conflict: "冲突",
  act: "篇章",
  foreshadowing: "伏笔"
};

export function OutlineEditor({ nodes, selectedNodeId, onSelectNode, onUpdateNode, onAddNode, onDeleteNode }: OutlineEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);
  const selectedNode = sortedNodes.find((n) => n.id === selectedNodeId);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodeId) {
      onUpdateNode(selectedNodeId, { title: e.target.value });
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedNodeId) {
      onUpdateNode(selectedNodeId, { content: e.target.value });
    }
  };

  const handleAddNode = (kind: OutlineNodeKind) => {
    const newNode: OutlineNode = {
      id: `node-${Date.now()}`,
      kind,
      title: kindLabels[kind],
      content: "",
      order: nodes.length
    };
    onAddNode(newNode);
    setShowAddMenu(false);
  };

  return (
    <div className="outline-editor">
      <div className="outline-sidebar">
        <div className="outline-header">
          <h3>大纲节点</h3>
          <div className="outline-actions">
            <div className="add-node-menu">
              <button
                className="icon-button"
                type="button"
                onClick={() => setShowAddMenu(!showAddMenu)}
              >
                <Plus size={16} />
              </button>
              {showAddMenu && (
                <div className="add-menu-dropdown">
                  {Object.entries(kindLabels).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => handleAddNode(kind as OutlineNodeKind)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="outline-tree">
          {sortedNodes.map((node) => {
            const Icon = kindIcons[node.kind];
            return (
              <div
                key={node.id}
                className={`outline-tree-item ${selectedNodeId === node.id ? "selected" : ""}`}
                onClick={() => onSelectNode(node.id)}
              >
                <GripVertical size={14} className="drag-handle" />
                <Icon size={14} />
                <span className="outline-node-title">{node.title}</span>
                {selectedNodeId === node.id && (
                  <button
                    className="icon-button delete-button"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="outline-editor-panel">
        {selectedNode ? (
          <div className="node-editor">
            <div className="node-editor-header">
              <span className="node-kind-badge">{kindLabels[selectedNode.kind]}</span>
              <input
                type="text"
                value={selectedNode.title}
                onChange={handleTitleChange}
                className="node-title-input"
              />
            </div>
            <textarea
              value={selectedNode.content}
              onChange={handleContentChange}
              className="node-content-textarea"
              placeholder="输入节点内容..."
            />
            {selectedNode.metadata?.chapterRange && (
              <div className="node-metadata">
                <span>章节范围：{selectedNode.metadata.chapterRange}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="node-editor-empty">
            <FileText size={48} />
            <p>选择一个节点开始编辑</p>
          </div>
        )}
      </div>
    </div>
  );
}