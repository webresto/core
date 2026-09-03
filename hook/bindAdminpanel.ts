/**
 * Binds the core's admin panel the Sails way: through `sails-adminpanel`'s events, onto a live
 * Adminizer instance.
 *
 * What the panel consists of is no longer written here — it is data in
 * `lib/adminpanel/manifest.ts`. This file only knows how a Sails host delivers it: which event
 * carries what, in which order, and that a broken module must not take the rest down with it.
 * A host that runs the core outside Sails reads the same manifest and binds it its own way, so
 * a module added to the manifest appears in both without either binder being touched.
 */
import * as fs from "fs";
import * as path from "path";
import { ensureDefaultGroups } from "../libs/adminpanel/ensureDefaultGroups";
import {
  AdminPanelModule,
  adminPanelAccessTokens,
  adminPanelCatalog,
  adminPanelControls,
  adminPanelDashboardWidgets,
  adminPanelDefaultModule,
  adminPanelLocalesDir,
  adminPanelMediaManager,
  adminPanelMiddlewares,
  adminPanelModules,
  adminPanelNavbarLinks,
  loadAdminPanelController,
  loadAdminPanelModule,
} from "../lib/adminpanel/manifest";

// todo: fix types model instance to {%ModelName%}Record for bind"

/** One admin page, as offered to `admin-panel:collect-links` subscribers. */
interface AdminPageLink {
  type: 'app';
  name: string;
  link: string;
  title?: string;
  section?: string;
  accessRightsToken?: string;
}

function normalizeHandlers(bound: any): any[] {
  return Array.isArray(bound) ? bound : [bound];
}

function makeAdminizerBinder(adminizer: any): (action: any) => any[] {
  const hasMiddlewareManager =
    adminizer.middlewareManager &&
    typeof adminizer.middlewareManager.bindMiddlewares === 'function';

  if (hasMiddlewareManager) {
    const middlewares = adminizer.config.middlewares ?? [];
    return (action: any) => normalizeHandlers(adminizer.middlewareManager.bindMiddlewares(middlewares, action));
  }

  const policies = adminizer.config.policies;
  return (action: any) => normalizeHandlers(adminizer.policyManager.bindPolicies(policies, action));
}

export default function bindAdminpanel() {
  processBindAdminpanel();
  sails.on('Adminpanel:loaded', async () => {
    if (!sails.hooks.adminpanel?.adminizer) return;

    const adminizer = sails.hooks.adminpanel.adminizer;
    const routePrefix = adminizer.config.routePrefix;
    appendTranslations(adminizer);

    // Before anything is bound: the demo seed creates the catalog, the kitchens
    // and the zones the screens below are about, and it is a no-op unless
    // `MULTI_KITCHEN_DEMO_SEED` asks for it.
    try {
      const { seedMultiKitchenDemo } = require("../libs/adminpanel/seedMultiKitchenDemo");
      await seedMultiKitchenDemo(adminizer);
    } catch (e) {
      sails.log.error("Multi-kitchen demo seed failed", e);
    }

    adminizer.accessRightsHelper.registerTokens(adminPanelAccessTokens);

    // Catalog bind
    try {
      const ProductCatalog = loadAdminPanelModule(adminPanelCatalog.module)[adminPanelCatalog.export];
      const productCatalog = new ProductCatalog();
      adminizer.catalogHandler.add(productCatalog);

      // One token per catalog on top of the catalog-wide one from the manifest: they only
      // exist once the catalog can say what it holds.
      const catalogIds = await productCatalog.getIdList();
      adminizer.accessRightsHelper.registerTokens(
        catalogIds.map((catalogId: string) => ({
          id: `${adminPanelCatalog.accessRightsToken}-${catalogId}`,
          name: "Product catalog",
          description: "Access to edit catalog for products",
          department: 'Catalog'
        }))
      );
    } catch (e) {
      sails.log.warn('Adminpanel product catalog binding skipped', e);
    }

    // Product media manager bind
    try {
      const ProductMediaManager = loadAdminPanelModule(adminPanelMediaManager.module)[adminPanelMediaManager.export];
      adminizer.mediaManagerHandler.add(new ProductMediaManager());
    } catch (e) {
      sails.log.warn('Adminpanel product media manager binding skipped', e);
    }

    // Custom controls used by the model forms (order logs, worktime, modifiers, tags)
    for (const control of adminPanelControls) {
      try {
        if (adminizer.controlsHandler.get(control.type, control.name)) continue;
        const ControlClass = loadAdminPanelModule(control.module)[control.export];
        adminizer.controlsHandler.add(new ControlClass(adminizer));
      } catch (e) {
        sails.log.warn(`Adminpanel control \`${control.name}\` binding skipped`, e);
      }
    }

    // Initialize dashboard widgets
    try {
      const { initializeWidgets } = loadAdminPanelModule("widgets");
      initializeWidgets();
    } catch (e) {
      sails.log.warn("Adminpanel widgets initialization skipped", e);
    }

    try {
      await ensureDefaultGroups(adminizer, adminizer.config.defaultGroups);
    } catch (e) {
      sails.log.error('Default admin groups initialization failed', e);
    }

    if (Array.isArray(adminizer.config.navbar?.additionalLinks)) {
      for (const link of adminPanelNavbarLinks) {
        adminizer.config.navbar.additionalLinks.push({
          id: link.id,
          title: link.title,
          link: link.linkType === "admin" ? `${routePrefix}${link.link}` : link.link,
          icon: link.icon as any,
          section: link.section as any,
          ...(link.accessRightsToken ? { accessRightsToken: link.accessRightsToken } : {}),
        });
      }
    }
  })
}

