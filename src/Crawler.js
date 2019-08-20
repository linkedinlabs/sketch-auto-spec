import { fromNative } from 'sketch';
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
   * @description Uses `setArray` to ensure the selection array is a javascript array. Also
   * looks into the selection for any groups and pulls out individual layers.
   *
   * @kind function
   * @name all
   * @returns {Object} All items in the array as a javascript array.
   */
  all() {
    const initialSelection = setArray(this.array);
    const flatSelection = [];
    initialSelection.forEach((layer) => {
      if (
        fromNative(layer).type === 'Group'
        || fromNative(layer).type === 'Artboard'
      ) {
        const innerLayers = layer.children();
        innerLayers.forEach((innerLayer) => {
          // .children() includes the outer layer group, so we want to exclude it
          // from our flattened selection
          if (
            fromNative(innerLayer).type !== 'Group'
            && fromNative(innerLayer).type !== 'Artboard'
          ) {
            flatSelection.push(innerLayer);
          }
        });
      } else {
        flatSelection.push(layer);
      }
    });
    return flatSelection;
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
   * of an entire selection. It also includes layer IDs (`layerAId` and `layerBId`)
   * for the two layers used to calculated the gap frame.
   */
  gapFrame() {
    const theFrame = {
      x: null,
      y: null,
      width: 0,
      height: 0,
      orientation: 'vertical',
      layerAId: null,
      layerBId: null,
    };

    const selection = setArray(this.array);

    // set shorthand for `getPositionOnArtboard`
    const aPos = getPositionOnArtboard;

    // set the layers to a default for comparisons
    let layerA = selection[0];
    let layerB = selection[0];
    // assume the gap orientation is vertical
    let horizontalGap = false;

    // find left-most (`layerA`) and right-most (`layerB`) layers
    selection.forEach((layer) => {
      if (aPos(layer).x < aPos(layerA).x) {
        layerA = layer;
      }

      if (aPos(layer).x > aPos(layerB).x) {
        layerB = layer;
      }
    });

    if (layerA && layerB) {
      let leftEdgeX = null; // lowest x within gap
      let rightEdgeX = null; // highest x within gap
      let topEdgeY = null;
      let frameHeight = null;

      // make sure the layers are not overlapped (a gap exists)
      if ((aPos(layerA).x + layerA.frame().width()) < aPos(layerB).x) {
        // set the left/right edges of the gap
        leftEdgeX = aPos(layerA).x + layerA.frame().width(); // lowest x within gap
        rightEdgeX = aPos(layerB).x; // highest x within gap

        // set Y
        if (aPos(layerA).y < aPos(layerB).y) {
          topEdgeY = aPos(layerA).y;
        } else {
          topEdgeY = aPos(layerB).y;
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
        theFrame.layerAId = fromNative(layerA).id;
        theFrame.layerBId = fromNative(layerB).id;
      } else {
        horizontalGap = true;
      }
    }

    // the gap is horizontal (if overlap does not exist)
    if (horizontalGap) {
      // find top-most (`layerA`) and bottom-most (`layerB`) layers
      selection.forEach((layer) => {
        if (aPos(layer).y < aPos(layerA).y) {
          layerA = layer;
        }

        if (aPos(layer).y > aPos(layerB).y) {
          layerB = layer;
        }
      });

      let topEdgeY = null; // lowest y within gap
      let bottomEdgeY = null; // highest y within gap
      let leftEdgeX = null;
      let frameWidth = null;

      // make sure the layers are not overlapped (a gap exists)
      if ((aPos(layerA).y + layerA.frame().height()) < aPos(layerB).y) {
        // set the top/bottom edges of the gap
        topEdgeY = aPos(layerA).y + layerA.frame().height(); // lowest y within gap
        bottomEdgeY = aPos(layerB).y; // highest y within gap

        // set X
        if (aPos(layerA).x < aPos(layerB).x) {
          leftEdgeX = aPos(layerA).x;
        } else {
          leftEdgeX = aPos(layerB).x;
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
        theFrame.layerAId = fromNative(layerA).id;
        theFrame.layerBId = fromNative(layerB).id;
      }
    }

    // no gap exists
    if (!theFrame.x) {
      return null;
    }

    return theFrame;
  }

  /** WIP
   * @description Simulates Sketch’s frame() object, but for the space between two
   * selected layers. It keeps the coordinates relative to the artboard, ignoring
   * if some of the items are grouped inside other layers. It also adds an orientation
   * `horizontal` or `vertical` based on the gap orientation. Assumes only 2 layers
   * are selected.
   *
   * @kind function
   * @name overlapFrames
   * @returns {Object} The `x`, `y` coordinates, `width`, `height`, and `orientation`
   * of an entire selection. It also includes layer IDs (`layerAId` and `layerBId`)
   * for the two layers used to calculated the gap frame.
   */
  overlapFrames() {
    // use `gapFrame` to first ensure that the itemse do actually overlap
    const gapFrame = this.gapFrame();

    if (gapFrame) {
      return null;
    }

    // set the selection
    const selection = setArray(this.array);

    // set shorthand for `getPositionOnArtboard`
    const aPos = getPositionOnArtboard;

    // set the layers to a default for comparisons
    let layerA = selection[0];
    let layerB = selection[0];

    // find biggest (`layerA`) and smallest (`layerB`) layers
    let layerAArea = (layerA.frame().width() * layerA.frame().height());
    let layerBArea = (layerB.frame().width() * layerB.frame().height());

    // set the largest layer to `layerA` and the smallest to `layerB`
    // if `layerB` is currently the largest, we have to flip them
    selection.forEach((layer) => {
      const layerArea = (layer.frame().width() * layer.frame().height());
      if (layerArea > layerAArea) {
        layerA = layer;
        layerAArea = layerArea;
      }

      if (layerArea < layerAArea) {
        layerB = layer;
        layerBArea = layerArea;
      }
    });

    // we need a dominant layer to orient positioning;
    // if both layers are exactly the same size, we cannot assume dominance
    if (layerAArea === layerBArea) {
      return null;
    }

    // -------- set frames - essentially defining rectangles in the overapped spaces
    // between the too layers
    // top
    const topWidth = layerB.frame().width();
    const topHeight = aPos(layerB).y - aPos(layerA).y;
    const topX = aPos(layerB).x;
    const topY = layerA.frame().y();
    // bottom
    const bottomWidth = layerB.frame().width();
    const bottomHeight = layerA.frame().height() - topHeight - layerB.frame().height();
    const bottomX = aPos(layerB).x;
    const bottomY = aPos(layerA).y + topHeight + layerB.frame().height();
    // left
    const leftWidth = aPos(layerB).x - aPos(layerA).x;
    const leftHeight = layerB.frame().height();
    const leftX = aPos(layerA).x;
    const leftY = aPos(layerB).y;
    // right
    const rightWidth = layerA.frame().width() - layerB.frame().width() - leftWidth;
    const rightHeight = layerB.frame().height();
    const rightX = aPos(layerB).x + layerB.frame().width();
    const rightY = aPos(layerB).y;

    // set the frames
    const theFrames = {
      top: {
        x: topX,
        y: topY,
        width: topWidth,
        height: topHeight,
        orientation: 'horizontal',
      },
      bottom: {
        x: bottomX,
        y: bottomY,
        width: bottomWidth,
        height: bottomHeight,
        orientation: 'horizontal',
      },
      right: {
        x: rightX,
        y: rightY,
        width: rightWidth,
        height: rightHeight,
        orientation: 'vertical',
      },
      left: {
        x: leftX,
        y: leftY,
        width: leftWidth,
        height: leftHeight,
        orientation: 'vertical',
      },
      layerAId: fromNative(layerA).id,
      layerBId: fromNative(layerB).id,
    };

    // deliver the result
    return theFrames;
  }
}
