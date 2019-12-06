import { fromNative, Settings } from 'sketch';
import {
  Group,
  Rectangle,
  ShapePath,
  Text,
} from 'sketch/dom';
import { getPositionOnArtboard, updateArray } from './Tools';
import {
  COLORS,
  PLUGIN_IDENTIFIER,
  PLUGIN_NAME,
} from './constants';

// --- private functions for drawing/positioning annotation elements in the Sketch file
/**
 * @description Checks for an installed font family of a typeface at the system level.
 *
 * @kind function
 * @name checkInstalledFont
 * @param {string} fontFamily A string representing the name of the font family.
 * @returns {boolean} A `true` if installed; `false` if not.
 * @private
 */
const checkInstalledFont = (fontFamily) => {
  const fontManager = NSFontManager.sharedFontManager(); // eslint-disable-line no-undef
  const installedFontFamilies = fontManager.availableFontFamilies();
  let familyExists = false;
  installedFontFamilies.forEach((fam) => {
    if (String(fam) === fontFamily) {
      familyExists = true;
    }
  });
  return familyExists;
};

/**
 * @description Builds the initial annotation elements in Sketch (diamond, rectangle, text).
 *
 * @kind function
 * @name buildMeasureIcon
 * @param {Object} parent The artboard or layer to draw within.
 * @param {string} colorHex A string representing the hex color for the icon.
 * @param {string} orientation A string representing the orientation (optional).
 * @returns {Object} Layer group containing the icon.
 * @private
 */
const buildMeasureIcon = (parent, colorHex, orientation = 'horizontal') => {
  // horizontal orientation lines
  let line1Params = {
    x: 0,
    y: 0,
    width: 1,
    height: 5,
  };
  let line2Params = {
    x: 9,
    y: 0,
    width: 1,
    height: 5,
  };
  let line3Params = {
    x: 1,
    y: 2,
    width: 8,
    height: 1,
  };

  // vertical orientation lines
  if (orientation === 'vertical') {
    line1Params = {
      x: 0,
      y: 0,
      width: 5,
      height: 1,
    };
    line2Params = {
      x: 0,
      y: 9,
      width: 5,
      height: 1,
    };
    line3Params = {
      x: 2,
      y: 1,
      width: 1,
      height: 8,
    };
  }

  const line1 = new ShapePath({
    frame: new Rectangle(line1Params),
    parent,
    style: {
      borders: [{
        enabled: false,
        thickness: 0,
      }],
      fills: [`${colorHex}ff`],
    },
  });

  const line2 = new ShapePath({
    frame: new Rectangle(line2Params),
    parent,
    style: {
      borders: [{
        enabled: false,
        thickness: 0,
      }],
      fills: [`${colorHex}ff`],
    },
  });

  const line3 = new ShapePath({
    frame: new Rectangle(line3Params),
    parent,
    style: {
      borders: [{
        enabled: false,
        thickness: 0,
      }],
      fills: [`${colorHex}ff`],
    },
  });

  const group = new Group({
    name: 'Icon',
    parent,
  });

  if (orientation === 'horizontal') {
    line1.sketchObject.hasFixedLeft = 1;
    line1.sketchObject.hasFixedWidth = 1;
    line2.sketchObject.hasFixedRight = 1;
    line2.sketchObject.hasFixedWidth = 1;
    line3.sketchObject.hasFixedRight = 1;
    line3.sketchObject.hasFixedLeft = 1;
  } else {
    line1.sketchObject.hasFixedTop = 1;
    line1.sketchObject.hasFixedHeight = 1;
    line2.sketchObject.hasFixedBottom = 1;
    line2.sketchObject.hasFixedHeight = 1;
    line3.sketchObject.hasFixedTop = 1;
    line3.sketchObject.hasFixedBottom = 1;
  }

  line1.parent = group;
  line2.parent = group;
  line3.parent = group;

  group.adjustToFit();

  return group;
};

/**
 * @description Builds the initial annotation elements in Sketch (diamond, rectangle, text).
 *
 * @kind function
 * @name buildAnnotation
 *
 * @param {Object} annotationText The text for the annotation.
 * @param {Object} annotationSecondaryText Optional secondary text for the annotation.
 * @param {string} annotationType A string representing the type of annotation
 * (component or foundation).
 * @param {Object} artboard The artboard to draw within.
 *
 * @returns {Object} Each annotation element (`diamond`, `rectangle`, `text`, and `icon`).
 * @private
 */
