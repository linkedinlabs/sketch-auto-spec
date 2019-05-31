import { UI } from 'sketch';

/**
 * @description A class to handle UI alerts, messages, and logging.
 *
 * @class
 * @name Messenger
 *
 * @constructor
 *
 * @property event The encompassing event we are logging or applying a message/alert to.
 * @property document The Sketch file that will display messages/alerts
 * or that the log will reference.
 */
export default class Messenger {
  constructor({
    for: event,
    in: document,
  }) {
    this.event = event;
    this.document = document;
  }

  /**
   * @description Takes a string message and logs it at one of 2 levels (normal or error).
   *
   * @kind function
   * @name log
   * @param {string} message The string containing the message to be logged.
   * @param {string} type The optional string declaring the type of log: error or normal (default).
   */
  log(message, type = 'normal') {
    const logType = type === 'error' ? '🆘' : '🐞';
    const documentIdString = this.document ? ` ${this.document.id} :` : '';
    const eventTypeString = this.event ? ` ${this.event.action} :` : 'Invoked';

    log(`Spec’ing ${logType}${documentIdString}${eventTypeString} ${message}`);
  }

  /**
   * @description Takes a string message and renders it as a Toast in the Sketch UI.
   *
   * @kind function
   * @name toast
   * @param {string} message The message to be displayed in the Toast.
   */
  toast(message) {
    if (this.document && UI.message !== undefined) {
      UI.message(message, this.document);
    } else {
      this.sendLog(`Could not display: “${message}”`, 'error');
    }
  }

  /**
   * @description Takes a string message and displays a system-level Alert dialog in the Sketch UI.
   *
   * @kind function
   * @name alert
   * @param {string} message The message to be used in the Alert dialog.
   * @param {string} title The title of the Alert dialog.
   */
  alert(message, title = 'Alert') {
    if (this.document && UI.message !== undefined) {
      UI.alert(title, message);
    } else {
      this.sendLog(`Could not display: “${message}”`, 'error');
    }
  }
}
