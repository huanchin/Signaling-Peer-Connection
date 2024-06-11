const userName = "Huan-" + Math.floor(Math.random() * 100000);
const password = "x";
document.querySelector("#user-name").innerHTML = userName;

// 10) CLIENT2 loads up the webpage with io.connect()
const socket = io.connect("https://localhost:3000", {
  auth: {
    userName,
    password,
  },
});

const localVideoEl = document.querySelector("#local-video");
const remoteVideoEl = document.querySelector("#remote-video");

let localStream; //a var to hold the local video stream
let remoteStream; //a var to hold the remote video stream
let peerConnection; //the peerConnection that the two clients use to talk
let didIOffer = false;

let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const fetchUserMedia = () =>
  new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        // audio: true,
      });
      localVideoEl.srcObject = stream;
      localStream = stream;
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const createPeerConnection = (offerObj) =>
  new Promise(async (resolve, reject) => {
    try {
      // RTCPeerConnection is the thing that creates the connection
      // we can pass a config object, and that config object can contain stun servers
      // which will fetch us ICE candidates
      // 3) peerConnection needs STUN servers, we will need ICE candidates later
      peerConnection = await new RTCPeerConnection(peerConfiguration);

      // 4) CLIENT1 add localstream tracks to peerConnection
      // 14) CLIENT2 adds localstream tracks to peerconnection
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      // 7) ICE candidates can now start coming in
      // 18) when setLocalDescription, start collecting ICE candidates (ASYNC)
      peerConnection.addEventListener("icecandidate", (e) => {
        console.log("****** ICE Candidate event ******");
        console.log(e);
        if (e.candidate) {
          // 9) Once 7 happens, emit ICE c. up to signaling server
          socket.emit("sendIceCandidateToSignalingServer", {
            iceCandidate: e.candidate,
            iceUserName: userName,
            didIOffer,
          });
        }
      });

      // 17) Because CLIENT2 has the offer, CLIENT2 can hand the offer to pc.setRemoteDescription
      if (offerObj) {
        // this won't be set when called from call();
        // will be set when we call from answerOffer()
        // console.log(peerConnection.signalingState) //should be stable because no setDesc has been run yet
        await peerConnection.setRemoteDescription(offerObj.offer);
        // console.log(peerConnection.signalingState) //should be have-remote-offer, because client2 has setRemoteDesc on the offer
      }

      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const answerOffer = async (offerObj) => {
  // 12) CLIENT2 runs getUserMedia()
  await fetchUserMedia();

  // 13) CLIENT2 creates a peerConnection()
  await createPeerConnection(offerObj);

  // 15) CLIENT2 creates an answer (createAnswer());
  const answer = await peerConnection.createAnswer({}); //just to make the docs happy

  // 16) CLIENT2 hands answer to pc.setLocalDescription
  await peerConnection.setLocalDescription(answer); //this is CLIENT2, and CLIENT2 uses the answer as the localDesc
  console.log(offerObj);
  console.log(answer);
  // console.log(peerConnection.signalingState) //should be have-local-pranswer because CLIENT2 has set its local desc to it's answer (but it won't be)
  //add the answer to the offerObj so the server knows which offer this is related to
  offerObj.answer = answer;
  //emit the answer to the signaling server, so it can emit to CLIENT1
  //expect a response from the server with the already existing ICE candidates
  const offerIceCandidates = await socket.emitWithAck("newAnswer", offerObj);
  offerIceCandidates.forEach((c) => {
    peerConnection.addIceCandidate(c);
    console.log("======Added Ice Candidate======");
  });
  console.log(offerIceCandidates);
};

//when a client initiates a call
const call = async (e) => {
  try {
    // 1) Someone must getUserMedia() - CLIENT1/Init/Caller/Offerer
    await fetchUserMedia();

    // 2) CLIENT1 creates RTCPeerConnection
    await createPeerConnection();

    // 5) CLIENT1 creates an offer
    const offerSessionDescription = await peerConnection.createOffer();
    console.log("****** offer/ SDP ******");
    console.log(offerSessionDescription);
    didIOffer = true;

    // 6) CLIENT1 hands offer to pc.setLocalDescription
    // setLocalDescription will trigger icecandidate event
    peerConnection.setLocalDescription(offerSessionDescription);

    // 8) CLIENT1 emits offer
    socket.emit("newOffer", offerSessionDescription);
  } catch (err) {
    console.log(err);
  }
};

document.querySelector("#call").addEventListener("click", call);
