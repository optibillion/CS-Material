import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'

export default function CameraModal({ open, onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setReady(false)
    setError('')

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      })
      .catch(() => setError('Camera access denied. Please allow camera permission and try again.'))

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [open])

  function handleClose() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    onClose()
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
      handleClose()
    }, 'image/jpeg', 0.9)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <button onClick={handleClose} className="text-white p-1"><X size={22} /></button>
        <span className="text-white text-sm font-medium">Take Photo</span>
        <div className="w-8" />
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <Camera size={40} className="text-[#6b7280]" />
          <p className="text-[#9ca3af] text-sm">{error}</p>
          <button onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-[#2a2a45] text-white text-sm">Close</button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="flex-1 w-full object-cover"
          />
          <div className="bg-black py-8 flex justify-center">
            <button
              onClick={capture}
              disabled={!ready}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40"
              style={{ width: 72, height: 72 }}
            >
              <div className="w-14 h-14 rounded-full bg-white" style={{ width: 56, height: 56 }} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
