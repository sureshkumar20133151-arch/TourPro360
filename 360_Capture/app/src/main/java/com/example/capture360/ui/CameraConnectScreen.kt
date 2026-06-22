package com.example.capture360.ui

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.capture360.camera.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CameraConnectScreen(onBack: () -> Unit) {
  val scope = rememberCoroutineScope()
  var cameraInfo by remember { mutableStateOf<OscInfo?>(null) }
  var cameraState by remember { mutableStateOf<OscState?>(null) }
  var statusText by remember { mutableStateOf("Disconnected") }
  var isCapturing by remember { mutableStateOf(false) }
  var capturedImageUri by remember { mutableStateOf<String?>(null) }
  var isConnected by remember { mutableStateOf(false) }

  fun checkConnection() {
    scope.launch {
      statusText = "Connecting..."
      try {
        val realInfo = withContext(Dispatchers.IO) { OscCameraClient.service.getInfo() }
        cameraInfo = realInfo
        val realState = withContext(Dispatchers.IO) { OscCameraClient.service.getState() }
        cameraState = realState.state
        statusText = "Connected to ${realInfo.model}"
        isConnected = true
      } catch (e: Exception) {
        statusText = "Failed to connect: Camera Wi-Fi not connected."
        isConnected = false
      }
    }
  }

  fun triggerCapture() {
    scope.launch {
      if (!isConnected) {
        statusText = "Please connect to the Camera's Wi-Fi hotspot first."
        return@launch
      }
      isCapturing = true
      statusText = "Triggering shutter..."
      try {
        val response = withContext(Dispatchers.IO) {
          OscCameraClient.service.executeCommand(
              OscCommandRequest(name = "camera.takePicture")
          )
        }
        
        var commandId = response.id
        var state = response.state
        
        while (state == "inProgress" && commandId != null) {
          delay(1000)
          val pollResponse = withContext(Dispatchers.IO) {
            OscCameraClient.service.executeCommand(
                OscCommandRequest(name = "camera.showStatus", parameters = mapOf("id" to commandId!!))
            )
          }
          state = pollResponse.state
          statusText = "Processing 360 image stitching..."
        }
        
        statusText = "Retrieving stitched 360 photo..."
        val listFilesResponse = withContext(Dispatchers.IO) {
          OscCameraClient.service.executeCommand(
              OscCommandRequest(
                  name = "camera.listFiles",
                  parameters = mapOf("entryCount" to 1, "fileType" to "image")
              )
          )
        }
        
        val results = listFilesResponse.results
        val entries = results?.get("entries") as? List<Map<String, Any>>
        val fileUrl = entries?.firstOrNull()?.get("fileUrl") as? String
        
        if (fileUrl != null) {
          capturedImageUri = fileUrl
          statusText = "360 Image captured successfully!"
        } else {
          statusText = "Error: Stitched image file URL not found."
        }
      } catch (e: Exception) {
        statusText = "Capture failed: ${e.localizedMessage}"
      } finally {
        isCapturing = false
      }
    }
  }

  Scaffold(
      topBar = {
        TopAppBar(
            title = { Text("Option A: 360 Camera Capture") },
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
      Card(
          modifier = Modifier.fillMaxWidth()
      ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          Text("Connection Status:", style = MaterialTheme.typography.titleMedium)
          Text(statusText, color = if (isConnected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
          
          if (isConnected && cameraInfo != null) {
            HorizontalDivider()
            Text("Camera Model: ${cameraInfo!!.model} (${cameraInfo!!.manufacturer})")
            Text("Serial Number: ${cameraInfo!!.serialNumber}")
            cameraState?.let {
              Text("Battery Level: ${(it.batteryLevel * 100).toInt()}%")
            }
          }
        }
      }

      Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        Button(
            onClick = { checkConnection() },
            modifier = Modifier.weight(1f)
        ) {
          Text("Check Connection")
        }
        
        Button(
            onClick = { triggerCapture() },
            enabled = isConnected && !isCapturing,
            modifier = Modifier.weight(1f)
        ) {
          if (isCapturing) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
          } else {
            Text("Capture 360")
          }
        }
      }

      if (capturedImageUri != null) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
          Column(
              modifier = Modifier.padding(8.dp),
              verticalArrangement = Arrangement.spacedBy(8.dp)
          ) {
            Text("360° Live Preview:", style = MaterialTheme.typography.titleMedium)
            
            AndroidView(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                factory = { context ->
                  WebView(context).apply {
                    webViewClient = WebViewClient()
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.allowFileAccessFromFileURLs = true
                    settings.allowUniversalAccessFromFileURLs = true
                    
                    val html = """
                      <!DOCTYPE html>
                      <html>
                      <head>
                          <meta charset="utf-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <title>Pannellum 360 Viewer</title>
                          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
                          <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
                          <style>
                          #panorama {
                              width: 100vw;
                              height: 100vh;
                              margin: 0;
                              padding: 0;
                          }
                          </style>
                      </head>
                      <body>
                      <div id="panorama"></div>
                      <script>
                      pannellum.viewer('panorama', {
                          "type": "equirectangular",
                          "panorama": "$capturedImageUri",
                          "autoLoad": true,
                          "showFullscreenCtrl": false
                      });
                      </script>
                      </body>
                      </html>
                    """.trimIndent()
                    loadDataWithBaseURL("https://pannellum.org", html, "text/html", "UTF-8", null)
                  }
                }
            )
          }
        }
      } else {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentAlignment = Alignment.Center
        ) {
          Text("Connect to camera Wi-Fi and tap Capture to view 360 panorama.", style = MaterialTheme.typography.bodyMedium)
        }
      }
    }
  }
}
