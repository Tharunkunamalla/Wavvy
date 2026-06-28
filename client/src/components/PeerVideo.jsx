import React, { useEffect, useRef } from "react";

const PeerVideo = ({ stream, isLocal }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="w-full h-full object-cover rounded-lg border border-white/10 shadow-lg"
    />
  );
};

export default PeerVideo;
