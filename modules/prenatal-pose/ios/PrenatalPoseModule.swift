import ExpoModulesCore
import AVFoundation
import MLKitPoseDetection
import MLKitPoseDetectionCommon
import MLKitVision

public class PrenatalPoseModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PrenatalPose")
    View(PrenatalPoseView.self) {
      Events("onPose", "onError")
    }
  }
}

final class PrenatalPoseView: ExpoView, AVCaptureVideoDataOutputSampleBufferDelegate {
  let onPose = EventDispatcher()
  let onError = EventDispatcher()
  private let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "clinic.pose.camera")
  private var preview: AVCaptureVideoPreviewLayer!
  private var detector: PoseDetector?
  private var lastFrame = 0.0
  private var observers: [NSObjectProtocol] = []
  private var configured = false
  // Accessed only on the serial camera queue.
  private var active = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    preview = AVCaptureVideoPreviewLayer(session: session)
    preview.videoGravity = .resizeAspect
    layer.addSublayer(preview)
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.stop() })
    observers.append(NotificationCenter.default.addObserver(forName: .AVCaptureSessionRuntimeError, object: session, queue: .main) { [weak self] _ in self?.fail("Camera unavailable. Please retry.") })
    observers.append(NotificationCenter.default.addObserver(forName: .AVCaptureSessionWasInterrupted, object: session, queue: .main) { [weak self] _ in self?.fail("Camera interrupted. Please retry.") })
  }
  override func layoutSubviews() { super.layoutSubviews(); preview.frame = bounds; preview.connection?.videoOrientation = .portrait }
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { stop() } else { start() }
  }
  private func fail(_ message: String) {
    stop()
    DispatchQueue.main.async { [weak self] in self?.onError(["message": message]) }
  }
  private func start() {
    queue.async { [weak self] in
      guard let self = self, !self.active else { return }
      guard AVCaptureDevice.authorizationStatus(for: .video) == .authorized else { self.fail("Camera permission required."); return }
      do {
        if !self.configured {
          self.session.beginConfiguration()
          defer { self.session.commitConfiguration() }
          self.session.sessionPreset = .vga640x480
          guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front) else { self.fail("Front camera unavailable."); return }
          let input = try AVCaptureDeviceInput(device: camera)
          let output = AVCaptureVideoDataOutput()
          output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
          output.alwaysDiscardsLateVideoFrames = true
          output.setSampleBufferDelegate(self, queue: self.queue)
          guard self.session.canAddInput(input), self.session.canAddOutput(output) else { self.fail("Camera configuration unavailable."); return }
          self.session.addInput(input)
          self.session.addOutput(output)
          // Deliver portrait, unmirrored buffers so ML Kit coordinates and dimensions agree.
          output.connection(with: .video)?.videoOrientation = .portrait
          output.connection(with: .video)?.isVideoMirrored = false
          self.configured = true
        }
        let options = PoseDetectorOptions()
        options.detectorMode = .stream
        self.detector = PoseDetector.poseDetector(options: options)
        self.active = true
        self.session.startRunning()
      } catch { self.fail("Camera or pose detector could not initialize.") }
    }
  }
  private func stop() {
    queue.async { [weak self] in
      guard let self = self else { return }
      self.active = false
      if self.session.isRunning { self.session.stopRunning() }
      self.detector = nil
    }
  }
  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    let now = ProcessInfo.processInfo.systemUptime * 1000
    guard active, now - lastFrame >= 100, let detector = detector, let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    lastFrame = now
    let image = VisionImage(buffer: sampleBuffer)
    image.orientation = .up
    do {
      let poses = try detector.results(in: image)
      let names: [(PoseLandmarkType, String)] = [(.nose, "nose"), (.leftShoulder, "leftShoulder"), (.rightShoulder, "rightShoulder"), (.leftElbow, "leftElbow"), (.rightElbow, "rightElbow"), (.leftWrist, "leftWrist"), (.rightWrist, "rightWrist"), (.leftHip, "leftHip"), (.rightHip, "rightHip"), (.leftKnee, "leftKnee"), (.rightKnee, "rightKnee"), (.leftAnkle, "leftAnkle"), (.rightAnkle, "rightAnkle")]
      var landmarks: [String: [String: Double]] = [:]
      if let pose = poses.first {
        for (type, name) in names {
          let p = pose.landmark(ofType: type)
          landmarks[name] = ["x": Double(p.position.x), "y": Double(p.position.y), "confidence": Double(p.inFrameLikelihood)]
        }
      }
      let event: [String: Any] = ["landmarks": landmarks, "width": CVPixelBufferGetWidth(buffer), "height": CVPixelBufferGetHeight(buffer), "timestamp": now]
      DispatchQueue.main.async { [weak self] in guard let self = self, self.window != nil else { return }; self.onPose(event) }
    } catch { fail("Pose processing failed. Please retry.") }
  }
  deinit {
    observers.forEach(NotificationCenter.default.removeObserver)
    // Queue retains the session until capture is stopped, without retaining this view.
    let capture = session
    queue.async { if capture.isRunning { capture.stopRunning() } }
  }
}
