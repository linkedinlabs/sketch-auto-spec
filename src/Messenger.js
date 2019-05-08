// Messenger - handle UI alerts, messages, and logging
import { UI } from 'sketch';

export default class Messenger {
  constructor({
    for: event,
    in: document,
  }) {
    this.event = event;
    this.document = document;
  }

  log(message, type = 'normal') {
    const logType = type === 'error' ? '🆘' : '🐞';
    const eventType = this.event.action ? this.event.action : 'Invoked';

    // log(this.event);
    log(`Auto-Spec ${logType} ${this.document.id} : ${eventType} : ${message}`);
  }

  // renders a toast in the UI
  toast(message) {
    if (this.document && UI.message !== undefined) {
      UI.message(message, this.document);
    } else {
      this.sendLog(`Could not display: “${message}”`, 'error');
    }
  }

  // displays an alert dialog
  alert(message, title = 'Alert') {
    if (this.document && UI.message !== undefined) {
      UI.alert(title, message);
    } else {
      this.sendLog(`Could not display: “${message}”`, 'error');
    }
  }
}
