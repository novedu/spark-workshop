"use client";

import type { ChangeEvent } from "react";
import { ShieldAlert } from "lucide-react";
import {
  getPressureSourceFieldEntries,
  type PressureSourceFieldDefinition
} from "@/lib/pressure-source-fields";
import type { OutlineNode, PressureSourceMetadataKey } from "@/types/product";

interface PressureSourceFieldsProps {
  node: OutlineNode;
  onChange: (key: PressureSourceMetadataKey, value: string) => void;
}

export function PressureSourceFields({ node, onChange }: PressureSourceFieldsProps) {
  const fields = getPressureSourceFieldEntries(node.metadata);
  const filledCount = fields.filter((field) => field.value.length > 0).length;

  return (
    <section className="node-pressure-chain" aria-label="压力源链字段">
      <div className="node-pressure-chain-header">
        <div className="node-pressure-chain-title">
          <ShieldAlert size={15} aria-hidden />
          <strong>压力源链</strong>
          <span>{filledCount}/5 已填</span>
        </div>
        <small>开局压迫 · 阶段对手 · 制度压力 · 终局影子 · 升级方式</small>
      </div>
      <div className="node-pressure-fields">
        {fields.map((field) => (
          <PressureSourceField key={field.key} field={field} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

function PressureSourceField({
  field,
  onChange
}: {
  field: PressureSourceFieldDefinition & { value: string; stageValue: string };
  onChange: (key: PressureSourceMetadataKey, value: string) => void;
}) {
  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(field.key, event.target.value);
  };
  const handleStageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!field.stageKey) return;
    onChange(field.stageKey, event.target.value);
  };

  return (
    <label className={`node-pressure-field ${field.fullWidth ? "full-width" : ""}`}>
      <span className="node-pressure-field-label">
        <b>{field.label}</b>
        {field.stageKey && (
          <input
            value={field.stageValue}
            onChange={handleStageChange}
            placeholder={field.stagePlaceholder}
            title={`${field.label}出场卷或阶段`}
            aria-label={`${field.label}出场卷或阶段`}
          />
        )}
      </span>
      <textarea
        value={field.value}
        onChange={handleTextChange}
        placeholder={field.placeholder}
        title={field.description}
        rows={field.fullWidth ? 2 : 3}
      />
    </label>
  );
}
