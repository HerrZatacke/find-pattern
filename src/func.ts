import {
  CompareResult,
  IGroup,
  Pattern,
  PatternChar,
  PatternCharAny,
  PatternCharRaw,
} from "./types/types";

export const skipChars = (minLength: number, maxLength: number): PatternCharAny => ({
  type: 'any',
  minLength,
  maxLength,
});

export const hx = (length: number) => (value: number): string => (
  `0x${value.toString(16).toUpperCase().padStart(length, '0')}`
);

export const phx = (length: number) => {
  const toHx = hx(length);
  return (char: PatternChar): string => {
    switch (char.type) {
      case 'simple':
        return toHx(char.value);
      case 'any':
        return `[${char.minLength}-${char.maxLength}]`;
      case 'nof':
        return `[${char.values.join(',')}]`;
    }
  };
};

export const describe = (pattern: PatternChar[]): string => (
  [...pattern].map(phx(2)).join(' ')
);

export const parse = (term: PatternCharRaw): PatternChar => {
  switch (term.type) {
    case 'simpleraw':
      return {
        type: 'simple',
        value: parseInt(term.value, 16),
      };
    case 'any':
      return term;
    case 'nofraw':
      return {
        type: 'nof',
        values: term.values.map((value: string) => parseInt(value, 16)),
      }
  }
};


export const invalidChar = (char: PatternChar): boolean => {
  switch (char.type) {
    case 'simple':
      return isNaN(char.value) || char.value < 0 || char.value > 255;
    case 'any':
      return char.minLength > char.maxLength;
    case 'nof':
      return char.values.findIndex((value: number) => (isNaN(value) || value < 0 || value > 255)) !== -1
  }
}

export const shiftPattern = (searchPattern: PatternChar[]) => (_: '', shiftBy: number): Pattern => ({
  shiftBy,
  pattern: searchPattern.map((char: PatternChar): PatternChar => {
    switch (char.type) {
      case 'simple':
        return {
          ...char,
          value: (char.value + shiftBy) % 0x100
        }
      case 'any':
        return char;
      case 'nof':
        return {
          ...char,
          values: char.values.map((value) => ((value + shiftBy) % 0x100)),
        }
    }
  })
});

export const getMaxPatternLength = (pattern: PatternChar[]) => (
  pattern.reduce((acc: number, char: PatternChar) => {
    switch (char.type) {
      case 'simple':
        return acc + 1;
      case 'any':
        return acc + char.maxLength
      case 'nof':
        return acc + char.values.length
    }
  }, 0)
)

export const patternToRegExp = (pattern: PatternChar[]): RegExp => {
  const rx = pattern.reduce((acc: string, char: PatternChar, index: number) => {
    switch (char.type) {
      case 'simple':
        return `${acc}(?<R${index.toString(10).padStart(8, '0')}>\\x${char.value.toString(16).padStart(2, '0')}{1})`
      case 'any':
        return `${acc}(?<S${index.toString(10).padStart(8, '0')}>.{${char.minLength},${char.maxLength}})`;
      case 'nof':
        return `${acc}(?<R${index.toString(10).padStart(8, '0')}>[${char.values.map((value) => (`\\x${value.toString(16).padStart(2, '0')}`)).join('')}]{${char.values.length}})`
    }
  }, '^');

  return new RegExp(rx);
}

export const compare = (searchArea: Uint8Array, shiftedPattern: Pattern): CompareResult => {
  const searchString: string = searchArea.reduce((acc: string, value: number) => (
    `${acc}${String.fromCharCode(value)}`
  ), '');

  // console.log(patternToRegExp(shiftedPattern.pattern), searchString);

  const found = !!patternToRegExp(shiftedPattern.pattern).exec(searchString);

  return {
    ...shiftedPattern,
    found,
  };
};

export const describeResult = (searchArea: Uint8Array, searchPattern: PatternChar[]): string => {
  const searchString: string = searchArea.reduce((acc, value) => (
    `${acc}${String.fromCharCode(value)}`
  ), '');

  const result = patternToRegExp(searchPattern).exec(searchString);

  const segments = Object.keys(result?.groups || {})
    .map((groupName: string): IGroup => {
      const index: number =  parseInt(groupName.match(/[0-9]{8}$/gi)?.[0] || '', 10);
      const type: string =  groupName.match(/^[a-z]{1}/gi)?.[0] || 'X';
      const value: string[] =  (result?.groups?.[groupName] || '').split('').map((chr) => chr.charCodeAt(0)).map(hx(2));

      return ({
        index,
        type,
        value,
      });
    })
    .sort((a: IGroup, b: IGroup): number => {
      if (a.value > b.value) return 1;
      if (a.value < b.value) return 1;
      return 0;
    })
    .map(({ value, type }: IGroup): string => {
      const color = type === 'R' ? '36m' : '33m';
      return `\x1b[${color}${value.join(', ')}\x1b[0m`;
    });

  return `SearchPattern\n  ${describe(searchPattern)} resulted in:\n  ${segments.join(', ')}`;
};
