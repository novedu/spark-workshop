"use client";

import type { ChangeEvent } from "react";
import { Sparkle } from "lucide-react";
import {
  getGoldenFingerFieldEntries,
  type GoldenFingerFieldDefinition
} from "@/lib/golden-finger-fields";
import type { GoldenFingerMetadataKey, OutlineNode } from "@/types/product";

interface GoldenFingerFieldsProps {
  node: OutlineNode;
  onChange: (key: GoldenFingerMetadataKey, value: string) => void;
}

export function GoldenFingerFields({ node, onChange }: GoldenFingerFieldsProps) {
  const fields = getGoldenFingerFieldEntries(node.metadata);
  const filledCount = fields.filter((field) => field.value.length > 0).length;

  return (
    <section className="node-golden-system" aria-label="金手指字段">
      <div className="node-golden-system-header">
        <div className="node-golden-system-title">
          <Sparkle size={15} aria-hidden />
          <strong>金手指基座</strong>
          <span>{filledCount}/5 已填</span>
        </div>
        <small>能力机制 · 限制边界 · 使用代价 · 升级路径 · 失控风险</small>
      </div>
      <div className="node-golden-fields">
        {fields.map((field) => (
          <GoldenFingerField key={field.key} field={field} value={field.value} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

function GoldenFingerField({
  field,
  value,
  onChange
}: {
  field: GoldenFingerFieldDefinition;
  value: string;
  onChange: (key: GoldenFingerMetadataKey, value: string) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(field.key, event.target.value);
  };

  return (
    <label className={`node-golden-field ${field.fullWidth ? "full-width" : ""}`}>
      <span>{field.label}</span>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder}
        title={field.description}
        rows={field.fullWidth ? 2 : 3}
      />
    </label>
  );
}
