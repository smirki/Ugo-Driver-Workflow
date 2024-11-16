const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let drivers = {};
let riders = {};

app.use(express.static('public'));


io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register', (data) => {
    if (data.type === 'driver') {
      drivers[socket.id] = { available: false };
    } else if (data.type === 'rider') {
      riders[socket.id] = {};
    }
    io.emit('update', { drivers, riders });
  });

  socket.on('setAvailability', (available) => {
    if (drivers[socket.id] !== undefined) {
      drivers[socket.id].available = available;
      io.emit('update', { drivers, riders });
    }
  });

  socket.on('requestRide', () => {
    const availableDriver = Object.keys(drivers).find((driverId) => drivers[driverId].available);
    if (availableDriver) {
      io.to(availableDriver).emit('rideRequested', { riderId: socket.id });
    }
  });
  
  socket.on('rideDeclined', () => {
    showToast('No drivers available at the moment. Please try again later.');
  });
  

  socket.on('rideResponse', (data) => {
    if (data.accepted) {
      drivers[socket.id].available = false;
      io.to(data.riderId).emit('rideAccepted', { driverId: socket.id });
    } else {
      const nextDriverId = findNextAvailableDriver(socket.id, drivers);
      if (nextDriverId) {
        io.to(nextDriverId).emit('rideRequested', { riderId: data.riderId });
      } else {
        io.to(data.riderId).emit('rideDeclined');
      }
    }
    io.emit('update', { drivers, riders });
  });
  

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete drivers[socket.id];
    delete riders[socket.id];
    io.emit('update', { drivers, riders });
  });
  socket.on('completeRide', () => {
    if (drivers[socket.id] !== undefined) {
      drivers[socket.id].available = true;
      io.emit('update', { drivers, riders });
    }
  });
});


  
  

function findNextAvailableDriver(currentDriverId, drivers) {
    const driverIds = Object.keys(drivers);
    const currentIndex = driverIds.indexOf(currentDriverId);
    for (let i = currentIndex + 1; i < driverIds.length; i++) {
      if (drivers[driverIds[i]].available) {
        return driverIds[i];
      }
    }
    return null;
  }
  


server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