const buildAnnotation = (
  annotationText,
  annotationSecondaryText,
  annotationType = 'component',
  artboard,
) => {
  // set the dominant color
  let colorHex = null;
  switch (annotationType) {
    case 'component':
      colorHex = COLORS.component;
      break;
    case 'custom':
      colorHex = COLORS.custom;
      break;
    case 'dimension':
      colorHex = COLORS.dimension;
      break;
    case 'spacing':
      colorHex = COLORS.spacing;
      break;
    case 'style':
      colorHex = COLORS.style;
      break;
    default:
      colorHex = COLORS.component;
  }

  // set the typeface
  let fontFamily = 'Helvetica Neue';
  // set backup
  if (!checkInstalledFont(fontFamily)) {
    fontFamily = 'Lato';
  }
  // revert to system default
  if (!checkInstalledFont(fontFamily)) {
    fontFamily = 'system';
  }

  let isMeasurement = false;
  if (
    annotationType === 'spacing'
    || annotationType === 'dimension'
  ) {
    isMeasurement = true;
  }

  // build the text box
  const textFrame = {
    x: 16,
    y: 3,
  };

  if (isMeasurement) {
    textFrame.x = 4;
    textFrame.y = -1;
  }

  // adjustment for two-line annotations
  let rectTextBuffer = 0;
  if (annotationSecondaryText) {
    rectTextBuffer = 22;
  }

  let setText = annotationText;
  if (annotationSecondaryText) {
    setText = `${annotationText}\n${annotationSecondaryText}`;
  }
  const text = new Text({
    frame: {
      x: textFrame.x,
      y: (textFrame.y - rectTextBuffer),
      height: 22, // text frames need an explicit height to start
      width: 200, // text frames need an explicit width to start
    },
    parent: artboard,
    text: setText,
    style: {
      alignment: Text.Alignment.center,
      borders: [{
        enabled: false,
      }],
      fontFamily,
      fontSize: 12,
      fontWeight: 4,
      kerning: 0,
      lineHeight: 22,
      textColor: '#ffffffff',
    },
  });
  // need to fire `adjustToFit` after creating the text for it to be effective
  text.adjustToFit();

  // build the rounded rectangle
  const rectHeight = (isMeasurement ? 22 : 30) + rectTextBuffer;
  const rectangle = new ShapePath({
    frame: new Rectangle(0, -rectTextBuffer, 200, rectHeight),
    parent: artboard,
    style: {
      borders: [{
        enabled: false,
        thickness: 0,
      }],
      fills: [`${colorHex}ff`],
    },
  });

  // set rounded corners of the rectangle
  const { points } = rectangle;
  points.forEach((point) => {
    point.cornerRadius = 2; // eslint-disable-line no-param-reassign
    return null;
  });

  // build the dangling diamond
  const diamondOffset = (isMeasurement ? 19 : 27);
  const diamond = new ShapePath({
    frame: new Rectangle(0, diamondOffset, 6, 6),
    name: 'Diamond',
    parent: artboard,
    style: {
      borders: [{
        enabled: false,
        thickness: 0,
      }],
      fills: [`${colorHex}ff`],
    },
    transform: {
      rotation: 45,
    },
  });

  // set rectangle width based on text width
  const textWidth = text.frame.width;
  const textPadding = (isMeasurement ? 6 : 32);
  const rectangleWidth = textWidth + textPadding;
  rectangle.frame.width = rectangleWidth;

  // move the diamond to the mid-point of the rectangle
  const diamondMidX = ((rectangleWidth - 6) / 2);
  diamond.frame.x = diamondMidX;

  // set z-axis placement of all elements
  rectangle.moveToFront();
  text.index = rectangle.index + 1;
  diamond.index = rectangle.index - 1;

  let icon = null;
  if (isMeasurement) {
    icon = buildMeasureIcon(artboard, colorHex);
    icon.moveToBack();
    icon.frame.x = diamondMidX - 2;
    icon.frame.y = rectangle.frame.height + 4;
  }

  // return an object with each element
  return {
    diamond,
    rectangle,
    text,
    icon,
  };
};

/**
 * @description Builds the rectangle shape styled as a bounding box.
 *
 * @kind function
 * @name buildBoundingBox
 * @param {Object} frame The frame coordinates (`x`, `y`, `width`, and `height`) for the box.
 * @param {Object} containerGroup The container group to draw within.
 * @returns {Object} The Sketch ShapePath object for the box.
 * @private
 */
const buildBoundingBox = (frame, containerGroup) => {
  const colorHex = COLORS.style;
  const colorOpactiy = '4d'; // 30% opacity

  // find container frame, relative to artboard
  const relativeGroupFrame = getPositionOnArtboard(containerGroup.sketchObject);

  // set x, y relative to container group and artboard
  const placementX = frame.x - relativeGroupFrame.x;
  const placementY = frame.y - relativeGroupFrame.y;

  // build the semi-transparent rectangle
  const boundingBox = new ShapePath({
    frame: new Rectangle(placementX, placementY, frame.width, frame.height),
    name: 'Bounding Box',
    parent: containerGroup,
    style: {
      borders: [{
        enabled: false,
        thickness: 0,
      }],
      fills: [`${colorHex}${colorOpactiy}`], // i.e. #ff6655
    },
  });

  return boundingBox;
};

/**
 * @description Takes the individual annotation elements, the specs for the layer(s) receiving
 * the annotation, and adds the annotation to the container group in the proper position.
 *
 * @kind function
 * @name positionAnnotation
 * @param {Object} containerGroup The group layer that holds all annotations.
 * @param {string} groupName The name of the group that holds the annotation elements
 * inside the `containerGroup`.
 * @param {Object} annotation Each annotation element (`diamond`, `rectangle`, `text`).
 * @param {Object} layerFrame The frame specifications (`width`, `height`, `x`, `y`, `index`)
 * for the layer receiving the annotation + the artboard width/height (`artboardWidth` /
 * `artboardHeight`).
 * @param {string} annotationType An optional string representing the type of annotation.
 * @param {string} orientation An optional string representing the orientation of the
 * annotation (`top` or `left`).
 *
 * @returns {Object} The final annotation as a layer group.
 * @private
 */
