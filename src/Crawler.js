import { getPositionOnArtboard, setArray } from './Tools';

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

  /**
   * @description Uses `setArray` to ensure the selection array is a javascript array.
   *
   * @kind function
   * @name all
   * @returns {Object} All items in the array as a javascript array.
   */
  all() {
    return setArray(this.array);
  }

  /**
   * @description Simulates Sketch’s frame() object, but for an entire selection,
   * and keeps the coordinates relative to the artboard, ignoring if some of the items
   * are grouped inside other layers.
   *
   * @kind function
   * @name frame
   * @returns {Object} The `x`, `y` coordinates and `width` and `height` of an entire selection.
   */
  frame() {
    const theFrame = {
      x: null,
      y: null,
      width: 0,
      height: 0,
    };

    // set some intitial outer values to compare to
    let outerX = 0;
    let outerY = 0;

    // iterate through the selected layers and update the frame inner `x`/`y` values and
    // the outer `x`/`y` values
    this.all().forEach((layer) => {
      const layerCoordinates = getPositionOnArtboard(layer);
      const layerX = layerCoordinates.x;
      const layerY = layerCoordinates.y;
      const layerW = layer.frame().width();
      const layerH = layer.frame().height();
      const layerOuterX = layerX + layerW;
      const layerOuterY = layerY + layerH;

      // set upper-left x
      if (
        (!theFrame.x)
        || (theFrame.x > layerX)
      ) {
        theFrame.x = layerX;
      }

      // set outerX
      if (layerOuterX > outerX) {
        outerX = layerOuterX;
      }

      // set upper-left y
      if (
        (!theFrame.y)
        || (theFrame.y > layerY)
      ) {
        theFrame.y = layerY;
      }

      // set outerY
      if (layerOuterY > outerY) {
        outerY = layerOuterY;
      }
    });

    // calculate the full `width`/`height` based on the inner and outer `x`/`y` values
    const width = outerX - theFrame.x;
    const height = outerY - theFrame.y;

    // set the new `width`/`height` values
    theFrame.width = width;
    theFrame.height = height;

    return theFrame;
  }

  /**
   * @description Simulates Sketch’s frame() object, but for the space between two
   * selected layers. It keeps the coordinates relative to the artboard, ignoring
   * if some of the items are grouped inside other layers. It also adds an orientation
   * `horizontal` or `vertical` based on the gap orientation. Assumes only 2 layers
   * are selected.
   *
   * @kind function
   * @name gapFrame
   * @returns {Object} The `x`, `y` coordinates, `width`, `height`, and `orientation`
   * of an entire selection.
   */
  gapFrame() {
    const theFrame = {
      x: null,
      y: null,
      width: 0,
      height: 0,
      orientation: 'vertical',
    };

    // set the layers to a default for comparions
    let layerA = this.all()[0];
    let layerB = this.all()[0];
    // assume the gap orientation is vertical
    let horizontalGap = false;

    // find left-most (`layerA`) and right-most (`layerB`) layers
    this.all().forEach((layer) => {
      if (layer.frame().x() < layerA.frame().x()) {
        layerA = layer;
      }

      if (layer.frame().x() > layerB.frame().x()) {
        layerB = layer;
      }
    });

    if (layerA && layerB) {
      let leftEdgeX = null; // lowest x within gap
      let rightEdgeX = null; // highest x within gap
      let topEdgeY = null;
      let frameHeight = null;

      // make sure the layers are not overlapped (a gap exists)
      if ((layerA.frame().x() + layerA.frame().width()) < layerB.frame().x()) {
        // set the left/right edges of the gap
        leftEdgeX = layerA.frame().x() + layerA.frame().width(); // lowest x within gap
        rightEdgeX = layerB.frame().x(); // highest x within gap

        // set Y
        if (layerA.frame().y() < layerB.frame().y()) {
          topEdgeY = layerA.frame().y();
        } else {
          topEdgeY = layerB.frame().y();
        }

        // set height
        if (layerA.frame().height() < layerB.frame().height()) {
          frameHeight = layerA.frame().height();
        } else {
          frameHeight = layerB.frame().height();
        }

        // set the final frame params
        theFrame.x = leftEdgeX;
        theFrame.y = topEdgeY;
        theFrame.width = rightEdgeX - leftEdgeX;
        theFrame.height = frameHeight;
      } else {
        horizontalGap = true;
      }
    }

    // the gap is horizontal (if overlap does not exist)
    if (horizontalGap) {
      // find top-most (`layerA`) and bottom-most (`layerB`) layers
      this.all().forEach((layer) => {
        if (layer.frame().y() < layerA.frame().y()) {
          layerA = layer;
        }

        if (layer.frame().y() > layerB.frame().y()) {
          layerB = layer;
        }
      });

      let topEdgeY = null; // lowest y within gap
      let bottomEdgeY = null; // highest y within gap
      let leftEdgeX = null;
      let frameWidth = null;

      // make sure the layers are not overlapped (a gap exists)
      if ((layerA.frame().y() + layerA.frame().height()) < layerB.frame().y()) {
        // set the top/bottom edges of the gap
        topEdgeY = layerA.frame().y() + layerA.frame().height(); // lowest y within gap
        bottomEdgeY = layerB.frame().y(); // highest y within gap

        // set X
        if (layerA.frame().x() < layerB.frame().x()) {
          leftEdgeX = layerA.frame().x();
        } else {
          leftEdgeX = layerB.frame().x();
        }

        // set width
        if (layerA.frame().width() < layerB.frame().width()) {
          frameWidth = layerA.frame().width();
        } else {
          frameWidth = layerB.frame().width();
        }

        // set the final frame params
        theFrame.x = leftEdgeX;
        theFrame.y = topEdgeY;
        theFrame.width = frameWidth;
        theFrame.height = bottomEdgeY - topEdgeY;
        theFrame.orientation = 'horizontal';
      }
    }

    // no gap exists
    if (!theFrame.x) {
      return null;
    }

    return theFrame;
  }
}
