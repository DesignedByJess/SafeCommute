import { z } from 'zod';

const ALLOWED_ELEMENTS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'button', 'input', 'textarea', 'select', 'option',
  'a', 'img', 'ul', 'ol', 'li', 'section', 'article',
  'header', 'footer', 'nav', 'main', 'aside',
  'strong', 'em', 'small', 'label', 'form',
] as const;

const ALLOWED_EVENT_HANDLERS = ['onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur'] as const;

const ALLOWED_URL_PROTOCOLS = ['https:', 'http:', 'mailto:', 'tel:'] as const;

export interface ComponentNode {
  type: string;
  props?: Record<string, string | number | boolean | Record<string, string | number>>;
  children?: string | ComponentNode[];
}

export interface PlaygroundConfig {
  component: ComponentNode;
  css?: string;
}

const componentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.union([z.string(), z.number()]))])).optional(),
    children: z.union([z.string(), z.array(componentNodeSchema)]).optional(),
  })
);

export const playgroundRenderSchema = z.object({
  config: z.object({
    component: componentNodeSchema,
    css: z.string().max(50_000, 'CSS must be under 50KB').optional(),
  }).refine(
    (data) => {
      const errors: string[] = [];
      let totalNodeCount = 0;

      function validateNode(node: ComponentNode, depth: number): void {
        if (depth > 10) {
          errors.push('Component nesting exceeds maximum depth of 10');
          return;
        }

        if (!ALLOWED_ELEMENTS.includes(node.type as typeof ALLOWED_ELEMENTS[number])) {
          errors.push(`Element "<${node.type}>" is not allowed`);
        }

        if (node.props) {
          for (const [key, value] of Object.entries(node.props)) {
            if (ALLOWED_EVENT_HANDLERS.includes(key as typeof ALLOWED_EVENT_HANDLERS[number])) {
              if (typeof value === 'string' && (value.includes('fetch(') || value.includes('XMLHttpRequest') || value.includes('eval(') || value.includes('Function('))) {
                errors.push(`Event handler "${key}" contains disallowed code patterns`);
              }
            }

            if (key === 'href' || key === 'src' || key === 'action') {
              if (typeof value === 'string') {
                try {
                  const url = new URL(value);
                  if (!ALLOWED_URL_PROTOCOLS.includes(url.protocol as typeof ALLOWED_URL_PROTOCOLS[number])) {
                    errors.push(`URL protocol "${url.protocol}" is not allowed in "${key}"`);
                  }
                } catch {
                  // Relative URLs are fine
                }
              }
            }

            if (key === 'style' && typeof value === 'object' && value !== null) {
              for (const [prop, val] of Object.entries(value as Record<string, string | number>)) {
                if (typeof val === 'string' && (val.includes('expression(') || val.includes('javascript:') || val.includes('url('))) {
                  errors.push(`Style property "${prop}" contains disallowed patterns`);
                }
              }
            }
          }
        }

        if (Array.isArray(node.children)) {
          for (const child of node.children) {
            totalNodeCount++;
            if (totalNodeCount > 200) {
              errors.push('Component tree exceeds maximum of 200 nodes');
              return;
            }
            validateNode(child, depth + 1);
          }
        }
      }

      validateNode(data.component, 0);
      return errors.length === 0;
    },
    {
      message: 'Invalid component configuration',
    }
  ),
});
