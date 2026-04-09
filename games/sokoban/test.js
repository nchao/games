const fs = require('fs');
const jsCode = fs.readFileSync('script.js', 'utf8');

const context = `
    const document = {
        getElementById: () => ({
            style: {},
            addEventListener: () => {},
            classList: { add: () => {}, remove: () => {} },
            appendChild: () => {}
        }),
        createElement: () => ({ classList: { add: () => {}, remove: () => {} } })
    };
    const window = {
        addEventListener: () => {},
        onload: null
    };

    ${jsCode}

    console.log("LEVELS:", LEVELS.length);
    console.log("Initial state loaded.");
    initGame();
    console.log("After load, player is at:", playerPos);
    move(1, 0); // Move right
    console.log("After moving right, player is at:", playerPos);
    console.log("Is level complete?", isLevelComplete);
`;

eval(context);
