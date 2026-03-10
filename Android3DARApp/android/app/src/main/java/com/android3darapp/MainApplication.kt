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

    override fun onCreate() {
        super.onCreate()

        // Load OpenCV early – before any React Native or module initialization
        if (OpenCVLoader.initLocal()) {
            Log.d("MainApplication", "OpenCV loaded successfully via initLocal")
        } else {
            Log.e("MainApplication", "OpenCV initLocal failed! Native functions will not work.")
            // You could show a toast or fatal error here in production
        }

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