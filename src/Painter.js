import { fromNative } from 'sketch';
import {
  Group,
  Rectangle,
  ShapePath,
  Text,
} from 'sketch/dom';

/**
 * @description A class to add elements to the Sketch file.
 *
 * @class
 * @name Painter
 *
 * @constructor
 *
 * @property layer The layer in the Sketch file that we want to label or modify.
 */
export default class Painter {
  constructor({ for: layer }) {
    this.layer = layer;
    this.artboard = this.layer.parentArtboard();
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
    const layerName = this.layer.name();
    const groupName = `Label for ${layerName}`;

    // build the text box
    const text = new Text({
      frame: {
        x: 16,
        y: 3,
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
      frame: new Rectangle(0, 0, 200, 30),
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
      frame: new Rectangle(0, 27, 6, 6),
      name: 'Diamond',
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
    diamond.frame.x = diamondMidX;

    // set z-axis placement of all elements
    rectangle.moveToFront();
    text.index = rectangle.index + 1;
    diamond.index = rectangle.index - 1;

    const group = new Group({
      name: groupName,
      parent: this.artboard,
    });

    group.frame.width = rectangle.frame.width;
    group.frame.height = rectangle.frame.height + 4;

    rectangle.parent = group;
    diamond.parent = group;
    text.parent = group;

    // position the group
    const artboardWidth = this.artboard.frame().width();
    const layerWidth = this.layer.frame().width();
    const originalLayerIndex = fromNative(this.layer).index;
    let diamondAdjustment = null;

    // move group to index right above layer to label
    group.index = originalLayerIndex + 1;

    // initial placement based on layer to label
    let placementX = (
      this.layer.frame().x() + (
        (layerWidth - group.frame.width) / 2
      )
    );
    let placementY = this.layer.frame().y() - 38;

    // correct for left bleed
    if (placementX < 0) {
      placementX = 5;
      diamondAdjustment = 'left';
    }

    // correct for right bleed
    if ((placementX + group.frame.width) > artboardWidth) {
      placementX = artboardWidth - group.frame.width - 5;
      diamondAdjustment = 'right';
    }

    // correct for top bleed
    if (placementY < 0) {
      placementY = 5;
    }

    // set label group placement
    group.frame.x = placementX;
    group.frame.y = placementY;

    // adjust diamond, if necessary
    if (diamondAdjustment) {
      // move the diamond to the mid-point of the layer to label
      let diamondLayerMidX = null;
      switch (diamondAdjustment) {
        case 'left':
          diamondLayerMidX = ((this.layer.frame().x() + layerWidth - 8) / 2);
          break;
        case 'right':
          diamondLayerMidX = ((this.layer.frame().x() - group.frame.x) + ((layerWidth - 8) / 2));
          break;
        default:
          diamondLayerMidX = 0;
      }
      diamond.frame.x = diamondLayerMidX;
    }

    return null;
  }
}
