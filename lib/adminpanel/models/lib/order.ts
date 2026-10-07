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
