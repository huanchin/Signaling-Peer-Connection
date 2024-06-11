const https = require("https");
const fs = require("fs");
const path = require("path");
const express = require("express");
const socketio = require("socket.io");

const app = express();

app.use(express.static(path.join(__dirname)));

//we need a key and cert to run https
//we generated them with mkcert
// $ mkcert create-ca
// $ mkcert create-cert
const key = fs.readFileSync("cert.key");
const cert = fs.readFileSync("cert.crt");

// we change our express setup so we can use https
// pass the key and cert to createServer on https
const expressServer = https.createServer({ key, cert }, app);

//create our socket.io server... it will listen to our express port
const io = socketio(expressServer);

const offers = [
  // offererUserName
  // offer
  // offerIceCandidate
  // answererUserName
  // answer
  // answerIceCandidate
];

const connectedSockets = [
  //username, socketId
];

io.on("connection", (socket) => {
  console.log("someone has connected");

  const userName = socket.handshake.auth.userName;
  const password = socket.handshake.auth.password;

  if (password !== "x") {
    socket.disconnect(true);
    return;
  }
  connectedSockets.push({
    socketId: socket.id,
    userName,
  });

  // 11) socket.io emit out the RTCSessionDesc to the new client
  // a new client has joined. If there are any offers available,
  // emit them out
  if (offers.length) {
    socket.emit("availableOffers", offers);
  }

  // store offer of offerer
  socket.on("newOffer", (newOffer) => {
    offers.push({
      offererUserName: userName,
      offer: newOffer,
      offerIceCandidates: [],
      answererUserName: null,
      answer: null,
      answererIceCandidates: [],
    });
    // console.log(newOffer.sdp.slice(50))
    //send out to all connected sockets EXCEPT the caller
    console.log(offers.length);
    socket.broadcast.emit("newOfferAwaiting", offers.slice(-1));
  });

  // store ice candidate of offerer
  socket.on("sendIceCandidateToSignalingServer", (iceCandidateObj) => {
    const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;
    console.log(iceCandidate);
    if (didIOffer) {
      const offerInOffers = offers.find(
        (o) => o.offererUserName === iceUserName
      );
      if (offerInOffers) {
        offerInOffers.offerIceCandidates.push(iceCandidate);
      }
    }
  });
});

expressServer.listen(3000, () => {
  console.log("App running on port 3000");
});
