package com.example.capture360.camera

import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

// OSC Data Classes
data class OscInfo(
    val manufacturer: String,
    val model: String,
    val serialNumber: String,
    val firmwareVersion: String
)

data class OscStateResponse(
    val state: OscState
)

data class OscState(
    val batteryLevel: Double,
    val storageUri: String?,
    @SerializedName("_batteryState") val batteryState: String?
)

data class OscCommandRequest(
    val name: String,
    val parameters: Map<String, Any>? = null
)

data class OscCommandResponse(
    val name: String,
    val state: String, // "done", "inProgress", "error"
    val id: String?,
    val results: Map<String, Any>?,
    val error: OscError?
)

data class OscError(
    val code: String,
    val message: String
)

// Retrofit API Service
interface OscCameraService {
    @GET("/osc/info")
    suspend fun getInfo(): OscInfo

    @POST("/osc/state")
    suspend fun getState(): OscStateResponse

    @POST("/osc/commands/execute")
    suspend fun executeCommand(@Body request: OscCommandRequest): OscCommandResponse
}

// Client Factory
object OscCameraClient {
    private const val BASE_URL = "http://192.168.1.1/" // Standard OSC Camera IP

    val service: OscCameraService by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(5, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(OscCameraService::class.java)
    }
}
