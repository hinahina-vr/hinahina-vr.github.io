const HEAD_BOOTSTRAP = `    <script>
      (function () {
        var KEY = "waddy-display-mode";
        var DEFAULT_MODE = "immersive";
        var params = new URLSearchParams(window.location.search);
        var queryMode = params.get("mode");
        var mode = queryMode === "immersive" || queryMode === "classic" ? queryMode : null;

        if (!mode) {
          try {
            var storedMode = window.localStorage.getItem(KEY);
            mode = storedMode === "immersive" || storedMode === "classic" ? storedMode : DEFAULT_MODE;
          } catch (error) {
            mode = DEFAULT_MODE;
          }
        } else {
          try {
            window.localStorage.setItem(KEY, mode);
          } catch (error) {
            // Ignore storage failures and continue with query mode.
          }
        }

        document.documentElement.dataset.siteMode = mode;
        window.__waddyInitialSiteMode = mode;
      })();
    </script>`;

const SCRIPT_TAG = `    <script src="./site-mode.js"></script>`;

export function getSiteModeHeadBootstrap() {
  return HEAD_BOOTSTRAP;
}

export function getSiteModeScriptTag() {
  return SCRIPT_TAG;
}

export function injectSiteModeAssets(html) {
  let output = html;

  if (!output.includes('window.__waddyInitialSiteMode')) {
    output = output.replace(
      '    <link rel="stylesheet" href="./styles.css" />',
      `${HEAD_BOOTSTRAP}\n    <link rel="stylesheet" href="./styles.css" />`
    );
  }

  if (!output.includes('src="./site-mode.js"')) {
    output = output.replace("</body>", `${SCRIPT_TAG}\n  </body>`);
  }

  return output;
}
