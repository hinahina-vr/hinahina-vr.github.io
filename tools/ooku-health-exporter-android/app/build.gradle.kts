val huaweiAppId = providers.gradleProperty("ooku.health.huaweiAppId").orElse("APP_ID")
val watchModel = providers.gradleProperty("ooku.health.watchModel").orElse("HUAWEI WATCH FIT 4 Pro")

plugins {
  id("com.android.application")
  kotlin("android")
}

android {
  namespace = "io.waddy.ookuhealthexporter"
  compileSdk = 34

  defaultConfig {
    applicationId = "io.waddy.ookuhealthexporter"
    minSdk = 26
    targetSdk = 34
    versionCode = 1
    versionName = "1.0.0"
    manifestPlaceholders["huaweiAppId"] = huaweiAppId.get()
    buildConfigField("String", "WATCH_MODEL", "\"${watchModel.get()}\"")
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro",
      )
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  buildFeatures {
    buildConfig = true
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("androidx.activity:activity-ktx:1.9.2")
  implementation("androidx.constraintlayout:constraintlayout:2.1.4")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
  implementation("com.google.android.material:material:1.12.0")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
  implementation("com.google.code.gson:gson:2.11.0")

  implementation("com.huawei.agconnect:agconnect-core:1.9.1.301")
  implementation("com.huawei.hms:hwid:6.4.0.301")
  implementation("com.huawei.hms:health:6.9.0.300")
}
