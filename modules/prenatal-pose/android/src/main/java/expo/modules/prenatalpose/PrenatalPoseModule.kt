package expo.modules.prenatalpose

import android.content.Context
import android.os.SystemClock
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.CameraState
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.Observer
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class PrenatalPoseModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PrenatalPose")
    View(PrenatalPoseView::class) {
      Events("onPose", "onError")
      OnViewDestroys { view: PrenatalPoseView -> view.dispose() }
    }
  }
}

class PrenatalPoseView(context: Context, appContext: AppContext) : ExpoView(context, appContext), DefaultLifecycleObserver {
  override val shouldUseAndroidLayout = true
  private val onPose by EventDispatcher()
  private val onError by EventDispatcher()
  private val previewView = PreviewView(context)
  private val executor = Executors.newSingleThreadExecutor()
  private val busy = AtomicBoolean(false)
  private var provider: ProcessCameraProvider? = null
  private var detector: PoseDetector? = null
  private var preview: Preview? = null
  private var analysis: ImageAnalysis? = null
  private var owner: LifecycleOwner? = null
  private var cameraState: LiveData<CameraState>? = null
  private val cameraObserver = Observer<CameraState> { state ->
    if (active && state.error != null) {
      stop()
      onError(mapOf("message" to "Camera unavailable or in use by another app. Please retry."))
    }
  }
  @Volatile private var generation = 0
  @Volatile private var active = false
  private var disposed = false
  private var lastFrame = 0L

  init {
    previewView.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    previewView.scaleType = PreviewView.ScaleType.FIT_CENTER
    addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    previewView.layout(0, 0, right - left, bottom - top)
  }
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    owner = appContext.currentActivity as? LifecycleOwner
    owner?.lifecycle?.addObserver(this)
    start()
  }
  override fun onDetachedFromWindow() {
    stop()
    owner?.lifecycle?.removeObserver(this)
    super.onDetachedFromWindow()
  }
  override fun onPause(owner: LifecycleOwner) { stop() }
  // JS remounts only after explicit Resume; background time never advances a cycle.
  @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
  private fun start() {
    if (disposed || active) return
    val lifecycle = owner ?: run { onError(mapOf("message" to "Camera lifecycle unavailable.")); return }
    active = true
    val token = ++generation
    try {
      detector = PoseDetection.getClient(PoseDetectorOptions.Builder().setDetectorMode(PoseDetectorOptions.STREAM_MODE).build())
      val future = ProcessCameraProvider.getInstance(context)
      future.addListener({
        if (!active || token != generation) return@addListener
        try {
          val cameraProvider = future.get()
          provider = cameraProvider
          val selector = if (cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
          if (!cameraProvider.hasCamera(selector)) throw IllegalStateException("No camera available")
          val cameraPreview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
          val analyzer = ImageAnalysis.Builder().setTargetResolution(Size(640, 480)).setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
          preview = cameraPreview
          analysis = analyzer
          analyzer.setAnalyzer(executor) { proxy ->
            val now = SystemClock.elapsedRealtime()
            if (!active || token != generation || now - lastFrame < 100 || !busy.compareAndSet(false, true)) {
              proxy.close()
              return@setAnalyzer
            }
            lastFrame = now
            val media = proxy.image
            val engine = detector
            if (media == null || engine == null) { busy.set(false); proxy.close(); return@setAnalyzer }
            val rotated = proxy.imageInfo.rotationDegrees % 180 != 0
            val width = if (rotated) proxy.height else proxy.width
            val height = if (rotated) proxy.width else proxy.height
            try {
              engine.process(InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees))
                .addOnSuccessListener { pose ->
                  if (active && token == generation) {
                    val names = mapOf(0 to "nose", 11 to "leftShoulder", 12 to "rightShoulder", 13 to "leftElbow", 14 to "rightElbow", 15 to "leftWrist", 16 to "rightWrist", 23 to "leftHip", 24 to "rightHip", 25 to "leftKnee", 26 to "rightKnee", 27 to "leftAnkle", 28 to "rightAnkle")
                    val landmarks = pose.allPoseLandmarks.mapNotNull { p -> names[p.landmarkType]?.let { it to mapOf("x" to p.position.x, "y" to p.position.y, "confidence" to p.inFrameLikelihood) } }.toMap()
                    onPose(mapOf("landmarks" to landmarks, "width" to width, "height" to height, "timestamp" to now.toDouble()))
                  }
                }
                .addOnFailureListener { if (active && token == generation) onError(mapOf("message" to "Pose processing failed. Please retry.")) }
                .addOnCompleteListener { proxy.close(); busy.set(false) }
            } catch (e: Exception) {
              proxy.close(); busy.set(false)
              post { if (active) onError(mapOf("message" to "Pose detector unavailable. Please retry.")) }
            }
          }
          val camera = cameraProvider.bindToLifecycle(lifecycle, selector, cameraPreview, analyzer)
          cameraState = camera.cameraInfo.cameraState
          cameraState?.observe(lifecycle, cameraObserver)
        } catch (e: Exception) { stop(); onError(mapOf("message" to "Camera could not start. Check permission and camera availability.")) }
      }, ContextCompat.getMainExecutor(context))
    } catch (e: Exception) { stop(); onError(mapOf("message" to "Pose detector could not initialize.")) }
  }
  private fun stop() {
    active = false; generation++
    cameraState?.removeObserver(cameraObserver); cameraState = null
    analysis?.clearAnalyzer()
    preview?.let { provider?.unbind(it) }
    analysis?.let { provider?.unbind(it) }
    analysis = null; preview = null
    detector?.close(); detector = null
  }
  fun dispose() {
    if (disposed) return
    disposed = true; stop()
    owner?.lifecycle?.removeObserver(this)
    executor.shutdown()
  }
}
