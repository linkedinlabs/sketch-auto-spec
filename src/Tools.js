/* eslint-disable import/prefer-default-export */
import { toArray } from 'util';

// conversion function to give us full js Array functions from an NSArray object
export const setArray = nsArray => toArray(nsArray);
/* eslint-enable import/prefer-default-export */
