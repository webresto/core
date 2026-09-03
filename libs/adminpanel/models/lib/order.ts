import { CreateUpdateConfig, FieldsModels } from "adminizer";
import { summarizeOrderLogs } from "../../controls/orderLogsViewerHelper";

export class OrderConfig {
  static listFields: FieldsModels = {
    logs: {
      title: "Logs",
      displayModifier(value: unknown) {
        return summarizeOrderLogs(value);
      },
    },
  };

  static editFields: FieldsModels = {
    /**
     * Read-only: the kitchen is resolved on every recalculation, and there is no
     * operator to overrule it. Shown so it can be read, never edited.
     */
    cookingPoint: {
      title: "Cooking point (assigned)",
      disabled: true,
      tooltip: "Кухня заказа. Назначается автоматически при пересчёте",
    },
    logs: {
      title: "Order logs",
      type: "json",
      disabled: true,
      tooltip: "Просмотр логов заказа: чёрный консольный вьювер с фильтрами по уровням",
      options: {
        name: "order-logs-viewer",
      },
    },
  };

  public static list(): { fields: FieldsModels } {
    return {
      fields: this.listFields,
    };
  }

  public static edit(): CreateUpdateConfig {
    return {
      fields: this.editFields,
    };
  }
}
