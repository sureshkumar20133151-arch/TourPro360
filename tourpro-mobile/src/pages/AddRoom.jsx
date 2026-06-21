import { useState } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const ROOM_PRESETS = [
  'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Kitchen', 'Dining Room', 'Bathroom', 'Master Bathroom',
  'Balcony', 'Terrace', 'Parking', 'Pooja Room',
  'Study Room', 'Hall', 'Store Room', 'Entrance'
]

export default function AddRoom() {
  const { id: projectId } = useParams()
  const [roomName, setRoomName] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState(null)
  const [photoBlob, setPhotoBlob] = useState(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const pickPhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      })
      if (image.dataUrl) {
        setPhotoDataUrl(image.dataUrl)
        // Convert dataUrl to blob for upload
        const res = await fetch(image.dataUrl)
        const blob = await res.blob()
        setPhotoBlob(blob)
      }
    } catch (err) {
      console.warn('User cancelled photo picker or permission denied', err)
    }
  }

  const handleSave = async () => {
    if (!roomName || !photoBlob) {
      alert('Please select a name and photo for this room.')
      return
    }
    setSaving(true)

    try {
      // 1. Create room record first to get UUID
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({ project_id: projectId, room_name: roomName })
        .select()
        .single()

      if (roomErr || !room) throw roomErr || new Error('Could not create room row')

      // 2. Upload photo to Supabase Storage
      const filePath = `tours/${projectId}/${room.id}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('tours')
        .upload(filePath, photoBlob, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) throw uploadError

      // 3. Get public URL and update room record
      const { data: urlData } = supabase.storage.from('tours').getPublicUrl(filePath)
      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', room.id)

      if (updateErr) throw updateErr

      navigate(`/project/${projectId}/rooms`)
    } catch (err) {
      alert('Error saving room: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 pb-12 text-white">
      {/* Back button */}
      <button
        onClick={() => navigate(`/project/${projectId}/rooms`)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 text-sm cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Rooms
      </button>

      <h1 className="text-xl font-bold text-white mb-6 font-display">Add Room</h1>

      <div className="mb-6">
        <label className="text-gray-400 text-sm mb-2 block font-medium">Room Name *</label>
        <input
          placeholder="e.g. Living Room"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm mb-3"
        />
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-900 border border-gray-800 rounded-lg">
          {ROOM_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => setRoomName(preset)}
              className={`text-[10px] px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                roomName === preset
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-gray-400 text-sm mb-2 block font-medium">360° Photo *</label>
        {photoDataUrl ? (
          <div className="relative border border-gray-800 rounded-xl overflow-hidden">
            <img src={photoDataUrl} alt="360 preview" className="w-full h-48 object-cover" />
            <button
              onClick={pickPhoto}
              className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer"
            >
              Change Photo
            </button>
          </div>
        ) : (
          <button
            onClick={pickPhoto}
            className="w-full h-48 bg-gray-900 border-2 border-dashed border-gray-850 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-orange-500 transition-colors cursor-pointer"
          >
            <span className="text-3xl mb-2">📷</span>
            <span className="text-xs font-semibold">Tap to select 360° photo from gallery</span>
            <span className="text-[10px] mt-1 text-gray-500">(from Insta360 app)</span>
          </button>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!roomName || !photoBlob || saving}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl transition-colors cursor-pointer text-sm"
      >
        {saving ? 'Saving...' : 'Save Room'}
      </button>
    </div>
  )
}
