package com.example.capture360.ui

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.capture360.stitch.OpenCVStitcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.content.pm.PackageManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImageStitchScreen(onBack: () -> Unit) {
  val context = LocalContext.current
  val lifecycleOwner = LocalLifecycleOwner.current
  val scope = rememberCoroutineScope()

  val imageCapture = remember { ImageCapture.Builder().build() }
  var capturedImages by remember { mutableStateOf<List<String>>(emptyList()) }
  var stitchedBitmap by remember { mutableStateOf<Bitmap?>(null) }
  var isStitching by remember { mutableStateOf(false) }
  var statusText by remember { mutableStateOf("Snap 3+ overlapping photos of the room.") }

  val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }
  var previewView by remember { mutableStateOf<PreviewView?>(null) }

  var hasCameraPermission by remember {
    mutableStateOf(
      ContextCompat.checkSelfPermission(context, android.Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    )
  }

  val permissionLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestPermission(),
    onResult = { granted ->
      hasCameraPermission = granted
      if (!granted) {
        statusText = "Camera permission is required to take photos."
      }
    }
  )

  LaunchedEffect(hasCameraPermission, previewView) {
    if (!hasCameraPermission) {
      permissionLauncher.launch(android.Manifest.permission.CAMERA)
    } else if (previewView != null) {
      try {
        val cameraProvider = cameraProviderFuture.get()
        val preview = Preview.Builder().build().also {
          it.setSurfaceProvider(previewView!!.surfaceProvider)
        }

        val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
        cameraProvider.unbindAll()
        cameraProvider.bindToLifecycle(
            lifecycleOwner,
            cameraSelector,
            preview,
            imageCapture
        )
      } catch (e: Exception) {
        Log.e("ImageStitchScreen", "Use case binding failed", e)
      }
    }
  }

  fun takePhoto() {
    val outputDirectory = context.cacheDir
    val photoFile = File(
        outputDirectory,
        SimpleDateFormat("yyyy-MM-dd-HH-mm-ss-SSS", Locale.US).format(System.currentTimeMillis()) + ".jpg"
    )

    val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
    
    statusText = "Capturing photo..."
    imageCapture.takePicture(
        outputOptions,
        ContextCompat.getMainExecutor(context),
        object : ImageCapture.OnImageSavedCallback {
          override fun onError(exc: ImageCaptureException) {
            statusText = "Capture failed: ${exc.message}"
          }

          override fun onImageSaved(output: ImageCapture.OutputFileResults) {
            capturedImages = capturedImages + photoFile.absolutePath
            statusText = "Photo ${capturedImages.size} snapped. Add more overlapping shots."
          }
        }
    )
  }

  fun performStitching() {
    if (capturedImages.size < 2) {
      statusText = "Need at least 2 images to stitch."
      return
    }

    scope.launch {
      isStitching = true
      statusText = "Stitching ${capturedImages.size} photos on-device..."
      
      val result = withContext(Dispatchers.Default) {
        OpenCVStitcher.stitchImages(capturedImages)
      }

      isStitching = false
      if (result != null) {
        stitchedBitmap = result
        statusText = "Panorama stitched successfully!"
      } else {
        statusText = "Stitching failed. Make sure your images overlap significantly."
      }
    }
  }

  fun clearPhotos() {
    capturedImages.forEach { File(it).delete() }
    capturedImages = emptyList()
    stitchedBitmap = null
    statusText = "Cleared. Snap 3+ overlapping photos."
  }

  Scaffold(
      topBar = {
        TopAppBar(
            title = { Text("Option B: On-Device Camera Stitching") },
            navigationIcon = {
              IconButton(onClick = onBack) {
                Text("Back")
              }
            }
        )
      }
  ) { padding ->
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      Text(statusText, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.secondary)

      if (stitchedBitmap == null) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
          AndroidView(
              factory = { ctx ->
                PreviewView(ctx).apply {
                  layoutParams = ViewGroup.LayoutParams(
                      ViewGroup.LayoutParams.MATCH_PARENT,
                      ViewGroup.LayoutParams.MATCH_PARENT
                  )
                  previewView = this
                }
              },
              modifier = Modifier.fillMaxSize()
          )
        }

        if (capturedImages.isNotEmpty()) {
          LazyRow(
              modifier = Modifier.fillMaxWidth().height(80.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp)
          ) {
            items(capturedImages) { path ->
              Card(modifier = Modifier.width(80.dp).fillMaxHeight()) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                  Text("Photo", style = MaterialTheme.typography.labelSmall)
                }
              }
            }
          }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          Button(
              onClick = { takePhoto() },
              modifier = Modifier.weight(1f)
          ) {
            Text("Snap Photo")
          }

          Button(
              onClick = { performStitching() },
              enabled = capturedImages.size >= 2 && !isStitching,
              modifier = Modifier.weight(1f)
          ) {
            if (isStitching) {
              CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
              Text("Stitch Images")
            }
          }

          Button(
              onClick = { clearPhotos() },
              enabled = capturedImages.isNotEmpty() && !isStitching,
              colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
              modifier = Modifier.weight(0.8f)
          ) {
            Text("Clear")
          }
        }
      } else {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
          Column(
              modifier = Modifier.padding(16.dp).fillMaxSize(),
              horizontalAlignment = Alignment.CenterHorizontally,
              verticalArrangement = Arrangement.Center
          ) {
            Text("Stitched Output Preview:", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(16.dp))
            Image(
                bitmap = stitchedBitmap!!.asImageBitmap(),
                contentDescription = "Stitched Panorama",
                modifier = Modifier.fillMaxWidth().weight(1f)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = { clearPhotos() },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) {
              Text("Clear and Reset")
            }
          }
        }
      }
    }
  }
}
