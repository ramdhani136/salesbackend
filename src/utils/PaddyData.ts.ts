function PaddyData(num?: any, padlen?: any, padchar?: any) {
  var pad_char = typeof padchar !== "undefined" ? padchar : "0";
  var pad = new Array(1 + padlen).join(pad_char);
  return (pad + num).slice(-pad.length);
}

export default PaddyData;
