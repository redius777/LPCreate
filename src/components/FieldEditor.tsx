'use client';

import { LPField, LPSection } from '@/types/lp';

interface Props {
  section: LPSection;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function FieldEditor({ section, values, onChange }: Props) {
  function fieldKey(field: LPField) {
    return `${section.id}_${field.key}`;
  }

  return (
    <div className="space-y-4">
      {section.fields.map((field) => {
        const key = fieldKey(field);
        const value = values[key] ?? field.value ?? '';

        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              <span className="ml-1 text-xs text-gray-400 font-normal">({field.key})</span>
            </label>

            {field.type === 'textarea' ? (
              <textarea
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            ) : field.type === 'color' ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value || '#000000'}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="h-9 w-16 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(key, e.target.value)}
                  placeholder={field.placeholder}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ) : field.type === 'list' ? (
              <ListEditor
                items={(value || '').split('\n').filter(Boolean)}
                placeholder={field.placeholder}
                onChange={(items) => onChange(key, items.join('\n'))}
              />
            ) : (
              <input
                type={field.type === 'url' || field.type === 'image_url' ? 'url' : 'text'}
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}

            {field.type === 'image_url' && value && (
              <div className="mt-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="preview"
                  className="h-20 w-auto rounded border border-gray-200 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListEditor({
  items,
  placeholder,
  onChange,
}: {
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  function update(idx: number, val: string) {
    const next = [...items];
    next[idx] = val;
    onChange(next.filter(Boolean));
  }

  function add() {
    onChange([...items, '']);
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => update(idx, e.target.value)}
            placeholder={`${placeholder} ${idx + 1}`}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => remove(idx)}
            className="px-2 py-1 text-red-500 hover:text-red-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-1"
      >
        + 項目を追加
      </button>
    </div>
  );
}
