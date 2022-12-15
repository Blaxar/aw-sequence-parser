/**
 * @author Julien 'Blaxar' Bardagi <blaxar.waldarax@gmail.com>
 */

/* exported FileType */
const FileType = {
  AUTO: 0,
  BINARY: 1,
  TEXT: 2,
};

/* exported RWXtag */
const RWXtag = {
  PELVIS: 1,
  BACK: 2,
  NECK: 3,
  HEAD: 4,
  RTSTERNUM: 5,
  RTSHOULDER: 6,
  RTELBOW: 7,
  RTWRIST: 8,
  RTFINGERS: 9,
  LFSTERNUM: 10,
  LFSHOULDER: 11,
  LFELBOW: 12,
  LFWRIST: 13,
  LFFINGERS: 14,
  RTHIP: 15,
  RTKNEE: 16,
  RTANKLE: 17,
  RTTOES: 18,
  LFHIP: 19,
  LFKNEE: 20,
  LFANKLE: 21,
  LFTOES: 22,
  NECK2: 23,
  TAIL: 24,
  TAIL2: 25,
  TAIL3: 26,
  TAIL4: 27,
  OBJ1: 28,
  OBJ2: 29,
  OBJ3: 30,
  HAIR: 31,
  HAIR2: 32,
  HAIR3: 33,
  HAIR4: 34,
  RTBREAST: 35,
  LFBREAST: 36,
  RTEYE: 37,
  LFEYE: 38,
  LIPS: 39,
  NOSE: 40,
  RTEAR: 41,
  LFEAR: 42,
  SIGN: 100,
  PICTURE: 200,
};

const headerPatterns = [[0x7f, 0x7f, 0x7f, 0x79], [0x7f, 0x7f, 0x7f, 0x7a]];

/* exported getJointTag */
function getJointTag(jointName) {
  return RWXtag[jointName.toUpperCase()];
}

function contentMatch(base, i, pattern) {
  let ret, start = i;

  // If the pattern matches: we return the nex index to conteinue from,
  // otherwise we return the original index
  pattern.every( (p) => {
    if (i >= base.length || base[i++] != p) {
      ret = start;
      return false;
    }
    ret = i;
    return true;
  } );

  return ret;
}

function spawnFrameObject() {
  return {joints: {}, location: [0.0, 0.0, 0.0]};
}

function parseBinaryLocationBlock(fileContent, i, frames, locId) {
  const iteLength = (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++];

  if (iteLength != 4) {
    throw('Unexpected data length for each locationX iteration');
  }

  // Get the number of frames in this block
  const nFrames = (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++];

  for (let frameId = 0; frameId < nFrames; frameId++) {
    // Get the frame number
    const frameNb = (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++];

    const floatView = new DataView(new ArrayBuffer(4));

    floatView.setInt32(0, (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++]);
    const loc = floatView.getFloat32(0);

    if (frames[frameNb] === undefined) {
      frames[frameNb] = spawnFrameObject();
    }

    frames[frameNb].location[locId] = loc;
  }

  return i;
}

