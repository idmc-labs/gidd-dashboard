const ResourceHintWebpackPlugin = require('resource-hints-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');

const { config } = require('dotenv');

const getEnvVariables = require('./env.js');

const dotenv = config({
    path: '.env',
});

const gitRevisionPlugin = new GitRevisionPlugin();

const appBase = process.cwd();
const eslintFile = path.resolve(appBase, '.eslintrc-loader.js');
const nodeModulesSrc = path.resolve(appBase, 'node_modules/');
const appSrc = path.resolve(appBase, 'src/');
const appDist = path.resolve(appBase, 'build/');
const appIndexJs = path.resolve(appBase, 'src/index.tsx');
const appIndexHtml = path.resolve(appBase, 'public/index.html');
const appFavicon = path.resolve(appBase, 'public/favicon.ico');
const appFaviconImage = path.resolve(appBase, 'public/favicon.png');

const PUBLIC_PATH = '/';

module.exports = (env) => {
    const ENV_VARS = {
        ...dotenv.pared,
        ...getEnvVariables(env),
        REACT_APP_VERSION: JSON.stringify(gitRevisionPlugin.version()),
        REACT_APP_COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
        REACT_APP_BRANCH: JSON.stringify(gitRevisionPlugin.branch()),
    };

    return {
        entry: appIndexJs,
        output: {
            path: appDist,
            publicPath: PUBLIC_PATH,
            sourceMapFilename: 'sourcemaps/[file].map',
            chunkFilename: 'js/[name].js',
            filename: 'js/[name].js',
            pathinfo: false,
        },

        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            symlinks: false,
        },

        mode: 'development',

        devtool: 'eval-cheap-module-source-map',

        node: {
            fs: 'empty',
        },

        performance: {
            hints: 'warning',
        },

        /*
        stats: {
            assets: true,
            colors: true,
            errors: true,
            errorDetails: true,
            hash: true,
        },
        */

        devServer: {
            host: '0.0.0.0',
            port: 3080,
            overlay: true,
            watchOptions: {
                ignored: /node_modules/,
            },
            // Don't show warnings in browser console
            clientLogLevel: 'none',

            hot: true,
            liveReload: false,
        },

        module: {
            rules: [
                {
                    test: /\.(js|jsx|ts|tsx)$/,
                    include: appSrc,
                    use: [
                        // require.resolve('cache-loader'),
                        require.resolve('babel-loader'),
                        {
                            loader: require.resolve('eslint-loader'),
                            options: {
                                // cache: true,
                                configFile: eslintFile,
                                failOnError: true,
                            },
                        },
                    ],
                },
                {
                    test: /\.(html)$/,
                    use: [
                        require.resolve('html-loader'),
                    ],
                },
                {
                    test: /\.(css|scss)$/,
                    include: appSrc,
                    use: [
                        require.resolve('style-loader'),
                        {
                            // NOTE: we may need to use postcss-modules instead of css-loader
                            loader: require.resolve('css-loader'),
                            options: {
                                importLoaders: 1,
                                modules: {
                                    localIdentName: '[name]_[local]_[hash:base64]',
                                },
                                esModule: true,
                                localsConvention: 'camelCaseOnly',
                                sourceMap: true,
                            },
                        },
                        {
                            loader: require.resolve('postcss-loader'),
                            options: {
                                ident: 'postcss',
                                sourceMap: true,
                            },
                        },
                    ],
                },
                {
                    test: /\.(css|scss)$/,
                    include: nodeModulesSrc,
                    use: [
                        require.resolve('style-loader'),
                        require.resolve('css-loader'),
                    ],
                },
                {
                    test: /\.(png|jpg|gif|svg)$/,
                    use: [
                        {
                            loader: require.resolve('file-loader'),
                            options: {
                                name: 'assets/[name].[ext]',
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            // NOTE: could try using react-hot-loader
            // https://github.com/gaearon/react-hot-loader
            new webpack.DefinePlugin({
                'process.env': ENV_VARS,
            }),
            new CircularDependencyPlugin({
                exclude: /node_modules/,
                failOnError: false,
                allowAsyncCycles: false,
                cwd: appBase,
            }),
            new StyleLintPlugin({
                files: ['**/*.css'],
                context: appSrc,
            }),
            new HtmlWebpackPlugin({
                template: appIndexHtml,
                filename: './index.html',
                title: 'GIDD',
                favicon: path.resolve(appFavicon),
                chunksSortMode: 'none',
            }),
            new MiniCssExtractPlugin({
                filename: 'css/[name].css',
                chunkFilename: 'css/[id].css',
            }),
            new WebpackPwaManifest({
                name: 'gidd-dashboard',
                short_name: 'GIDD',
                description: 'React client for GIDD dashboard',
                background_color: '#f0f0f0',
                orientation: 'portrait',
                // theme_color: '#303f9f',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                icons: [
                    {
                        src: path.resolve(appFaviconImage),
                        sizes: [96, 128, 192, 256, 384, 512],
                        destination: path.join('assets', 'icons'),
                    },
                ],
            }),
            new ResourceHintWebpackPlugin(),
            new webpack.HotModuleReplacementPlugin(),
        ],
    };
};
