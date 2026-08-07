let io = null;

export function initSocket(serverIo) {
  io = serverIo;
}

export function getIO() {
  return io;
}

export default { initSocket, getIO };
