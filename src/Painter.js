import { Rectangle, ShapePath } from 'sketch/dom';

/**
* @description A class to add elements to the Sketch file.
*
* @class
* @name Painter
*
* @constructor
*
* @property artboard The artboard in the Sketch file that we want to modify.
*/
export default class Painter {
  constructor({ for: artboard }) {
    this.artboard = artboard;
  }

  /**
   * @description Takes a layer name and returns a semi-transparent, small rectangle with that name.
   * Info {@link https://developer.sketch.com/reference/api/#shapepath}
   *
   * @kind function
   * @name add
   * @param {Array} layerName The name we want for the new label.
   * @returns {Object} A Sketch ShapePath Rectangle object.
   */
  add(layerName = 'New Label') {
    return new ShapePath({
      name: layerName,
      frame: new Rectangle(10, 10, 60, 60),
      parent: this.artboard,
      style: {
        fills: ['#ffcc3399'],
      },
    });
  }
}
