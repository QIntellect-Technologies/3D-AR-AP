package com.android3darapp

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.android3darapp.ImageQualityPackage
import org.opencv.android.OpenCVLoader

class MainApplication : Application(), ReactApplication {

    private fun initOpenCvRuntime() {
        // Ensure OpenCV native symbols are available before any Mat usage.
        val loaded = try {
            OpenCVLoader.initLocal()
        } catch (e: Throwable) {
            Log.e("MainApplication", "OpenCV initLocal failed", e)
            false
        }

        if (!loaded) {
            try {
                System.loadLibrary("opencv_java4")
                Log.d("MainApplication", "opencv_java4 loaded via System.loadLibrary")
            } catch (e: UnsatisfiedLinkError) {
                Log.e("MainApplication", "opencv_java4 load failed", e)
            }
        } else {
            Log.d("MainApplication", "OpenCV initialized with initLocal")
        }
    }

    override fun onCreate() {
        super.onCreate()

        initOpenCvRuntime()

        loadReactNative(this)
    }

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                add(ImageQualityPackage())
            }
        )
    }
}