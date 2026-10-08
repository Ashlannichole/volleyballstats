const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// React Native 0.79.x bundles a version of libfmt whose consteval usage
// triggers a hard error in Xcode 26's clang. Setting FMT_USE_CONSTEVAL=0
// disables the consteval path and restores the old runtime-check behaviour.
module.exports = function withFmtFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const patch = `
# Workaround: RN 0.79 fmt consteval incompatibility with Xcode 26 clang
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      flags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] = flags + ' -DFMT_USE_CONSTEVAL=0'
    end
  end
end
`;

      if (!podfile.includes('FMT_USE_CONSTEVAL')) {
        podfile += patch;
        fs.writeFileSync(podfilePath, podfile);
      }

      return cfg;
    },
  ]);
};
