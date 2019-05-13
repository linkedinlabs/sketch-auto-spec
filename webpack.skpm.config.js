/* eslint-disable indent */
/* eslint-disable comma-dangle */
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
