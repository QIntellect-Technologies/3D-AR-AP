package com.android3darapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfDouble
import org.opencv.imgproc.Imgproc
import org.opencv.android.Utils
import java.io.File

class ImageQualityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ImageQuality"

    // ✅ Helper: RN sometimes passes "file:///..."
    private fun normalizePath(path: String): String {
        return if (path.startsWith("file://")) path.removePrefix("file://") else path
    }

    @ReactMethod
    fun checkBlur(imagePath: String, promise: Promise) {
        Log.d("ImageQuality", "checkBlur called with path: $imagePath")

        try {
            val realPath = normalizePath(imagePath)
            val file = File(realPath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Image file not found")
                return
            }

            // Downscale for faster processing
            val options = BitmapFactory.Options().apply { inSampleSize = 4 }
            val bitmap: Bitmap = BitmapFactory.decodeFile(realPath, options)
                ?: run {
                    promise.reject("DECODE_FAILED", "Cannot decode image")
                    return
                }

            val mat = Mat(bitmap.height, bitmap.width, CvType.CV_8UC4)
            Utils.bitmapToMat(bitmap, mat)

            val gray = Mat()
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_RGBA2GRAY)

            val laplacian = Mat()
            Imgproc.Laplacian(gray, laplacian, CvType.CV_64F)

            val mean = MatOfDouble()
            val stddev = MatOfDouble()
            Core.meanStdDev(laplacian, mean, stddev)

            val variance = stddev.get(0, 0)[0] * stddev.get(0, 0)[0]

            mat.release()
            gray.release()
            laplacian.release()
            bitmap.recycle()

            Log.d("ImageQuality", "Computed variance: $variance")
            promise.resolve(variance)
        } catch (e: Exception) {
            Log.e("ImageQuality", "Error in checkBlur", e)
            promise.reject("NATIVE_ERROR", e.message ?: "Unknown error")
        }
    }

    // ✅ NEW: Exposure check (returns "normal" | "underexposed" | "overexposed")
    @ReactMethod
    fun checkExposure(imagePath: String, promise: Promise) {
        Log.d("ImageQuality", "checkExposure called with path: $imagePath")

        try {
            val realPath = normalizePath(imagePath)
            val file = File(realPath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Image file not found")
                return
            }

            // Decode smaller bitmap for speed (exposure doesn't need full res)
            val options = BitmapFactory.Options().apply {
                inSampleSize = 4
            }
            val bitmap: Bitmap = BitmapFactory.decodeFile(realPath, options)
                ?: run {
                    promise.reject("DECODE_FAILED", "Cannot decode image")
                    return
                }

            val width = bitmap.width
            val height = bitmap.height

            // Sample step (bigger step = faster, less accurate)
            val step = 2

            var totalLuminance = 0.0
            var sampledCount = 0

            var overexposed = 0
            var underexposed = 0

            // thresholds (0..1)
            val clipBright = 0.95
            val clipDark = 0.05

            var x = 0
            while (x < width) {
                var y = 0
                while (y < height) {
                    val c = bitmap.getPixel(x, y)
                    val r = Color.red(c)
                    val g = Color.green(c)
                    val b = Color.blue(c)

                    // Rec.601 luminance
                    val lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

                    totalLuminance += lum
                    sampledCount++

                    if (lum > clipBright) overexposed++
                    if (lum < clipDark) underexposed++

                    y += step
                }
                x += step
            }

            bitmap.recycle()

            if (sampledCount == 0) {
                promise.reject("NATIVE_ERROR", "No pixels sampled")
                return
            }

            val avgLum = totalLuminance / sampledCount
            val overRatio = overexposed.toDouble() / sampledCount.toDouble()
            val underRatio = underexposed.toDouble() / sampledCount.toDouble()

            // Decision logic (tune as you like)
            val status =
                if (avgLum < 0.30 || underRatio > 0.20) "underexposed"
                else if (avgLum > 0.70 || overRatio > 0.20) "overexposed"
                else "normal"

            Log.d(
                "ImageQuality",
                "Exposure status=$status avgLum=$avgLum overRatio=$overRatio underRatio=$underRatio"
            )

            promise.resolve(status)
        } catch (e: Exception) {
            Log.e("ImageQuality", "Error in checkExposure", e)
            promise.reject("NATIVE_ERROR", e.message ?: "Unknown error")
        }
    }
}
