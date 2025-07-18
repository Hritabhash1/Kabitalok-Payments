import { useEffect, useRef, useState } from 'react';

export default function WebCamCapture({ onCapture }) {
  const videoRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // First-time camera enable
  const enableCamera = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = newStream;
      setStream(newStream);

      // Now we can enumerate devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Permission or device error:', err);
      alert('Camera access is required to continue.');
    }
  };

  // Switch to a specific camera
  const switchCamera = async (deviceId) => {
    if (stream) stopStream();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      if (videoRef.current) videoRef.current.srcObject = newStream;
      setStream(newStream);
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  };

  const stopStream = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStream(null);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/png');
    setCapturedImage(imageData);
    stopStream();
  };

  const handleRetry = () => {
    setCapturedImage(null);
    if (selectedDeviceId) {
      switchCamera(selectedDeviceId);
    } else {
      enableCamera();
    }
  };

  const handleSave = () => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage);
      alert('Photo saved successfully!');
    }
  };

  // Stop camera on unmount
  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>📷 Camera Capture</h2>

      <div style={{ marginBottom: 16 }}>
        {devices.length > 0 && (
          <select
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              switchCamera(e.target.value);
            }}
            value={selectedDeviceId}
            style={{ padding: '8px', borderRadius: '6px', minWidth: '200px' }}
          >
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {!capturedImage ? (
        <div>
          {!stream && (
            <button
              onClick={enableCamera}
              style={buttonStyle('#2196F3')}
            >
              🎥 Enable Camera
            </button>
          )}

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              maxWidth: 400,
              borderRadius: 12,
              backgroundColor: '#000',
            }}
          />
          <br />
          <button
            onClick={handleCapture}
            style={{ ...buttonStyle('#4CAF50'), marginTop: 16 }}
          >
            📸 Capture Photo
          </button>
        </div>
      ) : (
        <div>
          <h3>Captured Photo:</h3>
          <img
            src={capturedImage}
            alt="Captured"
            style={{
              width: '100%',
              maxWidth: 400,
              borderRadius: 12,
              border: '2px solid #2196F3',
            }}
          />
          <br />
          <button
            onClick={handleRetry}
            style={{ ...buttonStyle('#FF9800'), marginTop: 16, marginRight: 12 }}
          >
            🔄 Retry
          </button>
          <button
            onClick={handleSave}
            style={{ ...buttonStyle('#4CAF50'), marginTop: 16 }}
          >
            ✅ Save Photo
          </button>
        </div>
      )}

      {capturedImage && (
        <div style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
          <small>Image captured successfully! Click Save to use it.</small>
        </div>
      )}
    </div>
  );
}

function buttonStyle(bg) {
  return {
    padding: '10px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    fontSize: '16px',
  };
}
