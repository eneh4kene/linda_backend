import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { CallContext } from '../types';

const PROMPT_PATH = path.join(process.cwd(), 'src', 'linda_system_prompt.md');
let compiledTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Reads and compiles the Handlebars system prompt
 */
function getTemplate(): Handlebars.TemplateDelegate {
  if (compiledTemplate) return compiledTemplate;

  try {
    const source = fs.readFileSync(PROMPT_PATH, 'utf-8');
    compiledTemplate = Handlebars.compile(source);
    return compiledTemplate;
  } catch (error) {
    console.error('Failed to load system prompt:', error);
    // Fallback to a simple string if file read fails
    return Handlebars.compile('You are Linda, a helpful AI assistant.');
  }
}

/**
 * Renders the system prompt for a specific call context
 */
export function renderSystemPrompt(context: CallContext['dynamicVariables'] & { mode_outbound: boolean; mode_inbound: boolean }): string {
  const template = getTemplate();
  return template(context);
}
