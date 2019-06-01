/* eslint-disable import/prefer-default-export */

/**
 * @description A constant with unique string to identify the plugin within Sketch.
 * Changing this will potentially break data retrieval in Sketch files that used
 * earlier versions of the plugin with a different identifier.
 *
 * @kind constant
 * @name options
 * @type {string}
 */
const PLUGIN_IDENTIFIER = 'com.linkedinlabs.sketch.auto-spec-plugin';

export { PLUGIN_IDENTIFIER };
/* eslint-enable import/prefer-default-export */
