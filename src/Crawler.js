/**
 * @description A class to handle traversing an array of selected items and return useful items
 * (parent layer, artboard, document, etc). It will also find items based on ID (or timestamp).
 *
 * @class
 * @name Crawler
 *
 * @constructor
 *
 * @property selectionArray The array of selected items.
 */
export default class Crawler {
  constructor({ for: selectionArray }) {
    this.array = selectionArray;
  }

  /**
   * @description Returns the first item in the array.
   *
   * @kind function
   * @name first
   * @returns {Object} The first layer item in the array.
   */
  first() {
    return this.array[0];
  }
}
