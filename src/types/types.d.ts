
export interface PatternCharBase {
  type: 'simple' | 'any' | 'nof' | 'nofraw' | 'simpleraw';

}

export interface PatternCharSimple extends PatternCharBase{
  type: 'simple';
  value: number;
}

export interface PatternCharSimpleRaw extends PatternCharBase{
  type: 'simpleraw';
  value: string;
}

export interface PatternCharAny extends PatternCharBase{
  type: 'any';
  minLength: number;
  maxLength: number;
}

export interface PatternCharNOfRaw extends PatternCharBase{
  type: 'nofraw';
  values: string[];
}

export interface PatternCharNOf extends PatternCharBase{
  type: 'nof';
  values: number[];
}

export type PatternChar = PatternCharSimple | PatternCharAny | PatternCharNOf;
export type PatternCharRaw = PatternCharSimpleRaw | PatternCharAny | PatternCharNOfRaw;

export interface Pattern {
  shiftBy: number;
  pattern: PatternChar[];
}

export interface CompareResult extends Pattern {
  found: boolean;
}

export interface Result extends CompareResult {
  position: number;
  searchArea: Uint8Array,
}

export interface IGroup {
  index: number;
  type: string;
  value: string[];
}
