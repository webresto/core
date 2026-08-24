import DishCountWidget from "./DishCount";
import TodayOrdersCountWidget from "./TodayOrdersCount";
import DishesOnStopWidget from "./DishesOnStop";
import NotificationsTodayCountWidget from "./NotificationsTodayCount";
import SalesChannelsCountWidget from "./SalesChannelsCount";
import SetupChecklistWidget from "./SetupChecklist";
import { adminPanelWidgets, loadAdminPanelModule } from "../manifest";

/**
 * Builds the core's dashboard widgets from the manifest.
 *
 * Kept separate from registration so a host that owns its own widget registry (Adminizer's app
 * API) can take the instances without a live `widgetHandler`.
 */
export function createWidgets(routePrefix: string): any[] {
  const widgets: any[] = [];

  for (const widget of adminPanelWidgets) {
    try {
      const WidgetClass = loadAdminPanelModule(widget.module).default;
      widgets.push(widget.needsRoutePrefix ? new WidgetClass(routePrefix) : new WidgetClass());
    } catch (error) {
      sails.log.error(`Error creating dashboard widget \`${widget.id}\`:`, error);
    }
  }

  return widgets;
}

/**
 * Registers all dashboard widgets on the panel Sails handed us.
 */
export function initializeWidgets() {
  if (!sails.hooks?.adminpanel?.adminizer) {
    sails.log.warn('Adminpanel adminizer not available, skipping widget initialization');
    return;
  }

  const adminizer = sails.hooks.adminpanel.adminizer;
  const widgetHandler = adminizer.widgetHandler;

  if (!widgetHandler) {
    sails.log.warn('Widget handler not available, skipping widget initialization');
    return;
  }

  const routePrefix = adminizer.config?.routePrefix || sails.config.adminpanel?.routePrefix || '/admin';

  try {
    for (const widget of createWidgets(routePrefix)) {
      widgetHandler.add(widget);
    }

    sails.log.info('Dashboard widgets registered successfully');
  } catch (error) {
    sails.log.error('Error registering dashboard widgets:', error);
  }
}

export { DishCountWidget, TodayOrdersCountWidget, DishesOnStopWidget, NotificationsTodayCountWidget, SalesChannelsCountWidget, SetupChecklistWidget };
