import { UI } from 'sketch';
import { PLUGIN_NAME } from './constants';

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
    const eventTypeString = this.event && this.event.action ? ` ${this.event.action} :` : ' Invoked :';

    log(`${PLUGIN_NAME} ${logType}${documentIdString}${eventTypeString} ${message}`);
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
      this.log(`Could not display: “${message}”`, 'error');
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
      this.log(`Could not display: “${message}”`, 'error');
    }
  }

  /**
   * @description Handle the result messenging/logging.
   *
   * @kind function
   * @name handleResult
   * @param {Object} result The success/error result and accompanying log/toast message(s).
   */
  handleResult(result) {
    if (result.messages) {
      // set up toast and log messages
      const alertMessage = result.messages.alert;
      const toastMessage = result.messages.toast;
      const logMessage = result.messages.log;
      const isError = (result.status === 'error');

      // log a message or error
      if (logMessage) {
        this.log(logMessage, isError ? 'error' : null);
      }

      // toast a message or error
      if (toastMessage) {
        this.toast(toastMessage);
      }

      // alert a message or error
      if (alertMessage) {
        this.alert(alertMessage);
      }
    }
  }
}
