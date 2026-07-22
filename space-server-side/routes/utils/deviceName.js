const normalizeDeviceName = (name) => (typeof name === 'string' ? name.trim() : '');

const isDuplicateEntryError = (error) => Boolean(error && error.code === 'ER_DUP_ENTRY');

module.exports = {
  normalizeDeviceName,
  isDuplicateEntryError,
};
