# aw-sequence-parser
Javascript parser for Active Worlds (AW) sequence files

## Usage

The `parseSequence` function expects two parameters:
- `uri`: mandatory, pointing to the resource (the url of some AW .zip sequence file for example)
- 'opts': optional, set of options to provide to the parser.

If nothing is provided, `opts` will hold the following values:
```javascript
{
  fileType: FileType.AUTO, // Auto detect file type (WIP)
  jsZip: null,             // jsZip utility, mandatory to extract zipped sequences
  jsZipUtils: null         // Same as above
}
```

In practice: it's highly recommended to provide such `opts` dictionary with jsZip(Utils) set, as zipped binary sequence files are usually the default way to go for AW object paths.

`parseSequence` will return the Promise of a dictionary for the freshly-parsed sequence file:

```javascript
{
  "fileType": "binary",             // The type of file this was extracted from, binary files are meant to be 30fps animations
  "totalNFrames": 413,              // Total number of frames for this animation
  "nJoints": 27,                    // Number of joints involved in this animation
  "modelName": "lmarsha",           // Name of the 3D model the sequence was meant to apply to, as an hint
  "rootJointName": "pelvis",        // Name of the root joint to apply translations to
  "frames": {                       // Key frames held in a dictionary (indices starting from 1)
    "1": {
      "joints": {
        "pelvis": [qX, qY, qZ, qW], // Quaternion parameters for each joint in the frame
        "back":  [qX, qY, qZ, qW],
        ...
      },
      "location": [x, y, z]         // Translation to apply to the root joint for this frame
    },
    "3": {
      "joints": {
        "pelvis": [qX, qY, qZ, qW],
        "back":  [qX, qY, qZ, qW],
        ...
      },
      "location": [x, y, z]
    },
    ...
  }
}
```

Note that the number of provided key-frames will often differ from `totalNFrames`: those missing frames are meant to be interpolated later on by the actual client making use of this parser.

### Getting RWX joint tags

Joint tag numbers, as specified in RWX clumps from avatar models, can be fetched from joint names by importing and using `getJointTag(jointName);` (where `jointName` can be something like `'pelvis'`, `'back'`, etc...), it is meant to be case-insensitive.

If the joint name is invalid: it will return `undefined`.

## Example

```javascript
import parseSequence, {FileType, getJointTag} from 'aw-sequence-parser';
import * as JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';

walkSeqPath = 'http://objects.activeworlds.com/uberpath/seqs/walk.zip';

const seqPromise = parseSequence(walkSeqPath, { fileType: FileType.AUTO,
                                                jsZip: JSZip,
                                                jsZipUtils: JSZipUtils });

seqPromise.then( seq => { /* Handle sequence here */ });

const pelvisTag = getJointTag('pelvis'); // 1
const lfkneeTag = getJointTag('LFKNEE'); // 20
const invalidTag = getJointTag('I do not exist'); // undefined
```

## Testing
```bash
$ npm test
```

## Linting
```bash
$ npm run lint
```

## References
- http://www.imatowns.com/xelagot/seqspecs.html