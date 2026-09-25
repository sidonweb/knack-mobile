const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite ships a WebAssembly build that the web bundle must be able to resolve,
// even though the app only uses SQLite on native (see src/lib/db.ts).
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './src/global.css' });
