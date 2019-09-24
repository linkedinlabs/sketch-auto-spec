import { toArray } from 'util';
import { fromNative } from 'sketch';

// --- helper functions
/**
 * @description Takes context (if made available) and returns the document
 * or derives the `currentDocument` from `NSDocumentController` (necessary
 * when a command froms from the GUI)
 *
 * @kind function
 * @name getDocument
 * @param {Object} context The current context (event) received from Sketch (optional).
 * @returns {Object} Contains an objective-c object with the current document.
 */
const getDocument = (context = null) => {
  if (!context) {
    /* eslint-disable no-undef */
    return NSDocumentController.sharedDocumentController().currentDocument();
    /* eslint-enable no-undef */
  }

  if (context.actionContext && context.actionContext.document) {
    return context.actionContext.document;
  }

  return context.document;
};

/**
 * @description Takes an objective-c object of the document and
 * retrieves the currently-selected layers
 *
 * @kind function
 * @name getSelection
 * @param {Object} objcDocument The current objective-c document object.
 * @returns {Object} Contains an objective-c object with the current document.
 */
const getSelection = objcDocument => objcDocument.selectedLayers().layers() || null;

/**
 * @description A conversion function to give us full js Array functions from an NSArray object.
 * Info {@link https://sketchplugins.com/d/113-how-to-iterate-through-selected-layers-in-sketchapi/8}
 *
 * @kind function
 * @name setArray
 * @param {Array} nsArray The NSArray-formatted array.
 * @returns {Array} Javascript Array.
 */
const setArray = nsArray => toArray(nsArray);

/**
 * @description Find a layer by ID in an array of layers.
 *
 * @kind function
 * @name findLayerById
 * @param {Array} layers Array of layers to search through.
 * @param {string} layerId The string ID of the layer to find.
 * @returns {Object} The layer that was found (or null).
 */
const findLayerById = (layers, layerId) => {
  if (!layers || !layerId) {
    return null;
  }

  let foundLayer = null;
  layers.forEach((layer) => {
    const layerJSON = fromNative(layer);
    if (layerJSON.id === layerId) {
      foundLayer = layer;
    }
    return foundLayer;
  });
  return foundLayer;
};

/**
 * @description A reusable helper function to take an array and add or remove data from it
 * based on a top-level key and a defined action.
 * an action (`add` or `remove`).
 *
 * @kind function
 * @name updateArray
 * @param {string} key String representing the top-level area of the array to modify.
 * @param {Object} item Object containing the new bit of data to add or
 * remove (must include an `id` string for comparison).
 * @param {Array} array The array to be modified.
 * @param {string} action Constant string representing the action to take (`add` or `remove`).
 * @returns {Object} The modified array.
 * @private
 */
const updateArray = (key, item, array, action = 'add') => {
  const updatedArray = array;

  if (action === 'add') {
    if (!updatedArray[key]) {
      updatedArray[key] = [];
    }

    updatedArray[key].push(item);
  }

  if (action === 'remove') {
    let updatedItems = null;
    // find the items updatedArray index of the item to remove
    const itemIndex = updatedArray[key].findIndex(foundItem => (foundItem.id === item.id));

    updatedItems = [
      ...updatedArray[key].slice(0, itemIndex),
      ...updatedArray[key].slice(itemIndex + 1),
    ];

    updatedArray[key] = updatedItems;
  }
  return updatedArray;
};

/**
 * @description Takes a Sketch layer object and returns a `frame` object with
 * `x` and `y` coordinates, relative to the artboard the frame is on.
 *
 * @kind function
 * @name getPositionOnArtboard
 * @param {Object} layer The Sketch layer object.
 * @returns {Object} A `frame` object with `x` and `y` coordinates.
 */
const getPositionOnArtboard = (layer) => {
  // original layer frame position
  const coordinates = {
    x: layer.frame().x(),
    y: layer.frame().y(),
  };

  // check first if the layer is an artboard;
  // artboards should simply return `x: 0, y: 0` by definition
  // otherwise we get coordinates relative to the overall page
  if (fromNative(layer).type === 'Artboard') {
    coordinates.x = 0;
    coordinates.y = 0;
    return coordinates;
  }

  // otherwise, look for an immediate parent
  let { parent } = fromNative(layer);

  // loop through each parent and adjust the coordinates
  if (parent) {
    while (parent.name && parent.type !== 'Artboard') {
      coordinates.x += parent.frame.x;
      coordinates.y += parent.frame.y;
      parent = parent.parent; // eslint-disable-line prefer-destructuring
    }
  }
  return coordinates;
};

/**
 * @description Compensates for a mix of `Artboard` and non-artboard layers, and
 * groups and non-groups when determining a layer index. Artboard layer indexes
 * are converted to a negative number so they can be compared against non-artboard
 * layers. This is necessary because artboards use a separate z-index, making it
 * possible for an artboard and a layer on that artboard to have the same
 * index value. Group layers are parsed to a decimal value that includes the final
 * parent Group index.
 *
 * @kind function
 * @name getRelativeIndex
 * @param {Object} layer The sketchObject layer.
 * @returns {number} The index.
 * @private
 */
const getRelativeIndex = (layer) => {
  const layerType = fromNative(layer).type;
  let layerIndex = fromNative(layer).index;

  // artboards use their own z-index
  // flip them to a negative for consistent comparison to items on artboards
  if (layerType === 'Artboard') {
    layerIndex = (0 - (layerIndex + 1));
  } else {
    const innerLayerIndex = layerIndex;
    let parentGroupIndex = null;

    let { parent } = fromNative(layer);

    // loop through each parent and adjust the coordinates
    if (parent) {
      while (parent.type === 'Group') {
        parentGroupIndex = parent.index;
        parent = parent.parent; // eslint-disable-line prefer-destructuring
      }

      if (parentGroupIndex !== null) {
        layerIndex = parseFloat(`${parentGroupIndex}.${innerLayerIndex}`);
      }
    }
  }

  return layerIndex;
};

export {
  findLayerById,
  getDocument,
  getPositionOnArtboard,
  getRelativeIndex,
  getSelection,
  setArray,
  updateArray,
};
