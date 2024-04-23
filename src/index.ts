import fs from 'fs'
import { stdout } from 'node:process';
import {
  hx,
  parse,
  shiftPattern,
  describe,
  invalidChar,
  getMaxPatternLength,
  compare,
  describeResult,
  skipChars,
} from './func'

import type {Pattern, PatternChar, PatternCharRaw, Result} from "./types/types";
import {Timing} from "./timing";
import {CompareResult} from "./types/types";

const content = fs.readFileSync('./rom/rom.gb')

const romData = Uint8Array.from(content);

if (romData.length.toString(16) !== '100000') {
  console.info('wrong filesize');
  process.exit(1);
}


const rawSearchPatterns: PatternCharRaw[][] = [];

// invalid
// rawSearchPatterns.push([
//   { type: 'simpleraw', value: 'xx' }, // Invalid char
//   { type: 'simpleraw', value: 'FC' },
//   { type: 'simpleraw', value: 'CA' },
//   { type: 'simpleraw', value: '88' },
//   { type: 'simpleraw', value: 'E2' },
//   { type: 'simpleraw', value: '60' },
//   { type: 'simpleraw', value: '17' },
//   { type: 'simpleraw', value: '01' },
// ]);

// debugging -> 0x00000015 (shifted by 255)
// rawSearchPatterns.push([
//   { type: 'simpleraw', value: '29' },
//   { type: 'simpleraw', value: 'FC' },
//   { type: 'simpleraw', value: 'CA' },
//   { type: 'simpleraw', value: '88' },
//   { type: 'simpleraw', value: 'E2' },
//   { type: 'simpleraw', value: '60' },
//   { type: 'simpleraw', value: '17' },
//   { type: 'simpleraw', value: '01' },
// ]);

// debugging finding parts of a pattern ->  0x00000016 (shifted by 255)
// rawSearchPatterns.push([
//   { type: 'simpleraw', value: 'FC' },
//   skipChars(1, 4),
//   { type: 'simpleraw', value: '88' },
//   skipChars(1, 4),
//   { type: 'simpleraw', value: '60' },
//   skipChars(1, 4),
//   { type: 'simpleraw', value: '01' },
// ]);

// Main Menu Chalkboards -> 0x0009A606 (shifted by 128) / 0x000BF456 (shifted by 128) / 0x000C7B56 (shifted by 128) /
// rawSearchPatterns.push([
//   { type: 'simpleraw', value: '43' },
//   { type: 'simpleraw', value: '70' },
//   { type: 'simpleraw', value: '71' },
//   { type: 'simpleraw', value: '43' },
//   { type: 'simpleraw', value: '44' },
//   { type: 'simpleraw', value: '45' },
//   { type: 'simpleraw', value: '46' },
//   { type: 'simpleraw', value: '43' },
// ])

// Debung n-of match // ToDo: regex? oioioi
// rawSearchPatterns.push([
//   {
//     type: 'nofraw',
//     values: ['CA', '29', '88', 'FC'],
//   },
// ])

// Marquee Printer error 2
// rawSearchPatterns.push([
//   {
//     type: 'nofraw',
//     values: ['2f', 'ad', '40', 'c8'],
//     minMatch: 4,
//     maxMatch: 4,
//   },
// ])

const searchRangeFrom = 0;
const searchRangeTo = romData.length;
// const searchRangeTo = 0x20;
// const searchRangeTo = romData.length >> 8; // Only search in the very first part of the rom (for debugging)


const searchPatterns: PatternChar[][] = rawSearchPatterns
  .map((rawSearchPattern) => rawSearchPattern.map(parse))
  .filter((searchPattern) => {
    const isValid = searchPattern.findIndex(invalidChar) === -1;
    if (!isValid) {
      console.info(`removing invalid pattern ${describe(searchPattern)}`);
    }
    return isValid;
  });


if (!searchPatterns.length) {
  console.log('no valid searchpatterns');
  process.exit(1);
}

const shiftedPatterns: Pattern[] = searchPatterns.reduce((acc: Pattern[], searchPattern: PatternChar[]) => {
  return [
    ...acc,
    ...Array(0x100).fill('').map(shiftPattern(searchPattern)),
  ]
}, []);

const found: Result[] = [];

console.log(`\n\n--------- Searching with ${shiftedPatterns.length} shifted variants ---------\n`);

const timer: Timing = new Timing(1000);

for (let i: number = searchRangeFrom; i < searchRangeTo; i++) {
  const progress: number = i * 100 / searchRangeTo;
  stdout.write(`  searching index ${hx(8)(i)}/${hx(8)(searchRangeTo)} (${progress.toFixed(2)}%) | elapsed: ${timer.elapsed} remaining: ${timer.remaining(progress)} | found: ${found.length}\r`);

  shiftedPatterns
    .forEach((searchPattern) => {
      const maxPatternLength: number = getMaxPatternLength(searchPattern.pattern)
      const searchArea: Uint8Array = romData.slice(i, i + maxPatternLength);
      const compareResult: CompareResult = compare(searchArea, searchPattern);

      if (!compareResult.found) {
        return;
      }

      found.push({
        ...compareResult,
        searchArea,
        position: i,
      });
    });
}

console.log(`\n\n--------- Found ${found.length} pattern(s) ---------`);

found.forEach((result: Result) => {
  console.log(`${describeResult(result.searchArea, result.pattern)}`);
  console.log(`  found at ${hx(8)(result.position)} (shifted by ${result.shiftBy})`);
})

console.log(`finished after ${timer.elapsed}`);
