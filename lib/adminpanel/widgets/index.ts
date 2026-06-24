import DishCountWidget from "./DishCount";
import TodayOrdersCountWidget from "./TodayOrdersCount";
import DishesOnStopWidget from "./DishesOnStop";
import NotificationsTodayCountWidget from "./NotificationsTodayCount";
import SalesChannelsCountWidget from "./SalesChannelsCount";

/**
 * Initialize and register all dashboard widgets
 */
export function initializeWidgets() {
  if (!sails.hooks?.adminpanel?.adminizer) {
    sails.log.warn('Adminpanel adminizer not available, skipping widget initialization');
    return;
  }

  const widgetHandler = sails.hooks.adminpanel.adminizer.widgetHandler;
  
  if (!widgetHandler) {
    sails.log.warn('Widget handler not available, skipping widget initialization');
    return;
  }

  try {
    // Register widgets
    widgetHandler.add(new DishCountWidget());
    widgetHandler.add(new TodayOrdersCountWidget());
    widgetHandler.add(new DishesOnStopWidget());
    widgetHandler.add(new NotificationsTodayCountWidget());
    widgetHandler.add(new SalesChannelsCountWidget());
    
    sails.log.info('Dashboard widgets registered successfully');
  } catch (error) {
    sails.log.error('Error registering dashboard widgets:', error);
  }
}

export { DishCountWidget, TodayOrdersCountWidget, DishesOnStopWidget, NotificationsTodayCountWidget, SalesChannelsCountWidget };
