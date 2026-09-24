// https://docs.expo.dev/guides/using-eslint/
module.exports = {
    root: true,
    extends: ['expo'],
    ignorePatterns: ['/node_modules', '/dist', '/.expo', '/coverage', '/scripts'],
    env: { jest: true },
};