const positionAnnotation = (
  containerGroup,
  groupName,
  annotation,
  layerFrame,
  annotationType = 'component',
  orientation = 'top',
) => {
  const {
    diamond,
    rectangle,
    text,
    icon,
  } = annotation;

  const { artboardWidth, artboardHeight } = layerFrame;
  const layerWidth = layerFrame.width;
  const layerHeight = layerFrame.height;
  const layerX = layerFrame.x;
  const layerY = layerFrame.y;

  let isMeasurement = false;
  if (
    annotationType === 'spacing'
    || annotationType === 'dimension'
  ) {
    isMeasurement = true;
  }

  // create the annotation group
  const group = new Group({
    name: groupName,
    parent: containerGroup,
  });

  // size the annotation group frame
  group.frame.width = rectangle.frame.width;
  group.frame.height = rectangle.frame.height + 4;

  // add elements to the group
  rectangle.parent = group;
  diamond.parent = group;
  text.parent = group;
  if (icon) {
    icon.parent = group;
  }

  // ------- position the group within the artboard, above the layer receiving the annotation
  let artboardEdge = null;

  // initial placement based on layer to annotate

  // for top
  let placementX = (
    layerX + (
      (layerWidth - group.frame.width) / 2
    )
  );
  // for `left` or `right`
  let placementY = (
    layerY + (
      (layerHeight - group.frame.height) / 2
    )
  );

  let offsetX = null;
  let offsetY = null;
  let iconOffsetX = 0;
  let iconOffsetY = 0;

  // adjustments based on orientation
  switch (orientation) {
    case 'left':
      offsetX = (isMeasurement ? 40 : 38);
      placementX = layerX - offsetX;
      break;
    case 'right':
      offsetX = (isMeasurement ? 12 : 5);
      placementX = layerX + layerWidth + offsetX;
      break;
    default: // top
      offsetY = (isMeasurement ? 33 : 38);
      placementY = layerY - offsetY;
  }

  // correct for left bleed
  if (placementX < 0) {
    artboardEdge = 'left';
    placementX = 5;

    // dimension/spacing annotations get their own special correction
    if (icon) {
      iconOffsetX = placementX;
    }
  }

  // correct for right bleed
  if ((placementX + group.frame.width) > artboardWidth) {
    artboardEdge = 'right';
    placementX = artboardWidth - group.frame.width - 3;

    // dimension/spacing annotations get their own special correction
    if (icon) {
      placementX -= 3;
      iconOffsetX = placementX;
    }
  }

  // correct for top bleed
  if (placementY < 0) {
    artboardEdge = 'top';
    placementY = 5;

    // dimension/spacing annotations get their own special correction
    if (icon) {
      placementY = 2;
      iconOffsetY = placementY;
    }
  }

  // correct for bottom bleed
  if (placementY > (artboardHeight - group.frame.height)) {
    artboardEdge = 'bottom';
    offsetY = icon ? 2 : 5;
    placementY = (artboardHeight - group.frame.height - offsetY);

    if (icon) {
      iconOffsetY = null;
    }
  }

  // find container frame, relative to artboard
  const relativeGroupFrame = getPositionOnArtboard(containerGroup.sketchObject);

  // set annotation group placement, relative to container group
  group.frame.x = placementX - relativeGroupFrame.x;
  group.frame.y = placementY - relativeGroupFrame.y;

  // adjust diamond on horizontal placement, if necessary
  if (artboardEdge) {
    // move the diamond to the mid-point of the layer to annotate
    let diamondLayerMidX = null;
    switch (artboardEdge) {
      case 'left':
        diamondLayerMidX = ((layerX - group.frame.x) + ((layerWidth - 6) / 2));
        break;
      case 'right':
        diamondLayerMidX = ((layerX - group.frame.x) + ((layerWidth - 6) / 2));
        break;
      default:
        diamondLayerMidX = diamond.frame.x;
    }
    diamond.frame.x = diamondLayerMidX;
  }

  // move diamond to left/right edge, if necessary
  if (orientation === 'left' || orientation === 'right') {
    const diamondNewY = rectangle.frame.y + (rectangle.frame.height / 2) - 3;
    let diamondNewX = null;

    if (orientation === 'left') {
      // move the diamond to the left mid-point of the layer to annotate
      diamondNewX = rectangle.frame.x + rectangle.frame.width - 3;
    } else {
      // move the diamond to the right mid-point of the layer to annotate
      diamondNewX = rectangle.frame.x - 3;
    }

    // re-position diamond
    diamond.frame.x = diamondNewX;
    diamond.frame.y = diamondNewY;

    // re-size the annotation group frame
    group.frame.y += 2;
  }

  // adjust measurement diamond based on artboard edge, if necessary
  if (artboardEdge && isMeasurement) {
    switch (artboardEdge) {
      case 'bottom':
        diamond.frame.y = rectangle.frame.height - diamond.frame.height - offsetY;
        break;
      case 'left':
        diamond.frame.x = diamond.frame.width / 2;
        break;
      case 'right':
        diamond.frame.x = rectangle.frame.width - diamond.frame.width - offsetX - 2;
        break;
      default: // top
        diamond.frame.y = diamond.frame.y;
    }
  }

  // adjust the measure icon width for top-oriented annotations
  if (orientation === 'top' && icon) {
    icon.frame.width = layerWidth;

    if (iconOffsetX > 0) {
      if (artboardEdge === 'left') {
        icon.frame.x -= getPositionOnArtboard(icon.sketchObject).x;
      } else {
        icon.frame.x = (
          artboardWidth - getPositionOnArtboard(group.sketchObject).x - icon.frame.width
        );
      }
    } else {
      icon.frame.x = (rectangle.frame.width - layerWidth) / 2;
    }

    icon.adjustToFit();
  }

  // adjust the measure icon height for left-/right-oriented annotations
  if (orientation !== 'top') {
    // remove horizontal icon (easier to re-draw)
    icon.remove();

    // redraw icon in vertical orientation
    const measureIconColor = (annotationType === 'spacing' ? COLORS.spacing : COLORS.dimension);
    const iconNew = buildMeasureIcon(group, measureIconColor, 'vertical');

    // resize icon based on gap/layer height
    iconNew.frame.height = layerHeight;

    // position icon on `y`
    if (iconOffsetY !== null) {
      if (iconOffsetY > 0) {
        // move the icon back to the top of the artboard
        iconNew.frame.y -= getPositionOnArtboard(iconNew.sketchObject).y;
      } else {
        iconNew.frame.y = (rectangle.frame.height - layerHeight) / 2;
      }
    } else {
      iconNew.frame.y = group.frame.height - iconNew.frame.height;
    }

    // position icon on `x` based on orientation
    if (orientation === 'right') {
      iconNew.frame.x = rectangle.frame.x - 10;
    } else {
      iconNew.frame.x = rectangle.frame.x + rectangle.frame.width + 4;
    }

    iconNew.adjustToFit();
  }

  group.adjustToFit();
  containerGroup.adjustToFit();
  containerGroup.parent.adjustToFit();
  return group;
};

