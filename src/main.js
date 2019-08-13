import { fromNative } from 'sketch';

import Crawler from './Crawler';
import Housekeeper from './Housekeeper';
import Identifier from './Identifier';
import Messenger from './Messenger';
import Painter from './Painter';
import { getDocument, getSelection } from './Tools';

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
    return messenger.alert('A layer must be selected');
  }

  // iterate through each layer in a selection
  const layers = new Crawler({ for: selection }).all();
  const multipleLayers = (layers.length > 1);

  layers.forEach((layer) => {
    // set up Identifier instance for the layer
    const layerToAnnotate = new Identifier({
      for: layer,
      document,
      documentData,
      messenger,
    });
    // set up Painter instance for the layer
    const painter = new Painter({ for: layer, in: document });

    // determine the annotation text
    let hasText = false;
    const hasCustomTextResult = layerToAnnotate.hasCustomText();

    if (hasCustomTextResult.status === 'error') {
      let setTextResult = null;
      const getLingoNameResult = layerToAnnotate.getLingoName();
      if (getLingoNameResult.status === 'error') {
        messenger.handleResult(getLingoNameResult);

        if (!multipleLayers) {
          setTextResult = layerToAnnotate.setText();
          messenger.handleResult(setTextResult);

          if (setTextResult.status === 'success') {
            hasText = true;
          }
        }
      } else {
        hasText = true;
      }
    } else {
      hasText = true;
    }

    // draw the annotation (if the text exists)
    let paintResult = null;
    if (hasText) {
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
 * @description Annotates a selected layer in a Sketch file with user input.
 *
 * @kind function
 * @name annotateLayerCustom
 * @param {Object} context The current context (event) received from Sketch.
 * @returns {null} Shows a Toast in the UI if nothing is selected or
 * if multiple layers are selected.
 */
const annotateLayerCustom = (context = null) => {
  const {
    document,
    documentData,
    messenger,
    selection,
  } = assemble(context);

  // need a selected layer to annotate it
  if (selection === null || selection.count() === 0) {
    return messenger.alert('A layer must be selected');
  }

  // need a selected layer to annotate it
  if (selection.count() > 1) {
    return messenger.alert('Only one layer may be selected');
  }

  // grab the layer form the selection
  const layer = new Crawler({ for: selection }).first();

  // set up Identifier instance for the layer
  const layerToAnnotate = new Identifier({
    for: layer,
    documentData,
    messenger,
  });
  // set up Painter instance for the layer
  const painter = new Painter({ for: layer, in: document });

  // determine the annotation text
  const setTextResult = layerToAnnotate.setText();
  messenger.handleResult(setTextResult);

  if (setTextResult.status === 'success') {
    // draw the annotation (if the text exists)
    let paintResult = null;
    paintResult = painter.addAnnotation();

    // read the response from Painter; if it was unsuccessful, log and display the error
    if (paintResult && (paintResult.status === 'error')) {
      return messenger.handleResult(paintResult);
    }
  }

  return null;
};

/**
 * @description Annotates a selection of layers in a Sketch file with the
 * spacing number (“IS-X”) based on the gap between the two layers.
 *
 * @kind function
 * @name annotateMeasurement
 * @param {Object} context The current context (event) received from Sketch.
 * @returns {null} Shows a Toast in the UI if nothing is selected or
 * if more than two layers are selected.
 */
const annotateMeasurement = (context = null) => {
  const {
    document,
    messenger,
    selection,
  } = assemble(context);

  // need a selected layer to annotate it
  if (selection === null || selection.count() > 2) {
    return messenger.alert('One or two layers must be selected');
  }

  // grab the gap frame from the selection
  const crawler = new Crawler({ for: selection });
  const layer = crawler.first();

  // set up Painter instance for the reference layer
  const painter = new Painter({ for: layer, in: document });

  // draw the spacing annotation (if gap frame exists)
  let paintResult = null;
  if (selection.count() === 2) {
    const gapFrame = crawler.gapFrame();
    paintResult = painter.addGapMeasurement(gapFrame);
  }

  if (selection.count() === 1) {
    paintResult = painter.addDimMeasurement();
  }

  // read the response from Painter; log and display message(s)
  messenger.handleResult(paintResult);

  return null;
};

/**
 * @description Draws a semi-transparent “Bounding Box” around any selected elements.
 *
 * @kind function
 * @name drawBoundingBox
 * @param {Object} context The current context (event) received from Sketch.
 * @returns {null} Shows a Toast in the UI if nothing is selected.
 */
const drawBoundingBox = (context = null) => {
  const {
    document,
    messenger,
    selection,
  } = assemble(context);

  // need a selected layer to annotate it
  if (selection === null || selection.count() === 0) {
    return messenger.alert('At least one layer must be selected');
  }

  // grab the frame from the selection
  const crawler = new Crawler({ for: selection });
  const layer = crawler.first();
  const frame = crawler.frame();

  // set up Painter instance for the layer
  const painter = new Painter({ for: layer, in: document });

  // draw the bounding box (if frame exists)
  let paintResult = null;
  if (frame) {
    paintResult = painter.addBoundingBox(frame);
  }

  // read the response from Painter; log and display message(s)
  messenger.handleResult(paintResult);

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

// export each used in manifest
export {
  annotateLayer,
  annotateLayerCustom,
  annotateMeasurement,
  drawBoundingBox,
  onOpenDocument,
};
