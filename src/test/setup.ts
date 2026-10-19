import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom has no object URLs; components only need a string to put in <img src>.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock';
  URL.revokeObjectURL = () => {};
}
