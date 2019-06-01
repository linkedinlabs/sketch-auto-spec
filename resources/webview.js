/* eslint-disable no-undef */
/**
 * @description A listener for `DOMContentLoaded`.
 *
 * @kind function
 * @name ready
 * @listens document
 * @param {Function} fn The function to call once the DOM is loaded.
 */
const ready = (fn) => { // eslint-disable-line no-unused-vars
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
};

/**
 * @description A wrapper to contain all of the webview functionality.
 *
 * @kind function
 * @name AutoSpecWebview
 * @type {module}
 */
const AutoSpecWebview = {
  /**
   * @description The initializer that is called once the DOM is loaded.
   *
   * @kind function
   * @name init
   */
  init: () => {
    AutoSpecWebview.disableRightClick();
    AutoSpecWebview.watchTriggers();
  },
  /**
   * @description Disables the system-level contextual menu (eg. the right click menu)
   * to give the webview a more native feel.
   *
   * @kind function
   * @name disableRightClick
   * @listens document
   */
  disableRightClick: () => {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  },
  /**
   * @description Sets listeners on all GUI trigger elements, watches for clicks,
   * and dispatches to the appropriate `GUI.js` actions.
   *
   * @kind function
   * @name watchTriggers
   */
  watchTriggers: () => {
    /**
     * @description Array containing the UI elements to watch for input.
     *
     * @kind constant
     * @name triggerElements
     * @type {array}
     */
    const triggerElements = document.querySelectorAll('.action-trigger');

    /**
     * @description Adds a click event listener to each webview trigger (`.action-trigger`)
     * and fires off the appropriate action(s) when clicked.
     *
     * @kind function
     * @param {array} triggerElements Array containing the UI elements to watch for input.
     */
    Array.from(triggerElements).forEach((trigger) => {
      document.getElementById(trigger.id).addEventListener('click', () => {
        window.postMessage('nativeLog', `Called #${trigger.id} from the GUI`);
        switch (trigger.id) {
          case 'close':
            window.postMessage('closeWindow');
            break;
          case 'label':
            window.postMessage('labelLayer');
            break;
          default:
            window.postMessage('nativeLog', `Missing ${trigger.id} action`);
        }
        return null;
      });
    });
  },
};
ready(AutoSpecWebview.init);
/* eslint-enable no-undef */
