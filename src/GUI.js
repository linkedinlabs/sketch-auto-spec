/**
 * @description A set of functions to operate the plugin GUI.
 */
import UI from 'sketch/ui'; // eslint-disable-line import/no-unresolved
import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import * as theWebview from '../resources/webview.html';
import { labelLayer } from './main';

/**
 * @description The namespace constant used to identify the webview within Sketch.
 *
 * @kind constant
 * @name webviewIdentifier
 * @type {string}
 */
const webviewIdentifier = 'com.linkedinlabs.sketch.auto-spec-plugin.webview';

/**
 * @description Called by the plugin manifest to open and operate the UI.
 *
 * @kind function
 * @returns {Object} An open webview in the Sketch UI.
 */
export default () => {
  /**
   * @description Options to set on BrowserWindow.
   *
   * @kind constant
   * @name options
   * @type {Object}
   */
  const options = {
    identifier: webviewIdentifier,
    width: 152,
    height: 64, // height includes title bar, if visible
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    center: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
  };

  /**
   * @description Sets a new BrowserWindow object using sketch-module-web-view.
   *
   * @kind function
   * @name browserWindow
   * @param {Object} options List of options to set in BrowserWindow.
   */
  const browserWindow = new BrowserWindow(options);

  // only show the window when the page has loaded to avoid a white flash
  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });

  /**
   * @description Sets up the main webview.
   *
   * @kind function
   * @name webContents
   */
  const { webContents } = browserWindow;

  // print a message when the page loads
  webContents.on('did-finish-load', () => UI.message('UI loaded!'));

  // add a handler for a call from web content's javascript
  webContents.on('nativeLog', message => UI.message(message));

  // call the labelLayer function in main.js
  webContents.on('labelLayer', () => labelLayer());

  // close the webview window
  webContents.on('closeWindow', () => {
    const existingWebview = getWebview(webviewIdentifier);
    if (existingWebview) {
      existingWebview.close();
    }
  });

  // load the webview window
  return browserWindow.loadURL(theWebview);
};

/**
 * @description Closes the webview when the plugin is shutdown by Sketch
 * (for example, when the user disables the plugin)
 *
 * @kind function
 * @name onShutdown
 */
export const onShutdown = () => {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
};
