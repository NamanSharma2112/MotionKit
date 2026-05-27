import fs from 'fs';
import path from 'path';

const filesToRead = [
  'Gooey.tsx',
  'TextScramble.tsx',
  'button.tsx',
  'StaggeredList.tsx',
  'MagneticButton.tsx',
  'AnimatedCounter.tsx',
  'ParallaxTiltCard.tsx',
  'ScrollReveal.tsx',
  'Typewriter.tsx',
  'LetterSwap.tsx',
  'SquigglyText.tsx',
  'BunnyIcon.tsx',
  'CharacterCounter.tsx',
  'AnimatePresenceModes.tsx',
  'apple-accordion/AppleAccordion.tsx',
];

const variables = [
  'gooeyCode',
  'textScrambleCode',
  'smoothButtonCode',
  'staggeredListCode',
  'magneticButtonCode',
  'animatedCounterCode',
  'parallaxTiltCardCode',
  'scrollRevealCode',
  'typewriterCode',
  'letterSwapCode',
  'squigglyTextCode',
  'bunnyIconCode',
  'characterCounterCode',
  'animatePresenceModesCode',
  'appleAccordionCode',
];

let output = '// Auto-generated: source code strings for component copy-to-clipboard\n\n';

for (let i = 0; i < filesToRead.length; i++) {
  const filePath = path.join(process.cwd(), filesToRead[i]);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // We use JSON.stringify to safely escape everything, including backticks, newlines, and quotes
    output += `export const ${variables[i]} = ${JSON.stringify(content)};\n\n`;
  } catch (err) {
    console.error(`Error reading ${filesToRead[i]}:`, err);
  }
}

fs.writeFileSync('componentCodes.ts', output);
console.log('Successfully generated componentCodes.ts');
