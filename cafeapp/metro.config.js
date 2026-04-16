const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// En web, reemplaza react-native-reanimated por su mock
// para evitar el error ERR_MODULE_NOT_FOUND con Animated.js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    moduleName === 'react-native-reanimated'
  ) {
    return {
      filePath: require.resolve(
        'react-native-reanimated/lib/module/mock.js'
      ),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;