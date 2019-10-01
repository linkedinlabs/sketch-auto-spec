import { fromNative } from 'sketch';
import {
  getPositionOnArtboard,
  getRelativeIndex,
  setArray,
} from './Tools';

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
      let bottomEdgeY = null;
      let frameHeight = null;

      // make sure the layers are not overlapped (a gap exists)
      if ((aPos(layerA).x + layerA.frame().width()) < aPos(layerB).x) {
        // set the left/right edges of the gap
        leftEdgeX = aPos(layerA).x + layerA.frame().width(); // lowest x within gap
        rightEdgeX = aPos(layerB).x; // highest x within gap

        const layerATopY = aPos(layerA).y;
        const layerABottomY = aPos(layerA).y + layerA.frame().height();
        const layerBTopY = aPos(layerB).y;
        const layerBBottomY = aPos(layerB).y + layerB.frame().height();

        if (layerBTopY >= layerATopY) {
          // top of A is higher than top of B
          if (layerABottomY >= layerBTopY) {
            // top of B is higher than bottom of A
            if (layerBBottomY >= layerABottomY) {
              // bottom of A is higher than bottom of B
              // decision: top edge is top of B; bottom edge is bottom of A
              topEdgeY = layerBTopY;
              bottomEdgeY = layerABottomY;
            } else {
              // decision: top edge is top of B; bottom edge is bottom of B
              topEdgeY = layerBTopY;
              bottomEdgeY = layerBBottomY;
            }
          } else {
            // decision: top edge is bottom of A; bottom edge is top of B
            topEdgeY = layerABottomY;
            bottomEdgeY = layerBTopY;
          }
        } else if (layerBBottomY >= layerATopY) {
          // top of A is higher than bottom of B
          if (layerABottomY >= layerBBottomY) {
            // bottom of B is higher than bottom of A
            // decision: top edge is top of A; bottom edge is bottom of B
            topEdgeY = layerATopY;
            bottomEdgeY = layerBBottomY;
          } else {
            // decision: top edge is top of A; bottom edge is bottom of A
            topEdgeY = layerATopY;
            bottomEdgeY = layerABottomY;
          }
        } else {
          // decision: top edge is bottom of B; bottom edge is top of A
          topEdgeY = layerBBottomY;
          bottomEdgeY = layerATopY;
        }

        // set frame height
        frameHeight = bottomEdgeY - topEdgeY;

        // set the final frame params
        // cut final `y` in half by height to position annotation at mid-point
        theFrame.x = leftEdgeX;
        theFrame.y = topEdgeY + (frameHeight / 2);
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
      let rightEdgeX = null;
      let frameWidth = null;

      // make sure the layers are not overlapped (a gap exists)
      if ((aPos(layerA).y + layerA.frame().height()) < aPos(layerB).y) {
        // set the top/bottom edges of the gap
        topEdgeY = aPos(layerA).y + layerA.frame().height(); // lowest y within gap
        bottomEdgeY = aPos(layerB).y; // highest y within gap

        // set initial layer values for comparison
        const layerALeftX = aPos(layerA).x;
        const layerARightX = aPos(layerA).x + layerA.frame().width();
        const layerBLeftX = aPos(layerB).x;
        const layerBRightX = aPos(layerB).x + layerB.frame().width();

        if (layerBLeftX >= layerALeftX) {
          // left-most of A is to the left of left-most of B
          if (layerARightX >= layerBLeftX) {
            // left-most of B is to the left of right-most of A
            if (layerBRightX >= layerARightX) {
              // right-most of A is to the left of right-most of B
              // decision: left-most edge is left-most of B; right-most edge is right-most of A
              leftEdgeX = layerBLeftX;
              rightEdgeX = layerARightX;
            } else {
              // decision: left-most edge is left-most of B; right-most edge is right-most of B
              leftEdgeX = layerBLeftX;
              rightEdgeX = layerBRightX;
            }
          } else {
            // decision: left-most edge is right-most of A; right-most edge is left-most of B
            leftEdgeX = layerARightX;
            rightEdgeX = layerBLeftX;
          }
        } else if (layerBRightX >= layerALeftX) {
          // left-most of A is to the left of right-most of B
          if (layerARightX >= layerBRightX) {
            // right-most of B is to the left of right-most of A
            // decision: left-most edge is left-most of A; right-most edge is right-most of B
            leftEdgeX = layerALeftX;
            rightEdgeX = layerBRightX;
          } else {
            // decision: left-most edge is left-most of A; right-most edge is right-most of A
            leftEdgeX = layerALeftX;
            rightEdgeX = layerARightX;
          }
        } else {
          // decision: left-most edge is right-most of B; right-most edge is left-most of A
          leftEdgeX = layerBRightX;
          rightEdgeX = layerALeftX;
        }

        // set frame height
        frameWidth = rightEdgeX - leftEdgeX;

        // set the final frame params
        // cut final `x` in half by width to position annotation at mid-point
        theFrame.x = leftEdgeX + (frameWidth / 2);
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

  /**
   * @description Creates four separate frames for the spaces around two overlapping
   * selected layers. It keeps the coordinates relative to the artboard, ignoring
   * if some of the items are grouped inside other layers. It also adds an orientation
   * `horizontal` or `vertical` based on the gap orientation. Assumes only 2 layers
   * are selected.
   *
   * @kind function
   * @name overlapFrames
   * @returns {Object} The `top`, `bottom`, `right`, and `left` frames. Each frame
   * contains `x`, `y` coordinates, `width`, `height`, and `orientation`.
   * The object also includes layer IDs (`layerAId` and `layerBId`)
   * for the two layers used to calculated the overlapped areas.
   */
  overlapFrames() {
    // use `gapFrame` to first ensure that the items do actually overlap
    const gapFrame = this.gapFrame();

    // if items do not overlap, cannot create an `overlapFrame`
    if (gapFrame) {
      return null;
    }

    // set the selection
    const selection = setArray(this.array);

    // set shorthand for `getPositionOnArtboard`
    const aPos = getPositionOnArtboard;

    // set the layers to a default for comparisons
    let layerA = selection[0];
    let layerB = selection[selection.length - 1];

    // find bottom (`layerA`) and top (`layerB`) layers
    let layerAIndex = getRelativeIndex(layerA);
    let layerBIndex = getRelativeIndex(layerB);

    // set the bottom layer to `layerA` and the top to `layerB`
    // if `layerB` is currently the bottom, we have to flip them
    selection.forEach((layer) => {
      const layerIndex = getRelativeIndex(layer);

      if (layerIndex > layerBIndex) {
        layerB = layer;
        layerBIndex = layerIndex;
      }

      if (layerIndex < layerAIndex) {
        layerA = layer;
        layerAIndex = layerIndex;
      }
    });

    // we need a dominant layer to orient positioning;
    // if both layers are exactly the same index, we cannot assume dominance.
    // this should not happen, but layers might be selected from multiple artboards.
    if (layerAIndex === layerBIndex) {
      return null;
    }

    // -------- set frames - essentially defining rectangles in the overapped spaces
    // between the two layers
    // top
    const topWidth = layerB.frame().width();
    const topHeight = aPos(layerB).y - aPos(layerA).y;
    const topX = aPos(layerB).x;
    const topY = aPos(layerA).y;
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
