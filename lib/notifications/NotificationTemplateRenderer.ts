/**
 * NotificationTemplateRenderer
 *
 * Resolves the text for a notification type given a channel + locale, then
 * interpolates `{{path.to.value}}` placeholders against the notification context.
 *
 * Resolution order (design notes §1, push-notifications.md "single contract"):
 *   1. templates.channels[channelType][locale]
 *   2. templates.channels[channelType].default
 *   3. templates.locales[locale]
 *   4. templates.default
 * Fields are merged top-down so a channel-specific override can supply only `title`
 * while `body` falls back to the base template.
 */

import { NotificationType, NotificationTemplateContent } from "./NotificationTypeRegistry";

export interface RenderInput {
  channelType?: string;
  locale?: string;
  context?: Record<string, any>;
  recipient?: Record<string, any>;
}

export interface RenderedContent {
  title: string;
  body: string;
  subject?: string;
  clickUrl?: string;
  [key: string]: string | undefined;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Resolve a dotted path (e.g. "order.shortId") against a root object. */
function resolvePath(root: Record<string, any>, path: string): unknown {
  let current: any = root;
  for (const segment of path.split(".")) {
    if (current == null) return undefined;
    current = current[segment];
  }
  return current;
}

export class NotificationTemplateRenderer {
  /**
   * Pick the most specific template content for the given channel/locale,
   * merged with less specific fallbacks.
   */
  static resolveTemplate(type: NotificationType, channelType?: string, locale?: string): NotificationTemplateContent {
    const templates = type.templates || {};
    const layers: NotificationTemplateContent[] = [];

    // Least specific first; later layers override earlier ones.
    if (isPlainObject(templates.default)) layers.push(templates.default);
    if (locale && isPlainObject(templates.locales) && isPlainObject(templates.locales[locale])) {
      layers.push(templates.locales[locale]);
    }
    if (channelType && isPlainObject(templates.channels) && isPlainObject(templates.channels[channelType])) {
      const channelTemplates = templates.channels[channelType];
      if (isPlainObject(channelTemplates.default)) layers.push(channelTemplates.default);
      if (locale && isPlainObject(channelTemplates[locale])) layers.push(channelTemplates[locale]);
    }

    return Object.assign({}, ...layers);
  }

  /**
   * Interpolate `{{path}}` placeholders. Unknown paths render as "" and are logged at silly.
   */
  static interpolate(template: string | undefined, scope: Record<string, any>): string {
    if (!template || typeof template !== "string") return "";
    return template.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, (_match, path: string) => {
      const value = resolvePath(scope, path);
      if (value === undefined || value === null) {
        try {
          sails.log.silly(`[NotificationTemplateRenderer] Unknown template variable: ${path}`);
        } catch (_e) { /* sails unavailable */ }
        return "";
      }
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
  }

  /**
   * Render a notification type into final text for a channel/locale.
   */
  static render(type: NotificationType, input: RenderInput = {}): RenderedContent {
    const { channelType, locale, context = {}, recipient = {} } = input;
    const resolved = NotificationTemplateRenderer.resolveTemplate(type, channelType, locale);
    const scope: Record<string, any> = { ...context, recipient };

    const rendered: RenderedContent = { title: "", body: "" };
    for (const [key, value] of Object.entries(resolved)) {
      rendered[key] = NotificationTemplateRenderer.interpolate(value, scope);
    }
    rendered.title = rendered.title || "";
    rendered.body = rendered.body || "";
    return rendered;
  }

  /**
   * Build the canonical `render` block (default + all configured locales + all
   * configured channels) so it can be attached to the notification payload and
   * consumed by the dispatcher / channel adapters.
   */
  static buildRenderBlock(type: NotificationType, input: Omit<RenderInput, "channelType" | "locale"> & { locale?: string } = {}): {
    default: RenderedContent;
    locales: Record<string, RenderedContent>;
    channels: Record<string, RenderedContent>;
  } {
    const { context = {}, recipient = {}, locale } = input;
    const templates = type.templates || {};

    const block = {
      default: NotificationTemplateRenderer.render(type, { context, recipient, locale }),
      locales: {} as Record<string, RenderedContent>,
      channels: {} as Record<string, RenderedContent>,
    };

    if (isPlainObject(templates.locales)) {
      for (const loc of Object.keys(templates.locales)) {
        block.locales[loc] = NotificationTemplateRenderer.render(type, { context, recipient, locale: loc });
      }
    }
    if (isPlainObject(templates.channels)) {
      for (const channelType of Object.keys(templates.channels)) {
        block.channels[channelType] = NotificationTemplateRenderer.render(type, { context, recipient, locale, channelType });
      }
    }
    return block;
  }
}
