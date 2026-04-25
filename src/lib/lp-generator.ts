import { LPTemplate, LPSection } from '@/types/lp';

export function generateHtml(template: LPTemplate, fieldValues: Record<string, string>): string {
  const sectionHtmls = template.sections.map((s) => renderSection(s, fieldValues));

  // Separate CSS and JS CDN links
  const cdnCss = (template.cdnLinks || []).filter((u) => u.endsWith('.css'));
  const cdnJs = (template.cdnLinks || []).filter((u) => !u.endsWith('.css'));

  const cdnCssTags = cdnCss
    .map((u) => `  <link rel="stylesheet" href="${u}">`)
    .join('\n');
  const cdnJsTags = cdnJs
    .map((u) => `  <script src="${u}"></script>`)
    .join('\n');

  const styleBlock = template.globalStyles
    ? `  <style>\n${template.globalStyles}\n  </style>`
    : '';

  const scriptBlock = template.globalScripts
    ? `  <script>\n${template.globalScripts}\n  </script>`
    : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(fieldValues['meta_title'] || template.name)}</title>
${cdnCssTags}
${styleBlock}
</head>
<body>
${sectionHtmls.join('\n')}
${cdnJsTags}
${scriptBlock}
</body>
</html>`;
}

export function renderSection(section: LPSection, fieldValues: Record<string, string>): string {
  let html = section.htmlTemplate;

  for (const field of section.fields) {
    const valueKey = `${section.id}_${field.key}`;
    const raw = fieldValues[valueKey] ?? field.value ?? field.placeholder ?? '';

    // image_url and url fields must NOT be HTML-escaped (they go into src/href)
    const value =
      field.type === 'image_url' || field.type === 'url' ? raw : escapeHtml(raw);

    html = html.replaceAll(`{{${field.key}}}`, value);
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getDefaultFieldValues(template: LPTemplate): Record<string, string> {
  const values: Record<string, string> = {};
  for (const section of template.sections) {
    for (const field of section.fields) {
      values[`${section.id}_${field.key}`] = field.value || '';
    }
  }
  return values;
}
