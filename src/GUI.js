// plugin GUI
import UI from 'sketch/ui'; // eslint-disable-line import/no-unresolved
import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import * as theWebview from '../resources/webview.html';

const webviewIdentifier = 'my-plugin-name.webview';

export default function () {
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

  const browserWindow = new BrowserWindow(options);

  // only show the window when the page has loaded to avoid a white flash
  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });

  const { webContents } = browserWindow;

  // print a message when the page loads
  webContents.on('did-finish-load', () => {
    UI.message('UI loaded!');
  });

  webContents.on('closeWindow', () => {
    const existingWebview = getWebview(webviewIdentifier);
    if (existingWebview) {
      existingWebview.close();
    }
  });

  browserWindow.loadURL(theWebview);
}

// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }
}