/**
 * @description Takes a string representing the type of element getting painted and
 * returns the name of the group used for that element.
 *
 * @kind function
 * @name setGroupName
 * @param {string} elementType A string representing the type of element getting painted.
 *
 * @returns {string} The name of the group getting painted.
 * @private
 */
const setGroupName = (elementType) => {
  let groupName = null;
  switch (elementType) {
    case 'boundingBox':
      groupName = 'Bounding Boxes';
      break;
    case 'component':
    case 'custom':
      groupName = 'Component Annotations';
      break;
    case 'dimension':
      groupName = 'Dimension Annotations';
      break;
    case 'spacing':
      groupName = 'Spacing Annotations';
      break;
    case 'style':
      groupName = 'Foundation Annotations';
      break;
    default:
      groupName = 'Component Annotations';
  }
  return groupName;
};

/**
 * @description Takes a string representing the type of element getting painted and
 * returns the key used in document settings to represent data linked to the element.
 *
 * @kind function
 * @name setGroupKey
 * @param {string} elementType A string representing the type of element getting painted.
 *
 * @returns {string} The key representing the type of element getting painted.
 * @private
 */
const setGroupKey = (elementType) => {
  let groupKey = null;
  switch (elementType) {
    case 'boundingBox':
      groupKey = 'boundingInnerGroupId';
      break;
    case 'component':
    case 'custom':
      groupKey = 'componentInnerGroupId';
      break;
    case 'dimension':
      groupKey = 'dimensionInnerGroupId';
      break;
    case 'spacing':
      groupKey = 'spacingInnerGroupId';
      break;
    case 'style':
      groupKey = 'styleInnerGroupId';
      break;
    default:
      groupKey = 'componentInnerGroupId';
  }
  return groupKey;
};

/**
 * @description Determines the spacing value (`IS-X`) based on length and returns
 * the appropriate spacing annotation text.
 *
 * @kind function
 * @name retrieveSpacingValue
 * @param {number} length A number representing length.
 * @returns {string} A text label based on the spacing value.
 * @private
 */
const retrieveSpacingValue = (length) => {
  let itemSpacingValue = null;

  // IS-X spacing is not an even scale
  // set some breakpoints and “round” `length` to the nearest proper IS-X number
  // ignore anything so large that it’s above `IS-9`
  switch (true) {
    case (length >= 128): // based on 160 – IS-10 (not actually specc'd in Art Deco)
      return itemSpacingValue;
    case (length >= 80): // 96 – IS-9
      itemSpacingValue = 9;
      break;
    case (length >= 56): // 64 – IS-8
      itemSpacingValue = 8;
      break;
    case (length >= 40): // 48 – IS-7
      itemSpacingValue = 7;
      break;
    case (length >= 28): // 32 – IS-6
      itemSpacingValue = 6;
      break;
    case (length >= 20): // 24 – IS-5
      itemSpacingValue = 5;
      break;
    case (length >= 16): // 16 – IS-4
      itemSpacingValue = 4;
      break;
    default:
      itemSpacingValue = Math.round(length / 4);
  }

  return itemSpacingValue;
};

/**
 * @description Resets the layer order for the Component, Foundation, and Bounding Box layers
 * within the outer container group layer.
 *
 * @kind function
 * @name orderContainerLayers
 * @param {string} outerGroupId String ID for finding the outer container group.
 * @param {Object} document The document containing the outer container group.
 *
 * @private
 */
const orderContainerLayers = (outerGroupId, document) => {
  const documentSettings = Settings.documentSettingForKey(document, PLUGIN_IDENTIFIER);
  let boundingGroupId = null;
  let componentGroupId = null;
  let dimensionGroupId = null;
  let spacingGroupId = null;

  // find the correct group set and inner groups based on the `outerGroupId`
  documentSettings.containerGroups.forEach((groupSet) => {
    if (groupSet.id === outerGroupId) {
      componentGroupId = groupSet.componentInnerGroupId;
      dimensionGroupId = groupSet.dimensionInnerGroupId;
      spacingGroupId = groupSet.spacingInnerGroupId;
      boundingGroupId = groupSet.boundingInnerGroupId;
    }
    return null;
  });

  // always move component group to top of list
  const componentGroup = document.getLayerWithID(componentGroupId);
  if (componentGroup) {
    fromNative(componentGroup).moveToFront();
  }

  // foundations group remains second from top without moving

  // always move spacing annotations group to third from bottom of list
  const spacingBoxGroup = document.getLayerWithID(spacingGroupId);
  if (spacingBoxGroup) {
    fromNative(spacingBoxGroup).moveToBack();
  }

  // always move dimension annotations group to second from bottom of list
  const dimensionBoxGroup = document.getLayerWithID(dimensionGroupId);
  if (dimensionBoxGroup) {
    fromNative(dimensionBoxGroup).moveToBack();
  }

  // always move bounding box group to bottom of list
  const boundingBoxGroup = document.getLayerWithID(boundingGroupId);
  if (boundingBoxGroup) {
    fromNative(boundingBoxGroup).moveToBack();
  }

  return null;
};

/**
 * @description Sets up the individual elements for a container group (inner or outer).
 *
 * @kind function
 * @name drawContainerGroup
 * @param {Object} groupSettings Object containing the `name`, `width`,
 * `height`, and `parent` layer.
 * @returns {Object} The container group layer object.
 * @private
 */
const drawContainerGroup = (groupSettings) => {
  const {
    name,
    width,
    height,
    parent,
    locked,
  } = groupSettings;

  const containerGroup = new Group({
    frame: {
      x: 0,
      y: 0,
      width,
      height,
    },
    locked,
    name,
    parent,
  });

  return containerGroup;
};

