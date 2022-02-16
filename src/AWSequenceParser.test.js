/**
 * @author Julien 'Blaxar' Bardagi <blaxar.waldarax@gmail.com>
 */

import parseSequence, { RWXtag, FileType, parseBinarySequence } from './AWSequenceParser.js';

test('parseBinarySequence', () => {
    expect(typeof parseBinarySequence).toBe('function');
});

test('parseSequence', () => {
    expect(typeof parseSequence).toBe('function');
});

test('enums', () => {
    expect(typeof RWXtag).toBe('object');
    expect(typeof FileType).toBe('object');
});
