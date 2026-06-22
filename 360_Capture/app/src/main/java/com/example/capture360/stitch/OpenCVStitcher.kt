package com.example.capture360.stitch

import android.graphics.Bitmap
import android.util.Log
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.*
import org.opencv.features2d.BFMatcher
import org.opencv.features2d.DescriptorMatcher
import org.opencv.features2d.ORB
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import org.opencv.calib3d.Calib3d
import java.io.File

object OpenCVStitcher {
    private const val TAG = "OpenCVStitcher"

    init {
        try {
            if (OpenCVLoader.initLocal()) {
                Log.d(TAG, "OpenCV library loaded successfully.")
            } else {
                Log.e(TAG, "OpenCV library loading failed.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing OpenCV: ${e.message}", e)
        }
    }

    fun stitchImages(imagePaths: List<String>): Bitmap? {
        if (imagePaths.size < 2) {
            Log.e(TAG, "At least 2 images are required for stitching.")
            return null
        }

        try {
            // Load the first image as base
            var baseMat = Imgcodecs.imread(imagePaths[0])
            if (baseMat.empty()) {
                Log.e(TAG, "Failed to read image: ${imagePaths[0]}")
                return null
            }

            // Convert base to RGB (OpenCV reads in BGR by default)
            Imgproc.cvtColor(baseMat, baseMat, Imgproc.COLOR_BGR2RGB)

            // Stitch other images one by one
            for (i in 1 until imagePaths.size) {
                val nextMat = Imgcodecs.imread(imagePaths[i])
                if (nextMat.empty()) {
                    Log.e(TAG, "Failed to read image: ${imagePaths[i]}")
                    baseMat.release()
                    return null
                }
                Imgproc.cvtColor(nextMat, nextMat, Imgproc.COLOR_BGR2RGB)

                val stitched = stitchTwoImages(baseMat, nextMat)
                nextMat.release()
                if (stitched == null) {
                    Log.e(TAG, "Failed to stitch image at index $i")
                    baseMat.release()
                    return null
                }
                baseMat.release()
                baseMat = stitched
            }

            // Convert final Mat back to Bitmap
            val bitmap = Bitmap.createBitmap(baseMat.cols(), baseMat.rows(), Bitmap.Config.ARGB_8888)
            Utils.matToBitmap(baseMat, bitmap)
            baseMat.release()
            return bitmap
        } catch (e: Exception) {
            Log.e(TAG, "Stitching process threw an exception: ${e.message}", e)
            return null
        }
    }

    private fun stitchTwoImages(img1: Mat, img2: Mat): Mat? {
        try {
            // 1. Detect ORB features and compute descriptors
            val orb = ORB.create(1000)
            val keypoints1 = MatOfKeyPoint()
            val keypoints2 = MatOfKeyPoint()
            val descriptors1 = Mat()
            val descriptors2 = Mat()

            orb.detectAndCompute(img1, Mat(), keypoints1, descriptors1)
            orb.detectAndCompute(img2, Mat(), keypoints2, descriptors2)

            if (descriptors1.empty() || descriptors2.empty()) {
                Log.e(TAG, "Empty descriptors, keypoint detection failed.")
                return null
            }

            // 2. Match descriptors using Brute-Force Hamming
            val matcher = BFMatcher.create(DescriptorMatcher.BRUTEFORCE_HAMMING, true)
            val matches = MatOfDMatch()
            matcher.match(descriptors1, descriptors2, matches)

            val matchesList = matches.toList()
            if (matchesList.size < 4) {
                Log.e(TAG, "Not enough matches to compute Homography (need at least 4).")
                return null
            }

            // Sort matches by distance
            val sortedMatches = matchesList.sortedBy { it.distance }
            // Keep the best matches
            val goodMatches = sortedMatches.take(100)

            // 3. Extract matching points
            val objPoints = ArrayList<Point>()
            val scenePoints = ArrayList<Point>()
            val kp1List = keypoints1.toList()
            val kp2List = keypoints2.toList()

            for (match in goodMatches) {
                objPoints.add(kp1List[match.queryIdx].pt)
                scenePoints.add(kp2List[match.trainIdx].pt)
            }

            val objMat = MatOfPoint2f()
            objMat.fromList(objPoints)
            val sceneMat = MatOfPoint2f()
            sceneMat.fromList(scenePoints)

            // 4. Find Homography
            val H = Calib3d.findHomography(sceneMat, objMat, Calib3d.RANSAC, 5.0)
            if (H.empty()) {
                Log.e(TAG, "Homography estimation failed.")
                return null
            }

            // 5. Warp img2 onto img1's coordinate system
            val result = Mat()
            // The warped image needs space for both images
            val width = img1.cols() + img2.cols()
            val height = maxOf(img1.rows(), img2.rows())
            val size = Size(width.toDouble(), height.toDouble())

            Imgproc.warpPerspective(img2, result, H, size)

            // 6. Copy img1 on top of the warped img2
            val roi = Mat(result, Rect(0, 0, img1.cols(), img1.rows()))
            img1.copyTo(roi)

            // 7. Crop black borders
            val cropped = cropBlackBorders(result)
            result.release()
            H.release()

            return cropped
        } catch (e: Exception) {
            Log.e(TAG, "Error stitching two images: ${e.message}", e)
            return null
        }
    }

    private fun cropBlackBorders(image: Mat): Mat {
        // Convert to grayscale to find non-zero pixels
        val gray = Mat()
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_RGB2GRAY)
        
        // Find threshold/non-black region
        val nonZeroPixels = Mat()
        Core.findNonZero(gray, nonZeroPixels)
        
        if (nonZeroPixels.empty()) {
            gray.release()
            return image
        }
        
        // Find bounding rect of all non-zero pixels
        val minMaxRect = Imgproc.boundingRect(nonZeroPixels)
        gray.release()
        nonZeroPixels.release()
        
        // Crop the original image to this rect
        return Mat(image, minMaxRect)
    }
}
