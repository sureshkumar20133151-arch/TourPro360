package com.example.capture360

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable data object Main : NavKey
@Serializable data object CameraConnect : NavKey
@Serializable data object ImageStitch : NavKey
