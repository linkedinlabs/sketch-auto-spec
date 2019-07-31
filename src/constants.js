/* eslint-disable import/prefer-default-export */

/**
 * @description A constant with unique string to identify the plugin within Sketch.
 * Changing this will potentially break data retrieval in Sketch files that used
 * earlier versions of the plugin with a different identifier. This should match the
 * `identifier` stated in manifset.json.
 *
 * @kind constant
 * @name PLUGIN_IDENTIFIER
 * @type {string}
 */
const PLUGIN_IDENTIFIER = 'com.linkedinlabs.sketch.auto-spec-plugin';

/**
 * @description The public-facing name for the plugin. This should match the
 * `name` stated in manifset.json.
 *
 * @kind constant
 * @name PLUGIN_NAME
 * @type {string}
 */
const PLUGIN_NAME = 'Specter';

const COLORS = {
  component: '#9966ff',
  custom: '#ff3399',
  measure: '#00cc99',
  style: '#ff6655',
};

export {
  COLORS,
  PLUGIN_IDENTIFIER,
  PLUGIN_NAME,
};
/* eslint-enable import/prefer-default-export */
