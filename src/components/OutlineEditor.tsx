"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, FileText, WandSparkles } from "lucide-react";
import { defaultEmotionGoalByKind, emotionGoalOptions, getNodeEmotionGoal } from "@/lib/emotion-goals";
import { getGoldenFingerMetadata } from "@/lib/golden-finger-fields";
import { createArcPhaseNode } from "@/lib/outline-template";
import { getPressureSourceMetadata } from "@/lib/pressure-source-fields";
import { getProtagonistMetadata } from "@/lib/protagonist-fields";
import { GoldenFingerFields } from "@/components/GoldenFingerFields";
import { PressureSourceFields } from "@/components/PressureSourceFields";
import { ProtagonistFields } from "@/components/ProtagonistFields";
import {
  getOutlineNodeStageHint,
  outlineKindDisplayLabels
} from "@/lib/outline-ux";
import {
  serialArcFieldDefinitions,
  type SerialArcFieldDefinition
} from "@/lib/serial-arc-fields";
import type {
  EmotionType,
  GoldenFingerMetadataKey,
  OutlineNode,
  OutlineNodeKind,
  PressureSourceMetadataKey,
  ProtagonistMetadataKey,
  ReaderEmotionGoal
} from "@/types/product";

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
  const [expandedSerialNodeIds, setExpandedSerialNodeIds] = useState<Record<string, boolean>>({});

  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);
  const selectedNode = sortedNodes.find((n) => n.id === selectedNodeId);
  const selectedEmotionGoal = selectedNode ? getNodeEmotionGoal(selectedNode) : null;
  const selectedStageHint = selectedNode ? getOutlineNodeStageHint(selectedNode) : "";
  const serialArcFieldValues =
    selectedNode?.kind === "act"
      ? serialArcFieldDefinitions.map((field) => ({
          ...field,
          value: selectedNode.metadata?.[field.key]?.trim() ?? ""
        }))
      : [];
  const filledSerialArcFieldCount = serialArcFieldValues.filter((field) => field.value.length > 0).length;
  const serialArcPreviewFields = serialArcFieldValues.slice(0, 3);
  const serialFieldsExpanded = selectedNodeId ? Boolean(expandedSerialNodeIds[selectedNodeId]) : false;

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

  const handleProtagonistFieldChange = (key: ProtagonistMetadataKey, value: string) => {
    if (!selectedNodeId || !selectedNode || selectedNode.kind !== "protagonist") return;
    onUpdateNode(selectedNodeId, {
      metadata: {
        ...(selectedNode.metadata ?? {}),
        ...getProtagonistMetadata(selectedNode),
        [key]: value
      }
    });
  };

  const handlePressureSourceFieldChange = (key: PressureSourceMetadataKey, value: string) => {
    if (!selectedNodeId || !selectedNode || selectedNode.kind !== "antagonist") return;
    onUpdateNode(selectedNodeId, {
      metadata: {
        ...(selectedNode.metadata ?? {}),
        ...getPressureSourceMetadata(selectedNode),
        [key]: value
      }
    });
  };

  const handleGoldenFingerFieldChange = (key: GoldenFingerMetadataKey, value: string) => {
    if (!selectedNodeId || !selectedNode || selectedNode.kind !== "goldenFinger") return;
    onUpdateNode(selectedNodeId, {
      metadata: {
        ...(selectedNode.metadata ?? {}),
        ...getGoldenFingerMetadata(selectedNode),
        [key]: value
      }
    });
  };

  const handleSerialArcFieldChange = (key: SerialArcFieldDefinition["key"], value: string) => {
    if (!selectedNodeId || !selectedNode) return;
    onUpdateNode(selectedNodeId, {
      metadata: {
        ...(selectedNode.metadata ?? {}),
        [key]: value
      }
    });
  };

  const toggleSerialFields = () => {
    if (!selectedNodeId) return;
    setExpandedSerialNodeIds((prev) => ({
      ...prev,
      [selectedNodeId]: !prev[selectedNodeId]
    }));
  };

  const handleAddNode = (kind: OutlineNodeKind) => {
    if (kind === "arcPhase") {
      const parentNode = selectedNode?.kind === "arcPhase"
        ? nodes.find((node) => node.id === selectedNode.parentId)
        : selectedNode;
      if (parentNode?.kind === "act") {
        const siblingPhaseCount = nodes.filter((node) => node.kind === "arcPhase" && node.parentId === parentNode.id).length;
        onAddNode(createArcPhaseNode(parentNode.id, nodes.length, siblingPhaseCount + 1));
        setShowAddMenu(false);
        return;
      }
    }

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
                title="根据当前节点和兄弟节点，补写缺失的设定缺口"
                onClick={() => onEnhanceNode(selectedNode.id)}
                disabled={enhancingNodeId === selectedNode.id}
              >
                <WandSparkles size={14} className={enhancingNodeId === selectedNode.id ? "spinning" : ""} aria-hidden />
                {enhancingNodeId === selectedNode.id ? "补写中" : "AI补写缺口"}
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
            {selectedNode.kind === "protagonist" && (
              <ProtagonistFields node={selectedNode} onChange={handleProtagonistFieldChange} />
            )}
            {selectedNode.kind === "antagonist" && (
              <PressureSourceFields node={selectedNode} onChange={handlePressureSourceFieldChange} />
            )}
            {selectedNode.kind === "goldenFinger" && (
              <GoldenFingerFields node={selectedNode} onChange={handleGoldenFingerFieldChange} />
            )}
            {selectedNode.kind === "act" && (
              <section className="node-serial-arc" aria-label="卷纲字段">
                <button
                  type="button"
                  className="node-serial-summary"
                  onClick={toggleSerialFields}
                  aria-expanded={serialFieldsExpanded}
                >
                  {serialFieldsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="node-serial-summary-title">卷纲字段</span>
                  <span className="node-serial-summary-count">{filledSerialArcFieldCount}/6 已填</span>
                  {selectedNode.metadata?.chapterRange && (
                    <span className="node-serial-summary-range">{selectedNode.metadata.chapterRange}</span>
                  )}
                </button>
                {!serialFieldsExpanded && (
                  <div className="node-serial-preview">
                    {serialArcPreviewFields.map((field) => (
                      <span key={field.key}>
                        <b>{field.label}</b>
                        {field.value || "待补"}
                      </span>
                    ))}
                  </div>
                )}
                {serialFieldsExpanded && (
                  <div className="node-serial-fields">
                    {serialArcFieldDefinitions.map((field) => (
                      <label key={field.key} className="node-serial-field">
                        <span>{field.label}</span>
                        <textarea
                          value={selectedNode.metadata?.[field.key] ?? ""}
                          onChange={(event) => handleSerialArcFieldChange(field.key, event.target.value)}
                          placeholder={field.description}
                          title={field.description}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>
            )}
            <textarea
              value={selectedNode.content}
              onChange={handleContentChange}
              className="node-content-textarea"
              placeholder="输入节点内容..."
            />
            {selectedNode.kind !== "act" && selectedNode.metadata?.chapterRange && (
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
