const crypto = require('crypto');

class HLSStreamGenerator {
  constructor() {
    this.segmentDuration = 10; // seconds
    this.segmentCount = 0;
    this.currentTrack = { title: 'Welcome to Radiocalico', artist: 'Live Stream' };
    this.lastUpdateTime = Date.now();
  }

  setTrack(title, artist) {
    this.currentTrack = { title, artist };
    this.lastUpdateTime = Date.now();
  }

  generateID3Metadata(title, artist) {
    // ID3v2.3 frame format
    const createTextFrame = (frameId, text) => {
      const textBuf = Buffer.from(text, 'utf8');
      const frame = Buffer.alloc(frameId.length + 6 + textBuf.length);
      Buffer.from(frameId).copy(frame, 0);
      frame[4] = 0x00; // flags
      frame[5] = 0x01; // encoding (UTF-8)
      textBuf.copy(frame, 6);
      return frame;
    };

    const tit2Frame = createTextFrame('TIT2', title); // Title
    const tpe1Frame = createTextFrame('TPE1', artist); // Artist

    const frames = Buffer.concat([tit2Frame, tpe1Frame]);
    const frameSize = frames.length;

    // ID3v2 header
    const id3Header = Buffer.alloc(10);
    id3Header[0] = 0x49; // 'I'
    id3Header[1] = 0x44; // 'D'
    id3Header[2] = 0x33; // '3'
    id3Header[3] = 0x03; // Version 2.3
    id3Header[4] = 0x00; // Revision
    id3Header[5] = 0x00; // Flags
    // Size (synchsafe integer)
    id3Header[6] = (frameSize >> 21) & 0x7F;
    id3Header[7] = (frameSize >> 14) & 0x7F;
    id3Header[8] = (frameSize >> 7) & 0x7F;
    id3Header[9] = frameSize & 0x7F;

    return Buffer.concat([id3Header, frames]);
  }

  generateSegment(segmentIndex) {
    // Generate minimal MPEG-TS segment with ID3 metadata
    // This is a simplified version - a real implementation would use proper encoding

    const id3Metadata = this.generateID3Metadata(
      this.currentTrack.title,
      this.currentTrack.artist
    );

    // MPEG-TS PAT (Program Association Table) packet
    const patPacket = Buffer.alloc(188);
    patPacket[0] = 0x47; // Sync byte
    patPacket[1] = 0x40; // PID 0
    patPacket[2] = 0x00;
    patPacket[3] = 0x10; // CC = 0

    // MPEG-TS PMT (Program Map Table) packet
    const pmtPacket = Buffer.alloc(188);
    pmtPacket[0] = 0x47; // Sync byte
    pmtPacket[1] = 0x41; // PID 0x100
    pmtPacket[2] = 0x00;
    pmtPacket[3] = 0x10;

    // Combine with ID3 metadata
    const segment = Buffer.concat([id3Metadata, patPacket, pmtPacket]);

    // Pad to reasonable size
    if (segment.length < 1000) {
      const padding = Buffer.alloc(1000 - segment.length);
      return Buffer.concat([segment, padding]);
    }

    return segment;
  }

  generateManifest() {
    const now = new Date();
    const manifests = [];

    // Generate master manifest
    const master = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${this.segmentDuration}
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:${this.segmentDuration},
segment-0.ts
#EXTINF:${this.segmentDuration},
segment-1.ts
#EXTINF:${this.segmentDuration},
segment-2.ts
#EXTINF:${this.segmentDuration},
segment-3.ts
`;

    return master;
  }
}

module.exports = HLSStreamGenerator;
