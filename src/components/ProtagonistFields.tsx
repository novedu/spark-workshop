"use client";

import type { ChangeEvent } from "react";
import { UserRound } from "lucide-react";
import {
  getProtagonistFieldEntries,
  type ProtagonistFieldDefinition
} from "@/lib/protagonist-fields";
import type { OutlineNode, ProtagonistMetadataKey } from "@/types/product";

interface ProtagonistFieldsProps {
  node: OutlineNode;
  onChange: (key: ProtagonistMetadataKey, value: string) => void;
}

export function ProtagonistFields({ node, onChange }: ProtagonistFieldsProps) {
  const fields = getProtagonistFieldEntries(node.metadata);
  const filledCount = fields.filter((field) => field.value.length > 0).length;

  return (
    <section className="node-protagonist-profile" aria-label="主角字段">
      <div className="node-protagonist-profile-header">
        <div className="node-protagonist-profile-title">
          <UserRound size={15} aria-hidden />
          <strong>主角基座</strong>
          <span>{filledCount}/5 已填</span>
        </div>
        <small>开局驱动力 · 困境压力 · 成长方向 · 关键关系</small>
      </div>
      <div className="node-protagonist-fields">
        {fields.map((field) => (
          <ProtagonistField key={field.key} field={field} value={field.value} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

function ProtagonistField({
  field,
  value,
  onChange
}: {
  field: ProtagonistFieldDefinition;
  value: string;
  onChange: (key: ProtagonistMetadataKey, value: string) => void;
}) {
  const commonProps = {
    value,
    placeholder: field.placeholder,
    title: field.description,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field.key, event.target.value)
  };

  return (
    <label className={`node-protagonist-field ${field.fullWidth ? "full-width" : ""}`}>
      <span>{field.label}</span>
      {field.multiline ? <textarea {...commonProps} rows={2} /> : <input {...commonProps} />}
    </label>
  );
}
