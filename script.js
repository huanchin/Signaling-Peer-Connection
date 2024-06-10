const localVideoEl = document.querySelector("#local-video");
const remoteVideoEl = document.querySelector("#remote-video");

let localStream; //a var to hold the local video stream
let remoteStream; //a var to hold the remote video stream
let peerConnection; //the peerConnection that the two clients use to talk

let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

/** 
const fetchUserMedia = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      // audio: true,
    });
    localVideoEl.srcObject = stream;
    localStream = stream;
  } catch (err) {
    console.log(err);
  }
};
*/

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

/*
const createPeerConnection = async () => {
  try {
    //RTCPeerConnection is the thing that creates the connection
    //we can pass a config object, and that config object can contain stun servers
    //which will fetch us ICE candidates
    peerConnection = await new RTCPeerConnection(peerConfiguration);
    peerConnection.addEventListener("icecandidate", (e) => {
      console.log("......ICE Candidate event......");
      console.log(e);
    });
  } catch (err) {
    console.log(err);
  }
};
*/

const createPeerConnection = () =>
  new Promise(async (resolve, reject) => {
    try {
      // RTCPeerConnection is the thing that creates the connection
      // we can pass a config object, and that config object can contain stun servers
      // which will fetch us ICE candidates
      // 2-1)
      peerConnection = await new RTCPeerConnection(peerConfiguration);

      // 2-2) Adds each track from the stream to the peer connection
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.addEventListener("icecandidate", (e) => {
        console.log("****** ICE Candidate event ******");
        console.log(e);
      });
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

//when a client initiates a call
const call = async (e) => {
  try {
    // 1) get stream from GUM
    await fetchUserMedia();

    // 2) create peer connection and get ICE candidate
    await createPeerConnection();

    // 3) create offer (generate SDP)
    const offerSessionDescription = await peerConnection.createOffer();
    console.log("****** offer/ SDP ******");
    console.log(offerSessionDescription);

    // 4) Changes the local description associated with the connection
    // setLocalDescription will trigger icecandidate event
    peerConnection.setLocalDescription(offerSessionDescription);
  } catch (err) {
    console.log(err);
  }
};

document.querySelector("#call").addEventListener("click", call);
