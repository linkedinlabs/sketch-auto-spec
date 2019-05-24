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

    // x, y placement of the label on the artboard
    const placement = {
      x: 20,
      y: 20,
    };

    // build the text box
    const text = new Text({
      frame: {
        x: placement.x + 16,
        y: placement.y + 3,
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

    // build the rounded rectangle
    const rectangle = new ShapePath({
      frame: new Rectangle(placement.x, placement.y, 200, 30),
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

    // set rounded corners of the rectangle
    const { points } = rectangle;
    points.forEach((point) => {
      point.cornerRadius = 2; // eslint-disable-line no-param-reassign
      return null;
    });

    // build the dangling diamond
    const diamond = new ShapePath({
      frame: new Rectangle(placement.x, placement.y + 27, 6, 6),
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

    // set rectangle width based on text width
    const textWidth = text.frame.width;
    const rectangleWidth = textWidth + 32;
    rectangle.frame.width = rectangleWidth;

    // move the diamond to the mid-point of the rectangle
    const diamondMidX = ((rectangleWidth - 8) / 2);
    diamond.frame.x = diamondMidX + placement.x;

    // set z-axis placement of all elements
    rectangle.moveToFront();
    text.index = rectangle.index + 1;
    diamond.index = rectangle.index - 1;

    return null;
  }
}
