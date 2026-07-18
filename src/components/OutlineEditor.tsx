"use client";

import { useState } from "react";
import { Plus, Trash2, FileText, WandSparkles } from "lucide-react";
import { defaultEmotionGoalByKind, emotionGoalOptions, getNodeEmotionGoal } from "@/lib/emotion-goals";
import {
  getOutlineNodeStageHint,
  outlineKindDisplayLabels
} from "@/lib/outline-ux";
import type { EmotionType, OutlineNode, OutlineNodeKind, ReaderEmotionGoal } from "@/types/product";

interface OutlineEditorProps {
  nodes: OutlineNode[];
  selectedNodeId: string | null;
  onUpdateNode: (id: string, updates: Partial<OutlineNode>) => void;
  onAddNode: (node: OutlineNode) => void;
  onDeleteNode: (id: string) => void;
  onEnhanceNode: (id: string) => void;
  enhancingNodeId?: string | null;
  enhanceStatus?: string | null;
}

export function OutlineEditor({
  nodes,
  selectedNodeId,
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onEnhanceNode,
  enhancingNodeId,
  enhanceStatus
}: OutlineEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);
  const selectedNode = sortedNodes.find((n) => n.id === selectedNodeId);
  const selectedEmotionGoal = selectedNode ? getNodeEmotionGoal(selectedNode) : null;
  const selectedStageHint = selectedNode ? getOutlineNodeStageHint(selectedNode) : "";

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

  const handleEmotionGoalChange = (updates: Partial<ReaderEmotionGoal>) => {
    if (!selectedNodeId || !selectedNode) return;
    onUpdateNode(selectedNodeId, {
      emotionGoal: {
        ...getNodeEmotionGoal(selectedNode),
        ...updates
      }
    });
  };

  const handleAddNode = (kind: OutlineNodeKind) => {
    const newNode: OutlineNode = {
      id: `node-${Date.now()}`,
      kind,
      title: outlineKindDisplayLabels[kind],
      content: "",
      emotionGoal: defaultEmotionGoalByKind[kind],
      order: nodes.length
    };
    onAddNode(newNode);
    setShowAddMenu(false);
  };

  return (
    <div className="outline-editor">
      <div className="outline-editor-panel">
        {selectedNode ? (
          <div className="node-editor">
            <div className="node-editor-header">
              <span className="node-kind-badge">{outlineKindDisplayLabels[selectedNode.kind]}</span>
              <input
                type="text"
                value={selectedNode.title}
                onChange={handleTitleChange}
                className="node-title-input"
              />
              <button
                type="button"
                className="node-ai-button"
                onClick={() => onEnhanceNode(selectedNode.id)}
                disabled={enhancingNodeId === selectedNode.id}
              >
                <WandSparkles size={14} className={enhancingNodeId === selectedNode.id ? "spinning" : ""} aria-hidden />
                {enhancingNodeId === selectedNode.id ? "补写中" : "AI补全"}
              </button>
              <div className="add-node-menu">
                <button
                  className="icon-button"
                  type="button"
                  title="新增大纲节点"
                  aria-label="新增大纲节点"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                >
                  <Plus size={16} />
                </button>
                {showAddMenu && (
                  <div className="add-menu-dropdown">
                    {Object.entries(outlineKindDisplayLabels).map(([kind, label]) => (
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
              <button
                className="icon-button node-delete-button"
                type="button"
                title="删除当前节点"
                aria-label="删除当前节点"
                onClick={() => onDeleteNode(selectedNode.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {selectedStageHint && <p className="node-stage-hint">{selectedStageHint}</p>}
            {enhanceStatus && <div className="node-ai-status">{enhanceStatus}</div>}
            <div className="node-emotion-goal" aria-label="读者情绪目标">
              <label>
                <span>目标情绪</span>
                <select
                  value={selectedEmotionGoal?.emotion ?? defaultEmotionGoalByKind[selectedNode.kind].emotion}
                  onChange={(event) => handleEmotionGoalChange({ emotion: event.target.value as EmotionType })}
                >
                  {emotionGoalOptions.map((emotion) => (
                    <option key={emotion} value={emotion}>
                      {emotion}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>情绪强度</span>
                <select
                  value={String(selectedEmotionGoal?.intensity ?? defaultEmotionGoalByKind[selectedNode.kind].intensity)}
                  onChange={(event) =>
                    handleEmotionGoalChange({ intensity: Number(event.target.value) as ReaderEmotionGoal["intensity"] })
                  }
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="emotion-promise-field">
                <span>读者承诺</span>
                <input
                  value={selectedEmotionGoal?.promise ?? defaultEmotionGoalByKind[selectedNode.kind].promise}
                  onChange={(event) => handleEmotionGoalChange({ promise: event.target.value })}
                  placeholder="这一节点要让读者产生什么期待或满足？"
                />
              </label>
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
