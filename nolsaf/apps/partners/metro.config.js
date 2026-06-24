const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo resolution, per the Shared code contract in NATIVE_PARTNERS_APP.md:
// watch the workspace root so Metro reads @nolsaf/native-ui source, and resolve
// modules from both the app and the hoisted root node_modules.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];

// The repo also contains a React 18 web app. Always resolve React from this
// workspace so Metro does not mix that copy with Expo's React 19 runtime.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "react" ||
    moduleName.startsWith("react/") ||
    moduleName === "react-dom" ||
    moduleName.startsWith("react-dom/")
  ) {
    const modulePath = require.resolve(moduleName, { paths: [projectRoot] });
    return context.resolveRequest(context, modulePath, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
