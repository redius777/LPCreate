import fs from 'fs';
import path from 'path';
import { LPTemplate, LPProject } from '@/types/lp';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filePath: string): T[] {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJson<T>(filePath: string, data: T[]) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Templates
export function getTemplates(): LPTemplate[] {
  return readJson<LPTemplate>(TEMPLATES_FILE);
}

export function getTemplate(id: string): LPTemplate | null {
  const templates = getTemplates();
  return templates.find((t) => t.id === id) || null;
}

export function saveTemplate(template: LPTemplate): LPTemplate {
  const templates = getTemplates();
  const idx = templates.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }
  writeJson(TEMPLATES_FILE, templates);
  return template;
}

export function deleteTemplate(id: string): boolean {
  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;
  writeJson(TEMPLATES_FILE, filtered);
  return true;
}

// Projects
export function getProjects(): LPProject[] {
  return readJson<LPProject>(PROJECTS_FILE);
}

export function getProject(id: string): LPProject | null {
  const projects = getProjects();
  return projects.find((p) => p.id === id) || null;
}

export function saveProject(project: LPProject): LPProject {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  writeJson(PROJECTS_FILE, projects);
  return project;
}
