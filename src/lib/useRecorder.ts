import { useCallback, useRef, useState } from 'react'

export interface Recorder {
  recording: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
}

export function useRecorder(): Recorder {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.start()
      mediaRef.current = rec
      setRecording(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied')
    }
  }, [])

  const stop = useCallback(async () => {
    const rec = mediaRef.current
    if (!rec) return null
    return new Promise<Blob | null>((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        mediaRef.current = null
        setRecording(false)
        resolve(blob.size > 0 ? blob : null)
      }
      rec.stop()
    })
  }, [])

  return { recording, error, start, stop }
}
