"use client";

import { useHousehold } from "@/contexts/HouseholdContext";
import type { ItemMetadata, CategoryFieldConfig } from "@/types/database";

interface CategoryFieldsProps {
  metadata: ItemMetadata;
  onChange: (metadata: ItemMetadata) => void;
  errors?: Record<string, string>;
}

/**
 * Dynamic form fields based on household category
 * Renders different fields for apartment, bride_venue, or car
 */
export default function CategoryFields({ metadata, onChange, errors = {} }: CategoryFieldsProps) {
  const { categoryConfig } = useHousehold();
  
  const updateField = (key: string, value: string | number | boolean) => {
    onChange({ ...metadata, [key]: value });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <span>{categoryConfig.emoji}</span>
        <span>{categoryConfig.label} Details</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {categoryConfig.fields.map((field) => (
          <CategoryField
            key={field.key}
            field={field}
            value={(metadata as Record<string, unknown>)[field.key]}
            onChange={(value) => updateField(field.key, value)}
            error={errors[field.key]}
          />
        ))}
      </div>
    </div>
  );
}

// ── Individual Field Component ────────────────────────────────────────────────

interface CategoryFieldProps {
  field: CategoryFieldConfig;
  value: unknown;
  onChange: (value: string | number | boolean) => void;
  error?: string;
}

function CategoryField({ field, value, onChange, error }: CategoryFieldProps) {
  const baseInputClass = `
    w-full px-3 py-2 rounded-xl border text-sm text-slate-900 bg-white
    placeholder:text-slate-400 transition-colors duration-150
    focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
    ${error ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300"}
  `;

  switch (field.type) {
    case "boolean":
      return (
        <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-700">{field.label}</span>
        </label>
      );

    case "number":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">{field.label}</label>
          <input
            type="number"
            value={value !== undefined ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 0)}
            placeholder={field.placeholder || "0"}
            className={baseInputClass}
          />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      );

    case "select":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">{field.label}</label>
          <select
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      );

    case "text":
    default:
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">{field.label}</label>
          <input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            className={baseInputClass}
          />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      );
  }
}
