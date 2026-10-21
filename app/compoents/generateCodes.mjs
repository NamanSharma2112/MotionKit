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
  'StackedCards.tsx',
  'apple-accordion/AppleAccordion.tsx',
  'PlayPauseMorph.tsx',
  'GooeyDropdown.tsx',
  'Name.tsx',
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
  'stackedCardsCode',
  'appleAccordionCode',
  'playPauseMorphCode',
  'gooeyDropdownCode',
  'nameCode',
];

let output = '// Auto-generated: source code strings for component copy-to-clipboard\n\n';

for (let i = 0; i < filesToRead.length; i++) {
  // Resolve next to this script so it works from any working directory.
  const filePath = path.join(path.dirname(new URL(import.meta.url).pathname), filesToRead[i]);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // We use JSON.stringify to safely escape everything, including backticks, newlines, and quotes
    output += `export const ${variables[i]} = ${JSON.stringify(content)};\n\n`;
  } catch (err) {
    console.error(`Error reading ${filesToRead[i]}:`, err);
  }
}

fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'componentCodes.ts'), output);
console.log('Successfully generated componentCodes.ts');