/* exported parseBinarySequence */
async function parseBinarySequence(fileContent) {
  let headerMissing = true;
  let i = 0;

  // Look for a valid header first
  headerPatterns.every( (header) => {
    let next = contentMatch(fileContent, i, header);
    if (i < next) {
      // The returned index has increased: it's a match!
      i = next;
      return headerMissing = false;
    }

    return true;
  } );

  if (headerMissing) {
    throw new Error('Missing header from binary sequence file');
  }

  // Look for the number of frames (assuming big-endian)
  const totalNFrames = (fileContent[i++] << 8) + fileContent[i++];

  // Look for the number of joints (assuming big-endian)
  const nJoints = (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++];

  // Look for the length of the model name (including nul-byte)
  const modelNameLength = (fileContent[i++] << 8) + (fileContent[i++]);

  if (fileContent[i+modelNameLength-1] != 0) {
    throw new Error('Missing nul-byte at the end of model name');
  }

  const modelName = String.fromCharCode(...fileContent.slice(i,i+modelNameLength-1));
  i += modelNameLength;

  // Look for the length of the root joint name (including nul-byte)
  const rootJointNameLength = (fileContent[i++] << 8) + (fileContent[i++]);

  if (fileContent[i+rootJointNameLength-1] != 0) {
    throw new Error('Missing nul-byte at the end of root joint name');
  }

  const rootJointName = String.fromCharCode(...fileContent.slice(i,i+rootJointNameLength-1));
  i += rootJointNameLength;

  const frames = {};

  // Start iterating over each joint, we expect 'nJoints' iterations
  for (let jointId = 0; jointId < nJoints; jointId++) {
    // Look for the length of the joint name (including nul-byte)
    const jointNameLength = (fileContent[i++] << 8) + fileContent[i++];

    if (fileContent[i+jointNameLength-1] != 0) {
      throw new Error('Missing nul-byte at the end of joint name');
    }
    
    const jointName = String.fromCharCode(...fileContent.slice(i,i+jointNameLength-1));
    i += jointNameLength;

    // Look for the data length of each iteration, we expect 16 bytes (4 floats) for a quaternion
    // Note: this data length seems to not include the 4-bytes integer for the frame number in each
    //       iteration
    const iteLength = (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++];

    if (iteLength != 16) {
      throw new Error('Unexpected data length for each frame iteration');
    }

    // Look for the number of frames (assuming big-endian)
    const nFrames = (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++];

    // For each joint: we expect 'nFrames' frame iterations
    for (let frameId = 0; frameId < nFrames; frameId++) {
      // Get the frame number
      const frameNb = (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++];

      const floatView = new DataView(new ArrayBuffer(4));

      floatView.setInt32(0, (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++]);
      const qW = floatView.getFloat32(0);

      floatView.setInt32(0, (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++]);
      const qX = floatView.getFloat32(0);

      floatView.setInt32(0, (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++]);
      const qY = floatView.getFloat32(0);

      floatView.setInt32(0, (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++]);
      const qZ = floatView.getFloat32(0);

      if (frames[frameNb] === undefined) {
        frames[frameNb] = spawnFrameObject();
      }

      frames[frameNb].joints[jointName] = [qW, qX, qY, qZ];
    }
  }

  // Check if there are other information blocks
  const nBlocks = (fileContent[i++] << 24) + (fileContent[i++] << 16) + (fileContent[i++] << 8) + fileContent[i++];

  if (nBlocks > 0) {
    // Parse locationX block
    i = parseBinaryLocationBlock(fileContent, i, frames, 0);
  }

  if (nBlocks > 1) {
    // Parse locationY block
    i = parseBinaryLocationBlock(fileContent, i, frames, 1);
  }

  if (nBlocks > 2) {
    // Parse locationZ block
    i = parseBinaryLocationBlock(fileContent, i, frames, 2);
  }

  return {fileType: 'binary', totalNFrames, nJoints, modelName, rootJointName, frames};
}

/* exported parseSequence */
async function parseSequence(uri, opts = {fileType: FileType.AUTO, fflate: null, cors: false}) {
  const extension = uri.substring(uri.lastIndexOf('.')).toLowerCase();
  const fflate = opts.fflate ? opts.fflate : null;
  const cors = opts.cors ? opts.cors : false;

  const request = new Request(uri, {
    method: 'GET',
    mode: cors ? 'cors' : undefined,
  });

  // If we are dealing with a zip file: we need to unzip it first, to deal with its content
  if (extension === '.zip') {
    if (!fflate) {
      throw new Error('Cannot open .zip file without providing fflate module');
    }

    return await fetch(request).then((response) => {
      if (response.ok) return response.arrayBuffer();
      else throw new Error(`HTTP error when fetching .zip file: ${response.status}`);
    }).then((arrayContent) => {
      return fflate.unzipSync(new Uint8Array(arrayContent));
    }).then((zip) => {
      // Chain with the seq content promise
      for (const key of Object.keys(zip)) {
        if (key.substring(key.lastIndexOf('.')).toLowerCase() === '.seq') {
          return zip[key];
        }
      }

      throw new Error('No .seq file found within .zip archive');
    }).then((buffer) => {
      return parseBinarySequence(buffer);
    }, (e) => {
      throw e;
    });
  } else {
    // Assuming binary file
    return await fetch(request).then((response) => {
      if (response.ok) return response.arrayBuffer();
      else throw new Error(`HTTP error when fetching file: ${response.status}`);
    }).then((buffer) => {
      return parseBinarySequence(buffer);
    }, (e) => {
      throw e;
    });
  }
}

export default parseSequence;
export {FileType, RWXtag, parseBinarySequence, getJointTag};
