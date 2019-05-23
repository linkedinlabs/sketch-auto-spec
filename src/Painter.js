import { Rectangle, ShapePath, Text } from 'sketch/dom';

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
   * @param {Array} layerLabel The name we want for the new label.
   * @returns {Object} A Sketch ShapePath Rectangle object.
   */
  addLabel(layerLabel = 'New Label') {
    const layerName = `Label for ${layerLabel}`;

    const text = new Text({
      frame: {
        x: 12,
        y: 12,
      },
      parent: this.artboard,
      text: layerLabel,
      style: {
        alignment: Text.Alignment.left,
        borders: [{
          enabled: false,
        }],
        fontFamily: 'helevetica neue',
        fontSize: 12,
        fontWeight: 4,
        kerning: 0,
        lineHeight: 22,
        textColor: '#ffffffff',
      },
    });
    text.adjustToFit();

    const rectangle = new ShapePath({
      frame: new Rectangle(10, 10, 200, 30),
      name: layerName,
      parent: this.artboard,
      style: {
        borders: [{
          enabled: false,
          thickness: 0,
        }],
        fills: ['#027affff'],
      },
    });

    const diamond = new ShapePath({
      frame: new Rectangle(5, 5, 6, 6),
      name: `${layerName} diamond`,
      parent: this.artboard,
      style: {
        borders: [{
          enabled: false,
          thickness: 0,
        }],
        fills: ['#027affff'],
      },
      transform: {
        rotation: 45,
      },
    });

    rectangle.moveToFront();
    text.index = rectangle.index + 1;
    diamond.index = rectangle.index - 1;
    // log(text);

    return null;
  }
}
