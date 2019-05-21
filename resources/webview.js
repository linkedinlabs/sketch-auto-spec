/* eslint-disable no-undef */

/**
 * @description Disables the system-level contextual menu (eg. the right click menu)
 * to give the webview a more native feel.
 *
 * @listens document
 */
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

/**
* @description Array containing the UI elements to watch for input.
*
* @kind constant
* @name triggerElements
* @type {array}
*/
const triggerElements = document.querySelectorAll('.action-trigger');

/**
 * @description Takes a string message and logs it at one of 2 levels (normal or error).
 *
 * @kind function
 * @param {array} triggerElements Array containing the UI elements to watch for input.
 */
Array.from(triggerElements).forEach((trigger) => {
  document.getElementById(trigger.id).addEventListener('click', () => {
    switch (trigger.id) {
      case 'label':
        window.postMessage('labelLayer');
        break;
      case 'close':
        window.postMessage('closeWindow');
        break;
      default:
        return null;
    }

    return window.postMessage('nativeLog', `Called #${trigger.id} from the webview`);
  });
});

/* eslint-enable no-undef */
