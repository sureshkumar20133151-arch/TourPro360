import { supabase } from './supabase'

export async function uploadRoomPhoto(projectId, roomId, file) {
  // Compress if over 8MB
  let uploadFile = file
  if (file.size > 8 * 1024 * 1024) {
    try {
      const imageCompression = (await import('browser-image-compression')).default
      uploadFile = await imageCompression(file, {
        maxSizeMB: 7,
        maxWidthOrHeight: 5760,
        useWebWorker: true
      })
    } catch (e) {
      console.warn('Compression failed, uploading original', e)
    }
  }

  const filePath = `tours/${projectId}/${roomId}.jpg`
  const { error } = await supabase.storage
    .from('tours')
    .upload(filePath, uploadFile, {
      contentType: 'image/jpeg',
      upsert: true
    })

  if (error) throw error

  const { data } = supabase.storage.from('tours').getPublicUrl(filePath)
  return data.publicUrl
}

export async function uploadFloorplan(projectId, file) {
  // Compress if over 8MB
  let uploadFile = file
  if (file.size > 8 * 1024 * 1024) {
    try {
      const imageCompression = (await import('browser-image-compression')).default
      uploadFile = await imageCompression(file, {
        maxSizeMB: 7,
        maxWidthOrHeight: 4096,
        useWebWorker: true
      })
    } catch (e) {
      console.warn('Compression failed, uploading original', e)
    }
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `tours/${projectId}/floorplan.${fileExt}`
  const { error } = await supabase.storage
    .from('tours')
    .upload(filePath, uploadFile, {
      contentType: file.type,
      upsert: true
    })

  if (error) throw error

  const { data } = supabase.storage.from('tours').getPublicUrl(filePath)
  return data.publicUrl
}

export async function uploadWalkthrough(projectId, file) {
  const fileExt = file.name.split('.').pop().toLowerCase()
  const filePath = `tours/${projectId}/walkthrough.${fileExt}`
  const { error } = await supabase.storage
    .from('tours')
    .upload(filePath, file, {
      contentType: 'application/octet-stream',
      upsert: true
    })

  if (error) throw error

  const { data } = supabase.storage.from('tours').getPublicUrl(filePath)
  return data.publicUrl
}

