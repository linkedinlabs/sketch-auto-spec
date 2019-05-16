/* eslint-disable indent */
/* eslint-disable comma-dangle */
/**
 * @description Function that mutates original webpack config.
 * Supports asynchronous changes when promise is returned.
 *
 * @kind function
 * @param {object} config Original webpack config.
 */
module.exports = (config) => {
  config.module.rules.push({
    test: /\.(html)$/,
    use: [{
        loader: '@skpm/extract-loader',
      },
      {
        loader: 'html-loader',
        options: {
          attrs: [
            'img:src',
            'link:href'
          ],
          interpolate: true,
        },
      },
    ]
  });
  config.module.rules.push({
    test: /\.(css)$/,
    use: [{
        loader: '@skpm/extract-loader',
      },
      {
        loader: 'css-loader',
      },
    ]
  });
};
/* eslint-enable indent */
/* eslint-enable comma-dangle */