/**
 * @description Builds the inner container group that holds annotations of a certain
 * `annotationType` and makes updates to the accompanying parent container group
 * settings object.
 *
 * @kind function
 * @name createInnerGroup
 * @param {Object} outerGroupLayer The layer to draw within.
 * @param {Object} containerSet An instance of the parent container group’s settings object.
 * @param {string} elementType A string representing the type of element going inside the continer.
 * @returns {Object} The inner container group layer object and the accompanying
 * updated parent container group settings object.
 * @private
 */
export const createInnerGroup = (
  outerGroupLayer,
  containerSet,
  elementType,
) => {
  const groupName = setGroupName(elementType);
  const groupKey = setGroupKey(elementType);

  // set up new container group layer on the artboard
  const newInnerGroup = drawContainerGroup({
    name: groupName,
    parent: outerGroupLayer,
    width: outerGroupLayer.frame.width,
    height: outerGroupLayer.frame.height,
    locked: false,
  });

  // update the `containerSet` object
  const updatedContainerSet = containerSet;
  updatedContainerSet[groupKey] = newInnerGroup.id;

  return {
    newInnerGroup,
    updatedContainerSet,
  };
};

/**
 * @description Builds the parent container group that holds all of the annotations and makes
 * updates to the accompanying document settings object.
 *
 * @kind function
 * @name createOuterGroup
 * @param {Object} artboard The artboard to draw within.
 * @param {Object} documentSettings An instance of the document’s settings object.
 * @param {string} elementType A string representing the type of element going inside the continer.
 * @returns {Object} The container group layer object and the accompanying
 * updated document settings object.
 * @private
 */
const createOuterGroup = (
  artboard,
  documentSettings,
  elementType,
) => {
  const artboardId = fromNative(artboard).id;
  // set up new container group layer on the artboard
  const newOuterGroup = drawContainerGroup({
    name: `+++ ${PLUGIN_NAME} +++`,
    parent: artboard,
    width: artboard.frame().width(),
    height: artboard.frame().height(),
    locked: true,
  });

  // new object with IDs to add to settings
  const newOuterGroupSet = {
    artboardId,
    id: newOuterGroup.id,
  };

  const cigResult = createInnerGroup(
    newOuterGroup,
    newOuterGroupSet,
    elementType,
  );

  // update the `documentSettings` array
  const newDocumentSettings = updateArray(
    'containerGroups',
    cigResult.updatedContainerSet,
    documentSettings,
    'add',
  );

  return {
    newOuterGroup,
    newInnerGroup: cigResult.newInnerGroup,
    newDocumentSettings,
  };
};

/**
 * @description Sets (finds or builds) the parent container group and
 * updates the document settings (if a new container group has been created).
 *
 * @kind function
 * @name setContainerGroups
 * @param {Object} artboard The artboard to draw within.
 * @param {Object} document The document to draw within.
 * @param {string} elementType A string representing the type of annotation to draw.
 * @returns {Object} The container group layer.
 * @private
 */
const setContainerGroups = (artboard, document, elementType) => {
  const groupKey = setGroupKey(elementType);
  const documentSettings = Settings.documentSettingForKey(document, PLUGIN_IDENTIFIER);
  const artboardId = fromNative(artboard).id;
  let outerGroup = null;
  let outerGroupId = null;
  let outerGroupSet = null;
  let innerGroup = null;
  let innerGroupId = null;

  // find the existing `outerGroup` (if it exists)
  if (documentSettings && documentSettings.containerGroups) {
    documentSettings.containerGroups.forEach((outerGroupLookupPair) => {
      if (outerGroupLookupPair.artboardId === artboardId) {
        outerGroupId = outerGroupLookupPair.id;
        outerGroupSet = outerGroupLookupPair;
        innerGroupId = outerGroupLookupPair[groupKey];
      }
      return null;
    });
    outerGroup = document.getLayerWithID(outerGroupId);
    innerGroup = document.getLayerWithID(innerGroupId);
  }

  // create a new `outerGroup` if one does not exist (or it cannot be found)
  if (!outerGroup || !innerGroup) {
    let newDocumentSettings = {};
    if (documentSettings) {
      newDocumentSettings = documentSettings;
    }

    // remove the existing lookup pair so it does not conflict with the new one
    if (outerGroupId) {
      newDocumentSettings = updateArray(
        'containerGroups',
        { id: outerGroupId },
        newDocumentSettings,
        'remove',
      );
    }

    // if the entire `outerGroup` is missing, add a new one
    if (!outerGroup) {
      // create the new `outerGroup` layer, inner layer and
      // update the settings array to include them
      const cogResult = createOuterGroup(artboard, newDocumentSettings, elementType);
      outerGroup = cogResult.newOuterGroup;
      innerGroup = cogResult.newInnerGroup;
      newDocumentSettings = cogResult.newDocumentSettings; // eslint-disable-line prefer-destructuring, max-len
    } else {
      // if only the `innerGroup` for this `elementType` is missing, add it
      const cigResult = createInnerGroup(
        outerGroup,
        outerGroupSet,
        elementType,
      );

      innerGroup = cigResult.newInnerGroup;

      // update the `newDocumentSettings` array
      newDocumentSettings = updateArray(
        'containerGroups',
        cigResult.updatedContainerSet,
        newDocumentSettings,
        'add',
      );
    }

    // commit the `Settings` update
    Settings.setDocumentSettingForKey(
      document,
      PLUGIN_IDENTIFIER,
      newDocumentSettings,
    );
  }

  // move the outer container layer to the front
  fromNative(outerGroup).moveToFront();

  // set the order of the inner container layers
  orderContainerLayers(outerGroup.id, document);

  return {
    containerGroup: outerGroup,
    innerContainerGroup: innerGroup,
  };
};

