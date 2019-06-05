import { fromNative, Settings } from 'sketch';

import Crawler from './Crawler';
import Painter from './Painter';
import Identifier from './Identifier';
import Messenger from './Messenger';
import { getDocument, getSelection } from './Tools';
import { PLUGIN_IDENTIFIER } from './constants';

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
 * @name annotateLayer
 * @param {Object} context The current context (event) received from Sketch.
 * @returns {null} Shows a Toast in the UI if nothing is selected.
 */
const annotateLayer = (context = null) => {
  const {
    documentData,
    messenger,
    selection,
  } = assemble(context);

  // need a selected layer to label it
  if (selection === null || selection.count() === 0) {
    return messenger.toast('A layer must be selected');
  }

  // iterate through each layer in a selection
  const layers = new Crawler({ for: selection });
  layers.all().forEach((layer) => {
    // set up Identifier instance for the layer
    const layerToLabel = new Identifier({
      for: layer,
      documentData,
      messenger,
    });
    // set up Painter instance for the layer
    const painter = new Painter({ for: layer });

    // determine the label text
    const labelTextResult = layerToLabel.label();
    if (labelTextResult && (labelTextResult.error || !labelTextResult.success)) {
      return messenger.handleResult(labelTextResult);
    }

    // draw the label (if the text exists)
    let paintResult = null;
    if (labelTextResult && labelTextResult.success && labelTextResult.data) {
      paintResult = painter.addLabel(labelTextResult.data);
    }

    // read the response from Painter; if it was unsuccessful, log and display the error
    if (paintResult && (paintResult.error || !paintResult.success)) {
      return messenger.handleResult(paintResult);
    }

    return null;
  });

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
    }
  }
};

/**
 * @description Writes to the log whenever the selection changes and displays a Toast indicator.
 *
 * @kind function
 * @name onSelectionChange
 * @param {Object} context The current context (event) received from Sketch.
 */
const onSelectionChange = (context) => {
  if (String(context.action) === 'SelectionChanged.finish') {
    const { document, messenger } = assemble(context);

    messenger.log(`Selection Changed in Doc “${document.id}”`);
  }
  return null;
};

// export each used in manifest
export {
  annotateLayer,
  drawLabel,
  onOpenDocument,
  onSelectionChange,
  resetData,
};
