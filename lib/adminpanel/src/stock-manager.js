// Minimal starter script for StockManager admin module
(function () {
  // Create a simple container and insert header when script is loaded
  function mount() {
    try {
      var root = document.getElementById('stock-manager-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'stock-manager-root';
        // Put it into main content area if available
        var app = document.querySelector('#app') || document.body;
        app.appendChild(root);
      }
      root.innerHTML = '<div class="stock-manager"><h1>Hello stock manager</h1></div>';
    } catch (e) {
      // ignore
      console.error('StockManager mount error', e);
    }
  }

  // Auto mount on load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(mount, 0);
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  // expose mount for manual mounting if adminizer wants to call it
  window.StockManager = {
    mount
  };
})();
