import { fromNative, Settings } from 'sketch';
import {
  Group,
  Rectangle,
  ShapePath,
  Text,
} from 'sketch/dom';
import { updateArray } from './Tools';
import {
  INITIAL_RESULT_STATE,
  PLUGIN_IDENTIFIER,
  PLUGIN_NAME,
} from './constants';

// --- private functions for drawing/positioning annotation elements in the Sketch file
/**
 * @description Builds the initial annotation elements in Sketch (diamond, rectangle, text).
 *
 * @kind function
 * @name buildAnnotationElements
 * @param {Object} annotationText The text for the annotation.
 * @param {string} annotationType A string representing the type of annotation
 * (component or foundation).
 * @param {Object} artboard The artboard to draw within.
 * @returns {Object} Each annotation element (`diamond`, `rectangle`, `text`).
 * @private
 */
const buildAnnotationElements = (annotationText, annotationType = 'component', artboard) => {
  let colorHex = '#027aff';
  if (annotationType === 'style') {
    colorHex = '#f5a623';
  }
  // build the text box
  const text = new Text({
    frame: {
      x: 16,
      y: 3,
    },
    parent: artboard,
    text: annotationText,
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
  // need to fire `adjustToFit` after creating the text for it to be effective
  text.adjustToFit();

  // build the rounded rectangle
  const rectangle = new ShapePath({
    frame: new Rectangle(0, 0, 200, 30),
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
  const diamond = new ShapePath({
    frame: new Rectangle(0, 27, 6, 6),
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
  const rectangleWidth = textWidth + 32;
  rectangle.frame.width = rectangleWidth;

  // move the diamond to the mid-point of the rectangle
  const diamondMidX = ((rectangleWidth - 8) / 2);
  diamond.frame.x = diamondMidX;

  // set z-axis placement of all elements
  rectangle.moveToFront();
  text.index = rectangle.index + 1;
  diamond.index = rectangle.index - 1;

  // return an object with each element
  return {
    diamond,
    rectangle,
    text,
  };
};

/**
 * @description Takes the individual annotation elements, the specs for the layer receiving the
 * annotation, and adds the annotation to the container group in the proper position.
 *
 * @kind function
 * @name positionAnnotationElements
 * @param {Object} containerGroup The group layer that holds all annotations.
 * @param {string} groupName The name of the group that holds the annotation elements
 * inside the `containerGroup`.
 * @param {Object} annotationElements Each annotation element (`diamond`, `rectangle`, `text`).
 * @param {Object} layerFrame The frame specifications (`width`, `height`, `x`, `y`, `index`)
 * for the layer receiving the annotation + the artboard width (`artboardWidth`).
 * @returns {Object} The final annotation as a layer group.
 * @private
 */
const positionAnnotationElements = (
  containerGroup,
  groupName,
  annotationElements,
  layerFrame,
) => {
  const {
    diamond,
    rectangle,
    text,
  } = annotationElements;

  const { artboardWidth } = layerFrame;
  const layerWidth = layerFrame.width;
  const layerX = layerFrame.x;
  const layerY = layerFrame.y;
  const originalLayerIndex = layerFrame.index;

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

  // position the group within the artboard, above the layer receiving the annotation
  let diamondAdjustment = null;

  // move group to z-index right above layer to annotate
  group.index = originalLayerIndex + 1;

  // initial placement based on layer to annotate
  let placementX = (
    layerX + (
      (layerWidth - group.frame.width) / 2
    )
  );
  let placementY = layerY - 38;

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

  // set annotation group placement
  group.frame.x = placementX;
  group.frame.y = placementY;

  // adjust diamond, if necessary
  if (diamondAdjustment) {
    // move the diamond to the mid-point of the layer to annotate
    let diamondLayerMidX = null;
    switch (diamondAdjustment) {
      case 'left':
        diamondLayerMidX = ((layerX + layerWidth - 8) / 2);
        break;
      case 'right':
        diamondLayerMidX = ((layerX - group.frame.x) + ((layerWidth - 8) / 2));
        break;
      default:
        diamondLayerMidX = 0;
    }
    diamond.frame.x = diamondLayerMidX;
  }

  return group;
};

/**
 * @description Sets up the individual elements for a container group (inner or outer).
 *
 * @kind function
 * @name drawContainerGroupElements
 * @param {Object} groupSettings Object containing the `name`, `width`, `height`, `parent` layer,
 * and a `bool` named `keystone` indicating whether or not a keystone layer should be inserted.
 * @returns {Object} The container group layer object.
 * @private
 */
const drawContainerGroupElements = (groupSettings) => {
  const {
    name,
    width,
    height,
    parent,
    keystone,
  } = groupSettings;

  const containerGroup = new Group({
    frame: {
      x: 0,
      y: 0,
      width,
      height,
    },
    locked: true,
    name,
    parent,
  });

  if (keystone) {
    // add placeholder rectangle to keep everything relative to 0, 0 on the artboard
    new ShapePath({ // eslint-disable-line no-new
      frame: new Rectangle(0, 0, 1, 1),
      locked: true,
      name: '--- keystone - please DO NOT delete me 🤗',
      parent: containerGroup,
    });
  }

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
 * @returns {Object} The inner container group layer object and the accompanying
 * updated parent container group settings object.
 * @private
 */
const createInnerGroup = (
  outerGroupLayer,
  containerSet,
  annotationType,
) => {
  // const containerId = fromNative(outerGroupLayer).id;
  const groupName = (annotationType === 'style') ? 'Foundation Annotations' : 'Component Annotations';
  const groupKey = (annotationType === 'style') ? 'styleInnerGroupId' : 'componentInnerGroupId';

  // set up new container group layer on the artboard
  const newInnerGroup = drawContainerGroupElements({
    name: groupName,
    parent: outerGroupLayer,
    width: outerGroupLayer.frame.width,
    height: outerGroupLayer.frame.height,
    keystone: true,
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
 * @returns {Object} The container group layer object and the accompanying
 * updated document settings object.
 * @private
 */
const createOuterGroup = (
  artboard,
  documentSettings,
  annotationType,
) => {
  const artboardId = fromNative(artboard).id;
  // set up new container group layer on the artboard
  const newOuterGroup = drawContainerGroupElements({
    name: `+++ ${PLUGIN_NAME} Annotations +++`,
    parent: artboard,
    width: artboard.frame().width(),
    height: artboard.frame().height(),
    keystone: false,
  });

  // new object with IDs to add to settings
  const newOuterGroupSet = {
    artboardId,
    id: newOuterGroup.id,
  };

  const cigResult = createInnerGroup(
    newOuterGroup,
    newOuterGroupSet,
    annotationType,
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
 * @returns {Object} The container group layer.
 * @private
 */
const setContainerGroups = (artboard, document, annotationType) => {
  const groupKey = (annotationType === 'style') ? 'styleInnerGroupId' : 'componentInnerGroupId';
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
      const cogResult = createOuterGroup(artboard, newDocumentSettings, annotationType);
      outerGroup = cogResult.newOuterGroup;
      innerGroup = cogResult.newInnerGroup;
      newDocumentSettings = cogResult.newDocumentSettings; // eslint-disable-line prefer-destructuring, max-len
    } else {
      // if only the `innerGroup` for this `annotationType` is missing, add it
      const cigResult = createInnerGroup(
        outerGroup,
        outerGroupSet,
        annotationType,
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

  // move the group layer to the front
  fromNative(outerGroup).moveToFront();

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
   * @description Takes the data representing an existing annotation and removes that data
   * (and cleans up the data).
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
    const result = INITIAL_RESULT_STATE;
    const layerSettings = Settings.layerSettingForKey(this.layer, PLUGIN_IDENTIFIER);

    if (!layerSettings || (layerSettings && !layerSettings.annotationText)) {
      result.status = 'true';
      result.messages.log = 'Layer missing annotationText';
      return result;
    }

    // return an error if the selection is not placed on an artboard
    if (!this.artboard) {
      result.status = 'error';
      result.messages.log = 'Selection not on artboard';
      result.messages.toast = 'Your selection needs to be on an artboard';
      return result;
    }

    // set up some information
    const { annotationText, annotationType } = layerSettings;
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

          // remove the ID that cannot be found from the `newDocumentSettings` array
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
    const annotationElements = buildAnnotationElements(
      annotationText,
      annotationType,
      this.artboard,
    );

    // group and position the base annotation elements
    const layerFrame = {
      artboardWidth: this.artboard.frame().width(),
      width: this.layer.frame().width(),
      height: this.layer.frame().height(),
      x: this.layer.frame().x(),
      y: this.layer.frame().y(),
      index: fromNative(this.layer).index,
    };
    const group = positionAnnotationElements(
      innerContainerGroup,
      groupName,
      annotationElements,
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
}
