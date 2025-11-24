const e = window.React;
function o() {
  return e.createElement(
    "div",
    { className: "stock-manager" },
    e.createElement("h1", null, "Hello stock manager")
  );
}
typeof window < "u" && (window.StockManager = window.StockManager || {}, window.StockManager.Component = o, window.StockManager.mount = (a = null) => {
  try {
    const t = a || document.getElementById("stock-manager-root") || (() => {
      const n = document.createElement("div");
      return n.id = "stock-manager-root", (document.querySelector("#app") || document.body).appendChild(n), n;
    })();
    window.ReactDOM && window.ReactDOM.render ? window.ReactDOM.render(e.createElement(o), t) : window.ReactDOM && window.ReactDOM.hydrateRoot && window.ReactDOM.hydrateRoot(t, e.createElement(o));
  } catch {
  }
});
export {
  o as default
};
