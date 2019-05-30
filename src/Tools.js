import { toArray } from 'util';

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
 * @private
 */
const setArray = nsArray => toArray(nsArray);

export {
  getDocument,
  getSelection,
  setArray,
};
