/**
 * @description A set of functions to operate the plugin GUI.
 */
import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import Messenger from './Messenger';
import * as theWebview from '../resources/webview.html';
import {
  annotateLayer,
  annotateMeasurement,
  drawBoundingBox,
} from './main';
import { PLUGIN_IDENTIFIER } from './constants';

/**
 * @description The namespace constant used to identify the webview within Sketch.
 *
 * @kind constant
 * @name webviewIdentifier
 * @type {string}
 */
const webviewIdentifier = `${PLUGIN_IDENTIFIER}.webview`;

/**
 * @description Set up a new Messenger class instance.
 *
 * @kind function
 * @name messenger
 */
const messenger = new Messenger({ for: { action: 'GUI' } });

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
    messenger.log('GUI closed.');
  }
};

/**
 * @description Called by the plugin manifest to open and operate the UI.
 *
 * @kind function
 * @name watchGui
 * @returns {Object} An open webview in the Sketch UI.
 */
const watchGui = () => {
  // check to see if the webview is already open
  // if so, close it
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    return onShutdown();
  }

  /**
   * @description Options to set on BrowserWindow.
   *
   * @kind constant
   * @name options
   * @type {Object}
   */
  const options = {
    identifier: webviewIdentifier,
    width: 178,
    height: 46, // height includes title bar, if visible
    frame: false,
    resizable: false,
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

  // log a message when the view loads
  webContents.on('did-finish-load', () => messenger.log('GUI loaded!'));

  // add a handler for a call from web content's javascript
  webContents.on('nativeLog', (message) => {
    messenger.log(message);
  });

  // call the annotateLayer function in main.js
  webContents.on('annotateLayer', () => annotateLayer());

  // call the annotateMeasurement function in main.js
  webContents.on('annotateMeasurement', () => annotateMeasurement());

  // call the drawBoundingBox function in main.js
  webContents.on('drawBoundingBox', () => drawBoundingBox());

  // close the webview window
  webContents.on('closeWindow', () => {
    if (existingWebview) {
      existingWebview.close();
      messenger.log('GUI closed.');
    }
  });

  // load the webview window
  return browserWindow.loadURL(theWebview);
};
export default watchGui;
