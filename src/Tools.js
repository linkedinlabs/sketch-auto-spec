import { toArray } from 'util';

// conversion function to give us full js Array functions from an NSArray object
export const setArray = ({ nsArray }) => toArray(nsArray);

// renders a toast in the UI, otherwise puts it in the dev log
export const show = ({ message, in: document }) => {
  if (document.showMessage !== undefined) {
    document.showMessage(message);
  } else {
    log(message);
  }
};
