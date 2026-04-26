let ioInstance = null;

export const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
};