// --- main Painter class function
/**
 * @description A class to add elements to the Sketch file.
 *
 * @class
 * @name Painter
 *
 * @constructor
 *
 * @property layer The layer in the Sketch file that we want to annotate or modify.
 */
export default class Painter {
  constructor({ for: layer, in: document }) {
    this.layer = layer;
    this.document = document;
    this.artboard = this.layer.parentArtboard();
  }

  /**
   * @description Takes the data representing an existing annotation, removes that annotation,
   * and cleans up the data.
   *
   * @kind function
   * @name removeAnnotation
   *
   * @param {Object} existingItemData The data object containing a
   * `containerGroupId`, `id` (representting the annotation) and `layerId` representing
   * the original layer that received the annotation.
   */
  removeAnnotation(existingItemData) {
    const layerToDelete = this.document.getLayerWithID(existingItemData.id);
    if (layerToDelete) {
      fromNative(layerToDelete).remove(); // .remove() only works on a js object, not obj-c
    }
  }

  /**
   * @description Locates annotation text in a layer’s Settings object and
   * builds the visual annotation on the Sketch artboard.
   *
   * @kind function
   * @name addAnnotation
   * @returns {Object} A result object container success/error status and log/toast messages.
   */
  addAnnotation() {
    const result = {
      status: null,
      messages: {
        alert: null,
        toast: null,
        log: null,
      },
    };
    const layerSettings = Settings.layerSettingForKey(this.layer, PLUGIN_IDENTIFIER);

    if (!layerSettings || (layerSettings && !layerSettings.annotationText)) {
      result.status = 'error';
      result.messages.log = 'Layer missing annotationText';
      return result;
    }

    // return an error if the selection is not placed on an artboard
    if (!this.artboard) {
      result.status = 'error';
      result.messages.log = 'Selection not on artboard';
      result.messages.alert = 'Your selection needs to be on an artboard';
      return result;
    }

    // set up some information
    const {
      annotationText,
      annotationSecondaryText,
      annotationType,
    } = layerSettings;
    const layerName = this.layer.name();
    const layerId = fromNative(this.layer).id;
    const groupName = `Annotation for ${layerName}`;

    // create or locate the container group
    const { containerGroup, innerContainerGroup } = setContainerGroups(
      this.artboard,
      this.document,
      annotationType,
    );

    // retrieve document settings
    const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);
    let newDocumentSettings = documentSettings;

    // check if we have already annotated this element and remove the old annotation
    if (documentSettings && documentSettings.annotatedLayers) {
      // remove the old ID pair(s) from the `newDocumentSettings` array
      documentSettings.annotatedLayers.forEach((layerSet) => {
        if (layerSet.originalId === layerId) {
          this.removeAnnotation(layerSet);

          // remove the layerSet from the `newDocumentSettings` array
          newDocumentSettings = updateArray(
            'annotatedLayers',
            { id: layerSet.id },
            newDocumentSettings,
            'remove',
          );
        }
      });
    }

    // construct the base annotation elements
    const annotation = buildAnnotation(
      annotationText,
      annotationSecondaryText,
      annotationType,
      this.artboard,
    );

    // group and position the base annotation elements
    const layerCoordinates = getPositionOnArtboard(this.layer);
    const layerFrame = {
      artboardWidth: this.artboard.frame().width(),
      artboardHeight: this.artboard.frame().height(),
      width: this.layer.frame().width(),
      height: this.layer.frame().height(),
      x: layerCoordinates.x,
      y: layerCoordinates.y,
      index: fromNative(this.layer).index,
    };
    const group = positionAnnotation(
      innerContainerGroup,
      groupName,
      annotation,
      layerFrame,
    );

    // new object with IDs to add to settings
    const newAnnotatedLayerSet = {
      containerGroupId: fromNative(containerGroup).id,
      id: group.id,
      originalId: layerId,
    };

    // update the `newDocumentSettings` array
    newDocumentSettings = updateArray(
      'annotatedLayers',
      newAnnotatedLayerSet,
      newDocumentSettings,
      'add',
    );

    // commit the `Settings` update
    Settings.setDocumentSettingForKey(
      this.document,
      PLUGIN_IDENTIFIER,
      newDocumentSettings,
    );

