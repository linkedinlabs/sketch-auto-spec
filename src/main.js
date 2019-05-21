import { fromNative } from 'sketch';

import Crawler from './Crawler';
import Painter from './Painter';
import Identifier from './Identifier';
import Messenger from './Messenger';

/**
 * @description Takes context (if available) and returns the document
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
 * @description A shared helper function to set up in-UI messages and the logger.
 *
 * @kind function
 * @name assemble
 * @param {Object} context The current context (event) received from Sketch.
 * @returns {Object} Contains an object with the current document as a javascript object,
 * a JSON object with documentData, a messenger instance, and a selection array (if applicable).
 */
const assemble = (context = null) => {
  const objcDocument = getDocument(context);
  const jsDocument = fromNative(objcDocument); // move from obj-c object to JSON object
  const documentData = objcDocument.documentData(); // obj-c object
  const messenger = new Messenger({ for: context, in: jsDocument });
  const selection = getSelection(objcDocument);

  return {
    document: jsDocument,
    documentData,
    messenger,
    selection,
  };
};

// invoked commands -------------------------------------------------

/**
 * @description Displays a “Hello World” Alert in the Sketch UI when invoked from the plugin menu.
 *
 * @kind function
 * @name helloWorld
 * @param {Object} context The current context (event) received from Sketch.
 */
const helloWorld = (context) => {
  if (context.document) {
    const { messenger } = assemble(context);

    messenger.alert('It’s alive 🙌', 'Hello');
    messenger.log('It’s alive 🙌');
  }
  return null;
};

/**
 * @description Identifies and labels a selected layer in a Sketch file.
 *
 * @kind function
 * @name labelLayer
 * @param {Object} context The current context (event) received from Sketch.
 * @returns {null} Shows a Toast in the UI if nothing is selected.
 */
const labelLayer = (context = null) => {
  const {
    documentData,
    messenger,
    selection,
  } = assemble(context);

  if (selection === null || selection.count() === 0) {
    return messenger.toast('A layer must be selected');
  }

  const layers = new Crawler({ for: selection });
  const layerToLabel = new Identifier({ for: layers.first(), documentData });
  const painter = new Painter({ for: layerToLabel.artboard() });
  const kitLayerLabel = layerToLabel.label();

  // some feedback
  messenger.toast(`Component Identified: 💅 “${kitLayerLabel}”`);
  messenger.log(`Component Identified: “${kitLayerLabel}”`);

  // draw the label
  painter.addLabel(kitLayerLabel);
  return null;
};

// listeners -------------------------------------------------

/**
 * @description Displays a Toast in the UI with the document ID on open.
 *
 * @kind function
 * @name onOpenDocument
 * @param {Object} context The current context (event) received from Sketch.
 */
const onOpenDocument = (context) => {
  if (context.actionContext.document) {
    const { document, messenger } = assemble(context);

    if (document) {
      messenger.log(`Document “${document.id}” Opened 😻`);

      // need to wait for the UI to be ready
      setTimeout(() => {
        messenger.toast(`Document “${document.id}” Opened 😻`);
      }, 1500);
    }
  }
};

/**
 * @description Writes to the log whenever the selection changes and display a Toast indicator.
 *
 * @kind function
 * @name onSelectionChange
 * @param {Object} context The current context (event) received from Sketch.
 */
const onSelectionChange = (context) => {
  if (String(context.action) === 'SelectionChanged.finish') {
    const { document, messenger } = assemble(context);
    // const newSelectionArray = setArray(context.actionContext.newSelection);

    messenger.log(`Selection Changed in Doc “${document.id}”`);
    messenger.toast('Selection Changed');

    // if (newSelectionArray.length > 0) {
    //   const firstSelectedItem = new Crawler({ for: newSelectionArray }).first();
    //   messenger.log(firstSelectedItem);
    // }
  }
  return null;
};

// export each used in manifest
export {
  helloWorld,
  labelLayer,
  onOpenDocument,
  onSelectionChange,
};
