import { fromNative, Settings } from 'sketch';

import Crawler from './Crawler';
import Painter from './Painter';
import Identifier from './Identifier';
import Messenger from './Messenger';
import { getDocument, getSelection, PLUGIN_IDENTIFIER } from './Tools';

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
 * @description Temporary dev function to quickly draw an instance of a Component label.
 *
 * @kind function
 * @name drawLabel
 * @param {Object} context The current context (event) received from Sketch.
 */
const drawLabel = (context) => {
  const { selection } = assemble(context);

  const painter = new Painter({ for: selection[0] });
  painter.addLabel('Hello, I am Component');
  return null;
};

/**
 * @description Temporary dev function to remove data in the `PLUGIN_IDENTIFIER` namespace.
 *
 * @kind function
 * @name resetData
 */
const resetData = () => {
  Settings.setSettingForKey(PLUGIN_IDENTIFIER, null);
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
  const layerToLabel = new Identifier({
    for: layers.first(),
    documentData,
    messenger,
  });
  const painter = new Painter({ for: layers.first() });
  const kitLayerLabel = layerToLabel.label();

  // draw the label
  let paintResult = null;
  if (kitLayerLabel) {
    paintResult = painter.addLabel(kitLayerLabel);
  }

  if (paintResult && (paintResult.error || !paintResult.success)) {
    const toastMessage = paintResult.error && paintResult.messages.toast ? paintResult.messages.toast : 'An error occured';
    const logMessage = paintResult.error && paintResult.messages.log ? paintResult.messages.log : 'An error occured';
    messenger.log(logMessage, 'error');
    return messenger.toast(toastMessage);
  }
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
  drawLabel,
  labelLayer,
  onOpenDocument,
  onSelectionChange,
  resetData,
};
