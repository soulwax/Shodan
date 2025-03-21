// File: scripts/rename.js

const fs = require('fs');
const path = require('path');

// Maps for different card types
const majorArcanaMap = {
  'The-Fool': 'm_00_fool',
  'The-Magician': 'm_01_magician',
  'The-High-Priestess': 'm_02_highpriestess',
  'The-Empress': 'm_03_empress',
  'The-Emperor': 'm_04_emperor',
  'The-Hierophant': 'm_05_hierophant',
  'The-Lovers': 'm_06_lovers',
  'The-Chariot': 'm_07_chariot',
  'Strength': 'm_08_strength',
  'The-Hermit': 'm_09_hermit',
  'The-Wheel-of-Fortune': 'm_10_wheel',
  'Justice': 'm_11_justice',
  'The-Hanged-Man': 'm_12_hanged',
  'Death': 'm_13_death',
  'Temperance': 'm_14_temperance',
  'The-Devil': 'm_15_devil',
  'The-Tower': 'm_16_tower',
  'The-Star': 'm_17_star',
  'The-Moon': 'm_18_moon',
  'The-Sun': 'm_19_sun',
  'Judgment': 'm_20_judgment',
  'The-World': 'm_21_world'
};

const suitMap = {
  'cups': 'c',
  'pentacles': 'p',
  'swords': 's',
  'wands': 'w'
};

const rankMap = {
  'ace': 'ace',
  'two': '2',
  'three': '3',
  'four': '4',
  'five': '5',
  'six': '6',
  'seven': '7',
  'eight': '8',
  'nine': '9',
  'ten': '10',
  'page': 'page',
  'knight': 'knight',
  'queen': 'queen',
  'king': 'king'
};

function getNewFileName(oldName) {
  // Remove the extension and metadata
  const baseName = oldName.replace(/-Tarot-card-img-182x300-1.jpg/, '');
  
  // Split by hyphens
  const parts = baseName.split('-');
  
  // Remove the leading number (if exists)
  if (parts[0].match(/^\d+$/)) {
    parts.shift();
  }

  // Check if it's a major arcana card
  const majorName = parts.join('-');
  if (majorArcanaMap[majorName]) {
    return majorArcanaMap[majorName] + '.jpg';
  }

  // Handle minor arcana
  // Example: "ace-of-cups" -> ["ace", "of", "cups"]
  const rank = parts[0].toLowerCase();
  const suit = parts[2].toLowerCase();
  
  if (suitMap[suit] && rankMap[rank]) {
    return `${suitMap[suit]}_${rankMap[rank]}.jpg`;
  }
  
  // Return original name if no match found
  return oldName;
}

async function renameFiles(directory) {
  try {
    const files = await fs.promises.readdir(directory);
    
    for (const file of files) {
      if (path.extname(file).toLowerCase() === '.jpg') {
        const oldPath = path.join(directory, file);
        const newName = getNewFileName(file);
        const newPath = path.join(directory, newName);
        
        if (file !== newName) {
          console.log(`Renaming: ${file} -> ${newName}`);
          await fs.promises.rename(oldPath, newPath);
        }
      }
    }
    
    console.log('Renaming complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage:
const imageDir = path.join(__dirname, '../static/rider-waite');
renameFiles(imageDir);