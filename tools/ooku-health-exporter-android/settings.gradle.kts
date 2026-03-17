pluginManagement {
  repositories {
    google()
    mavenCentral()
    maven("https://developer.huawei.com/repo/")
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
    maven("https://developer.huawei.com/repo/")
  }
}

rootProject.name = "OokuHealthExporter"
include(":app")
