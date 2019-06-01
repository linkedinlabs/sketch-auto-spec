import { fromNative, Settings } from 'sketch';
import {
  Group,
  Rectangle,
  ShapePath,
  Text,
} from 'sketch/dom';
import { findLayerById } from './Tools';
import { PLUGIN_IDENTIFIER } from './constants';

// --- settings/state management
// good candidate to move this to its own class once it gets re-used
const initialSettingsState = {
  containerGroups: [],
  labeledLayers: [],
};

const initialResultState = {
  success: false,
  error: false,
  messages: {
    toast: null,
    log: null,
  },
};

const updateSettings = (key, data, action = 'add') => {
  let settings = Settings.settingForKey(PLUGIN_IDENTIFIER);

  if (!settings) {
    settings = initialSettingsState;
  }

  if (action === 'add') {
    if (!settings[key]) {
      settings[key] = [];
    }

    settings[key].push(data);
  }

  if (action === 'remove') {
    let updatedItems = null;
    // find the items array index of the item to remove
    const itemIndex = settings[key].findIndex(foundItem => (foundItem.id === data.id));

    updatedItems = [
      ...settings[key].slice(0, itemIndex),
      ...settings[key].slice(itemIndex + 1),
    ];

    settings[key] = updatedItems;
  }

  Settings.setSettingForKey(PLUGIN_IDENTIFIER, settings);
  return settings;
};

// --- private functions for drawing/positioning label elements in the Sketch file
const buildLabelElements = (artboard, layerLabel) => {
  // build the text box
  const text = new Text({
    frame: {
      x: 16,
      y: 3,
    },
    parent: artboard,
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
    parent: artboard,
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
    parent: artboard,
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

  return {
    diamond,
    rectangle,
    text,
  };
};

const positionLabelElements = (containerGroup, groupName, labelElements, layerFrame) => {
  const {
    diamond,
    rectangle,
    text,
  } = labelElements;

  const { artboardWidth } = layerFrame;
  const layerWidth = layerFrame.width;
  const layerX = layerFrame.x;
  const layerY = layerFrame.y;
  const originalLayerIndex = layerFrame.index;

  // create the label group
  const group = new Group({
    name: groupName,
    parent: containerGroup,
  });

  // size the label group frame
  group.frame.width = rectangle.frame.width;
  group.frame.height = rectangle.frame.height + 4;

  // add elements to the group
  rectangle.parent = group;
  diamond.parent = group;
  text.parent = group;

  // position the group within the artboard, above the layer receiving the label
  let diamondAdjustment = null;

  // move group to z-index right above layer to label
  group.index = originalLayerIndex + 1;

  // initial placement based on layer to label
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

  // set label group placement
  group.frame.x = placementX;
  group.frame.y = placementY;

  // adjust diamond, if necessary
  if (diamondAdjustment) {
    // move the diamond to the mid-point of the layer to label
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

const createContainerGroup = (artboard) => {
  const artboardId = fromNative(artboard).id;
  const newContainerGroup = new Group({
    frame: {
      x: 0,
      y: 0,
      width: artboard.frame().width(),
      height: artboard.frame().height(),
    },
    locked: true,
    name: '+++ Auto-Spec Labels +++',
    parent: artboard,
  });

  // add placeholder rectangle to keep everything relative to 0, 0 on the artboard
  new ShapePath({ // eslint-disable-line no-new
    frame: new Rectangle(0, 0, 1, 1),
    locked: true,
    name: '--- keystone - please DO NOT delete me 🤗',
    parent: newContainerGroup,
  });

  const newContainerGroupSetting = {
    artboardId,
    id: newContainerGroup.id,
  };

  updateSettings('containerGroups', newContainerGroupSetting);

  return newContainerGroup;
};

const setContainerGroup = (artboard) => {
  const settings = Settings.settingForKey(PLUGIN_IDENTIFIER);
  const artboardId = fromNative(artboard).id;
  let containerGroup = null;
  let containerGroupId = null;

  if (settings && settings.containerGroups) {
    settings.containerGroups.forEach((containerGroupLookupPair) => {
      if (containerGroupLookupPair.artboardId === artboardId) {
        containerGroupId = containerGroupLookupPair.id;
      }
      return null;
    });
    containerGroup = findLayerById(artboard.layers(), containerGroupId);
  }

  if (!containerGroup) {
    if (containerGroupId) {
      updateSettings('containerGroups', { id: containerGroupId }, 'remove');
    }
    containerGroup = createContainerGroup(artboard);
  }

  // move to the front
  fromNative(containerGroup).moveToFront();

  return containerGroup;
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
 * @property layer The layer in the Sketch file that we want to label or modify.
 */
export default class Painter {
  constructor({ for: layer }) {
    this.layer = layer;
    this.artboard = this.layer.parentArtboard();
  }

  removeLabel(existingItem) {
    const layerContainer = findLayerById(this.artboard.layers(), existingItem.containerGroupId);
    if (layerContainer) {
      const layerToDelete = findLayerById(layerContainer.layers(), existingItem.id);
      if (layerToDelete) {
        fromNative(layerToDelete).remove(); // .remove() only works on a js object, not obj-c
      }
    }
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
    const result = initialResultState;

    // return an error if the selection is not placed on an artboard
    if (!this.artboard) {
      result.error = true;
      result.messages.log = 'Selection not on artboard';
      result.messages.toast = 'Your selection needs to be on an artboard';
      return result;
    }

    // set up some information
    const layerName = this.layer.name();
    const layerId = fromNative(this.layer).id;
    const groupName = `Label for ${layerName}`;
    const settings = Settings.settingForKey(PLUGIN_IDENTIFIER);

    // create or locate the container group
    const containerGroup = setContainerGroup(this.artboard);

    // check if we have already labeled this element and remove the old label
    if (settings && settings.labeledLayers) {
      const existingItem = settings.labeledLayers.find(
        foundItem => (foundItem.originalId === layerId),
      );

      // remove old label layer + remove from data
      if (existingItem) {
        updateSettings('labeledLayers', { id: existingItem.id }, 'remove');
        this.removeLabel(existingItem);
      }
    }

    // construct the base label elements
    const labelElements = buildLabelElements(this.artboard, layerLabel);

    // group and position the base label elements
    const layerFrame = {
      artboardWidth: this.artboard.frame().width(),
      width: this.layer.frame().width(),
      height: this.layer.frame().height(),
      x: this.layer.frame().x(),
      y: this.layer.frame().y(),
      index: fromNative(this.layer).index,
    };
    const group = positionLabelElements(containerGroup, groupName, labelElements, layerFrame);

    // update data (connect new label with layer receiving label)
    const newSettingsEntry = {
      containerGroupId: fromNative(containerGroup).id,
      id: group.id,
      originalId: layerId,
    };
    updateSettings('labeledLayers', newSettingsEntry);

    // return a successful result
    result.success = true;
    return result;
  }
}
