import { FieldsModels } from "adminizer";

export class NotificationConfig {
  static fields: FieldsModels = {
    id:        { title: "Id", disabled: true },
    user:      { title: "User", disabled: true },
    title:     { title: "Title" },
    body:      { title: "Body", type: "text" },
    data:      { title: "Payload", type: "json" },
    status:    { title: "Status", disabled: true },
    groupTo:   { title: "Group", disabled: true },
    channels:  { title: "Channels", disabled: true },
    logs:      { title: "Logs", type: "json", disabled: true },
    badge:     { title: "Badge", disabled: true },
    readAt:    { title: "Read At", disabled: true },
    createdAt: { title: "Created", disabled: true },
  };

  static list() {
    return {
      fields: {
        id:        this.fields.id,
        user:      this.fields.user,
        title:     this.fields.title,
        status:    this.fields.status,
        channels:  this.fields.channels,
        badge:     this.fields.badge,
        createdAt: this.fields.createdAt,
      },
    };
  }

  static edit() {
    return { fields: this.fields };
  }
}
