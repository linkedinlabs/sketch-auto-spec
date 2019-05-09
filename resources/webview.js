/* eslint-disable no-undef */
// disable the context menu (eg. the right click menu) to have a more native feel
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// call the plugin from the webview
const triggerElements = document.querySelectorAll('.action-trigger');
Array.from(triggerElements).forEach((trigger) => {
  document.getElementById(trigger.id).addEventListener('click', () => {
    window.postMessage('nativeLog', `Called #${trigger.id} from the webview`);

    if (trigger.id === 'close') {
      window.postMessage('closeWindow');
    }
  });
});

// call the wevbiew from the plugin
// window.setRandomNumber = (randomNumber) => {
//   document.getElementById('answer').innerHTML = `Random number from the plugin: ${randomNumber}`;
// };
/* eslint-enable no-undef */
