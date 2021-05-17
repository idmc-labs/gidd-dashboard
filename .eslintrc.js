const config = {
    extends: [
        'airbnb',
        'airbnb/hooks',
        'plugin:postcss-modules/recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    env: {
        browser: true,
        jest: true,
    },
    plugins: [
        'postcss-modules',
        '@typescript-eslint',
    ],
    settings: {
        'postcss-modules': {
            // postcssConfigDir: 'cwd',
            // baseDir: 'cwd',
            camelCase: 'camelCaseOnly',
            // defaultScope: 'local',
            // include: /\.css$/,
            // exclude: /\/node_modules\//,
        },
        'import/resolver': {
            'babel-module': {
                root: ['.'],
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
                alias: {
                    '#generated': './generated',
                    '#components': './src/components',
                    '#config': './src/config',
                    '#resources': './src/resources',
                    '#utils': './src/utils',
                    '#views': './src/views',
                    '#types': './src/types',
                    '#hooks': './src/hooks',
                },
            },
        },
        react: {
            version: 'detect',
        },
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2018,
        ecmaFeatures: {
            jsx: true,
        },
        sourceType: 'module',
        allowImportExportEverywhere: true,
    },
    rules: {
        strict: 1,
        indent: ['error', 4, { SwitchCase: 1 }],

        'no-console': 0,

        'no-unused-vars': 0,
        '@typescript-eslint/no-unused-vars': 1,

        'no-use-before-define': 0,
        '@typescript-eslint/no-use-before-define': 1,

        // note you must disable the base rule as it can report incorrect errors
        'no-shadow': 0,
        '@typescript-eslint/no-shadow': ['error'],

        'prefer-destructuring': 'warn',
        'function-paren-newline': ['warn', 'consistent'],
        'object-curly-newline': [2, {
            ObjectExpression: { consistent: true },
            ObjectPattern: { consistent: true },
            ImportDeclaration: { consistent: true },
            ExportDeclaration: { consistent: true },
        }],

        'import/extensions': ['off', 'never'],
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],

        '@typescript-eslint/no-empty-interface': 0,
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,

        'jsx-a11y/anchor-is-valid': ['error', {
            components: ['Link'],
            specialLink: ['to'],
        }],
        'jsx-a11y/label-has-for': 'warn',

        'react/jsx-indent': [2, 4],
        'react/jsx-indent-props': [2, 4],
        'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
        'react/prop-types': [1, { ignore: [], customValidators: [], skipUndeclared: false }],
        'react/forbid-prop-types': [1],
        'react/destructuring-assignment': [1, 'always', { ignoreClassFields: true }],
        'react/sort-comp': [1, {
            order: [
                'static-methods',
                'constructor',
                'lifecycle',
                'everything-else',
                'render',
            ],
        }],
        'react/no-unused-state': 'warn',
        'react/jsx-props-no-spreading': 0,
        'react/require-default-props': ['warn', { ignoreFunctionalComponents: true }],
        'react/default-props-match-prop-types': ['warn', {
            allowRequiredDefaults: true,
        }],

        'postcss-modules/no-unused-class': 'warn',
        'postcss-modules/no-undef-class': 'warn',

        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
    },
};

module.exports = config;
