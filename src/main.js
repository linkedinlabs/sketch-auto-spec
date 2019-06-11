import { fromNative, Settings } from 'sketch';

import Crawler from './Crawler';
import Housekeeper from './Housekeeper';
import Identifier from './Identifier';
import Messenger from './Messenger';
import Painter from './Painter';
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
  const housekeeper = new Housekeeper({ in: jsDocument, messenger });
  const selection = getSelection(objcDocument);

  return {
    document: jsDocument,
    documentData,
    housekeeper,
    messenger,
    selection,
  };
};

// invoked commands -------------------------------------------------

/**
 * @description Identifies and annotates a selected layer in a Sketch file.
 *
 * @kind function
 * @name annotateLayer
 * @param {Object} context The current context (event) received from Sketch.
 * @returns {null} Shows a Toast in the UI if nothing is selected.
 */
const annotateLayer = (context = null) => {
  const {
    document,
    documentData,
    messenger,
    selection,
  } = assemble(context);

  // need a selected layer to annotate it
  if (selection === null || selection.count() === 0) {
    return messenger.toast('A layer must be selected');
  }

  // iterate through each layer in a selection
  const layers = new Crawler({ for: selection });
  layers.all().forEach((layer) => {
    // set up Identifier instance for the layer
    const layerToAnnotate = new Identifier({
      for: layer,
      documentData,
      messenger,
    });
    // set up Painter instance for the layer
    const painter = new Painter({ for: layer, in: document });

    // determine the annotation text
    let hasName = false;
    const hasNameResult = layerToAnnotate.hasName();

    if (hasNameResult.status === 'error') {
      let setNameResult = null;
      const getLingoNameResult = layerToAnnotate.getLingoName();
      if (getLingoNameResult.status === 'error') {
        messenger.handleResult(getLingoNameResult);

        setNameResult = layerToAnnotate.setName();
        messenger.handleResult(setNameResult);

        if (setNameResult.status === 'success') {
          hasName = true;
        }
      } else {
        hasName = true;
      }
    } else {
      hasName = true;
    }

    // draw the annotation (if the text exists)
    let paintResult = null;
    if (hasName) {
      paintResult = painter.addAnnotation();
    }

    // read the response from Painter; if it was unsuccessful, log and display the error
    if (paintResult && (paintResult.status === 'error')) {
      return messenger.handleResult(paintResult);
    }

    return null;
  });

  return null;
};

/**
 * @description Temporary dev function to quickly draw an instance of a Component annotation.
 *
 * @kind function
 * @name drawAnnotation
 * @param {Object} context The current context (event) received from Sketch.
 */
const drawAnnotation = (context) => {
  const { document, selection } = assemble(context);
  const layer = selection[0];
  const layerSettings = { annotationText: 'Hello, I am Component' };
  Settings.setLayerSettingForKey(layer, PLUGIN_IDENTIFIER, layerSettings);

  const painter = new Painter({ for: selection[0], in: document });
  painter.addAnnotation();
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
    const {
      document,
      housekeeper,
      messenger,
    } = assemble(context);

    if (document) {
      messenger.log(`Document “${document.id}” Opened 😻`);

      setTimeout(() => {
        housekeeper.runMigrations();
      }, 500);
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
  drawAnnotation,
  onOpenDocument,
  onSelectionChange,
};
