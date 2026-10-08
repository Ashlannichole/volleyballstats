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

      if (podfile.includes('FMT_USE_CONSTEVAL')) {
        return cfg; // already patched
      }

      const fmtPatch = `
    # fmt consteval workaround for Xcode 26 clang compatibility
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        flags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
        unless flags.include?('FMT_USE_CONSTEVAL')
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = flags + ' -DFMT_USE_CONSTEVAL=0'
        end
      end
    end`;

      // Inject into the existing post_install block rather than adding a second one
      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${fmtPatch}`
        );
      } else {
        // No existing post_install — safe to add one
        podfile += `\npost_install do |installer|\n${fmtPatch}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
