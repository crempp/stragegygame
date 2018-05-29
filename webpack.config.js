const CopyWebpackPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const webpack = require('webpack');
const path = require("path");

const isVendorModule = (module) => {
  // returns true for everything in node_modules
  return module.context && module.context.indexOf('node_modules') !== -1;
}

module.exports = {
  entry: [
    'babel-polyfill',
    require.resolve("./src/main.js"),
  ],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js"
  },
  // devtool: "source-map",
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
    ignored: [
      /node_modules/,
      /doc/,
      /idea/,
      /dist/,
    ]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        query: {
          presets:[ 'es2015', 'stage-2' ]
        }
      },
      {
        test: /\.scss$/,
        use: [{
          loader: "style-loader" // creates style nodes from JS strings
        }, {
          loader: "css-loader" // translates CSS into CommonJS
        }, {
          loader: "sass-loader" // compiles Sass to CSS
        }]
      },
      {
        test: /\.html$/,
        use: [ {
          loader: 'html-loader',
          options: {
            minimize: true
          }
        }],
      }
    ]
  },
  plugins: [
    // new BundleAnalyzerPlugin({
    //   analyzerMode: 'static'
    // }),
    // new webpack.ProvidePlugin({
    //   'THREE': 'three'
    // }),
    new CopyWebpackPlugin([
      { from: 'src/static/textures', to: 'textures' },
      { from: 'src/static/index.html', to: 'index.html' },
      { from: 'src/static/css', to: 'css' },
    ]),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'node-static',
      filename: 'node-static.js',
      // minChunks(module, count) {
      //   var context = module.context;
      //   return context && context.indexOf('node_modules') >= 0;
      // },
      minChunks: isVendorModule,
    }),
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      exclude: [
        "node-static.js"
      ]
    }),
  ]
};
