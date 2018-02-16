const numberRange = (start, end) => {
  return new Array(end - start).fill().map((d, i) => i + start);
}

module.exports = {
  numberRange: numberRange
}
