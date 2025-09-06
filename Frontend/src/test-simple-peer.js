// Test file to check simple-peer import
import SimplePeer from 'simple-peer';

console.log('Test file - SimplePeer:', SimplePeer);
console.log('Test file - SimplePeer type:', typeof SimplePeer);
console.log('Test file - SimplePeer.default:', SimplePeer.default);

const Peer = SimplePeer.default || SimplePeer;
console.log('Test file - Final Peer:', Peer);
console.log('Test file - Final Peer type:', typeof Peer);

try {
  const testPeer = new Peer({
    initiator: true,
    config: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }
  });
  console.log('Test file - Peer created successfully:', testPeer);
  testPeer.destroy();
} catch (error) {
  console.error('Test file - Error creating peer:', error);
}

export { Peer };