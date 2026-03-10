package com.android3darapp  // ← your actual package name

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Android3DARApp"  // ← match your app name

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // Optional: If you need to override onCreate for any reason (e.g. screens), do it like this:
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)  // ← Important for react-native-screens compatibility
  }
}