function appendTranslations(adminizer: any) {
  if (!adminizer?.i18n?.appendLocale) {
    sails.log.warn("Adminizer i18n.appendLocale is not available, skipping core programmatic translations");
    return;
  }

  if (!fs.existsSync(adminPanelLocalesDir)) {
    sails.log.warn(`Adminpanel module translations directory not found: ${adminPanelLocalesDir}`);
    return;
  }

  const locales = sails.config.i18n?.locales ?? [];
  for (const locale of locales) {
    const localeFile = path.resolve(adminPanelLocalesDir, `${locale}.json`);
    if (!fs.existsSync(localeFile)) {
      sails.log.debug(`Adminpanel module translations: locale file not found for ${locale}`);
      continue;
    }

    try {
      const fileContent = fs.readFileSync(localeFile, "utf8");
      const jsonData = JSON.parse(fileContent);
      adminizer.i18n.appendLocale(locale, jsonData);
    } catch (error) {
      sails.log.error(`Adminpanel module translations > Error when reading ${locale}.json:`, error);
    }
  }
}

// Adding a method to update admin panel models
function addModelConfig(newModels: Record<string, any>) {
  if (!sails.config.adminpanel || !sails.config.adminpanel.models) return;
  Object.assign(sails.config.adminpanel.models, newModels);
}



