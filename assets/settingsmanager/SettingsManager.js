const e = window.React, c = window.React.useState, R = window.React.useEffect;
window.React.useCallback;
window.React.useRef;
function A() {
  return "/" + (window.location.pathname.split("/")[1] || "admin");
}
async function M(t) {
  const a = await fetch(t, { headers: { Accept: "application/json" } });
  if (!a.ok)
    throw new Error(`HTTP ${a.status}`);
  return a.json();
}
async function N(t, a) {
  const i = await fetch(t, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(a)
  }), l = await i.json();
  if (!i.ok)
    throw new Error((l == null ? void 0 : l.error) || `HTTP ${i.status}`);
  return l;
}
function B(t) {
  return { string: "String", boolean: "Boolean", number: "Number", json: "JSON" }[t] || t;
}
function k(t) {
  return {
    string: "#3b82f6",
    boolean: "#10b981",
    number: "#f59e0b",
    json: "#8b5cf6"
  }[t] || "#6b7280";
}
function V({ value: t, onChange: a, readOnly: i }) {
  return /* @__PURE__ */ e.createElement(
    "textarea",
    {
      readOnly: i,
      value: t == null ? "" : String(t),
      onChange: (l) => a(l.target.value),
      rows: 4,
      style: O(i)
    }
  );
}
function L({ value: t, onChange: a, readOnly: i }) {
  return /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "number",
      readOnly: i,
      value: t ?? "",
      onChange: (l) => a(l.target.value === "" ? null : Number(l.target.value)),
      style: j(i)
    }
  );
}
function H({ value: t, onChange: a, readOnly: i }) {
  return /* @__PURE__ */ e.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center", marginTop: 4 } }, [!0, !1].map((l) => /* @__PURE__ */ e.createElement("label", { key: String(l), style: { display: "flex", alignItems: "center", gap: 6, cursor: i ? "default" : "pointer", fontSize: 14 } }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "radio",
      disabled: i,
      checked: t === l,
      onChange: () => a(l)
    }
  ), l ? "true" : "false")));
}
function q({ value: t, schema: a, onChange: i, readOnly: l }) {
  const [b, f] = c(""), [u, p] = c(null), [g, x] = c([]);
  R(() => {
    try {
      f(t == null ? "" : JSON.stringify(t, null, 2)), p(null);
    } catch {
      f("");
    }
  }, [t]);
  function r(d) {
    f(d);
    try {
      const s = JSON.parse(d);
      p(null);
      const m = a ? F(s, a) : [];
      x(m), i(s);
    } catch (s) {
      p(s.message);
    }
  }
  return /* @__PURE__ */ e.createElement("div", null, a && /* @__PURE__ */ e.createElement("div", { style: { marginBottom: 8 } }, /* @__PURE__ */ e.createElement(J, { schema: a })), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      readOnly: l,
      value: b,
      onChange: (d) => r(d.target.value),
      rows: 14,
      spellCheck: !1,
      style: {
        ...O(l),
        fontFamily: "monospace",
        fontSize: 13,
        border: u ? "1.5px solid #ef4444" : "1.5px solid var(--border, #e2e8f0)"
      }
    }
  ), u && /* @__PURE__ */ e.createElement("div", { style: { color: "#ef4444", fontSize: 12, marginTop: 4 } }, "Parse error: ", u), g.map((d, s) => /* @__PURE__ */ e.createElement("div", { key: s, style: { color: "#f59e0b", fontSize: 12, marginTop: 2 } }, "Schema: ", d)));
}
function F(t, a) {
  const i = [];
  if (!a || typeof a != "object")
    return i;
  const { type: l, required: b, enum: f, minimum: u, maximum: p, minLength: g, maxLength: x } = a;
  if (l) {
    const r = Array.isArray(t) ? "array" : typeof t, d = Array.isArray(l) ? l : [l];
    !d.includes(r) && !(r === "number" && d.includes("integer")) && i.push(`Expected type ${d.join("|")}, got ${r}`);
  }
  if (f && !f.includes(t) && i.push(`Value must be one of: ${f.join(", ")}`), typeof t == "number" && (u != null && t < u && i.push(`Minimum is ${u}`), p != null && t > p && i.push(`Maximum is ${p}`)), typeof t == "string" && (g != null && t.length < g && i.push(`Min length is ${g}`), x != null && t.length > x && i.push(`Max length is ${x}`)), b && typeof t == "object" && t !== null && !Array.isArray(t))
    for (const r of b)
      r in t || i.push(`Missing required field: ${r}`);
  return i;
}
function J({ schema: t }) {
  const a = [];
  return t.description && a.push(t.description), t.type && a.push(`Type: ${Array.isArray(t.type) ? t.type.join(" | ") : t.type}`), t.enum && a.push(`Enum: ${t.enum.join(", ")}`), t.properties && a.push("Fields: " + Object.keys(t.properties).join(", ")), a.length ? /* @__PURE__ */ e.createElement("div", { style: {
    background: "var(--muted, #f8fafc)",
    border: "1px solid var(--border, #e2e8f0)",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12,
    color: "var(--muted-foreground, #64748b)"
  } }, /* @__PURE__ */ e.createElement("div", { style: { fontWeight: 600, marginBottom: 4, color: "#8b5cf6" } }, "JSON Schema"), a.map((i, l) => /* @__PURE__ */ e.createElement("div", { key: l }, i))) : null;
}
function j(t) {
  return {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1.5px solid var(--border, #e2e8f0)",
    background: t ? "var(--muted, #f8fafc)" : "var(--background, #fff)",
    color: "var(--foreground, #0f172a)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box"
  };
}
function O(t) {
  return {
    ...j(t),
    resize: "vertical",
    fontFamily: "inherit"
  };
}
function P() {
  const a = `${A()}/core/settings-manager`, [i, l] = c([]), [b, f] = c(!0), [u, p] = c(null), [g, x] = c(""), [r, d] = c(null), [s, m] = c(void 0), [h, w] = c(!1), [z, E] = c(null), [W, v] = c(!1);
  R(() => {
    f(!0), M(`${a}/list`).then((n) => {
      l(n), f(!1);
    }).catch((n) => {
      p(n.message), f(!1);
    });
  }, [a]);
  const C = i.filter((n) => {
    const y = g.toLowerCase();
    return y ? n.key.toLowerCase().includes(y) || (n.name || "").toLowerCase().includes(y) || (n.module || "").toLowerCase().includes(y) : !0;
  });
  function T(n) {
    d(n), m(n.value !== void 0 && n.value !== null ? n.value : n.defaultValue), E(null), v(!1);
  }
  async function $() {
    if (r) {
      w(!0), E(null), v(!1);
      try {
        const n = await N(`${a}/update/${encodeURIComponent(r.key)}`, { value: s });
        l((y) => y.map((S) => S.key === n.key ? { ...S, ...n } : S)), d((y) => ({ ...y, ...n })), v(!0), setTimeout(() => v(!1), 2500);
      } catch (n) {
        E(n.message);
      } finally {
        w(!1);
      }
    }
  }
  function I() {
    r && (m(r.defaultValue), E(null), v(!1));
  }
  return /* @__PURE__ */ e.createElement("div", { style: o.root }, /* @__PURE__ */ e.createElement("div", { style: o.sidebar }, /* @__PURE__ */ e.createElement("div", { style: o.sidebarHeader }, /* @__PURE__ */ e.createElement("div", { style: o.sidebarTitle }, "Settings"), /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      placeholder: "Search by key…",
      value: g,
      onChange: (n) => x(n.target.value),
      style: o.searchInput
    }
  )), b && /* @__PURE__ */ e.createElement("div", { style: o.stateMsg }, "Loading…"), u && /* @__PURE__ */ e.createElement("div", { style: { ...o.stateMsg, color: "#ef4444" } }, "Error: ", u), /* @__PURE__ */ e.createElement("div", { style: o.list }, C.map((n) => /* @__PURE__ */ e.createElement(
    "button",
    {
      key: n.key,
      onClick: () => T(n),
      style: {
        ...o.listItem,
        background: (r == null ? void 0 : r.key) === n.key ? "var(--accent, #f1f5f9)" : "transparent",
        borderLeft: (r == null ? void 0 : r.key) === n.key ? `3px solid ${k(n.type)}` : "3px solid transparent"
      }
    },
    /* @__PURE__ */ e.createElement("div", { style: o.listItemKey }, n.key),
    n.name && /* @__PURE__ */ e.createElement("div", { style: o.listItemName }, n.name),
    /* @__PURE__ */ e.createElement("div", { style: { display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" } }, /* @__PURE__ */ e.createElement("span", { style: { ...o.badge, background: k(n.type) } }, B(n.type)), n.module && /* @__PURE__ */ e.createElement("span", { style: o.moduleBadge }, n.module), n.readOnly && /* @__PURE__ */ e.createElement("span", { style: o.readOnlyBadge }, "read-only"), n.isRequired && /* @__PURE__ */ e.createElement("span", { style: o.requiredBadge }, "required"))
  )), !b && C.length === 0 && /* @__PURE__ */ e.createElement("div", { style: o.stateMsg }, "No settings found"))), /* @__PURE__ */ e.createElement("div", { style: o.editor }, r ? /* @__PURE__ */ e.createElement("div", { style: o.editorContent }, /* @__PURE__ */ e.createElement("div", { style: o.editorHeader }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("div", { style: o.editorKey }, r.key), r.name && /* @__PURE__ */ e.createElement("div", { style: o.editorName }, r.name)), /* @__PURE__ */ e.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ e.createElement("span", { style: { ...o.badge, background: k(r.type), fontSize: 13 } }, B(r.type)), r.module && /* @__PURE__ */ e.createElement("span", { style: o.moduleBadge }, r.module), r.readOnly && /* @__PURE__ */ e.createElement("span", { style: o.readOnlyBadge }, "read-only"))), r.description && /* @__PURE__ */ e.createElement("div", { style: o.descBlock }, r.description), r.tooltip && r.tooltip !== r.description && /* @__PURE__ */ e.createElement("div", { style: { ...o.descBlock, fontStyle: "italic", opacity: 0.8 } }, "💡 ", r.tooltip), /* @__PURE__ */ e.createElement("div", { style: o.fieldBlock }, /* @__PURE__ */ e.createElement("label", { style: o.fieldLabel }, "Value"), r.type === "string" && /* @__PURE__ */ e.createElement(V, { value: s, onChange: m, readOnly: r.readOnly }), r.type === "number" && /* @__PURE__ */ e.createElement(L, { value: s, onChange: m, readOnly: r.readOnly }), r.type === "boolean" && /* @__PURE__ */ e.createElement(H, { value: s, onChange: m, readOnly: r.readOnly }), r.type === "json" && /* @__PURE__ */ e.createElement(
    q,
    {
      value: s,
      schema: r.jsonSchema,
      onChange: m,
      readOnly: r.readOnly
    }
  )), r.defaultValue !== void 0 && r.defaultValue !== null && /* @__PURE__ */ e.createElement("div", { style: o.defaultBlock }, /* @__PURE__ */ e.createElement("span", { style: { opacity: 0.6, marginRight: 6 } }, "Default:"), /* @__PURE__ */ e.createElement("code", { style: o.defaultCode }, typeof r.defaultValue == "object" ? JSON.stringify(r.defaultValue) : String(r.defaultValue))), z && /* @__PURE__ */ e.createElement("div", { style: o.errorMsg }, "⚠ ", z), W && /* @__PURE__ */ e.createElement("div", { style: o.successMsg }, "✓ Saved successfully"), !r.readOnly && /* @__PURE__ */ e.createElement("div", { style: o.actions }, /* @__PURE__ */ e.createElement("button", { onClick: $, disabled: h, style: o.btnSave }, h ? "Saving…" : "Save"), r.defaultValue !== void 0 && r.defaultValue !== null && /* @__PURE__ */ e.createElement("button", { onClick: I, disabled: h, style: o.btnSecondary }, "Reset to default"))) : /* @__PURE__ */ e.createElement("div", { style: o.editorEmpty }, /* @__PURE__ */ e.createElement("div", { style: { fontSize: 40, marginBottom: 12, opacity: 0.3 } }, "⚙"), /* @__PURE__ */ e.createElement("div", { style: { color: "var(--muted-foreground, #94a3b8)", fontSize: 15 } }, "Select a setting from the list to edit it"))));
}
const o = {
  root: {
    display: "flex",
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    fontFamily: "inherit"
  },
  sidebar: {
    width: 300,
    minWidth: 220,
    maxWidth: 380,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--border, #e2e8f0)",
    background: "var(--sidebar-background, #f8fafc)",
    overflow: "hidden"
  },
  sidebarHeader: {
    padding: "16px 12px 10px",
    borderBottom: "1px solid var(--border, #e2e8f0)",
    flexShrink: 0
  },
  sidebarTitle: {
    fontWeight: 700,
    fontSize: 16,
    marginBottom: 10,
    color: "var(--foreground, #0f172a)"
  },
  searchInput: {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 6,
    border: "1.5px solid var(--border, #e2e8f0)",
    background: "var(--background, #fff)",
    color: "var(--foreground, #0f172a)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box"
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 0"
  },
  listItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    border: "none",
    cursor: "pointer",
    background: "transparent",
    transition: "background 0.1s",
    color: "var(--foreground, #0f172a)",
    borderBottom: "1px solid var(--border, #f1f5f9)"
  },
  listItemKey: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: 600,
    wordBreak: "break-all",
    color: "var(--foreground, #0f172a)"
  },
  listItemName: {
    fontSize: 12,
    marginTop: 2,
    color: "var(--muted-foreground, #64748b)"
  },
  badge: {
    display: "inline-block",
    color: "#fff",
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: 4
  },
  moduleBadge: {
    display: "inline-block",
    background: "var(--muted, #e2e8f0)",
    color: "var(--muted-foreground, #475569)",
    fontSize: 10,
    fontWeight: 500,
    padding: "2px 6px",
    borderRadius: 4
  },
  readOnlyBadge: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: 4
  },
  requiredBadge: {
    display: "inline-block",
    background: "#fef9c3",
    color: "#854d0e",
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: 4
  },
  stateMsg: {
    padding: "20px 16px",
    color: "var(--muted-foreground, #94a3b8)",
    fontSize: 13,
    textAlign: "center"
  },
  editor: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  },
  editorEmpty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--muted-foreground, #94a3b8)"
  },
  editorContent: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  editorHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap"
  },
  editorKey: {
    fontFamily: "monospace",
    fontSize: 17,
    fontWeight: 700,
    color: "var(--foreground, #0f172a)",
    wordBreak: "break-all"
  },
  editorName: {
    fontSize: 13,
    color: "var(--muted-foreground, #64748b)",
    marginTop: 3
  },
  descBlock: {
    background: "var(--muted, #f8fafc)",
    border: "1px solid var(--border, #e2e8f0)",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 13,
    color: "var(--muted-foreground, #475569)",
    lineHeight: 1.5
  },
  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--foreground, #0f172a)"
  },
  defaultBlock: {
    fontSize: 12,
    color: "var(--muted-foreground, #64748b)",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4
  },
  defaultCode: {
    fontFamily: "monospace",
    background: "var(--muted, #f1f5f9)",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 12,
    maxWidth: "100%",
    wordBreak: "break-all"
  },
  errorMsg: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#b91c1c",
    fontSize: 13
  },
  successMsg: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#15803d",
    fontSize: 13
  },
  actions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginTop: 4
  },
  btnSave: {
    padding: "9px 22px",
    borderRadius: 6,
    border: "none",
    background: "var(--primary, #0f172a)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer"
  },
  btnSecondary: {
    padding: "9px 16px",
    borderRadius: 6,
    border: "1.5px solid var(--border, #e2e8f0)",
    background: "transparent",
    color: "var(--foreground, #0f172a)",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer"
  }
};
export {
  P as default
};
