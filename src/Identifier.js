/**
* @description A class to handle identifying a Sketch layer as a valid part of the Design System.
*
* @class
* @name Identifier
*
* @constructor
*
* @property layer The layer that needs identification.
*/
export default class Identifier {
  constructor({ for: layer }) {
    this.layer = layer;
  }

  /**
   * @description Returns the current name of the layer.
   *
   * @kind function
   * @name label
   * @returns {string} The layer name.
   */
  label() {
    return this.layer.name();
  }

  /**
   * @description Returns the artboard the layer exists on.
   *
   * @kind function
   * @name artboard
   * @returns {Object} The parent artboard.
   */
  artboard() {
    return this.layer.parentArtboard();
  }
}