function processBindAdminpanel() {
  // Using local addModelConfig
  try {
    const models = require("../libs/adminpanel/models/bind").models;
    addModelConfig(models);
  } catch (e) {
    sails.log.warn("Adminpanel model bindings are skipped: failed to load model configs", e);
  }

  // Configure dashboard widgets
  if (sails.config.adminpanel?.dashboard) {
    if (!sails.config.adminpanel.dashboard.defaultWidgets) {
      sails.config.adminpanel.dashboard.defaultWidgets = [];
    }
    const defaultWidgets = sails.config.adminpanel.dashboard.defaultWidgets;
    for (const widgetId of adminPanelDashboardWidgets) {
      if (!defaultWidgets.includes(widgetId)) {
        defaultWidgets.push(widgetId);
      }
    }
  }

  // Module routes are bound once the panel's own router exists.
  sails.on('Adminpanel:afterHook:loaded', async () => {
    if (sails.hooks.adminpanel && sails.hooks.adminpanel.adminizer) {
      const adminizer = sails.hooks.adminpanel.adminizer;
      adminizer.emitter.on('adminizer:loaded', () => {
        const routePrefix = adminizer.config.routePrefix;
        const bind = makeAdminizerBinder(adminizer);

        // Admin pages this module owns. Recorded as they are registered so the
        // list cannot drift from the navbar, and offered over the emitter to
        // whoever builds links into the admin router.
        const corePages: AdminPageLink[] = [];
        // Answered live on every read, so it does not matter who loads first,
        // and nothing breaks when no one is collecting.
        emitter.on('admin-panel:collect-links', 'restocore', () => corePages);

        for (const middleware of adminPanelMiddlewares) {
          try {
            adminizer.app.use(
              `${routePrefix}${middleware.route}`,
              loadAdminPanelController(middleware.handler)
            );
          } catch (e) {
            sails.log.debug(`Adminpanel middleware \`${middleware.id}\` bind error`, e);
          }
        }

        for (const module of adminPanelModules) {
          try {
            bindModule(adminizer, module, routePrefix, bind, corePages);
          } catch (e) {
            sails.log.debug(`Adminpanel module \`${module.id}\` bind error`, e);
          }
        }

        // The OpenHarness Agent page moved to the restoapp project
        // (api/hooks/openharness-ui); only the access token stays here.

        // Route for product setup page
        // adminizer.app.get(`${routePrefix}/product-setup`, (req: any, res: any) => {
        //   if (adminizer.config.auth?.enable && !req.user) {
        //     return res.redirect(`${routePrefix}/model/userap/login`);
        //   }
        //   // For now, redirect to catalog - later can render ProductSetup component
        //   return res.redirect(`${routePrefix}/catalog/products`);
        // });
      });
    }
  });

}

/** Binds one manifest module: its page (plus sidebar entry) and its API routes. */
function bindModule(
  adminizer: any,
  module: AdminPanelModule,
  routePrefix: string,
  bind: (action: any) => any[],
  corePages: AdminPageLink[]
): void {
  const page = module.page;
  if (page) {
    const link = `${routePrefix}${page.route}`;
    adminizer.config.navbar.additionalLinks.push({
      id: page.id,
      title: page.title,
      link,
      icon: page.icon,
      accessRightsToken: page.accessRightsToken,
      section: page.section,
    });
    corePages.push({
      type: 'app',
      name: page.id,
      link,
      title: page.title,
      section: page.section,
      accessRightsToken: page.accessRightsToken,
    });

    adminizer.app.get(link, ...bind(loadAdminPanelController(page.controller)));

    // Asked after the link is in place rather than before it: the answer needs
    // the database and this handler is synchronous — Adminizer emits
    // `adminizer:loaded` once and does not wait for a listener to finish. The
    // sidebar is rebuilt from this array on every request, so an entry taken
    // out of it a few milliseconds later is one no operator ever saw. The route
    // stays bound either way, and its controller is what actually refuses.
    if (module.available) {
      void module.available()
        .then((available: boolean) => {
          if (available) return;
          // Found by id rather than by the object pushed above: the array is
          // the one the sidebar is built from on every request, but the entry
          // in it is not necessarily the same object by the time this answers.
          const links = adminizer.config.navbar.additionalLinks;
          const at = links.findIndex((entry: any) => entry.id === page.id);
          if (at !== -1) links.splice(at, 1);
          const shown = corePages.findIndex((entry) => entry.name === page.id);
          if (shown !== -1) corePages.splice(shown, 1);
        })
        .catch((e: any) => sails.log.warn("Adminpanel module availability check failed: " + module.id, e));
    }

    if (module.id === adminPanelDefaultModule) {
      // Make this module the default admin landing page.
      adminizer.app.get(
        `${routePrefix}`,
        ...bind((_req: any, res: any) => res.redirect(link))
      );
    }
  }

  for (const route of module.routes ?? []) {
    adminizer.app[route.method](
      `${routePrefix}${route.route}`,
      ...bind(loadAdminPanelController(route.controller))
    );
  }
}
