const { execSync } = require('child_process');
const { screen } = require('electron');
const Jimp = require('jimp');

const TMP = '/tmp/mob-frame.png';

async function grab() {
  execSync(`screencapture -x -t png ${TMP}`);
  const img = await Jimp.read(TMP);
  const logicalW = screen.getPrimaryDisplay().bounds.width;
  const scale = img.bitmap.width / logicalW;
  return { img, scale };
}

module.exports = { grab };
