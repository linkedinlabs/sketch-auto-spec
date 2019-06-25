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

export {
  findLayerById,
  getDocument,
  getSelection,
  setArray,
  updateArray,
};
