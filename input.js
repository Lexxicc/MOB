let robot;
try {
  robot = require('@jitsi/robotjs');
} catch (e) {
  robot = null;
}

function ensureRobot() {
  if (!robot) throw new Error('robotjs not available — run npm run rebuild first');
}

function click(x, y, bounds) {
  ensureRobot();
  const margin = 4;
  if (
    x < bounds.x - margin || x > bounds.x + bounds.w + margin ||
    y < bounds.y - margin || y > bounds.y + bounds.h + margin
  ) {
    throw new Error(`Click (${x},${y}) outside board bounds`);
  }
  robot.setMouseDelay(0);
  robot.moveMouse(x, y);
  robot.mouseClick('left');
}

module.exports = { click };
