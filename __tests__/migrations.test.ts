import {swapTransposedDonkeyTigerPositions} from '../src/db/migrations';

describe('swapTransposedDonkeyTigerPositions', () => {
  it('swaps indices 1<->2 and 3<->4, leaving 0 and 5-8 untouched', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

    expect(swapTransposedDonkeyTigerPositions(values)).toEqual([
      'a',
      'c',
      'b',
      'e',
      'd',
      'f',
      'g',
      'h',
      'i',
    ]);
  });

  it('does not mutate the input array', () => {
    const values = ['a', 'b', 'c', 'd', 'e'];
    swapTransposedDonkeyTigerPositions(values);

    expect(values).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('is its own inverse (applying it twice restores the original order)', () => {
    const values = ['tiger', 'donkey', 'neither', 'tiger', 'donkey'];

    const twice = swapTransposedDonkeyTigerPositions(
      swapTransposedDonkeyTigerPositions(values),
    );

    expect(twice).toEqual(values);
  });
});
