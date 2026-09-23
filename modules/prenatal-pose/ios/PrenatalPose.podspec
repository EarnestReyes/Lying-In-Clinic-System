Pod::Spec.new do |s|
  s.name = 'PrenatalPose'
  s.version = '1.0.0'
  s.summary = 'Local live-camera pose landmarks'
  s.description = 'Expo bridge for on-device ML Kit pose landmarks.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Lying-In Center'
  s.homepage = 'https://developers.google.com/ml-kit/vision/pose-detection'
  s.source = { :git => 'https://github.com/googlesamples/mlkit.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'GoogleMLKit/PoseDetection', '8.0.0'
  s.source_files = '**/*.swift'
end
