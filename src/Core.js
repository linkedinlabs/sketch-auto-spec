import { fromNative } from 'sketch';

import Crawler from './Crawler';
import Painter from './Painter';
import Identifier from './Identifier';
import Messenger from './Messenger';

// import { setArray } from './Tools';

const coreTasks = (() => {
  const assemble = (context) => {
    let contextDocument = null;
    if (context.actionContext && context.actionContext.document) {
      contextDocument = context.actionContext.document;
    } else {
      contextDocument = context.document;
    }
    const document = fromNative(contextDocument); // move from obj-c object to js api object
    const messenger = new Messenger({ for: context, in: document });

    return {
      document,
      messenger,
      selection: context.selection || null,
    };
  };

  return {
    // does it work?
    helloWorld: (context) => {
      if (context.document) {
        const { messenger } = assemble(context);

        messenger.alert('It’s alive 🙌', 'Hello');
        return messenger.log('It’s alive 🙌');
      }
      return null;
    },

    // identify and label a layer
    whatAmI: (context) => {
      const { messenger } = assemble(context);
      const { selection } = assemble(context);

      if (selection === null || selection.count() === 0) {
        return messenger.toast('A layer must be selected');
      }

      const layers = new Crawler({ for: selection });
      const layerToId = new Identifier({ for: layers.first() });
      const painter = new Painter({ for: layerToId.artboard() });

      messenger.toast(`I will identify selected things 💅 “${layerToId.label()}”`);
      messenger.log(`Selected item: “${layerToId.label()}”`);
      return painter.add(`Label for ${layerToId.label()}`);
    },

    // do a thing when the document opens
    onOpenDocument: (context) => {
      if (context.actionContext.document) {
        const { document } = assemble(context);
        const { messenger } = assemble(context);

        if (document) {
          messenger.log(`Document “${document.id}” Opened 😻`);

          // need to wait for the UI to be ready
          setTimeout(() => {
            messenger.toast(`Document “${document.id}” Opened 😻`);
          }, 1500);
        }
      }
    },

    // watch all selection changes
    onSelectionChange: (context) => {
      if (String(context.action) === 'SelectionChanged.finish') {
        const { document } = assemble(context);
        const { messenger } = assemble(context);
        // const newSelectionArray = setArray(context.actionContext.newSelection);

        messenger.log(`Selection Changed in Doc “${document.id}”`);
        messenger.toast('Selection Changed');

        // if (newSelectionArray.length > 0) {
        //   const firstSelectedItem = new Crawler({ for: newSelectionArray }).first();
        //   messenger.log(firstSelectedItem);
        // }
      }
      return null;
    },
  };
})();

// define each in manifest
export const helloWorld = context => coreTasks.helloWorld(context);
export const whatAmI = context => coreTasks.whatAmI(context);
export const onOpenDocument = context => coreTasks.onOpenDocument(context);
export const onSelectionChange = context => coreTasks.onSelectionChange(context);