    // return a successful result
    result.status = 'success';
    return result;
  }

  /**
   * @description Adds a semi-transparent rectangle to a specific artboard based on the parameters
   * received in the `frame` object.
   *
   * @kind function
   * @name addBoundingBox
   * @param {Object} frame The frame coordinates (`x`, `y`, `width`, and `height`) for the box.
   * @returns {Object} A result object container success/error status and log/toast messages.
   */
  addBoundingBox(frame) {
    const result = {
      status: null,
      messages: {
        toast: null,
        log: null,
      },
    };

    // create or locate the container group
    const { containerGroup, innerContainerGroup } = setContainerGroups(
      this.artboard,
      this.document,
      'boundingBox',
    );

    // draw the bounding box
    const boundingBox = buildBoundingBox(frame, innerContainerGroup);

    if (!boundingBox) {
      result.status = 'error';
      result.messages.log = 'Failed to draw the bounding box for a selection';
      result.messages.toast = 'Hmm… an error occured drawing that bounding box 😬';

      return result;
    }

    innerContainerGroup.adjustToFit();
    containerGroup.adjustToFit();

    result.status = 'success';
    result.messages.log = `Bounding box drawn on “${this.artboard.name()}”`;
    return result;
  }

  /**
   * @description Takes a layer and creates two dimension annotations with the layer’s
   * `height` and `width`.
   *
   * @kind function
   * @name addDimMeasurement
   *
   * @returns {Object} A result object container success/error status and log/toast messages.
   */
  addDimMeasurement() {
    const result = {
      status: null,
      messages: {
        alert: null,
        toast: null,
        log: null,
      },
    };

    // return an error if the selection is not placed on an artboard
    if (!this.artboard) {
      result.status = 'error';
      result.messages.log = 'Selection not on artboard';
      result.messages.alert = 'Your selection needs to be on an artboard';
      return result;
    }

    // set up some information
    const annotationType = 'dimension';
    const layerId = fromNative(this.layer).id;
    const layerName = this.layer.name();

    // create or locate the container group
    const { containerGroup, innerContainerGroup } = setContainerGroups(
      this.artboard,
      this.document,
      annotationType,
    );

    // retrieve document settings
    const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);
    let newDocumentSettings = documentSettings;

    // check if we have already annotated this element and remove the old annotation
    if (documentSettings && documentSettings.annotatedDimensions) {
      // remove the old ID pair(s) from the `newDocumentSettings` array
      documentSettings.annotatedDimensions.forEach((layerSet) => {
        if (layerSet.originalId === layerId) {
          this.removeAnnotation(layerSet);

          // remove the layerSet from the `newDocumentSettings` array
          newDocumentSettings = updateArray(
            'annotatedDimensions',
            { id: layerSet.id },
            newDocumentSettings,
            'remove',
          );
        }
      });
    }

    // group and position the annotation elements
    const layerCoordinates = getPositionOnArtboard(this.layer);
    const layerFrame = {
      artboardWidth: this.artboard.frame().width(),
      artboardHeight: this.artboard.frame().height(),
      width: this.layer.frame().width(),
      height: this.layer.frame().height(),
      x: layerCoordinates.x,
      y: layerCoordinates.y,
      index: fromNative(this.layer).index,
    };

    // ------------------------
    // construct the width annotation elements
    const annotationTextWidth = `${this.layer.frame().width()}dp`;
    const groupNameWidth = `Dimension Width for layer ${layerName}`;
    const annotationWidth = buildAnnotation(
      annotationTextWidth,
      null, // annotationSecondaryText
      annotationType,
      this.artboard,
    );

    const annotationOrientation = 'top';
    const group = positionAnnotation(
      innerContainerGroup,
      groupNameWidth,
      annotationWidth,
      layerFrame,
      annotationType,
      annotationOrientation,
    );

    // new object with IDs to add to settings
    const newAnnotatedDimensionSetWidth = {
      containerGroupId: fromNative(containerGroup).id,
      id: group.id,
      originalId: layerId,
    };

    // update the `newDocumentSettings` array
    newDocumentSettings = updateArray(
      'annotatedDimensions',
      newAnnotatedDimensionSetWidth,
      newDocumentSettings,
      'add',
    );

    // ------------------------
    // construct the height annotation elements
    const annotationTextHeight = `${this.layer.frame().height()}dp`;
    const groupNameHeight = `Dimension Height for layer ${layerName}`;
    const annotationHeight = buildAnnotation(
      annotationTextHeight,
      null, // annotationSecondaryText
      annotationType,
      this.artboard,
    );

    const annotationOrientationHeight = 'right';
    const groupHeight = positionAnnotation(
      innerContainerGroup,
      groupNameHeight,
      annotationHeight,
      layerFrame,
      annotationType,
      annotationOrientationHeight,
    );

    // new object with IDs to add to settings
    const newAnnotatedDimensionSetHeight = {
      containerGroupId: fromNative(containerGroup).id,
      id: groupHeight.id,
      originalId: layerId,
    };

    // update the `newDocumentSettings` array
    newDocumentSettings = updateArray(
      'annotatedDimensions',
      newAnnotatedDimensionSetHeight,
      newDocumentSettings,
      'add',
    );

    // ------------------------

    // commit the `Settings` update
    Settings.setDocumentSettingForKey(
      this.document,
      PLUGIN_IDENTIFIER,
      newDocumentSettings,
    );

    // return a successful result
    result.status = 'success';
    result.messages.log = `Dimensions annotated for “${this.layer.name()}”`;
    return result;
  }

  /**
   * @description Takes a `spacingFrame` object and creates a spacing measurement annotation
   * with the correct spacing number (“IS-X”). If the calculated spacing number is larger
   * than “IS-9”, the annotation is not created.
   *
   * @kind function
   * @name addSpacingAnnotation
   * @param {Object} spacingFrame The `x`, `y` coordinates, `width`, `height`, and `orientation`
   * of an entire selection. It should also includes layer IDs (`layerAId` and `layerBId`)
   * for the two layers used to calculated the gap.
   *
   * @returns {null}
   */
  addSpacingAnnotation(spacingFrame) {
    // set up some information
    const measurementToUse = spacingFrame.orientation === 'vertical' ? spacingFrame.width : spacingFrame.height;
    const spacingValue = retrieveSpacingValue(measurementToUse);

    // if there is no `spacingValue`, the measurement is above an `IS-9` and
    // isn’t considered valid
    if (!spacingValue) {
      return null;
    }

    const annotationText = `IS-${spacingValue}`;
    const annotationType = 'spacing';
    const layerName = this.layer.name();
    const groupName = `Spacing for ${layerName} (${spacingFrame.direction})`;

    // create or locate the container group
    const { containerGroup, innerContainerGroup } = setContainerGroups(
      this.artboard,
      this.document,
      annotationType,
    );

    // retrieve document settings
    const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);
    let newDocumentSettings = documentSettings;

    // check if we have already annotated this element and remove the old annotation
    if (documentSettings && documentSettings.annotatedSpacings) {
      // remove the old ID pair(s) from the `newDocumentSettings` array
      documentSettings.annotatedSpacings.forEach((layerSet) => {
        if (
          layerSet.layerAId === spacingFrame.layerAId
          && layerSet.layerBId === spacingFrame.layerBId
          && layerSet.direction === spacingFrame.direction
        ) {
          this.removeAnnotation(layerSet);

          // remove the layerSet from the `newDocumentSettings` array
          newDocumentSettings = updateArray(
            'annotatedSpacings',
            { id: layerSet.id },
            newDocumentSettings,
            'remove',
          );
        }
      });
    }

    // construct the base annotation elements
    const annotation = buildAnnotation(
      annotationText,
      null, // annotationSecondaryText
      annotationType,
      this.artboard,
    );

    // group and position the base annotation elements
    const layerFrame = {
      artboardWidth: this.artboard.frame().width(),
      artboardHeight: this.artboard.frame().height(),
      width: spacingFrame.width,
      height: spacingFrame.height,
      x: spacingFrame.x,
      y: spacingFrame.y,
      index: fromNative(this.layer).index,
    };

    const annotationOrientation = (spacingFrame.orientation === 'vertical' ? 'top' : 'left');
    const group = positionAnnotation(
      innerContainerGroup,
      groupName,
      annotation,
      layerFrame,
      annotationType,
      annotationOrientation,
    );

    // new object with IDs to add to settings
    const newAnnotatedSpacingSet = {
      containerGroupId: fromNative(containerGroup).id,
      id: group.id,
      layerAId: spacingFrame.layerAId,
      layerBId: spacingFrame.layerBId,
      direction: spacingFrame.direction,
    };

    // update the `newDocumentSettings` array
    newDocumentSettings = updateArray(
      'annotatedSpacings',
      newAnnotatedSpacingSet,
      newDocumentSettings,
      'add',
    );

    // commit the `Settings` update
    Settings.setDocumentSettingForKey(
      this.document,
      PLUGIN_IDENTIFIER,
      newDocumentSettings,
    );

    return null;
  }

  /**
   * @description Takes a `spacingFrame` object from Crawler and creates a spacing measurement
   * annotation with the correct spacing number (“IS-X”).
   *
   * @kind function
   * @name addGapMeasurement
   * @param {Object} spacingFrame The `x`, `y` coordinates, `width`, `height`, and `orientation`
   * of an entire selection. It should also includes layer IDs (`layerAId` and `layerBId`)
   * for the two layers used to calculated the gap.
   *
   * @returns {Object} A result object container success/error status and log/toast messages.
   */
  addGapMeasurement(spacingFrame) {
    const result = {
      status: null,
      messages: {
        alert: null,
        toast: null,
        log: null,
      },
    };

    // return an error if the selection is not placed on an artboard
    if (!this.artboard) {
      result.status = 'error';
      result.messages.log = 'Selection not on artboard';
      result.messages.alert = 'Your selection needs to be on an artboard';
      return result;
    }

    // return an error if the selection is not placed on an artboard
    if (!spacingFrame) {
      result.status = 'error';
      result.messages.log = 'spacingFrame is missing';
      result.messages.alert = 'Could not find a gap in your selection';
      return result;
    }

    // set direction (type)
    spacingFrame.direction = 'gap'; // eslint-disable-line no-param-reassign

    // add the annotation
    this.addSpacingAnnotation(spacingFrame);

    // return a successful result
    result.status = 'success';
    result.messages.log = `Spacing annotated for “${this.layer.name()}”`;
    return result;
  }

  /**
   * @description Takes a `overlapFrames` object from Crawler and creates spacing measurement
   * annotations with the correct spacing number (“IS-X”) in the selected directions (top, bottom,
   * right, and left). The default is all four directions.
   *
   * @kind function
   * @name addOverlapMeasurements
   * @param {Object} overlapFrames The `top`, `bottom`, `right`, and `left` frames. Each frame
   * contains `x`, `y` coordinates, `width`, `height`, and `orientation`. The object also includes
   * layer IDs (`layerAId` and `layerBId`) for the two layers used to calculated the
   * overlapped areas.
   * @param {array} directions An optional array containing 4 unique strings representating
   * the annotation directions: `top`, `bottom`, `right`, `left`.
   *
   * @returns {Object} A result object container success/error status and log/toast messages.
   */
  addOverlapMeasurements(
    overlapFrames,
    directions = ['top', 'bottom', 'right', 'left'],
  ) {
    const result = {
      status: null,
      messages: {
        alert: null,
        toast: null,
        log: null,
      },
    };

    // return an error if the selection is not placed on an artboard
    if (!this.artboard) {
      result.status = 'error';
      result.messages.log = 'Selection not on artboard';
      result.messages.alert = 'Your selection needs to be on an artboard';
      return result;
    }

    // return an error if the selection is not placed on an artboard
    if (!overlapFrames) {
      result.status = 'error';
      result.messages.log = 'overlapFrames is missing';
      result.messages.alert = 'Could not find a overlapped layers in your selection';
      return result;
    }

    directions.forEach((direction) => {
      // do not annotate if the results are negative, or less than a single
      // IS-X spacing unit
      if (overlapFrames[direction].width <= 2 || overlapFrames[direction].height <= 2) {
        return null;
      }

      // otherwise, set up the frame we can use for the annotation
      let frameX = overlapFrames[direction].x + (overlapFrames[direction].width / 2);
      let frameY = overlapFrames[direction].y;

      if ((direction === 'left') || (direction === 'right')) {
        frameY = overlapFrames[direction].y + (overlapFrames[direction].height / 2);
        frameX = overlapFrames[direction].x;
      }

      const spacingFrame = {
        x: frameX,
        y: frameY,
        width: overlapFrames[direction].width,
        height: overlapFrames[direction].height,
        orientation: overlapFrames[direction].orientation,
        layerAId: overlapFrames.layerAId,
        layerBId: overlapFrames.layerBId,
        direction,
      };

      return this.addSpacingAnnotation(spacingFrame);
    });

    // return a successful result
    result.status = 'success';
    result.messages.log = `Spacing (${directions.join(', ')}) annotated for “${this.layer.name()}”`;
    return result;
  }
}
